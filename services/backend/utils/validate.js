const { validationResult } = require('express-validator');
const { ValidationError } = require('./errors');

// Runs after express-validator chains; throws a 422 with field details.
module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return next(new ValidationError('The request is invalid.', details));
};
