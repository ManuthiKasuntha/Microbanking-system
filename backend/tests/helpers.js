process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.LOGIN_RATE_LIMIT = '1000';

const jwt = require('jsonwebtoken');

const tokenFor = (role, id = 1) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '5m' });

module.exports = { tokenFor };
