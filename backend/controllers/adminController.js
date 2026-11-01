const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { sendDbError } = require('../utils/dbError');

exports.registerEmployee = async (req, res) => {
  const { 
    role, 
    username, 
    password, 
    first_name, 
    last_name, 
    nic, 
    gender, 
    date_of_birth, 
    branch_id,
    contact_no_1,
    contact_no_2,
    address,
    email
  } = req.body;

  if (!username || !password || !first_name || !last_name || !nic || !gender || !date_of_birth || !branch_id) {
    return res.status(400).json({
      status: 'error',
      message: 'All basic fields are required'
    });
  }

  if (!contact_no_1 || !address || !email) {
    return res.status(400).json({
      status: 'error',
      message: 'All contact fields are required'
    });
  }

  // 18+ age rule is enforced by DB trigger trg_employee_min_age

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const contactResult = await client.query(
      `INSERT INTO contact (type, contact_no_1, contact_no_2, address, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING contact_id`,
      ['employee', contact_no_1, contact_no_2 || null, address, email]
    );
    
    const contact_id = contactResult.rows[0].contact_id;

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await client.query(
      `INSERT INTO employee (role, username, password, first_name, last_name, nic, gender, date_of_birth, branch_id, contact_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING employee_id`,
      [role, username, hashedPassword, first_name, last_name, nic, gender, date_of_birth, branch_id, contact_id]
    );

    await client.query('COMMIT');
    
    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      employee_id: insertResult.rows[0].employee_id,
      contact_id: contact_id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database error:', error);
    // 23505 = unique_violation (duplicate username)
    if (error && error.code === '23505' && String(error.detail || '').includes('(username)')) {
      return res.status(409).json({
        status: 'error',
        message: 'Username already exists'
      });
    }
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.getUsers = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT e.employee_id, e.username, e.first_name, e.last_name, e.role, e.nic, e.gender, e.date_of_birth,
              e.branch_id, e.contact_id, e.employee_status, e.created_at,
              c.contact_no_1, c.contact_no_2, c.address, c.email
       FROM employee e
       LEFT JOIN contact c ON e.contact_id = c.contact_id
       ORDER BY e.created_at DESC`
    );
    
    res.json({
      status: 'success',
      users: result.rows
    });
  } catch (error) {
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, role, branch_id, contact_no_1, contact_no_2, address, email } = req.body;

  if (Number(id) === Number(req.user.id) && role !== 'Admin') {
    return res.status(400).json({ status: 'error', message: 'You cannot remove your own Admin role.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT contact_id FROM employee WHERE employee_id = $1 FOR UPDATE', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    await client.query(
      `UPDATE employee SET first_name = $1, last_name = $2, role = $3, branch_id = $4
       WHERE employee_id = $5`,
      [first_name, last_name, role, branch_id, id]
    );
    await client.query(
      `UPDATE contact SET contact_no_1 = $1, contact_no_2 = $2, address = $3, email = $4
       WHERE contact_id = $5`,
      [contact_no_1, contact_no_2 || null, address, email, existing.rows[0].contact_id]
    );

    await client.query('COMMIT');
    res.json({ status: 'success', message: 'User updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    if (req.user && parseInt(id, 10) === parseInt(req.user.id, 10)) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot deactivate your own account.'
      });
    }

    const userRes = await client.query('SELECT employee_status FROM employee WHERE employee_id = $1', [id]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    await client.query('CALL proc_deactivate_employee($1, $2)', [id, req.user?.id]);

    res.json({ status: 'success', message: 'User deactivated successfully' });
  } catch (error) {
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const client = await pool.connect();

  try {
    if (!status || !['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status. Use Active or Inactive.' });
    }
    if (status === 'Inactive') {
      await client.query('CALL proc_deactivate_employee($1, $2)', [id, req.user?.id]);
    } else {
      await client.query('CALL proc_activate_employee($1)', [id]);
    }

    res.json({ status: 'success', message: `User ${status === 'Active' ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.getBranches = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        b.branch_id,
        b.name,
        b.created_at,
        c.contact_id,
        c.contact_no_1,
        c.contact_no_2,
        c.address,
        c.email
      FROM branch b
      JOIN contact c ON b.contact_id = c.contact_id
      ORDER BY b.created_at DESC
    `);
    
    res.json({
      status: 'success',
      branches: result.rows
    });
  } catch (error) {
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.createBranch = async (req, res) => {
  const { name, contact_no_1, contact_no_2, address, email } = req.body;

  if (!name || !contact_no_1 || !address || !email) {
    return res.status(400).json({
      status: 'error',
      message: 'All required fields must be provided'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingByName = await client.query(
      'SELECT 1 FROM branch WHERE LOWER(name) = LOWER($1) LIMIT 1',
      [name]
    );
    if (existingByName.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'Branch name already exists'
      });
    }

    const contactResult = await client.query(
      `INSERT INTO contact (type, contact_no_1, contact_no_2, address, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING contact_id`,
      ['branch', contact_no_1, contact_no_2 || null, address, email]
    );

    const contactId = contactResult.rows[0].contact_id;

    const branchResult = await client.query(
      `INSERT INTO branch (name, contact_id)
       VALUES ($1, $2)
       RETURNING branch_id`,
      [name, contactId]
    );

    const newBranchId = branchResult.rows[0].branch_id;

    await client.query('COMMIT');
    
    res.status(201).json({
      status: 'success',
      message: 'Branch created successfully',
      branch_id: newBranchId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.updateBranch = async (req, res) => {
  const { id } = req.params;
  const { name, contact_no_1, contact_no_2, address, email } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT contact_id FROM branch WHERE branch_id = $1 FOR UPDATE', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Branch not found' });
    }

    const duplicate = await client.query(
      'SELECT 1 FROM branch WHERE LOWER(name) = LOWER($1) AND branch_id <> $2 LIMIT 1',
      [name, id]
    );
    if (duplicate.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ status: 'error', message: 'Branch name already exists' });
    }

    await client.query('UPDATE branch SET name = $1 WHERE branch_id = $2', [name, id]);
    await client.query(
      `UPDATE contact SET contact_no_1 = $1, contact_no_2 = $2, address = $3, email = $4
       WHERE contact_id = $5`,
      [contact_no_1, contact_no_2 || null, address, email, existing.rows[0].contact_id]
    );

    await client.query('COMMIT');
    res.json({ status: 'success', message: 'Branch updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.deleteBranch = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const branchResult = await client.query('SELECT contact_id FROM branch WHERE branch_id = $1', [id]);
    if (branchResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: 'error',
        message: 'Branch not found'
      });
    }

    const contactId = branchResult.rows[0].contact_id;

    const employeesCheck = await client.query('SELECT COUNT(*) as count FROM employee WHERE branch_id = $1', [id]);
    if (parseInt(employeesCheck.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete branch with assigned employees. Reassign employees first.'
      });
    }

    const accountsCheck = await client.query('SELECT COUNT(*) as count FROM account WHERE branch_id = $1', [id]);
    if (parseInt(accountsCheck.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete branch with associated accounts. Transfer accounts first.'
      });
    }

    await client.query('DELETE FROM branch WHERE branch_id = $1', [id]);
    
    await client.query('DELETE FROM contact WHERE contact_id = $1', [contactId]);

    await client.query('COMMIT');
    
    res.json({
      status: 'success',
      message: 'Branch deleted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.getAgentTransactionsReport = async (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({
      status: 'error',
      message: 'startDate and endDate are required'
    });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        e.employee_id,
        e.first_name || ' ' || e.last_name AS employee_name,
        COUNT(v.transaction_id) AS total_transactions,
        COALESCE(SUM(v.deposit_amount), 0) AS total_deposits,
        COALESCE(SUM(v.withdrawal_amount), 0) AS total_withdrawals,
        COALESCE(SUM(v.net_value), 0) AS net_value
      FROM employee e
      LEFT JOIN v_transaction_enriched v ON e.employee_id = v.employee_id
        AND DATE(v.time) BETWEEN $1 AND $2
      WHERE e.role = 'Agent'
      GROUP BY e.employee_id, e.first_name, e.last_name
      ORDER BY total_transactions DESC
    `, [startDate, endDate]);

    res.json({
      status: 'success',
      data: result.rows
    });
  } catch (error) {
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.getAccountSummariesReport = async (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({
      status: 'error',
      message: 'startDate and endDate are required'
    });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        a.account_id,
        ac.customer_names,
        COUNT(v.transaction_id) AS transaction_count,
        COALESCE(SUM(v.deposit_amount), 0) AS total_deposits,
        COALESCE(SUM(v.withdrawal_amount), 0) AS total_withdrawals,
        a.balance AS current_balance
      FROM account a
      JOIN v_account_customers ac ON ac.account_id = a.account_id
      LEFT JOIN v_transaction_enriched v ON a.account_id = v.account_id
        AND DATE(v.time) BETWEEN $1 AND $2
      WHERE a.account_status = 'Active'
      GROUP BY a.account_id, a.balance, ac.customer_names
      ORDER BY a.account_id
    `, [startDate, endDate]);

    res.json({
      status: 'success',
      data: result.rows
    });
  } catch (error) {
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.getActiveFDsReport = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT *
      FROM v_active_fd_overview
      ORDER BY open_date DESC
    `);

    res.json({
      status: 'success',
      data: result.rows
    });
  } catch (error) {
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.getInterestSummaryReport = async (req, res) => {
  const { month, year } = req.query;
  
  if (!month || !year) {
    return res.status(400).json({
      status: 'error',
      message: 'month and year are required'
    });
  }

  const client = await pool.connect();
  try {
    const summary = await client.query(`
      SELECT plan_type, account_type, total_interest, account_count, average_interest
      FROM v_monthly_interest_summary
      WHERE month = $1 AND year = $2
    `, [month, year]);
    res.json({
      status: 'success',
      data: summary.rows
    });
  } catch (error) {
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.getCustomerActivityReport = async (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({
      status: 'error',
      message: 'startDate and endDate are required'
    });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        v.customer_id,
        v.customer_name,
        COALESCE(SUM(v.deposit_amount), 0) AS total_deposits,
        COALESCE(SUM(v.withdrawal_amount), 0) AS total_withdrawals,
        COALESCE(SUM(v.net_value), 0) AS net_balance,
        COUNT(DISTINCT v.account_id) AS account_count,
        MAX(v.transaction_date) AS last_activity
      FROM v_customer_transaction_enriched v
      WHERE v.transaction_date BETWEEN $1 AND $2
      GROUP BY v.customer_id, v.customer_name
      HAVING COUNT(v.transaction_id) > 0
      ORDER BY net_balance DESC
    `, [startDate, endDate]);

    res.json({
      status: 'success',
      data: result.rows
    });
  } catch (error) {
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.getSavingsInterestSummary = async (req, res) => {
  const client = await pool.connect();
  try {
    const monthlyRes = await client.query(
      `SELECT COALESCE(SUM(interest_amount), 0) AS total
       FROM savings_interest_calculations
       WHERE status = 'credited'
         AND date_trunc('month', credited_at) = date_trunc('month', now())`
    );

    const activeRes = await client.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(balance), 0)::numeric AS total_balance
       FROM account
       WHERE account_status = 'Active' AND saving_plan_id IS NOT NULL`
    );

    const recentRes = await client.query(
      `WITH per_day AS (
         SELECT calculation_date::date AS calc_date,
                MAX(credited_at) AS processed_at
         FROM savings_interest_calculations
         WHERE status = 'credited'
         GROUP BY calculation_date
       )
       SELECT 
         (calc_date - INTERVAL '30 days')::date AS period_start,
         calc_date AS period_end,
         processed_at
       FROM per_day
       ORDER BY calc_date DESC
       LIMIT 5`
    );

    const debug = process.env.INTEREST_CRON_DEBUG === '1';
    const cronExpr = debug ? '* * * * *' : (process.env.SAVINGS_INTEREST_CRON || '30 3 * * *');
    let nextScheduledRun = '';
    if (debug) {
      nextScheduledRun = 'Every minute (DEBUG)';
    } else if (cronExpr === '30 3 * * *') {
      nextScheduledRun = 'Daily at 3:30 AM';
    } else {
      nextScheduledRun = `Cron: ${cronExpr}`;
    }

    res.json({
      monthly_interest: parseFloat(monthlyRes.rows[0].total) || 0,
      active_savings_accounts: {
        count: activeRes.rows[0].count || 0,
        total_balance: parseFloat(activeRes.rows[0].total_balance) || 0
      },
      recent_periods: recentRes.rows.map(r => ({
        period_start: r.period_start,
        period_end: r.period_end,
        processed_at: r.processed_at
      })),
      next_scheduled_run: nextScheduledRun
    });
  } catch (error) {
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.getFDInterestSummary = async (req, res) => {
  const client = await pool.connect();
  try {
    const monthlyRes = await client.query(
      `SELECT COALESCE(SUM(interest_amount), 0) AS total
       FROM fd_interest_calculations
       WHERE status = 'credited'
         AND date_trunc('month', credited_at) = date_trunc('month', now())`
    );

    const activeRes = await client.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(fd_balance), 0)::numeric AS total_value
       FROM fixeddeposit
       WHERE fd_status = 'Active'`
    );

    const recentRes = await client.query(
      `WITH per_day AS (
         SELECT calculation_date::date AS calc_date,
                MAX(credited_at) AS processed_at
         FROM fd_interest_calculations
         WHERE status = 'credited'
         GROUP BY calculation_date
       )
       SELECT 
         (calc_date - INTERVAL '30 days')::date AS period_start,
         calc_date AS period_end,
         processed_at
       FROM per_day
       ORDER BY calc_date DESC
       LIMIT 5`
    );

    const debug = process.env.INTEREST_CRON_DEBUG === '1';
    const cronExpr = debug ? '* * * * *' : (process.env.FD_INTEREST_CRON || '0 3 * * *');
    let nextScheduledRun = '';
    if (debug) {
      nextScheduledRun = 'Every minute (DEBUG)';
    } else if (cronExpr === '0 3 * * *') {
      nextScheduledRun = 'Daily at 3:00 AM';
    } else {
      nextScheduledRun = `Cron: ${cronExpr}`;
    }

    res.json({
      monthly_interest: parseFloat(monthlyRes.rows[0].total) || 0,
      active_fds: {
        count: activeRes.rows[0].count || 0,
        total_value: parseFloat(activeRes.rows[0].total_value) || 0
      },
      recent_periods: recentRes.rows.map(r => ({
        period_start: r.period_start,
        period_end: r.period_end,
        processed_at: r.processed_at
      })),
      next_scheduled_run: nextScheduledRun
    });
  } catch (error) {
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};