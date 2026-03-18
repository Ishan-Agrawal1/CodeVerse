const { validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors from express-validator
 * Should be used after validation rules in route definitions
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Extract the first error message for a cleaner response
    const firstError = errors.array()[0];
    return res.status(400).json({
      success: false,
      error: firstError.msg,
      field: firstError.param,
      errors: errors.array() // Include all errors for debugging
    });
  }

  next();
};

module.exports = { handleValidationErrors };
