const db = require('../db');

const RECENT_ACTIVITY_LIMIT = 10;
const TREND_DAYS = 30;

// Dashboard figures for the signed-in agent
const agentPerformance = async (employeeId) => {
  const [today, customers, monthly, volume, recent] = await Promise.all([
    db.query(
      'SELECT COUNT(*) AS count FROM transaction WHERE employee_id = $1 AND DATE(time) = CURRENT_DATE',
      [employeeId]
    ),
    db.query(
      `SELECT COUNT(DISTINCT t.customer_id) AS count
       FROM takes t
       JOIN transaction tr ON t.account_id = tr.account_id
       WHERE tr.employee_id = $1 AND tr.transaction_type = 'Deposit'`,
      [employeeId]
    ),
    db.query(
      `SELECT COUNT(DISTINCT account_id) AS count
       FROM transaction
       WHERE employee_id = $1 AND date_trunc('month', time) = date_trunc('month', CURRENT_DATE)`,
      [employeeId]
    ),
    db.query('SELECT COALESCE(SUM(amount), 0) AS total FROM transaction WHERE employee_id = $1', [employeeId]),
    db.query(
      `SELECT transaction_type, amount, account_id, description, time
       FROM transaction
       WHERE employee_id = $1
       ORDER BY time DESC
       LIMIT $2`,
      [employeeId, RECENT_ACTIVITY_LIMIT]
    ),
  ]);

  return {
    today_transactions: parseInt(today.rows[0].count, 10),
    total_customers: parseInt(customers.rows[0].count, 10),
    monthly_accounts: parseInt(monthly.rows[0].count, 10),
    transaction_volume: parseFloat(volume.rows[0].total),
    recent_activity: recent.rows.map((row) => ({
      type: 'transaction',
      description: `${row.transaction_type} of LKR ${parseFloat(row.amount).toLocaleString()} - ${row.description || `Account ${row.account_id}`}`,
      time: row.time,
    })),
  };
};

const transactionsByPlanType = async (employeeId) => {
  const result = await db.query(
    `SELECT sp.plan_type, COUNT(t.transaction_id) AS transaction_count
     FROM transaction t
     JOIN account a ON t.account_id = a.account_id
     JOIN savingplan sp ON a.saving_plan_id = sp.saving_plan_id
     WHERE t.employee_id = $1 AND sp.plan_type IN ('Children', 'Teen', 'Adult', 'Senior')
     GROUP BY sp.plan_type
     ORDER BY transaction_count DESC`,
    [employeeId]
  );
  return result.rows;
};

// One row per day for the last 30 days, including days with no transactions
const transactionTrend = async (employeeId) => {
  const result = await db.query(
    `WITH date_series AS (
       SELECT generate_series(CURRENT_DATE - ($2::int - 1), CURRENT_DATE, INTERVAL '1 day')::date AS date
     )
     SELECT ds.date, COUNT(t.transaction_id) AS transaction_count
     FROM date_series ds
     LEFT JOIN transaction t ON DATE(t.time) = ds.date AND t.employee_id = $1
     GROUP BY ds.date
     ORDER BY ds.date ASC`,
    [employeeId, TREND_DAYS]
  );
  return result.rows;
};

module.exports = { agentPerformance, transactionsByPlanType, transactionTrend };
