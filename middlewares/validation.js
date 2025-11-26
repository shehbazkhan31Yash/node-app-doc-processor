/**
 * validation.js
 * Helper that runs an array of express-validator validations and returns 422 on error.
 *
 * Usage:
 *   const validate = require('../middleware/validation');
 *   router.post('/register', validate(userValidators.register), userController.register);
 *
 * Notes:
 * - Each validation in the array should be an express-validator check (e.g., body('email').isEmail()).
 * - This middleware runs validation.run(req) for each rule so async validators work correctly.
 */

// const { validationResult } = require("express-validator");

// const validate = (validations = []) => {
//   return async (req, res, next) => {
//     // Run all validators (they populate the req object)
//     await Promise.all(validations.map((v) => v.run(req)));

//     const errors = validationResult(req);
//     if (errors.isEmpty()) {
//       return next();
//     }

//     // Format the errors to a friendly structure
//     const formatted = errors.array().map((err) => ({
//       param: err.param,
//       msg: err.msg,
//       value: err.value,
//     }));

//     // 422 Unprocessable Entity is a common choice for validation errors
//     return res.status(422).json({ errors: formatted });
//   };
// };

// module.exports = validate;

const { validationResult } = require("express-validator");

const validate = (validations = []) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Create an error object with details
    const error = new Error("Validation failed");
    error.status = 422; // Unprocessable Entity
    error.type = "ValidationError";
    error.details = errors.array().map((err) => ({
      param: err.param,
      msg: err.msg,
      value: err.value,
    }));

    // Pass error to global error handler via next()
    return next(error);
  };
};

module.exports = validate;
