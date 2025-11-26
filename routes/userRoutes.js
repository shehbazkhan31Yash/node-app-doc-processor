/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User authentication and registration
 */
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { csrfProtection } = require("../middlewares/csrf");
const authMiddleware = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/authorize");
const {
  authLimiter,
  registerLimiter,
  publicApiLimiter,
  adminLimiter,
} = require("../middlewares/rateLimiter");

const validate = require("../middlewares/validation");
const userValidators = require("../validators/userValidators");

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Registers a new user creating a new user document in the database.
 *     tags: [Users]
 *     parameters:
 *       - in: header
 *         name: x-csrf-token
 *         schema:
 *           type: string
 *         required: false
 *         description: CSRF token header (set by /api/csrf-token). Add it via "Authorize" or requestInterceptor.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userName
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *             properties:
 *               userName:
 *                 type: string
 *                 description: Unique username
 *               firstName:
 *                 type: string
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 description: User's last name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Unique email
 *               password:
 *                 type: string
 *                 description: User's password
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request (user exists or validation error)
 *       500:
 *         description: Server error
 */
router.post(
  "/register",
  csrfProtection,
  registerLimiter,
  validate(userValidators.register),
  userController.register
);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Authenticates a user and returns JWT token.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email
 *               password:
 *                 type: string
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Login successful with JWT token
 *       400:
 *         description: Invalid credentials or user not found
 *       500:
 *         description: Server error
 */
router.post(
  "/login",
  authLimiter,
  validate(userValidators.login),
  userController.login
);

// get lists (with pagination)
router.get(
  "/managers",
  authMiddleware,
  authorize("admin"),
  publicApiLimiter,
  validate(userValidators.pagination),
  userController.getAllManagers
);

router.get(
  "/",
  authMiddleware,
  authorize("admin", "manager"),
  publicApiLimiter,
  validate(userValidators.pagination),
  userController.getAllEmployees
);

router.get(
  "/all",
  authMiddleware,
  authorize("admin"),
  publicApiLimiter,
  validate(userValidators.pagination),
  userController.getAllUsers
);

// get / delete / patch by id
router.get(
  "/:id",
  authMiddleware,
  authorize("admin", "user"),
  publicApiLimiter,
  validate(userValidators.getUserById),
  userController.getUserById
);

router.delete(
  "/:id",
  csrfProtection,
  authMiddleware,
  authorize("admin"),
  adminLimiter,
  validate(userValidators.deleteUser),
  userController.deleteUser
);

router.patch(
  "/:id",
  csrfProtection,
  authMiddleware,
  authorize("admin", "manager", "user"),
  adminLimiter,
  validate(userValidators.updateUser),
  userController.UpdateUserDetails
);

module.exports = router;
