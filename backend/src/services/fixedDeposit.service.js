const db = require('../db');
const { badRequest } = require('../errors/AppError');

const MIN_FD_AGE = 18;

// Fixed deposits with their plan, linked savings account and holders; filter narrows the result
const fdSummaries = async ({ where = '', params = [], orderBy = 'fd.fd_id DESC' } = {}) => {
  const result = await db.query(
    `SELECT fd.fd_id, fd.fd_balance, fd.fd_status, fd.open_date, fd.maturity_date, fd.auto_renewal_status,
            fp.fd_options, fp.interest, a.account_id,
            STRING_AGG(DISTINCT c.first_name || ' ' || c.last_name, ', ') AS customer_names,
            STRING_AGG(DISTINCT c.nic, ', ') AS customer_nics
     FROM fixeddeposit fd
     JOIN fdplan fp ON fd.fd_plan_id = fp.fd_plan_id
     JOIN account a ON fd.fd_id = a.fd_id
     JOIN takes t ON a.account_id = t.account_id
     JOIN customer c ON t.customer_id = c.customer_id
     ${where}
     GROUP BY fd.fd_id, fp.fd_plan_id, a.account_id
     ORDER BY ${orderBy}`,
    params
  );
  return result.rows;
};

const list = () => fdSummaries();

const listByHolderNic = (nic) =>
  fdSummaries({
    where: 'WHERE a.account_id IN (SELECT ht.account_id FROM takes ht JOIN customer hc ON ht.customer_id = hc.customer_id WHERE hc.nic = $1)',
    params: [nic],
  });

const search = (term) =>
  fdSummaries({
    where: `WHERE fd.fd_id::text ILIKE $1 OR a.account_id IN (
              SELECT ht.account_id FROM takes ht JOIN customer hc ON ht.customer_id = hc.customer_id WHERE hc.nic ILIKE $1)`,
    params: [`%${term}%`],
    orderBy: 'fd.open_date DESC',
  });

// The DB stores auto renewal as the enum 'True' | 'False'
const toAutoRenewalFlag = (value) => (String(value).toLowerCase() === 'true' ? 'True' : 'False');

const open = (employeeId, { customer_id, account_id, fd_plan_id, principal_amount, auto_renewal_status }) =>
  db.withTransaction(async (client) => {
    const customer = await client.query(
      'SELECT EXTRACT(YEAR FROM AGE(date_of_birth))::int AS age FROM customer WHERE customer_id = $1',
      [customer_id]
    );
    if (customer.rows.length === 0) throw badRequest('Customer not found');
    if (customer.rows[0].age < MIN_FD_AGE) {
      throw badRequest(`Customer must be at least ${MIN_FD_AGE} years old for Fixed Deposit`);
    }

    const accountResult = await client.query(
      `SELECT a.balance, sp.min_balance
       FROM account a
       JOIN savingplan sp ON a.saving_plan_id = sp.saving_plan_id
       WHERE a.account_id = $1 AND a.account_status = 'Active'`,
      [account_id]
    );
    const account = accountResult.rows[0];
    if (!account) throw badRequest('Account not found or closed');

    const ownership = await client.query('SELECT 1 FROM takes WHERE account_id = $1 AND customer_id = $2', [account_id, customer_id]);
    if (ownership.rows.length === 0) throw badRequest('The selected account does not belong to this customer');

    const availableForFd = parseFloat(account.balance) - parseFloat(account.min_balance);
    if (principal_amount > availableForFd) {
      throw badRequest(`Insufficient balance. Maximum FD amount: LKR ${availableForFd.toFixed(2)}`);
    }

    const planResult = await client.query('SELECT fd_options FROM fdplan WHERE fd_plan_id = $1', [fd_plan_id]);
    const plan = planResult.rows[0];
    if (!plan) throw badRequest('Invalid FD plan');

    // maturity_date is set by the DB trigger fd_autocalc_maturity_date
    const fdResult = await client.query(
      `INSERT INTO fixeddeposit (fd_balance, auto_renewal_status, fd_status, open_date, fd_plan_id)
       VALUES ($1, $2, 'Active', NOW(), $3)
       RETURNING fd_id, maturity_date`,
      [principal_amount, toAutoRenewalFlag(auto_renewal_status), fd_plan_id]
    );
    const { fd_id: fdId, maturity_date: maturityDate } = fdResult.rows[0];

    await client.query('SELECT create_transaction_with_validation($1, $2, $3, $4, $5)', [
      'Withdrawal', principal_amount, `Fixed Deposit Creation - ${plan.fd_options} Plan`, account_id, employeeId,
    ]);
    await client.query('UPDATE account SET fd_id = $1 WHERE account_id = $2', [fdId, account_id]);

    const updated = await client.query('SELECT balance FROM account WHERE account_id = $1', [account_id]);

    return {
      fd_id: fdId,
      maturity_date: new Date(maturityDate).toISOString().split('T')[0],
      new_savings_balance: parseFloat(updated.rows[0].balance),
    };
  });

// Closing an FD returns its principal to the linked savings account
const close = (employeeId, fdId) =>
  db.withTransaction(async (client) => {
    const fdResult = await client.query(
      "SELECT fd_balance FROM fixeddeposit WHERE fd_id = $1 AND fd_status = 'Active' FOR UPDATE",
      [fdId]
    );
    const fd = fdResult.rows[0];
    if (!fd) throw badRequest('Active fixed deposit not found');

    const accountResult = await client.query('SELECT account_id FROM account WHERE fd_id = $1', [fdId]);
    if (accountResult.rows.length === 0) throw badRequest('Linked savings account not found');
    const accountId = accountResult.rows[0].account_id;

    await client.query('SELECT create_transaction_with_validation($1, $2, $3, $4, $5)', [
      'Deposit', fd.fd_balance, `FD Deactivation - Principal Return (${fdId})`, accountId, employeeId,
    ]);
    await client.query("UPDATE fixeddeposit SET fd_status = 'Closed' WHERE fd_id = $1", [fdId]);
    await client.query('UPDATE account SET fd_id = NULL WHERE fd_id = $1', [fdId]);

    return { fd_id: fdId, principal_returned: fd.fd_balance, account_id: accountId };
  });

module.exports = { list, listByHolderNic, search, open, close };
