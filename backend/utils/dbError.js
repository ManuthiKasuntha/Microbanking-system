// Maps PostgreSQL errors to HTTP responses. Messages raised by our own triggers/functions (P0001)
// are written for end users, so they are passed through; anything unexpected becomes a generic 500.
const PG_ERRORS = {
  P0001: { status: 400 },
  22023: { status: 400 },
  '02000': { status: 404 },
  23505: { status: 409, message: 'A record with the same unique value already exists' },
  23503: { status: 409, message: 'This record is linked to other records and cannot be changed' },
  23514: { status: 400, message: 'The data violates a database rule' },
  23502: { status: 400, message: 'A required field is missing' },
  '22P02': { status: 400, message: 'Invalid input value' },
  22001: { status: 400, message: 'A value is too long' },
  22003: { status: 400, message: 'A number is out of range' },
  22007: { status: 400, message: 'Invalid date' },
  22008: { status: 400, message: 'Invalid date' },
};

const sendDbError = (res, error, fallback = 'Database error') => {
  const mapped = error && PG_ERRORS[error.code];
  if (mapped) {
    return res.status(mapped.status).json({ status: 'error', message: mapped.message || error.message });
  }
  console.error(`${fallback}:`, error);
  return res.status(500).json({ status: 'error', message: fallback });
};

module.exports = { sendDbError };
