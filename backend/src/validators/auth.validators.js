const { PATTERNS, body, rules } = require('./common');

const validateLogin = rules(
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
);

const validateChangePassword = rules(
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password')
    .matches(PATTERNS.password).withMessage('New password must be at least 8 characters and contain a letter and a number')
    .custom((value, { req }) => {
      if (value === req.body.current_password) throw new Error('New password must be different from the current password');
      return true;
    }),
);

module.exports = { validateLogin, validateChangePassword };
