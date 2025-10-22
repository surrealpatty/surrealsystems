// src/middlewares/validate.js
import { validationResult } from "express-validator";

export const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  // Standard 400 shape (non-breaking)
  return res.status(400).json({
    error: "Validation failed",
    errors: result.array().map(e => ({
      field: e.path,
      message: e.msg,
      location: e.location
    }))
  });
};
