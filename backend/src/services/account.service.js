const db = require('../db');
const { badRequest, notFound } = require('../errors/AppError');

const PLAN_MIN_AGE = { Children: 0, Teen: 12, Adult: 18, Senior: 60, Joint: 18 };
const JOINT_HOLDER_MIN_AGE = 18;

const today = () => new Date().toISOString().split('T')[0];

// Lists accounts with their plan, branch and all holders; holderFilter optionally narrows by a holder's NIC
const accountSummaries = async ({ byHolderNic } = {}) => {
  const filterJoin = byHolderNic
    ? `JOIN takes ft ON a.account_id = ft.account_id
       JOIN customer fc ON ft.customer_id = fc.customer_id AND fc.nic = $1`
    : '';
  const result = await db.query(
    `SELECT a.account_id, a.balance, a.account_status, a.open_date, a.branch_id, a.saving_plan_id, a.fd_id,
            sp.plan_type, sp.interest, sp.min_balance,
            b.name AS branch_name,
            STRING_AGG(DISTINCT c.first_name || ' ' || c.last_name, ', ') AS customer_names,
            STRING_AGG(DISTINCT c.nic, ', ') AS customer_nics,
            COUNT(DISTINCT t.customer_id) AS customer_count
     FROM account a
     JOIN savingplan sp ON a.saving_plan_id = sp.saving_plan_id
     JOIN branch b ON a.branch_id = b.branch_id
     JOIN takes t ON a.account_id = t.account_id
     JOIN customer c ON t.customer_id = c.customer_id
     ${filterJoin}
     GROUP BY a.account_id, sp.saving_plan_id, b.branch_id
     ORDER BY a.account_id DESC`,
    byHolderNic ? [byHolderNic] : []
  );
  return result.rows;
};

const listAll = () => accountSummaries();

const listByHolderNic = (nic) => accountSummaries({ byHolderNic: nic });

const listActive = async () => {
  const result = await db.query(`
    SELECT a.account_id, a.balance, a.account_status,
           STRING_AGG(DISTINCT c.first_name || ' ' || c.last_name, ', ') AS customer_names
    FROM account a
    JOIN takes t ON a.account_id = t.account_id
    JOIN customer c ON t.customer_id = c.customer_id
    WHERE a.account_status = 'Active'
    GROUP BY a.account_id
    ORDER BY a.account_id
  `);
  return result.rows;
};

// Active accounts that can still take a fixed deposit (one FD per account)
const listEligibleForFd = async () => {
  const result = await db.query(`
    SELECT a.account_id, a.balance, a.fd_id, sp.min_balance, sp.interest, sp.plan_type,
           STRING_AGG(DISTINCT c.first_name || ' ' || c.last_name, ', ') AS customer_names,
           ARRAY_AGG(DISTINCT t.customer_id) AS customer_ids,
           COUNT(DISTINCT t.customer_id) AS customer_count
    FROM account a
    JOIN savingplan sp ON a.saving_plan_id = sp.saving_plan_id
    JOIN takes t ON a.account_id = t.account_id
    JOIN customer c ON t.customer_id = c.customer_id
    WHERE a.account_status = 'Active' AND a.fd_id IS NULL
    GROUP BY a.account_id, sp.saving_plan_id
    ORDER BY a.account_id
  `);
  return result.rows;
};

const search = async (term) => {
  const result = await db.query(
    `SELECT a.account_id, a.balance, a.account_status, a.open_date, a.branch_id, a.saving_plan_id, a.fd_id,
            sp.plan_type, sp.interest, sp.min_balance,
            STRING_AGG(DISTINCT c.first_name || ' ' || c.last_name, ', ') AS customer_names,
            COUNT(DISTINCT t.customer_id) AS customer_count,
            b.name AS branch_name
     FROM account a
     JOIN takes t ON a.account_id = t.account_id
     JOIN customer c ON t.customer_id = c.customer_id
     JOIN savingplan sp ON a.saving_plan_id = sp.saving_plan_id
     JOIN branch b ON a.branch_id = b.branch_id
     WHERE a.account_id::text ILIKE $1 OR c.first_name ILIKE $1 OR c.last_name ILIKE $1
     GROUP BY a.account_id, sp.saving_plan_id, b.branch_id
     ORDER BY a.open_date DESC`,
    [`%${term}%`]
  );
  return result.rows;
};

const getDetails = async (id) => {
  const accountResult = await db.query(
    `SELECT a.account_id, a.balance, a.account_status, a.open_date,
            COALESCE(b.name, 'Unknown') AS branch_name,
            COALESCE(sp.plan_type::text, 'Unknown') AS plan_type,
            COALESCE(sp.interest, 0) AS interest,
            COALESCE(sp.min_balance, 0) AS min_balance
     FROM account a
     LEFT JOIN branch b ON a.branch_id = b.branch_id
     LEFT JOIN savingplan sp ON a.saving_plan_id = sp.saving_plan_id
     WHERE a.account_id = $1`,
    [id]
  );
  const base = accountResult.rows[0];
  if (!base) throw notFound('Account not found');

  const [customers, transactions] = await Promise.all([
    db.query(
      `SELECT c.customer_id, c.first_name, c.last_name, c.nic, c.date_of_birth
       FROM takes t
       JOIN customer c ON t.customer_id = c.customer_id
       WHERE t.account_id = $1
       ORDER BY c.last_name, c.first_name`,
      [id]
    ),
    db.query(
      `SELECT transaction_id, transaction_type, amount, time, description
       FROM transaction
       WHERE account_id = $1
       ORDER BY time DESC
       LIMIT 20`,
      [id]
    ),
  ]);

  return {
    ...base,
    balance: parseFloat(base.balance),
    interest: parseFloat(base.interest),
    min_balance: parseFloat(base.min_balance),
    customers: customers.rows,
    transactions: transactions.rows.map((row) => ({ ...row, amount: parseFloat(row.amount) })),
  };
};

const ensureEligibleHolders = async (client, plan, primaryCustomerId, jointHolderIds) => {
  if (plan.plan_type === 'Joint' && jointHolderIds.length === 0) {
    throw badRequest('Joint account requires at least one joint holder');
  }

  const primary = await client.query(
    'SELECT EXTRACT(YEAR FROM AGE(date_of_birth))::int AS age FROM customer WHERE customer_id = $1',
    [primaryCustomerId]
  );
  if (primary.rows.length === 0) throw badRequest('Primary customer not found');

  const requiredAge = PLAN_MIN_AGE[plan.plan_type] ?? 18;
  if (primary.rows[0].age < requiredAge) {
    throw badRequest(`${plan.plan_type} account requires account holder to be at least ${requiredAge} years old`);
  }

  if (jointHolderIds.length === 0) return;

  const joint = await client.query(
    `SELECT first_name, last_name, EXTRACT(YEAR FROM AGE(date_of_birth))::int AS age
     FROM customer WHERE customer_id = ANY($1)`,
    [jointHolderIds]
  );
  if (joint.rows.length !== jointHolderIds.length) throw badRequest('One or more joint holders not found');

  const underage = joint.rows.find((holder) => holder.age < JOINT_HOLDER_MIN_AGE);
  if (underage) {
    throw badRequest(`Joint holder ${underage.first_name} ${underage.last_name} must be at least ${JOINT_HOLDER_MIN_AGE} years old`);
  }
};

const open = (employeeId, { customer_id, saving_plan_id, initial_deposit, branch_id, joint_holders = [] }) =>
  db.withTransaction(async (client) => {
    const planResult = await client.query('SELECT * FROM savingplan WHERE saving_plan_id = $1', [saving_plan_id]);
    const plan = planResult.rows[0];
    if (!plan) throw badRequest('Invalid saving plan');

    await ensureEligibleHolders(client, plan, customer_id, joint_holders);

    if (initial_deposit < Number(plan.min_balance)) {
      throw badRequest(`Minimum deposit for ${plan.plan_type} plan is LKR ${plan.min_balance}`);
    }

    const branch = await client.query('SELECT 1 FROM branch WHERE branch_id = $1', [branch_id]);
    if (branch.rows.length === 0) throw badRequest('Branch not found');

    const accountResult = await client.query(
      `INSERT INTO account (open_date, account_status, balance, saving_plan_id, branch_id)
       VALUES ($1, 'Active', 0, $2, $3)
       RETURNING account_id`,
      [today(), saving_plan_id, branch_id]
    );
    const accountId = accountResult.rows[0].account_id;

    for (const holderId of [customer_id, ...joint_holders]) {
      await client.query('INSERT INTO takes (customer_id, account_id) VALUES ($1, $2)', [holderId, accountId]);
    }

    if (initial_deposit > 0) {
      await client.query('SELECT create_transaction_with_validation($1, $2, $3, $4, $5)', [
        'Deposit', initial_deposit, 'Initial Deposit', accountId, employeeId,
      ]);
    }

    return { account_id: accountId, joint_holders_count: joint_holders.length };
  });

const changePlan = (employeeId, { account_id, new_saving_plan_id, reason, new_nic }) =>
  db.withTransaction(async (client) => {
    await db.setActor(client, employeeId);
    await client.query('SELECT change_account_saving_plan($1, $2, $3, $4, $5)', [
      account_id, new_saving_plan_id, employeeId, reason, new_nic || null,
    ]);
    const plan = await client.query(
      'SELECT saving_plan_id, plan_type, interest, min_balance FROM savingplan WHERE saving_plan_id = $1',
      [new_saving_plan_id]
    );
    return plan.rows[0];
  });

// Closing an account withdraws the full balance first; an active FD must be closed beforehand
const close = (employeeId, { account_id, reason }) =>
  db.withTransaction(async (client) => {
    const accountResult = await client.query(
      "SELECT balance, fd_id FROM account WHERE account_id = $1 AND account_status = 'Active' FOR UPDATE",
      [account_id]
    );
    const account = accountResult.rows[0];
    if (!account) throw badRequest('Active account not found');

    if (account.fd_id) {
      const fd = await client.query("SELECT 1 FROM fixeddeposit WHERE fd_id = $1 AND fd_status = 'Active'", [account.fd_id]);
      if (fd.rows.length > 0) {
        throw badRequest('Cannot deactivate account with active Fixed Deposit. Please deactivate the FD first.');
      }
    }

    const withdrawalAmount = parseFloat(account.balance);
    let withdrawalTransactionId = null;

    if (withdrawalAmount > 0) {
      // The balance guard trigger only allows a direct balance update when these flags are set
      await client.query("SELECT set_config('app.balance_update_allowed', 'true', true)");
      await client.query("SELECT set_config('app.balance_update_account_id', $1, true)", [String(account_id)]);
      await client.query('UPDATE account SET balance = 0 WHERE account_id = $1', [account_id]);

      const tx = await client.query(
        `INSERT INTO transaction (transaction_type, amount, time, description, account_id, employee_id)
         VALUES ('Withdrawal', $1, NOW(), $2, $3, $4)
         RETURNING transaction_id`,
        [withdrawalAmount, `Account Closure - Full Balance Withdrawal - ${reason || 'No reason provided'}`, account_id, employeeId]
      );
      withdrawalTransactionId = tx.rows[0].transaction_id;
    }

    await client.query(
      "UPDATE account SET account_status = 'Closed', closed_at = NOW() WHERE account_id = $1",
      [account_id]
    );

    return { account_id, withdrawal_amount: withdrawalAmount, withdrawal_transaction_id: withdrawalTransactionId };
  });

module.exports = {
  listAll,
  listByHolderNic,
  listActive,
  listEligibleForFd,
  search,
  getDetails,
  open,
  changePlan,
  close,
};
