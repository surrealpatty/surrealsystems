// src/middlewares/validate.js
const { validationResult } = require('express-validator');

module.exports = function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  return res.status(400).json({
    success: false,
    error: {
      message: 'Validation failed',
      details: result.array().map((e) => ({
        field: e.path,
        message: e.msg,
        location: e.location,
      })),
    },
  });
};
