const { body, param, query, validationResult } = require('express-validator');

// Keep these patterns in sync with frontend/src/utils/validation.ts and the DB CHECK constraints
const PATTERNS = {
  nic: /^([0-9]{12}|[0-9]{9}V)$/,
  phone: /^\+?[0-9]{9,14}$/,
  name: /^[A-Za-z][A-Za-z .'-]*$/,
  username: /^[A-Za-z0-9_.]+$/,
  password: /^(?=.*[A-Za-z])(?=.*[0-9]).{8,}$/,
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array({ onlyFirstError: true }).map((err) => ({ field: err.param, message: err.msg }));
    return res.status(400).json({
      status: 'error',
      message: details[0].message,
      errors: details,
    });
  }
  next();
};

const idParam = (name = 'id', label = 'ID') =>
  param(name).isInt({ min: 1 }).withMessage(`${label} must be a positive integer`).toInt();

const positiveId = (field, label) =>
  body(field).isInt({ min: 1 }).withMessage(`${label} is required`).toInt();

const personName = (field, label) =>
  body(field)
    .trim()
    .notEmpty().withMessage(`${label} is required`)
    .isLength({ min: 2, max: 50 }).withMessage(`${label} must be 2-50 characters`)
    .matches(PATTERNS.name).withMessage(`${label} can only contain letters, spaces, apostrophes and hyphens`);

const nicField = (field = 'nic') =>
  body(field)
    .trim()
    .notEmpty().withMessage('NIC/Birth Certificate number is required')
    .matches(PATTERNS.nic).withMessage('NIC must be 12 digits, or 9 digits followed by V');

const dateOfBirth = (field = 'date_of_birth') =>
  body(field)
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601({ strict: true }).withMessage('Date of birth must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      const dob = new Date(value);
      if (dob > new Date()) throw new Error('Date of birth cannot be in the future');
      if (dob.getFullYear() < 1900) throw new Error('Date of birth is not realistic');
      return true;
    });

const gender = (field = 'gender') =>
  body(field).isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female or Other');

const contactFields = ({ optional = false } = {}) => {
  const maybe = (chain) => (optional ? chain.optional() : chain);
  return [
    maybe(body('contact_no_1'))
      .trim()
      .notEmpty().withMessage('Primary contact number is required')
      .matches(PATTERNS.phone).withMessage('Contact number must be 9-14 digits, optionally starting with +'),
    body('contact_no_2')
      .optional({ checkFalsy: true })
      .trim()
      .matches(PATTERNS.phone).withMessage('Secondary contact number must be 9-14 digits, optionally starting with +'),
    maybe(body('address'))
      .trim()
      .notEmpty().withMessage('Address is required')
      .isLength({ min: 5, max: 100 }).withMessage('Address must be 5-100 characters'),
    maybe(body('email'))
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Email address is not valid')
      .isLength({ max: 50 }).withMessage('Email must be at most 50 characters'),
  ];
};

const dateRange = (startField, endField) => [
  query(startField).isISO8601().withMessage(`${startField} must be a date (YYYY-MM-DD)`),
  query(endField)
    .isISO8601().withMessage(`${endField} must be a date (YYYY-MM-DD)`)
    .custom((end, { req }) => {
      if (new Date(end) < new Date(req.query[startField])) throw new Error(`${endField} must be on or after ${startField}`);
      return true;
    }),
];

// ---- Auth
exports.validateLogin = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

exports.validateChangePassword = [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password')
    .matches(PATTERNS.password).withMessage('New password must be at least 8 characters and contain a letter and a number')
    .custom((value, { req }) => {
      if (value === req.body.current_password) throw new Error('New password must be different from the current password');
      return true;
    }),
  validate,
];

// ---- Admin: employees
const employeeCore = [
  personName('first_name', 'First name'),
  personName('last_name', 'Last name'),
  body('role').isIn(['Admin', 'Manager', 'Agent']).withMessage('Role must be Admin, Manager or Agent'),
  positiveId('branch_id', 'Branch'),
];

exports.validateEmployeeRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters')
    .matches(PATTERNS.username).withMessage('Username can only contain letters, numbers, dots and underscores'),
  body('password')
    .matches(PATTERNS.password).withMessage('Password must be at least 8 characters and contain a letter and a number'),
  ...employeeCore,
  nicField(),
  gender(),
  dateOfBirth(),
  ...contactFields(),
  validate,
];

exports.validateEmployeeUpdate = [idParam('id', 'User ID'), ...employeeCore, ...contactFields(), validate];

exports.validateUserStatus = [
  idParam('id', 'User ID'),
  body('status').isIn(['Active', 'Inactive']).withMessage('Status must be Active or Inactive'),
  validate,
];

// ---- Admin: branches
const branchFields = [
  body('name')
    .trim()
    .notEmpty().withMessage('Branch name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Branch name must be 2-50 characters'),
  ...contactFields(),
];

exports.validateBranch = [...branchFields, validate];
exports.validateBranchUpdate = [idParam('id', 'Branch ID'), ...branchFields, validate];

// ---- Admin: reports
exports.validateDateRange = [...dateRange('startDate', 'endDate'), validate];
exports.validateInterestSummary = [
  query('month').isInt({ min: 1, max: 12 }).withMessage('Month must be 1-12'),
  query('year').isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100'),
  validate,
];

// ---- Agent: customers
exports.validateCustomerRegistration = [
  personName('first_name', 'First name'),
  personName('last_name', 'Last name'),
  nicField(),
  gender(),
  dateOfBirth(),
  ...contactFields(),
  validate,
];

exports.validateCustomerUpdate = [
  idParam('id', 'Customer ID'),
  personName('first_name', 'First name'),
  personName('last_name', 'Last name'),
  nicField(),
  gender(),
  dateOfBirth(),
  ...contactFields(),
  validate,
];

exports.validateCustomerContactUpdate = [idParam('id', 'Customer ID'), ...contactFields(), validate];

// ---- Agent: accounts
exports.validateAccountCreation = [
  positiveId('customer_id', 'Customer'),
  positiveId('saving_plan_id', 'Saving plan'),
  positiveId('branch_id', 'Branch'),
  body('initial_deposit')
    .isFloat({ min: 0, max: 9999999999.99 }).withMessage('Initial deposit must be 0 or more')
    .toFloat(),
  body('joint_holders').optional().isArray({ max: 5 }).withMessage('Joint holders must be a list of customer IDs'),
  body('joint_holders.*').isInt({ min: 1 }).withMessage('Each joint holder must be a valid customer ID').toInt(),
  validate,
];

exports.validateAccountDeactivation = [
  positiveId('account_id', 'Account'),
  body('reason').optional().trim().isLength({ max: 50 }).withMessage('Reason must be at most 50 characters'),
  validate,
];

exports.validatePlanChange = [
  positiveId('account_id', 'Account'),
  positiveId('new_saving_plan_id', 'New saving plan'),
  body('reason')
    .trim()
    .notEmpty().withMessage('A reason is required')
    .isLength({ max: 200 }).withMessage('Reason must be at most 200 characters'),
  body('new_nic').optional({ checkFalsy: true }).trim().matches(PATTERNS.nic).withMessage('NIC must be 12 digits, or 9 digits followed by V'),
  validate,
];

// ---- Agent: transactions
exports.validateTransaction = [
  positiveId('account_id', 'Account'),
  body('transaction_type').isIn(['Deposit', 'Withdrawal']).withMessage('Transaction type must be Deposit or Withdrawal'),
  body('amount')
    .isFloat({ gt: 0, max: 9999999999.99 }).withMessage('Amount must be greater than 0')
    .toFloat(),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 100 }).withMessage('Description must be at most 100 characters'),
  validate,
];

// ---- Agent: fixed deposits
exports.validateFixedDeposit = [
  positiveId('customer_id', 'Customer'),
  positiveId('account_id', 'Savings account'),
  positiveId('fd_plan_id', 'FD plan'),
  body('principal_amount')
    .isFloat({ gt: 0, max: 9999999999999.99 }).withMessage('Principal amount must be greater than 0')
    .toFloat(),
  body('auto_renewal_status')
    .optional()
    .custom((value) => typeof value === 'boolean' || ['true', 'false'].includes(String(value).toLowerCase()))
    .withMessage('Auto renewal must be true or false'),
  validate,
];

exports.validateFdDeactivation = [positiveId('fd_id', 'Fixed deposit'), validate];

// ---- Shared params
exports.validateIdParam = (name = 'id', label = 'ID') => [idParam(name, label), validate];
exports.validateNicParam = [
  param('nic').trim().matches(PATTERNS.nic).withMessage('NIC must be 12 digits, or 9 digits followed by V'),
  validate,
];
exports.validateBranchTransactionsQuery = [
  query('start').optional().isISO8601().withMessage('start must be a date (YYYY-MM-DD)'),
  query('end').optional().isISO8601().withMessage('end must be a date (YYYY-MM-DD)'),
  validate,
];

exports.PATTERNS = PATTERNS;
