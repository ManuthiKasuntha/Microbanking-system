const { query, rules } = require('./common');

const validateBranchTransactionsQuery = rules(
  query('start').optional().isISO8601().withMessage('start must be a date (YYYY-MM-DD)'),
  query('end').optional().isISO8601().withMessage('end must be a date (YYYY-MM-DD)'),
);

module.exports = { validateBranchTransactionsQuery };
