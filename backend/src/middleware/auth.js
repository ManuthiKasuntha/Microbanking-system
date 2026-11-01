const jwt = require('jsonwebtoken');
const config = require('../config/env');

const unauthorized = (res, message) => res.status(401).json({ status: 'error', message });

const TOKEN_ERRORS = {
  TokenExpiredError: 'Token has expired. Please login again.',
  JsonWebTokenError: 'Invalid token',
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return unauthorized(res, 'Authorization token required');

  const token = authHeader.split(' ')[1];
  if (!token) return unauthorized(res, 'Invalid authorization format. Use: Bearer <token>');

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = { id: decoded.id, role: decoded.role };
    return next();
  } catch (error) {
    return unauthorized(res, TOKEN_ERRORS[error.name] || 'Authentication failed');
  }
};

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return unauthorized(res, 'Authentication required');
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      status: 'error',
      message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
    });
  }
  return next();
};

module.exports = { verifyToken, authorize };
