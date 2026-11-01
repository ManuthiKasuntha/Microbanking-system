const rateLimit = require('express-rate-limit');
const config = require('../config/env');

// Only failed attempts count, so a busy branch sharing one IP is not locked out
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.loginRateLimit,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many login attempts. Please try again in 15 minutes.' },
});

module.exports = { loginLimiter };
