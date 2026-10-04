const logger = require('./logger');
const { AppError, NotFoundError } = require('./errors');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const notFoundHandler = (req, res, next) => next(new NotFoundError('Route not found'));

// eslint-disable-next-line no-unused-vars
const globalErrorHandler = (err, req, res, next) => {
  let error = err;

  if (err.type === 'entity.too.large') error = new AppError('Request body too large', 413);
  else if (err.type === 'entity.parse.failed') error = new AppError('Malformed JSON body', 400);
  else if (err.name === 'CastError') error = new AppError('Invalid identifier', 400);
  else if (err.name === 'ValidationError' && err.errors) error = new AppError('Invalid input', 400);
  else if (err.code === 11000) error = new AppError('Resource already exists', 409);
  else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = new AppError('Invalid or expired token', 401);
  }

  const status = error.statusCode || 500;
  if (status >= 500) (req.log || logger).error({ err }, 'Unhandled error');

  res.status(status).json({
    success: false,
    error: error.isOperational ? error.message : 'Internal server error',
    ...(error.details ? { details: error.details } : {})
  });
};

module.exports = { asyncHandler, notFoundHandler, globalErrorHandler };
