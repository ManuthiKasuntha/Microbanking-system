const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../db');
const { badRequest, unauthorized, forbidden, notFound } = require('../errors/AppError');

const SALT_ROUNDS = 10;

const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

const login = async (username, password) => {
  const result = await db.query('SELECT * FROM employee WHERE username = $1', [username]);
  const user = result.rows[0];
  if (!user) throw unauthorized('Invalid username or password');

  if (user.employee_status && user.employee_status !== 'Active') {
    throw forbidden('Account is inactive. Please contact an administrator.');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw unauthorized('Invalid username or password');

  const token = jwt.sign({ id: user.employee_id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

  return {
    token,
    user: {
      id: user.employee_id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
    },
  };
};

const changePassword = async (employeeId, currentPassword, newPassword) => {
  const result = await db.query('SELECT password FROM employee WHERE employee_id = $1', [employeeId]);
  if (result.rows.length === 0) throw notFound('User not found');

  const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
  if (!isMatch) throw badRequest('Current password is incorrect');

  await db.query('UPDATE employee SET password = $1 WHERE employee_id = $2', [await hashPassword(newPassword), employeeId]);
};

module.exports = { login, changePassword, hashPassword };
