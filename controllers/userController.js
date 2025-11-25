const User = require("../models/Users");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config();
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
    const { userName, firstName, lastName, email, password, role } = req.body;

    // required fields
    if (!userName || !firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // restrict client-selectable roles
    const allowedClientRoles = ["user", "manager"];

    let assignedRole = "user";
    if (role) {
      if (!allowedClientRoles.includes(role)) {
        // block 'admin' or any other invalid role from being self-assigned
        return res
          .status(403)
          .json({ message: "Cannot assign this role during registration" });
      }
      assignedRole = role;
    }

    // ensure email/username uniqueness
    const existingUser = await User.findOne({ $or: [{ email }, { userName }] });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = new User({
      userName,
      firstName,
      lastName,
      email,
      password,
      role: assignedRole,
    });

    await user.save();

    // return minimal user info (no password)
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,
      },
    });
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

    // explicitly include password field
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// GET /users/managers?page=1&limit=20
exports.getAllManagers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      200
    ); // cap
    const skip = (page - 1) * limit;

    const filter = { role: "manager" };
    const [total, docs] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("userName firstName lastName email _id")
        .sort("-createdAt")
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const managers = docs.map((d) => ({
      id: d._id,
      userName: d.userName,
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
    }));

    return res.status(200).json({
      success: true,
      count: managers.length,
      data: managers,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllEmployees = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      200
    );
    const skip = (page - 1) * limit;

    const filter = { role: "user" };
    const [total, docs] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("userName firstName lastName email _id")
        .sort("-createdAt")
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const users = docs.map((d) => ({
      id: d._id,
      userName: d.userName,
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
    }));

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};
// GET /users/all?page=1&limit=20
// GET /users/all?page=1&limit=20
exports.getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      200
    );
    const skip = (page - 1) * limit;

    const [total, docs] = await Promise.all([
      User.countDocuments({}),
      User.find({})
        .select("userName firstName lastName email _id role createdAt")
        .sort("-createdAt")
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const result = docs.map((u) => ({
      id: u._id,
      userName: u.userName,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
    }));

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};
/**
 * Delete a user by ID.
 * Only allow if requester is admin or the user themselves.
 */
exports.deleteUser = async (req, res) => {
  try {
    const userIdToDelete = req.params.id;
    const requester = req.user;

    if (!mongoose.Types.ObjectId.isValid(userIdToDelete)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (!requester || !requester.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Allow deletion if requester is admin or deleting their own user
    if (requester.role !== "admin" && requester.id !== userIdToDelete) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient permissions" });
    }

    const user = await User.findById(userIdToDelete);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndDelete(userIdToDelete);
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.UpdateUserDetails = async (req, res) => {
  try {
    const userIdToUpdate = req.params.id;
    const requester = req.user;
    const updateFields = req.body;

    if (!mongoose.Types.ObjectId.isValid(userIdToUpdate)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (!requester || !requester.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Only admin or the user can patch their details
    if (requester.role !== "admin" && requester.id !== userIdToUpdate) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient permissions" });
    }

    // Filter allowed update fields for security
    const allowedUpdates = ["firstName", "lastName", "email", "userName"];
    const filteredUpdates = {};
    for (const key of Object.keys(updateFields)) {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updateFields[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided for update" });
    }

    // Perform partial update, return updated user
    const updatedUser = await User.findByIdAndUpdate(
      userIdToUpdate,
      { $set: filteredUpdates },
      { new: true, runValidators: true, context: "query" }
    )
      .select("userName firstName lastName email _id")
      .lean();

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ success: true, data: updatedUser });
  } catch (err) {
    console.error("patchUserDetails error:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const requestedId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(requestedId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const requesterId = req.user?.id;
    if (!requesterId || !mongoose.Types.ObjectId.isValid(requesterId)) {
      return res.status(401).json({ message: "Unauthorized or invalid user" });
    }

    const isSelfRequest = requesterId === requestedId;
    const requesterRole = req.user?.role;

    if (!isSelfRequest && requesterRole !== "admin") {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient permissions" });
    }
    const user = await User.findById(requestedId)
      .select("-password")
      .lean()
      .exec();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error("getUserById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
