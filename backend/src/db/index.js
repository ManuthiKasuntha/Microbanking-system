const { pool } = require('./pool');

const query = (text, params) => pool.query(text, params);

// Runs fn on one client inside BEGIN/COMMIT; any error thrown inside rolls the whole unit back
const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Read by the DB audit triggers to record who made a change
const setActor = (client, employeeId) =>
  client.query("SELECT set_config('app.actor_employee_id', $1, true)", [String(employeeId)]);

module.exports = { pool, query, withTransaction, setActor };
