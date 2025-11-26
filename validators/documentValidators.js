const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");

// Helper to check Mongo ObjectId validity
const isValidMongoId = (value) => mongoose.Types.ObjectId.isValid(value);

exports.createDocument = [
  body("projectSite")
    .exists({ checkFalsy: true })
    .withMessage("projectSite is required")
    .isString()
    .trim(),

  body("department")
    .exists({ checkFalsy: true })
    .withMessage("department is required")
    .isString()
    .trim(),

  body("equipment")
    .exists({ checkFalsy: true })
    .withMessage("equipment is required")
    .isString()
    .trim(),

  body("projectId")
    .optional()
    .custom((value) => {
      if (!isValidMongoId(value)) throw new Error("Invalid projectId");
      return true;
    }),
];

exports.getDocumentByProjectID = [
  param("projectId")
    .exists()
    .withMessage("projectId is required")
    .bail()
    .custom((value) => {
      if (!isValidMongoId(value)) throw new Error("Invalid projectId");
      return true;
    }),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be an integer >= 1")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage("limit must be an integer between 1 and 200")
    .toInt(),

  query("sort").optional().isString(),
  query("q").optional().isString(),
];

// exports.deleteAttachment = [
//   param("id")
//     .exists()
//     .withMessage("Document id is required")
//     .bail()
//     .custom((value) => {
//       if (!isValidMongoId(value)) throw new Error("Invalid document id");
//       return true;
//     }),

//   param("attachmentId")
//     .exists()
//     .withMessage("attachmentId is required")
//     .bail()
//     .isMongoId()
//     .withMessage("Invalid attachment id"),
// ];

exports.searchDocuments = [
  query("q")
    .exists({ checkFalsy: true })
    .withMessage("Search query (q) is required")
    .isString()
    .trim(),

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

exports.validateDocumentId = [
  param("id")
    .exists()
    .withMessage("Document id is required")
    .bail()
    .custom((value) => {
      if (!isValidMongoId(value)) throw new Error("Invalid document id");
      return true;
    }),
];

exports.validateAttachmentId = [
  param("attachmentId")
    .exists()
    .withMessage("Attachment id is required")
    .bail()
    .custom((value) => {
      if (!isValidMongoId(value)) throw new Error("Invalid attachment id");
      return true;
    }),
];
