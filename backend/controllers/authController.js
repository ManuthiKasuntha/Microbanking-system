const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { sendDbError } = require('../utils/dbError');

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Username and password are required'
    });
  }

  const client = await pool.connect();

  try {
    const query = 'SELECT * FROM employee WHERE username = $1';
    const result = await client.query(query, [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username or password'
      });
    }

    const user = result.rows[0];
    
    if (user.employee_status && user.employee_status !== 'Active') {
      return res.status(403).json({
        status: 'error',
        message: 'Account is inactive. Please contact an administrator.'
      });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username or password'
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not set in environment');
      return res.status(500).json({ status: 'error', message: 'Server configuration error' });
    }
    const token = jwt.sign(
      { id: user.employee_id, role: user.role },
      secret,
      { expiresIn: '1h' }
    );

    res.json({
      status: 'success',
      token,
      user: {
        id: user.employee_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;

  try {
    const result = await pool.query('SELECT password FROM employee WHERE employee_id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(current_password, result.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ status: 'error', message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE employee SET password = $1 WHERE employee_id = $2', [hashedPassword, req.user.id]);

    res.json({ status: 'success', message: 'Password changed successfully' });
  } catch (error) {
    return sendDbError(res, error);
  }
};
