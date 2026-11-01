const config = require('../config/env');
const db = require('../db');

const creditInterest = (client, amount, description, accountId) =>
  client.query('SELECT create_transaction_with_validation($1, $2, $3, $4, $5)', [
    'Interest', amount, description, accountId, config.interest.systemActorId,
  ]);

// What differs between FD and savings interest; the batch runner below handles the rest
const FD_INTEREST = {
  label: 'FD',
  dueQuery: 'SELECT * FROM calculate_fd_interest_due($1::INTERVAL) WHERE interest_amount > 0',
  describe: (row) => `FD ${row.fd_id} (account ${row.linked_account_id})`,
  credit: (client, row) =>
    creditInterest(client, row.interest_amount, `Monthly FD Interest - ${row.interest_rate}% Plan`, row.linked_account_id),
  record: (client, row, date, status, creditedAt) =>
    client.query(
      `INSERT INTO fd_interest_calculations
       (fd_id, calculation_date, interest_amount, days_in_period, credited_to_account_id, status, credited_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [row.fd_id, date, row.interest_amount, row.days_in_period, row.linked_account_id, status, creditedAt]
    ),
};

const SAVINGS_INTEREST = {
  label: 'savings',
  dueQuery: 'SELECT * FROM calculate_savings_interest_due($1::INTERVAL) WHERE interest_amount > 0',
  describe: (row) => `account ${row.account_id} (${row.plan_type})`,
  credit: (client, row) =>
    creditInterest(client, row.interest_amount, `Monthly Savings Interest - ${row.plan_type} Plan`, row.account_id),
  record: (client, row, date, status, creditedAt) =>
    client.query(
      `INSERT INTO savings_interest_calculations
       (account_id, calculation_date, interest_amount, interest_rate, plan_type, status, credited_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [row.account_id, date, row.interest_amount, row.interest_rate, row.plan_type, status, creditedAt]
    ),
};

const creditDueInterest = async (client, kind) => {
  const now = new Date();
  const processDate = now.toISOString().split('T')[0];
  const due = await client.query(kind.dueQuery, [config.interest.cycle]);

  let processed = 0;
  let totalInterest = 0;

  for (const row of due.rows) {
    // A failed credit only rolls back to its savepoint, so the rest of the batch still commits
    await client.query('SAVEPOINT credit_one');
    try {
      await kind.credit(client, row);
      await kind.record(client, row, processDate, 'credited', now);
      await client.query('RELEASE SAVEPOINT credit_one');
      processed++;
      totalInterest += parseFloat(row.interest_amount);
      console.log(`💰 Credited LKR ${row.interest_amount} interest for ${kind.describe(row)}`);
    } catch (error) {
      await client.query('ROLLBACK TO SAVEPOINT credit_one');
      console.error(`❌ Failed to process interest for ${kind.describe(row)}:`, error.message);
      await kind.record(client, row, processDate, 'failed', null);
    }
  }

  return { processed, totalInterest, period: processDate };
};

// Batch failures are reported in the result instead of thrown, so a scheduled run never crashes the server
const runBatch = async (kind, afterCredit = async () => ({})) => {
  console.log(`🚀 Starting ${kind.label} interest processing (cycle: ${config.interest.cycle})...`);
  try {
    const result = await db.withTransaction(async (client) => ({
      ...(await creditDueInterest(client, kind)),
      ...(await afterCredit(client)),
    }));
    console.log(`✅ ${kind.label} interest: ${result.processed} credited, LKR ${result.totalInterest.toLocaleString()} total`);
    return { success: true, ...result };
  } catch (error) {
    console.error(`❌ Error in ${kind.label} interest processing:`, error);
    return { success: false, error: error.message };
  }
};

const processDailyFDInterest = () =>
  runBatch(FD_INTEREST, async (client) => {
    const matured = (await client.query('SELECT * FROM process_matured_fixed_deposits()')).rows[0];
    console.log(`🏁 Matured FDs processed: ${matured.processed_count}`);
    return { maturedProcessed: matured.processed_count, principalReturned: matured.total_principal_returned };
  });

const processDailySavingsInterest = () => runBatch(SAVINGS_INTEREST);

const describeSchedule = (cronExpr, defaultExpr, defaultLabel) => {
  if (config.interest.debug) return 'Every 10 seconds (DEBUG)';
  return cronExpr === defaultExpr ? defaultLabel : `Cron: ${cronExpr}`;
};

// Interest credited this month and the last five processing runs for one calculations table
const creditHistory = async (table) => {
  const [monthly, recent] = await Promise.all([
    db.query(
      `SELECT COALESCE(SUM(interest_amount), 0) AS total
       FROM ${table}
       WHERE status = 'credited' AND date_trunc('month', credited_at) = date_trunc('month', now())`
    ),
    db.query(
      `SELECT (calculation_date - INTERVAL '30 days')::date AS period_start,
              calculation_date::date AS period_end,
              MAX(credited_at) AS processed_at
       FROM ${table}
       WHERE status = 'credited'
       GROUP BY calculation_date
       ORDER BY calculation_date DESC
       LIMIT 5`
    ),
  ]);
  return { monthly_interest: parseFloat(monthly.rows[0].total) || 0, recent_periods: recent.rows };
};

const savingsSummary = async () => {
  const [history, active] = await Promise.all([
    creditHistory('savings_interest_calculations'),
    db.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(balance), 0) AS total_balance
       FROM account
       WHERE account_status = 'Active' AND saving_plan_id IS NOT NULL`
    ),
  ]);
  return {
    monthly_interest: history.monthly_interest,
    active_savings_accounts: {
      count: active.rows[0].count,
      total_balance: parseFloat(active.rows[0].total_balance) || 0,
    },
    recent_periods: history.recent_periods,
    next_scheduled_run: describeSchedule(config.interest.savingsCron, '30 3 * * *', 'Daily at 3:30 AM'),
  };
};

const fdSummary = async () => {
  const [history, active] = await Promise.all([
    creditHistory('fd_interest_calculations'),
    db.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(fd_balance), 0) AS total_value
       FROM fixeddeposit
       WHERE fd_status = 'Active'`
    ),
  ]);
  return {
    monthly_interest: history.monthly_interest,
    active_fds: {
      count: active.rows[0].count,
      total_value: parseFloat(active.rows[0].total_value) || 0,
    },
    recent_periods: history.recent_periods,
    next_scheduled_run: describeSchedule(config.interest.fdCron, '0 3 * * *', 'Daily at 3:00 AM'),
  };
};

module.exports = { processDailyFDInterest, processDailySavingsInterest, savingsSummary, fdSummary };
