const { body, param, query, validationResult } = require('express-validator');

// Keep these patterns in sync with frontend/src/utils/validation.ts and the DB CHECK constraints
const PATTERNS = {
  nic: /^([0-9]{12}|[0-9]{9}V)$/,
  phone: /^\+?[0-9]{9,14}$/,
  name: /^[A-Za-z][A-Za-z .'-]*$/,
  username: /^[A-Za-z0-9_.]+$/,
  password: /^(?=.*[A-Za-z])(?=.*[0-9]).{8,}$/,
};

const NIC_MESSAGE = 'NIC must be 12 digits, or 9 digits followed by V';

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
  return next();
};

// Appends the result check so each export is a ready-to-use middleware chain
const rules = (...chains) => [...chains.flat(), validate];

const idParam = (name = 'id', label = 'ID') =>
  param(name).isInt({ min: 1 }).withMessage(`${label} must be a positive integer`).toInt();

const positiveId = (field, label) => body(field).isInt({ min: 1 }).withMessage(`${label} is required`).toInt();

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
    .matches(PATTERNS.nic).withMessage(NIC_MESSAGE);

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

const contactFields = () => [
  body('contact_no_1')
    .trim()
    .notEmpty().withMessage('Primary contact number is required')
    .matches(PATTERNS.phone).withMessage('Contact number must be 9-14 digits, optionally starting with +'),
  body('contact_no_2')
    .optional({ checkFalsy: true })
    .trim()
    .matches(PATTERNS.phone).withMessage('Secondary contact number must be 9-14 digits, optionally starting with +'),
  body('address')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ min: 5, max: 100 }).withMessage('Address must be 5-100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Email address is not valid')
    .isLength({ max: 50 }).withMessage('Email must be at most 50 characters'),
];

const dateRange = (startField, endField) => [
  query(startField).isISO8601().withMessage(`${startField} must be a date (YYYY-MM-DD)`),
  query(endField)
    .isISO8601().withMessage(`${endField} must be a date (YYYY-MM-DD)`)
    .custom((end, { req }) => {
      if (new Date(end) < new Date(req.query[startField])) throw new Error(`${endField} must be on or after ${startField}`);
      return true;
    }),
];

const validateIdParam = (name = 'id', label = 'ID') => rules(idParam(name, label));

const validateNicParam = rules(param('nic').trim().toUpperCase().matches(PATTERNS.nic).withMessage(NIC_MESSAGE));

module.exports = {
  PATTERNS,
  NIC_MESSAGE,
  body,
  query,
  rules,
  idParam,
  positiveId,
  personName,
  nicField,
  dateOfBirth,
  gender,
  contactFields,
  dateRange,
  validateIdParam,
  validateNicParam,
};
