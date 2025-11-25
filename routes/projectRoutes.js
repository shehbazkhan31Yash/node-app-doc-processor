const express = require("express");
const { body, param, validationResult } = require("express-validator");
const { csrfProtection } = require("../middlewares/csrf");
const authMiddleware = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/authorize");
const { adminLimiter } = require("../middlewares/rateLimiter");
const projectController = require("../controllers/projectController");
const router = express.Router();

const projectValidationRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("projectManager").isMongoId().withMessage("Invalid manager ID"),
  body("members").isArray().withMessage("Members must be an array"),
  body("members.*").isMongoId().withMessage("Invalid member ID"),
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

// Middleware to handle validation errors
const validateProject = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  next();
};

router.post(
  "/",
  csrfProtection,
  authMiddleware,
  authorize("admin"),
  adminLimiter,
  projectValidationRules,
  validateProject,
  projectController.createProject
);

const validateIdParam = [
  param("id").isMongoId().withMessage("Invalid project id"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    next();
  },
];

router.delete(
  "/:id",
  authMiddleware,
  authorize("admin"),
  adminLimiter,
  validateIdParam,
  projectController.deleteProject
);

router.post(
  "/:id",
  csrfProtection,
  authMiddleware,
  authorize("admin"),
  adminLimiter,
  projectController.assignUserToProject
);

router.get(
  "/all",
  authMiddleware,
  authorize("admin"),
  adminLimiter,
  projectController.getAllProjects
);
router.post(
  "/:projectId/assign-user",
  authMiddleware,
  authorize("admin"),
  adminLimiter,
  projectController.assignUserToProject
);

const validateUpdate = [
  param("id").isMongoId().withMessage("Invalid project id"),
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
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    next();
  },
];
router.patch(
  "/:id",
  csrfProtection,
  authMiddleware,
  authorize("admin"),
  adminLimiter,
  validateUpdate,
  projectController.updateProject
);
module.exports = router;
