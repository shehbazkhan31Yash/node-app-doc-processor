// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");

// const UserSchema = new mongoose.Schema({
//   userName: { type: String, required: true, unique: true },
//   firstName: { type: String, required: true }, // make required: true if you want to enforce it
//   lastName: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
// });

// // Hash password before save (only when modified)
// UserSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   try {
//     const hash = await bcrypt.hash(this.password, 10);
//     this.password = hash;
//     next();
//   } catch (err) {
//     next(err);
//   }
// });
// module.exports = mongoose.model("User", UserSchema);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Mongoose schema defining the shape and validation of User documents.
 * Represents a registered user with authentication credentials.
 * 
 * @typedef {Object} User
 * @property {string} userName - Unique username for the user (required).
 * @property {string} firstName - User's first name (required).
 * @property {string} lastName - User's last name (required).
 * @property {string} email - Unique email address associated with the user (required).
 * @property {string} password - User's hashed password; stored securely.
 */
const UserSchema = new mongoose.Schema({
  userName: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

/**
 * Pre-save middleware hook to hash the password before saving the User document.
 * This runs on document save only if the password field has been modified.
 * Uses bcrypt to generate a salted hash of the password.
 * 
 * @function
 * @name preSaveHashPassword
 * @param {Function} next - The callback to continue middleware chain
 * @returns {void}
 */
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const hash = await bcrypt.hash(this.password, 10);
    this.password = hash;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("User", UserSchema);
