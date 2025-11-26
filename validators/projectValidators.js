const { body, param } = require("express-validator");
const mongoose = require("mongoose");

const isValidMongoId = (value) => mongoose.Types.ObjectId.isValid(value);

exports.createProject = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("projectManager")
    .optional()
    .isMongoId()
    .withMessage("Invalid manager ID"),
  body("members").optional().isArray().withMessage("Members must be an array"),
  body("members.*").optional().isMongoId().withMessage("Invalid member ID"),
  body("startDate")
    .notEmpty()
    .withMessage("startDate is required")
    .isISO8601()
    .withMessage("Invalid startDate"),
  body("endDate")
    .notEmpty()
    .withMessage("endDate is required")
    .isISO8601()
    .withMessage("Invalid endDate"),
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["planning", "active", "completed", "on-hold"])
    .withMessage("Invalid status value"),
];

exports.idParam = [
  param("id")
    .exists()
    .withMessage("Project id is required")
    .bail()
    .custom((value) => {
      if (!isValidMongoId(value)) throw new Error("Invalid project id");
      return true;
    }),
];

exports.assignUserToProject = [
  param("projectId")
    .exists()
    .withMessage("projectId is required")
    .bail()
    .custom((value) => {
      if (!isValidMongoId(value)) throw new Error("Invalid projectId");
      return true;
    }),
  body("userId")
    .exists()
    .withMessage("userId is required")
    .bail()
    .custom((value) => {
      if (!isValidMongoId(value)) throw new Error("Invalid userId");
      return true;
    }),
];

exports.updateProject = [
  param("id")
    .exists()
    .withMessage("Project id is required")
    .bail()
    .custom((value) => {
      if (!isValidMongoId(value)) throw new Error("Invalid project id");
      return true;
    }),
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("projectManager")
    .optional()
    .isMongoId()
    .withMessage("Invalid manager ID"),
  body("members").optional().isArray().withMessage("Members must be an array"),
  body("members.*").optional().isMongoId().withMessage("Invalid member ID"),
  body("startDate").optional().isISO8601().withMessage("Invalid startDate"),
  body("endDate").optional().isISO8601().withMessage("Invalid endDate"),
  body("status")
    .optional()
    .isIn(["planning", "active", "completed", "on-hold"])
    .withMessage("Invalid status value"),
];
exports.getUserProjects = [
  param("userId")
    .exists()
    .withMessage("userId is required")
    .bail()
    .custom((value) => {
      if (!isValidMongoId(value)) throw new Error("Invalid userId");
      return true;
    }),
];
