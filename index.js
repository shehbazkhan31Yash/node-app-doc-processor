// const express = require("express");
// require('dotenv').config();
// const connectDB = require("./config/mongodb"); 
// const userRoutes = require("./routes/userRoutes");

// const app = express();

// app.use(express.json());

// connectDB();

// app.use('/api/users', userRoutes);

// app.get("/", (req, res) => {
//   res.send("API is running");
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

/**
 * Express application entry point.
 * 
 * This file initializes the Express application, sets up essential middleware,
 * connects to the MongoDB database using Mongoose, and mounts route handlers.
 * 
 * It serves as the main HTTP server, listening on the configured port,
 * and includes a basic health check endpoint to verify the API status.
 * 
 * @module index
 */

const express = require("express");
require('dotenv').config();
const connectDB = require("./config/mongodb"); 
const userRoutes = require("./routes/userRoutes");

const app = express();

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Establish connection to MongoDB database
connectDB();

/**
 * Mounts user-related routes under the /api/users path.
 * Routes include user registration and login.
 */
app.use('/api/users', userRoutes);

/**
 * Basic health check endpoint.
 * Responds with a simple message confirming the API is running.
 */
app.get("/", (req, res) => {
  res.send("API is running");
});

// Start the Express server on the configured port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
