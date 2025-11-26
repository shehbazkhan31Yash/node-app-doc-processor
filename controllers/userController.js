const User = require("../models/Users");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config();
/**
 * Register a new user.
 */
exports.register = async (req, res) => {
  try {
    const { userName, firstName, lastName, email, password, role } = req.body;
    const allowedClientRoles = ["user", "manager"];
    const assignedRole = allowedClientRoles.includes(role) ? role : "user";

    const user = new User({
      userName,
      firstName,
      lastName,
      email,
      password,
      role: assignedRole,
    });

    await user.save();

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    if (err && err.code === 11000) {
      const dupField = Object.keys(err.keyValue || {}).join(", ");
      return res.status(409).json({
        message: dupField
          ? `Duplicate value for: ${dupField}`
          : "Duplicate key error",
      });
    }
    console.error("register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Login a user.
 */
exports.login = async (req, res) => {
  try {
    const { email, userName, password } = req.body;
    const findQuery = email ? { email } : { userName };
    const user = await User.findOne(findQuery).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const safeUser = user.toObject ? user.toObject() : { ...user };
    delete safeUser.password;

    return res.status(200).json({ token, user: safeUser });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /users/managers?page=&limit=
 */
exports.getAllManagers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      200
    );
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

/**
 * GET /users -> employees (paginated)
 */
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

/**
 * GET /users/all -> all users (paginated)
 */
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

/**
 * Update user details.
 */
exports.UpdateUserDetails = async (req, res) => {
  try {
    const userIdToUpdate = req.params.id;
    const requester = req.user;
    const updateFields = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(userIdToUpdate)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (!requester || !requester.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (requester.role !== "admin" && requester.id !== userIdToUpdate) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient permissions" });
    }

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

/**
 * Get user by id.
 */
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
