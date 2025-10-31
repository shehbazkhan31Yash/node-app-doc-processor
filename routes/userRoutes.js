/**
 * Routes for user authentication operations.
 * Provides endpoints for user registration and login.
 * @module routes/userRoutes
 */

const express = require('express');

/**
 * Express router to mount user-related routes.
 * Handles requests related to user authentication.
 * @type {module:express.Router}
 */
const router = express.Router();

const userController = require('../controllers/userController');

/**
 * POST /register
 * Registers a new user creating a new user document in the database.
 * 
 * Request body must include:
 * - userName: string (unique, required)
 * - firstName: string (required)
 * - lastName: string (required)
 * - email: string (unique, required)
 * - password: string (required)
 * 
 * Responds with:
 * - 201 Created and success message on success
 * - 400 Bad Request with error message if user already exists or validation fails
 * - 500 Server Error on unexpected failure
 */
router.post('/register', userController.register);

/**
 * POST /login
 * Authenticates a user with email and password.
 * Generates and returns JWT token if successful.
 * 
 * Request body must include:
 * - email: string (required)
 * - password: string (required)
 * 
 * Responds with:
 * - 200 OK with JWT token and user info on success
 * - 400 Bad Request with error message if authentication fails
 * - 500 Server Error on unexpected failure
 */
router.post('/login', userController.login);

module.exports = router;
