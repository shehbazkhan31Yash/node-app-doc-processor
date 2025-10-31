// const User = require('../models/Users');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');

// // Register a new user
// exports.register = async (req, res) => {
//   try {
//     const { userName, firstName, lastName, email, password } = req.body;
//     console.log(req.body);
//     console.log(req.headers);

//     if (!userName || !firstName || !lastName || !email || !password) {
//       return res.status(400).json({ message: "All fields are required" });
//     }
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: 'User already exists' });
//     }

//     const user = new User({
//       userName,
//       firstName,
//       lastName,
//       email,
//       password, 
//     });

//     await user.save();

//     res.status(201).json({ message: 'User registered successfully' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Login user
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: 'User not found' });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }

//     const token = jwt.sign(
//       { userId: user._id },
//       process.env.JWT_SECRET || 'your_jwt_secret',
//       { expiresIn: '1d' }
//     );

//     res.json({ token, user });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


const User = require('../models/Users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Register a new user.
 *
 * This endpoint creates a new user record in the database.
 *
 * @param {module:express.Request} req - The Express request object.
 *   @property {string} req.body.userName - The unique username of the user (required).
 *   @property {string} req.body.firstName - The user's first name (required).
 *   @property {string} req.body.lastName - The user's last name (required).
 *   @property {string} req.body.email - The user's unique email address (required).
 *   @property {string} req.body.password - The user's password in plain text (required).
 *
 * @param {module:express.Response} res - The Express response object.
 *
 * @returns {Promise<void>} Sends JSON response with:
 * - `201` and success message if user is created.
 * - `400` if any required fields are missing or user already exists.
 * - `500` if server error occurs.
 */
exports.register = async (req, res) => {
  try {
    const { userName, firstName, lastName, email, password } = req.body;
    console.log(req.body);
    console.log(req.headers);

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
 * This endpoint authenticates a user and returns a JWT token for authorized requests.
 *
 * @param {module:express.Request} req - The Express request object.
 *   @property {string} req.body.email - The user's email address (required).
 *   @property {string} req.body.password - The user's plain text password (required).
 *
 * @param {module:express.Response} res - The Express response object.
 *
 * @returns {Promise<void>} Sends JSON response with:
 * - `200` along with JWT token and user info if login succeeds.
 * - `400` if user not found or invalid credentials.
 * - `500` if server error occurs.
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
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1d' }
    );

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
