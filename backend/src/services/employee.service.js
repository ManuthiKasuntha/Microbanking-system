const db = require('../db');
const { badRequest, notFound, conflict } = require('../errors/AppError');
const { createContact, updateContact } = require('./contact.service');
const { hashPassword } = require('./auth.service');

// The 18+ age rule is enforced by the DB trigger trg_employee_min_age
const register = (data) =>
  db.withTransaction(async (client) => {
    const contactId = await createContact(client, 'employee', data);
    const { role, username, password, first_name, last_name, nic, gender, date_of_birth, branch_id } = data;

    try {
      const result = await client.query(
        `INSERT INTO employee (role, username, password, first_name, last_name, nic, gender, date_of_birth, branch_id, contact_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING employee_id`,
        [role, username, await hashPassword(password), first_name, last_name, nic, gender, date_of_birth, branch_id, contactId]
      );
      return { employee_id: result.rows[0].employee_id, contact_id: contactId };
    } catch (error) {
      if (error.code === '23505' && String(error.detail || '').includes('(username)')) {
        throw conflict('Username already exists');
      }
      throw error;
    }
  });

const list = async () => {
  const result = await db.query(
    `SELECT e.employee_id, e.username, e.first_name, e.last_name, e.role, e.nic, e.gender, e.date_of_birth,
            e.branch_id, e.contact_id, e.employee_status, e.created_at,
            c.contact_no_1, c.contact_no_2, c.address, c.email
     FROM employee e
     LEFT JOIN contact c ON e.contact_id = c.contact_id
     ORDER BY e.created_at DESC`
  );
  return result.rows;
};

const update = (id, actorId, data) => {
  if (Number(id) === Number(actorId) && data.role !== 'Admin') {
    throw badRequest('You cannot remove your own Admin role.');
  }

  return db.withTransaction(async (client) => {
    const existing = await client.query('SELECT contact_id FROM employee WHERE employee_id = $1 FOR UPDATE', [id]);
    if (existing.rows.length === 0) throw notFound('User not found');

    const { first_name, last_name, role, branch_id } = data;
    await client.query(
      `UPDATE employee SET first_name = $1, last_name = $2, role = $3, branch_id = $4
       WHERE employee_id = $5`,
      [first_name, last_name, role, branch_id, id]
    );
    await updateContact(client, existing.rows[0].contact_id, data);
  });
};

const deactivate = async (id, actorId) => {
  if (Number(id) === Number(actorId)) throw badRequest('You cannot deactivate your own account.');

  const existing = await db.query('SELECT 1 FROM employee WHERE employee_id = $1', [id]);
  if (existing.rowCount === 0) throw notFound('User not found');

  await db.query('CALL proc_deactivate_employee($1, $2)', [id, actorId]);
};

const setStatus = (id, status, actorId) =>
  status === 'Inactive'
    ? db.query('CALL proc_deactivate_employee($1, $2)', [id, actorId])
    : db.query('CALL proc_activate_employee($1)', [id]);

module.exports = { register, list, update, deactivate, setStatus };
