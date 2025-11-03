const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


/**
 * User model (Mongoose)
 *
 * Purpose:
 *  - Defines the structure and validation rules for user documents stored in MongoDB.
 *
 * Fields:
 *  - userName (string): Unique username for the user (required)
 *  - firstName (string): User's first name (required)
 *  - lastName (string): User's last name (required)
 *  - email (string): Unique email address (required)
 *  - password (string): Hashed password (required) — the raw password is hashed before save
 *
 * Behavior:
 *  - A pre-save hook hashes the password using bcrypt when the password field is created or modified.
 *  - The model enforces uniqueness on userName and email at the Mongoose/schema level, but
 *    you should also handle duplicate-key errors coming from the database in production.
 *
 * Example:
 *   const user = new User({ userName, firstName, lastName, email, password });
 *   await user.save(); // password is hashed automatically before saving
 *
 * @typedef {Object} User
 * @property {string} userName
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string} password - hashed before persistence
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
