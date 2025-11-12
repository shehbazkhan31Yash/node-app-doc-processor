const jwt = require('jsonwebtoken');
/**
 * Authentication middleware using JWT.
 *
 * Behavior:
 *  - Reads the Authorization header and expects a Bearer token:
 *      Authorization: Bearer <token>
 *  - Verifies the token using the JWT secret from process.env.JWT_SECRET.
 *  - On success: attaches the decoded token payload to req.user and calls next().
 *  - On failure: responds with 401 Unauthorized and a short error message.
 *
 * Example usage in a route:
 *   const authMiddleware = require('./middleware/authMiddleware');
 *   router.get('/protected', authMiddleware, (req, res) => {
 *     // req.user contains decoded JWT payload, e.g. { userId: '...' }
 *     res.json({ message: 'Protected content', userId: req.user.userId });
 *   });
 *
 * Notes:
 *  - Ensure JWT_SECRET is set in environment variables for production.
 *  - Token expiry handling is performed by jwt.verify; expired tokens will trigger 401.
 *
 * @param {Object} req - Express request object. On success, req.user will hold decoded token payload.
 * @param {Object} res - Express response object.
 * @param {Function} next - Next middleware function to call on successful auth.
 * @returns {void|Object} May return a response object when unauthorized, otherwise calls next().
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to request object
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
