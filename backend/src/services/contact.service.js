// Customers, employees and branches all store their contact details in the shared contact table

const createContact = async (client, type, { contact_no_1, contact_no_2, address, email }) => {
  const result = await client.query(
    `INSERT INTO contact (type, contact_no_1, contact_no_2, address, email)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING contact_id`,
    [type, contact_no_1, contact_no_2 || null, address, email]
  );
  return result.rows[0].contact_id;
};

const updateContact = (client, contactId, { contact_no_1, contact_no_2, address, email }) =>
  client.query(
    `UPDATE contact SET contact_no_1 = $1, contact_no_2 = $2, address = $3, email = $4
     WHERE contact_id = $5`,
    [contact_no_1, contact_no_2 || null, address, email, contactId]
  );

module.exports = { createContact, updateContact };
