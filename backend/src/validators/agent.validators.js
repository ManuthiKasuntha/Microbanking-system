const {
  PATTERNS, NIC_MESSAGE, body, rules, idParam, positiveId, personName, nicField, gender, dateOfBirth, contactFields,
} = require('./common');

const customerFields = () => [
  personName('first_name', 'First name'),
  personName('last_name', 'Last name'),
  nicField(),
  gender(),
  dateOfBirth(),
  contactFields(),
];

const validateCustomerRegistration = rules(customerFields());
const validateCustomerUpdate = rules(idParam('id', 'Customer ID'), customerFields());
const validateCustomerContactUpdate = rules(idParam('id', 'Customer ID'), contactFields());

const validateAccountCreation = rules(
  positiveId('customer_id', 'Customer'),
  positiveId('saving_plan_id', 'Saving plan'),
  positiveId('branch_id', 'Branch'),
  body('initial_deposit')
    .isFloat({ min: 0, max: 9999999999.99 }).withMessage('Initial deposit must be 0 or more')
    .toFloat(),
  body('joint_holders').optional().isArray({ max: 5 }).withMessage('Joint holders must be a list of customer IDs'),
  body('joint_holders.*').isInt({ min: 1 }).withMessage('Each joint holder must be a valid customer ID').toInt(),
);

const validateAccountDeactivation = rules(
  positiveId('account_id', 'Account'),
  body('reason').optional().trim().isLength({ max: 50 }).withMessage('Reason must be at most 50 characters'),
);

const validatePlanChange = rules(
  positiveId('account_id', 'Account'),
  positiveId('new_saving_plan_id', 'New saving plan'),
  body('reason')
    .trim()
    .notEmpty().withMessage('A reason is required')
    .isLength({ max: 200 }).withMessage('Reason must be at most 200 characters'),
  body('new_nic').optional({ checkFalsy: true }).trim().matches(PATTERNS.nic).withMessage(NIC_MESSAGE),
);

const validateTransaction = rules(
  positiveId('account_id', 'Account'),
  body('transaction_type').isIn(['Deposit', 'Withdrawal']).withMessage('Transaction type must be Deposit or Withdrawal'),
  body('amount')
    .isFloat({ gt: 0, max: 9999999999.99 }).withMessage('Amount must be greater than 0')
    .toFloat(),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 100 }).withMessage('Description must be at most 100 characters'),
);

const validateFixedDeposit = rules(
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
);

const validateFdDeactivation = rules(positiveId('fd_id', 'Fixed deposit'));

module.exports = {
  validateCustomerRegistration,
  validateCustomerUpdate,
  validateCustomerContactUpdate,
  validateAccountCreation,
  validateAccountDeactivation,
  validatePlanChange,
  validateTransaction,
  validateFixedDeposit,
  validateFdDeactivation,
};
