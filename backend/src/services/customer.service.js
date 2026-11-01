const db = require('../db');
const { badRequest, notFound } = require('../errors/AppError');
const { createContact, updateContact } = require('./contact.service');

const register = (data) =>
  db.withTransaction(async (client) => {
    const existing = await client.query('SELECT 1 FROM customer WHERE nic = $1', [data.nic]);
    if (existing.rows.length > 0) throw badRequest('Customer with this NIC already exists');

    const contactId = await createContact(client, 'customer', data);
    const { first_name, last_name, gender, nic, date_of_birth } = data;
    const result = await client.query(
      `INSERT INTO customer (first_name, last_name, gender, nic, date_of_birth, contact_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING customer_id`,
      [first_name, last_name, gender, nic, date_of_birth, contactId]
    );
    return result.rows[0].customer_id;
  });

const list = async () => {
  const result = await db.query(`
    SELECT customer_id, first_name, last_name, nic, date_of_birth
    FROM customer
    ORDER BY first_name, last_name
  `);
  return result.rows;
};

const findByNic = async (nic) => {
  const result = await db.query(
    'SELECT customer_id, first_name, last_name, nic, date_of_birth FROM customer WHERE nic = $1',
    [nic]
  );
  if (result.rows.length === 0) throw notFound('Customer not found');
  return result.rows[0];
};

const findById = async (id) => {
  const result = await db.query(
    `SELECT c.customer_id, c.first_name, c.last_name, c.gender, c.nic, c.date_of_birth,
            ct.contact_id, ct.contact_no_1, ct.contact_no_2, ct.address, ct.email
     FROM customer c
     JOIN contact ct ON c.contact_id = ct.contact_id
     WHERE c.customer_id = $1`,
    [id]
  );
  if (result.rows.length === 0) throw notFound('Customer not found');
  return result.rows[0];
};

const lockCustomer = async (client, id) => {
  const result = await client.query('SELECT contact_id, nic FROM customer WHERE customer_id = $1 FOR UPDATE', [id]);
  if (result.rows.length === 0) throw notFound('Customer not found');
  return result.rows[0];
};

// Age rules are enforced per saving plan when an account is opened or its plan changes
const update = (id, data) =>
  db.withTransaction(async (client) => {
    const current = await lockCustomer(client, id);

    if (data.nic !== current.nic) {
      const duplicate = await client.query('SELECT 1 FROM customer WHERE nic = $1 AND customer_id <> $2', [data.nic, id]);
      if (duplicate.rows.length > 0) throw badRequest('Another customer with this NIC already exists');
    }

    await updateContact(client, current.contact_id, data);
    const { first_name, last_name, gender, nic, date_of_birth } = data;
    await client.query(
      `UPDATE customer SET first_name = $1, last_name = $2, gender = $3, nic = $4, date_of_birth = $5
       WHERE customer_id = $6`,
      [first_name, last_name, gender, nic, date_of_birth, id]
    );
  });

const updateContactDetails = (id, data) =>
  db.withTransaction(async (client) => {
    const current = await lockCustomer(client, id);
    await updateContact(client, current.contact_id, data);
  });

module.exports = { register, list, findByNic, findById, update, updateContactDetails };
