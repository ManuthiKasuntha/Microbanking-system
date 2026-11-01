const {
  PATTERNS, body, query, rules, idParam, positiveId, personName, nicField, gender, dateOfBirth, contactFields, dateRange,
} = require('./common');

const employeeCore = () => [
  personName('first_name', 'First name'),
  personName('last_name', 'Last name'),
  body('role').isIn(['Admin', 'Manager', 'Agent']).withMessage('Role must be Admin, Manager or Agent'),
  positiveId('branch_id', 'Branch'),
];

const validateEmployeeRegistration = rules(
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters')
    .matches(PATTERNS.username).withMessage('Username can only contain letters, numbers, dots and underscores'),
  body('password')
    .matches(PATTERNS.password).withMessage('Password must be at least 8 characters and contain a letter and a number'),
  employeeCore(),
  nicField(),
  gender(),
  dateOfBirth(),
  contactFields(),
);

const validateEmployeeUpdate = rules(idParam('id', 'User ID'), employeeCore(), contactFields());

const validateUserStatus = rules(
  idParam('id', 'User ID'),
  body('status').isIn(['Active', 'Inactive']).withMessage('Status must be Active or Inactive'),
);

const branchFields = () => [
  body('name')
    .trim()
    .notEmpty().withMessage('Branch name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Branch name must be 2-50 characters'),
  contactFields(),
];

const validateBranch = rules(branchFields());
const validateBranchUpdate = rules(idParam('id', 'Branch ID'), branchFields());

const validateDateRange = rules(dateRange('startDate', 'endDate'));

const validateInterestSummary = rules(
  query('month').isInt({ min: 1, max: 12 }).withMessage('Month must be 1-12'),
  query('year').isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100'),
);

module.exports = {
  validateEmployeeRegistration,
  validateEmployeeUpdate,
  validateUserStatus,
  validateBranch,
  validateBranchUpdate,
  validateDateRange,
  validateInterestSummary,
};
