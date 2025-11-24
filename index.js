const express = require("express");
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/mongodb");
const userRoutes = require("./routes/userRoutes");
const documentRoutes = require("./routes/documentRoutes");
const projectRoutes = require("./routes/projectRoutes");
const setupSwagger = require("./swagger");

const { notFound } = require("./middlewares/notFound");
const { errorHandler } = require("./middlewares/errorMiddleware");

const { csrfProtection } = require("./middlewares/csrf");

const app = express();
const allowedOrigins = [process.env.FRONTEND_URL];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

connectDB().catch((err) => {
  console.error("Failed to connect to DB at startup:", err);
  process.exit(1);
});

app.get("/api/csrf-token", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.use("/api/users", userRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/projects", projectRoutes);

app.get("/", (req, res) => res.send("API is running"));

setupSwagger(app);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception, exiting:", err);
  server.close(() => process.exit(1));
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection, exiting:", reason);
  server.close(() => process.exit(1));
});
