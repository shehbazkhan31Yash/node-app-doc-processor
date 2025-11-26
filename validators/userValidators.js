const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");
const User = require("../models/Users");

/**
 * Helper async validators
 */
const isValidMongoId = (value) => mongoose.Types.ObjectId.isValid(value);

const checkEmailUnique = async (email) => {
  const existing = await User.findOne({ email }).lean().exec();
  if (existing) {
    return Promise.reject("E-mail already in use");
  }
};

const checkUserNameUnique = async (userName) => {
  const existing = await User.findOne({ userName }).lean().exec();
  if (existing) {
    return Promise.reject("Username already in use");
  }
};

/**
 * REGISTER
 * - userName, firstName, lastName, email, password required
 * - role optional but only 'user' or 'manager' allowed (no 'admin')
 */
exports.register = [
  body("userName")
    .exists({ checkFalsy: true })
    .withMessage("userName is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("userName must be 3-30 characters")
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage("userName may contain letters, numbers, _, - or .")
    .custom(async (value) => checkUserNameUnique(value))
    .trim()
    .escape(),

  body("firstName")
    .exists({ checkFalsy: true })
    .withMessage("firstName is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("firstName must be 1-50 characters")
    .trim()
    .escape(),

  body("lastName")
    .exists({ checkFalsy: true })
    .withMessage("lastName is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("lastName must be 1-50 characters")
    .trim()
    .escape(),

  body("email")
    .exists({ checkFalsy: true })
    .withMessage("email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail()
    .custom(async (value) => checkEmailUnique(value)),

  body("password")
    .exists({ checkFalsy: true })
    .withMessage("password is required")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be 8-128 characters"),

  body("role").optional().isIn(["user", "manager"]).withMessage("Invalid role"),
];

/**
 * LOGIN
 * - require password
 * - require either email or userName
 */
exports.login = [
  body("password")
    .exists({ checkFalsy: true })
    .withMessage("Password is required"),

  // If email is present, validate it
  body("email")
    .optional({ nullable: true })
    .isEmail()
    .withMessage("Invalid email")
    .normalizeEmail(),

  // If username is present, validate it
  body("userName")
    .optional({ nullable: true })
    .isLength({ min: 3, max: 30 })
    .withMessage("Invalid userName"),

  // Ensure at least one identifier is present
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.userName) {
      throw new Error("Either email or userName is required");
    }
    return true;
  }),
];

/**
 * Pagination validator for list endpoints (page, limit)
 * - page >=1, limit between 1..200
 */
exports.pagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be >= 1")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage("limit must be between 1 and 200")
    .toInt(),
];

/**
 * GET BY ID / DELETE / PATCH: validate :id param
 */
exports.idParam = [
  param("id")
    .exists()
    .withMessage("id param is required")
    .bail()
    .custom((value) => {
      if (!isValidMongoId(value)) {
        throw new Error("Invalid id");
      }
      return true;
    }),
];

/**
 * UPDATE USER DETAILS
 * - Only allow certain fields (firstName, lastName, email, userName)
 * - If updating email or userName, ensure uniqueness (exclude the user being updated)
 */
exports.updateUser = [
  param("id")
    .exists()
    .withMessage("id param is required")
    .bail()
    .custom((value) => {
      if (!isValidMongoId(value)) {
        throw new Error("Invalid id");
      }
      return true;
    }),

  // Accept only allowed fields; validate them if present
  body("firstName")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("firstName must be 1-50 characters")
    .trim()
    .escape(),

  body("lastName")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("lastName must be 1-50 characters")
    .trim()
    .escape(),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email")
    .normalizeEmail()
    .bail()
    .custom(async (value, { req }) => {
      // ensure email is not used by another user
      const existing = await User.findOne({
        email: value,
        _id: { $ne: req.params.id },
      })
        .lean()
        .exec();
      if (existing) {
        return Promise.reject("E-mail already in use by another account");
      }
    }),

  body("userName")
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage("userName must be 3-30 characters")
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage("userName may contain letters, numbers, _, - or .")
    .bail()
    .custom(async (value, { req }) => {
      const existing = await User.findOne({
        userName: value,
        _id: { $ne: req.params.id },
      })
        .lean()
        .exec();
      if (existing) {
        return Promise.reject("Username already in use by another account");
      }
    })
    .trim()
    .escape(),

  // Prevent updating role, password, or other protected fields here (controller enforces)
];

/**
 * getUserById: same idParam
 */
exports.getUserById = exports.idParam;

/**
 * deleteUser: same idParam
 */
exports.deleteUser = exports.idParam;
