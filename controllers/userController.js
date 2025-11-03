const User = require('../models/Users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');



/**
 * Register a new user.
 *
 * Creates a new user record in the database. Expects the request body to contain:
 *   - userName (string): unique username for the user (required)
 *   - firstName (string): user's first name (required)
 *   - lastName (string): user's last name (required)
 *   - email (string): user's email, must be unique (required)
 *   - password (string): plain-text password (required) — this is hashed before saving
 *
 * Successful response:
 *   - 201: { message: 'User registered successfully' }
 *
 * Possible error responses:
 *   - 400: { message: 'All fields are required' } when any required field is missing
 *   - 400: { message: 'User already exists' } when a user with the same email already exists
 *   - 500: { message: '<error message>' } for unexpected server/database errors
 *
 * Notes:
 *  - The password provided in the request is hashed by the User model before it is saved.
 *  - The response intentionally does not return the user object or password for security reasons.
 *
 * @param {Object} req - Express request object. req.body contains input fields described above.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
exports.register = async (req, res) => {
  try {
    const { userName, firstName, lastName, email, password } = req.body;
    if (!userName || !firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
      userName,
      firstName,
      lastName,
      email,
      password,
    });

    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



/**
 * Login a user.
 *
 * Authenticates a user and returns a JWT token for authorized requests.
 * Expects the request body to contain:
 *   - email (string): user's email (required)
 *   - password (string): plain-text password (required)
 *
 * Successful response:
 *   - 200: { token: '<jwt token>', user: <user object> }
 *
 * Possible error responses:
 *   - 400: { message: 'User not found' } when no user exists with the provided email
 *   - 400: { message: 'Invalid credentials' } when password does not match
 *   - 500: { message: '<error message>' } for unexpected server/database errors
 *
 * Notes:
 *  - The JWT payload contains { userId } and the token expiry is set to 1 day.
 *  - Keep JWT secret secure and set it via the JWT_SECRET environment variable in production.
 *
 * @param {Object} req - Express request object. req.body contains email and password.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
