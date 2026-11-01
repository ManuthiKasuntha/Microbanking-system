const db = require('../db');
const { badRequest } = require('../errors/AppError');

// Balance rules (minimum balance, no overdraft) are enforced by create_transaction_with_validation
const processTransaction = (employeeId, { account_id, transaction_type, amount, description }) =>
  db.withTransaction(async (client) => {
    await db.setActor(client, employeeId);

    const account = await client.query(
      "SELECT 1 FROM account WHERE account_id = $1 AND account_status = 'Active'",
      [account_id]
    );
    if (account.rows.length === 0) throw badRequest('Account not found or closed');

    const tx = await client.query(
      'SELECT create_transaction_with_validation($1, $2, $3, $4, $5) AS transaction_id',
      [transaction_type, amount, description, account_id, employeeId]
    );
    const balance = await client.query('SELECT balance FROM account WHERE account_id = $1', [account_id]);

    return { transaction_id: tx.rows[0].transaction_id, new_balance: parseFloat(balance.rows[0].balance) };
  });

const listRecent = async (limit = 50) => {
  const result = await db.query(
    `SELECT transaction_id, transaction_type, amount, time, description, account_id, employee_id
     FROM transaction
     ORDER BY time DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
};

const listByEmployee = async (employeeId, limit = 50) => {
  const result = await db.query(
    `SELECT transaction_id, transaction_type, amount, time, description, account_id, employee_id
     FROM transaction
     WHERE employee_id = $1
     ORDER BY time DESC
     LIMIT $2`,
    [employeeId, limit]
  );
  return result.rows;
};

module.exports = { processTransaction, listRecent, listByEmployee };
