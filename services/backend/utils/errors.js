class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Invalid input', details) {
    super(message, 400);
    this.details = details;
  }
}
class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') { super(message, 401); }
}
class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource') { super(message, 403); }
}
class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(message, 404); }
}
class ConflictError extends AppError {
  constructor(message = 'Conflict') { super(message, 409); }
}

module.exports = { AppError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError };
