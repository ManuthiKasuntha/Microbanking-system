const db = require('../db');
const { notFound } = require('../errors/AppError');

// Managers only see data for the branch they belong to
const getBranchIdOf = async (employeeId) => {
  const result = await db.query('SELECT branch_id FROM employee WHERE employee_id = $1', [employeeId]);
  if (result.rows.length === 0) throw notFound('Manager not found');
  return result.rows[0].branch_id;
};

const searchCustomers = async (managerId, term) => {
  const branchId = await getBranchIdOf(managerId);
  const result = await db.query(
    `SELECT c.customer_id, c.first_name, c.last_name, c.gender, c.nic, c.date_of_birth,
            ct.contact_no_1, ct.contact_no_2, ct.email, ct.address,
            COUNT(DISTINCT a.account_id) AS accounts_count,
            ARRAY_AGG(DISTINCT a.account_id) AS account_ids
     FROM customer c
     JOIN contact ct ON c.contact_id = ct.contact_id
     JOIN takes t ON c.customer_id = t.customer_id
     JOIN account a ON t.account_id = a.account_id
     WHERE a.branch_id = $1
       AND (c.first_name ILIKE $2 OR c.last_name ILIKE $2 OR c.nic ILIKE $2
            OR (c.first_name || ' ' || c.last_name) ILIKE $2
            OR (c.last_name || ' ' || c.first_name) ILIKE $2)
     GROUP BY c.customer_id, ct.contact_id
     ORDER BY c.last_name, c.first_name
     LIMIT 50`,
    [branchId, `%${term}%`]
  );
  return result.rows;
};

const findCustomersByNic = async (managerId, nic) => {
  const branchId = await getBranchIdOf(managerId);
  const result = await db.query(
    `SELECT c.customer_id, c.first_name, c.last_name, c.gender, c.nic, c.date_of_birth,
            ct.contact_no_1, ct.contact_no_2, ct.email, ct.address,
            COUNT(DISTINCT a.account_id) AS accounts_count,
            COALESCE(ARRAY_AGG(DISTINCT a.account_id) FILTER (WHERE a.account_id IS NOT NULL), ARRAY[]::int[]) AS account_ids
     FROM customer c
     JOIN contact ct ON c.contact_id = ct.contact_id
     LEFT JOIN takes t ON c.customer_id = t.customer_id
     LEFT JOIN account a ON t.account_id = a.account_id AND a.branch_id = $1
     WHERE c.nic = $2
     GROUP BY c.customer_id, ct.contact_id
     ORDER BY c.last_name, c.first_name
     LIMIT 50`,
    [branchId, nic]
  );
  return result.rows;
};

const EMPTY_PERFORMANCE = {
  total_transactions: 0,
  total_volume: 0,
  customers_registered: 0,
  accounts_created: 0,
  last_activity: null,
};

// Agents of the manager's branch plus per-agent performance, keyed by employee_id
const listAgentsWithPerformance = async (managerId) => {
  const branchId = await getBranchIdOf(managerId);
  const agentsResult = await db.query(
    `SELECT e.employee_id, e.username, e.first_name, e.last_name, e.role,
            e.nic, e.gender, e.date_of_birth, e.branch_id, e.contact_id, e.created_at,
            c.contact_no_1, c.contact_no_2, c.email, c.address
     FROM employee e
     LEFT JOIN contact c ON e.contact_id = c.contact_id
     WHERE e.branch_id = $1 AND e.role = 'Agent'
     ORDER BY e.first_name, e.last_name`,
    [branchId]
  );
  const agents = agentsResult.rows;
  const agentIds = agents.map((agent) => agent.employee_id);

  const statsResult = await db.query(
    `SELECT tr.employee_id,
            COUNT(*) AS total_transactions,
            COALESCE(SUM(tr.amount), 0) AS total_volume,
            COUNT(DISTINCT tr.account_id) AS accounts_created,
            MAX(tr.time) AS last_activity,
            (SELECT COUNT(DISTINCT tk.customer_id)
             FROM transaction tx JOIN takes tk ON tx.account_id = tk.account_id
             WHERE tx.employee_id = tr.employee_id) AS customers_registered
     FROM transaction tr
     WHERE tr.employee_id = ANY($1)
     GROUP BY tr.employee_id`,
    [agentIds]
  );

  const performance = Object.fromEntries(agentIds.map((id) => [id, { ...EMPTY_PERFORMANCE }]));
  for (const row of statsResult.rows) {
    performance[row.employee_id] = {
      total_transactions: parseInt(row.total_transactions, 10),
      total_volume: parseFloat(row.total_volume),
      customers_registered: parseInt(row.customers_registered, 10),
      accounts_created: parseInt(row.accounts_created, 10),
      last_activity: row.last_activity,
    };
  }

  return { agents, performance };
};

const branchTransactions = async (managerId, start, end) => {
  const branchId = await getBranchIdOf(managerId);
  const params = [branchId, start, end];

  const [transactions, summary] = await Promise.all([
    db.query(
      `SELECT t.transaction_id, t.transaction_type, t.amount, t.time, t.description, t.account_id, t.employee_id,
              e.first_name || ' ' || e.last_name AS employee_name
       FROM transaction t
       JOIN employee e ON t.employee_id = e.employee_id
       JOIN account a ON t.account_id = a.account_id
       WHERE a.branch_id = $1 AND DATE(t.time) BETWEEN $2 AND $3
       ORDER BY t.time DESC
       LIMIT 100`,
      params
    ),
    db.query(
      `SELECT COUNT(*) AS transaction_count,
              COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'Deposit'), 0) AS total_deposits,
              COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'Withdrawal'), 0) AS total_withdrawals,
              COALESCE(SUM(CASE WHEN transaction_type = 'Deposit' THEN amount ELSE -amount END), 0) AS net_flow
       FROM transaction t
       JOIN account a ON t.account_id = a.account_id
       WHERE a.branch_id = $1 AND DATE(t.time) BETWEEN $2 AND $3`,
      params
    ),
  ]);

  const totals = summary.rows[0];
  return {
    transactions: transactions.rows,
    summary: {
      total_deposits: parseFloat(totals.total_deposits),
      total_withdrawals: parseFloat(totals.total_withdrawals),
      net_flow: parseFloat(totals.net_flow),
      transaction_count: parseInt(totals.transaction_count, 10),
    },
  };
};

const branchAccounts = async (managerId) => {
  const branchId = await getBranchIdOf(managerId);
  const result = await db.query(
    `SELECT a.account_id, a.open_date, a.account_status, a.balance, a.branch_id, a.saving_plan_id,
            c.customer_id, c.first_name, c.last_name, c.nic, c.gender, c.date_of_birth,
            ct.contact_no_1, ct.email, ct.address,
            sp.plan_type, sp.interest, sp.min_balance
     FROM account a
     JOIN takes t ON a.account_id = t.account_id
     JOIN customer c ON t.customer_id = c.customer_id
     JOIN contact ct ON c.contact_id = ct.contact_id
     LEFT JOIN savingplan sp ON a.saving_plan_id = sp.saving_plan_id
     WHERE a.branch_id = $1
     ORDER BY a.balance DESC`,
    [branchId]
  );

  const accounts = result.rows;
  const active = accounts.filter((account) => account.account_status === 'Active');
  const totalBalance = active.reduce((sum, account) => sum + parseFloat(account.balance), 0);

  return {
    accounts,
    summary: {
      total_accounts: accounts.length,
      active_accounts: active.length,
      total_balance: totalBalance,
      average_balance: active.length > 0 ? totalBalance / active.length : 0,
    },
  };
};

module.exports = {
  searchCustomers,
  findCustomersByNic,
  listAgentsWithPerformance,
  branchTransactions,
  branchAccounts,
};
