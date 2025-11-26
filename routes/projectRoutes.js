const express = require("express");
const { csrfProtection } = require("../middlewares/csrf");
const authMiddleware = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/authorize");
const {
  adminLimiter,
  publicApiLimiter,
} = require("../middlewares/rateLimiter");
const projectValidators = require("../validators/projectValidators");
const validate = require("../middlewares/validation");
const projectController = require("../controllers/projectController");
const router = express.Router();

router.post(
  "/",
  csrfProtection,
  authMiddleware,
  authorize("admin"),
  adminLimiter,
  validate(projectValidators.createProject),
  projectController.createProject
);

router.delete(
  "/:id",
  authMiddleware,
  authorize("admin"),
  adminLimiter,
  validate(projectValidators.idParam),
  projectController.deleteProject
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
  validate(projectValidators.assignUserToProject),
  projectController.assignUserToProject
);
router.patch(
  "/:id",
  csrfProtection,
  authMiddleware,
  authorize("admin"),
  adminLimiter,
  validate(projectValidators.updateProject),
  projectController.updateProject
);
router.get(
  "/user/:userId",
  authMiddleware,
  authorize("admin", "manager", "user"),
  publicApiLimiter,
  validate(projectValidators.getUserProjects),
  projectController.getProjectsByUserId
);
module.exports = router;
