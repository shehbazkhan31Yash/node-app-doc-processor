const mongoose = require('mongoose');

/**
 * Connects to MongoDB using Mongoose.
 * 
 * MongoDB is used as the primary database in this application because it provides a flexible,
 * scalable, and high-performance NoSQL document store ideal for modern web applications.
 * It stores data in BSON (Binary JSON) format, which seamlessly integrates with JavaScript,
 * allowing for efficient data handling with Node.js.
 * 
 * The schema-less nature of MongoDB lets developers evolve the data model without complex migrations,
 * which is especially useful in agile and fast-changing development environments.
 * 
 * Using MongoDB with Node.js leverages the asynchronous, event-driven architecture of both technologies,
 * enabling non-blocking, scalable database operations that improve application responsiveness.
 * 
 * This function attempts to establish a connection to the MongoDB cluster specified by the
 * MONGODB_URI environment variable. On successful connection, it logs the host information.
 * On failure, it logs the error and terminates the Node.js process to prevent running without a database.
 *
 * @async
 * @function connectDB
 * @returns {Promise<void>} Resolves if connection succeeds; exits process on failure.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;


