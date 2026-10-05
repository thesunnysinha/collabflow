const logger = require('./logger');
const { AppError, NotFoundError } = require('./errors');
const { failure } = require('./envelope');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const notFoundHandler = (req, res, next) => next(new NotFoundError('Not found.'));

// eslint-disable-next-line no-unused-vars
const globalErrorHandler = (err, req, res, next) => {
  let error = err;

  if (err.type === 'entity.too.large') error = new AppError('Request body too large', 413, 'PAYLOAD_TOO_LARGE');
  else if (err.type === 'entity.parse.failed') error = new AppError('Malformed JSON body', 400, 'BAD_REQUEST');
  else if (err.name === 'CastError') error = new AppError('Invalid identifier', 422, 'VALIDATION_ERROR');
  else if (err.name === 'ValidationError' && err.errors) error = new AppError('Invalid input', 422, 'VALIDATION_ERROR');
  else if (err.code === 11000) error = new AppError('Resource already exists', 409, 'CONFLICT');
  else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
  }

  const status = error.statusCode || 500;
  if (status >= 500) (req.log || logger).error({ err }, 'Unhandled error');

  const operational = error.isOperational;
  res.status(status).json(failure(
    operational ? error.code : 'INTERNAL_ERROR',
    operational ? error.message : 'Internal server error',
    req.id,
    error.details ? { details: error.details } : {}
  ));
};

module.exports = { asyncHandler, notFoundHandler, globalErrorHandler };
