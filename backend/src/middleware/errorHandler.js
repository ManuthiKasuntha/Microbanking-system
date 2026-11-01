const { AppError } = require('../errors/AppError');
const { mapPgError } = require('../errors/pgErrors');

const sendError = (res, status, message) => res.status(status).json({ status: 'error', message });

const notFoundHandler = (req, res) => sendError(res, 404, `Route ${req.originalUrl} not found`);

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) return sendError(res, err.status, err.message);
  if (err.type === 'entity.parse.failed') return sendError(res, 400, 'Request body is not valid JSON');

  const pgError = mapPgError(err);
  if (pgError) return sendError(res, pgError.status, pgError.message);

  console.error('Unhandled error:', err);
  // Body-parser errors (e.g. payload too large) carry a safe status and message
  if (err.status && err.status < 500) return sendError(res, err.status, err.message);
  return sendError(res, 500, 'Internal server error');
};

module.exports = { notFoundHandler, errorHandler };
