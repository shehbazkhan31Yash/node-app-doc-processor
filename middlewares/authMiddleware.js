
const jwt = require('jsonwebtoken');
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * Middleware to authenticate requests using JWT tokens.
 * 
 * This middleware checks the `Authorization` header for a Bearer token,
 * verifies the token's validity and expiration using the JWT secret,
 * and attaches the decoded user payload to `req.user` for downstream use.
 * 
 * If the header is missing or invalid, or if the token verification fails,
 * it sends a 401 Unauthorized response with an appropriate error message.
 * 
 * This middleware is used to protect routes that require authenticated access.
 * It should be added before handlers for routes that need user identification.
 *
 * @param {module:express.Request} req - The Express request object.
 *   @property {Object} [user] - The decoded JWT payload added when token is valid.
 * 
 * @param {module:express.Response} res - The Express response object.
 * 
 * @param {module:express.NextFunction} next - The Express next middleware function.
 *   Called to pass control to the next middleware or route handler if authentication succeeds.
 * 
 * @returns {void}
 * 
 * @example
 * // Usage in an Express route
 * const express = require('express');
 * const router = express.Router();
 * const authMiddleware = require('./middleware/authMiddleware');
 * 
 * router.get('/protected', authMiddleware, (req, res) => {
 *   res.json({ message: 'This is protected data', userId: req.user.userId });
 * });
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded; // Attach user info to request object
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
