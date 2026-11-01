const db = require('../db');

const rows = async (text, params) => (await db.query(text, params)).rows;

const agentTransactions = (startDate, endDate) =>
  rows(
    `SELECT e.employee_id,
            e.first_name || ' ' || e.last_name AS employee_name,
            COUNT(v.transaction_id) AS total_transactions,
            COALESCE(SUM(v.deposit_amount), 0) AS total_deposits,
            COALESCE(SUM(v.withdrawal_amount), 0) AS total_withdrawals,
            COALESCE(SUM(v.net_value), 0) AS net_value
     FROM employee e
     LEFT JOIN v_transaction_enriched v ON e.employee_id = v.employee_id AND DATE(v.time) BETWEEN $1 AND $2
     WHERE e.role = 'Agent'
     GROUP BY e.employee_id
     ORDER BY total_transactions DESC`,
    [startDate, endDate]
  );

const accountSummaries = (startDate, endDate) =>
  rows(
    `SELECT a.account_id, ac.customer_names,
            COUNT(v.transaction_id) AS transaction_count,
            COALESCE(SUM(v.deposit_amount), 0) AS total_deposits,
            COALESCE(SUM(v.withdrawal_amount), 0) AS total_withdrawals,
            a.balance AS current_balance
     FROM account a
     JOIN v_account_customers ac ON ac.account_id = a.account_id
     LEFT JOIN v_transaction_enriched v ON a.account_id = v.account_id AND DATE(v.time) BETWEEN $1 AND $2
     WHERE a.account_status = 'Active'
     GROUP BY a.account_id, ac.customer_names
     ORDER BY a.account_id`,
    [startDate, endDate]
  );

const activeFixedDeposits = () => rows('SELECT * FROM v_active_fd_overview ORDER BY open_date DESC');

const monthlyInterest = (month, year) =>
  rows(
    `SELECT plan_type, account_type, total_interest, account_count, average_interest
     FROM v_monthly_interest_summary
     WHERE month = $1 AND year = $2`,
    [month, year]
  );

const customerActivity = (startDate, endDate) =>
  rows(
    `SELECT v.customer_id, v.customer_name,
            COALESCE(SUM(v.deposit_amount), 0) AS total_deposits,
            COALESCE(SUM(v.withdrawal_amount), 0) AS total_withdrawals,
            COALESCE(SUM(v.net_value), 0) AS net_balance,
            COUNT(DISTINCT v.account_id) AS account_count,
            MAX(v.transaction_date) AS last_activity
     FROM v_customer_transaction_enriched v
     WHERE v.transaction_date BETWEEN $1 AND $2
     GROUP BY v.customer_id, v.customer_name
     HAVING COUNT(v.transaction_id) > 0
     ORDER BY net_balance DESC`,
    [startDate, endDate]
  );

module.exports = { agentTransactions, accountSummaries, activeFixedDeposits, monthlyInterest, customerActivity };
