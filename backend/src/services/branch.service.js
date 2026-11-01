const db = require('../db');
const { badRequest, notFound, conflict } = require('../errors/AppError');
const { createContact, updateContact } = require('./contact.service');

const nameTaken = async (client, name, exceptBranchId = null) => {
  const result = await client.query(
    'SELECT 1 FROM branch WHERE LOWER(name) = LOWER($1) AND ($2::int IS NULL OR branch_id <> $2) LIMIT 1',
    [name, exceptBranchId]
  );
  return result.rows.length > 0;
};

const list = async () => {
  const result = await db.query(`
    SELECT b.branch_id, b.name, b.created_at,
           c.contact_id, c.contact_no_1, c.contact_no_2, c.address, c.email
    FROM branch b
    JOIN contact c ON b.contact_id = c.contact_id
    ORDER BY b.created_at DESC
  `);
  return result.rows;
};

const create = (data) =>
  db.withTransaction(async (client) => {
    if (await nameTaken(client, data.name)) throw badRequest('Branch name already exists');

    const contactId = await createContact(client, 'branch', data);
    const result = await client.query(
      'INSERT INTO branch (name, contact_id) VALUES ($1, $2) RETURNING branch_id',
      [data.name, contactId]
    );
    return result.rows[0].branch_id;
  });

const update = (id, data) =>
  db.withTransaction(async (client) => {
    const existing = await client.query('SELECT contact_id FROM branch WHERE branch_id = $1 FOR UPDATE', [id]);
    if (existing.rows.length === 0) throw notFound('Branch not found');
    if (await nameTaken(client, data.name, id)) throw conflict('Branch name already exists');

    await client.query('UPDATE branch SET name = $1 WHERE branch_id = $2', [data.name, id]);
    await updateContact(client, existing.rows[0].contact_id, data);
  });

const countWhere = async (client, table, branchId) => {
  const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${table} WHERE branch_id = $1`, [branchId]);
  return result.rows[0].count;
};

const remove = (id) =>
  db.withTransaction(async (client) => {
    const existing = await client.query('SELECT contact_id FROM branch WHERE branch_id = $1', [id]);
    if (existing.rows.length === 0) throw notFound('Branch not found');

    if ((await countWhere(client, 'employee', id)) > 0) {
      throw badRequest('Cannot delete branch with assigned employees. Reassign employees first.');
    }
    if ((await countWhere(client, 'account', id)) > 0) {
      throw badRequest('Cannot delete branch with associated accounts. Transfer accounts first.');
    }

    await client.query('DELETE FROM branch WHERE branch_id = $1', [id]);
    await client.query('DELETE FROM contact WHERE contact_id = $1', [existing.rows[0].contact_id]);
  });

module.exports = { list, create, update, remove };
