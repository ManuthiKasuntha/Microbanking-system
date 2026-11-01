-- IDs below assume a fresh database (contact_id = branch_id = 1)
INSERT INTO Contact (type, contact_no_1, contact_no_2, address, email)
VALUES ('employee', '+1234567890', NULL, '123 Admin Street, City', 'admin@microbanking.com')
RETURNING contact_id;

INSERT INTO Branch (name, contact_id)
VALUES ('Main Branch', 1)
RETURNING branch_id;

INSERT INTO Employee (role, username, password, first_name, last_name, nic, gender, date_of_birth, branch_id, contact_id)
VALUES (
    'Admin',
    'admin',
    '$2a$10$z8XMweokob.ErL0iZxgw4esHMnaJjkT9UDiTEaYbqTc2ktF1dPfJ.',
    'System',
    'Administrator',
    '123456789V',
    'Other',
    '1990-01-01',
    1,
    1
)
RETURNING employee_id;

