/**
 * Express application entry point.
 */

const express = require('express');
require('dotenv').config();

const cookieParser = require('cookie-parser'); 
const connectDB = require('./config/mongodb');
const userRoutes = require('./routes/userRoutes');
const setupSwagger = require('./swagger');

const { notFound } = require('./middlewares/notFound');
const { errorHandler } = require('./middlewares/errorMiddleware');

const { csrfProtection } = require('./middlewares/csrf'); 

const app = express();

app.use(express.json());
app.use(cookieParser()); 

connectDB().catch(err => {
  console.error('Failed to connect to DB at startup:', err);
  process.exit(1); 
});

app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.use('/api/users', userRoutes);

app.get('/', (req, res) => res.send('API is running'));

setupSwagger(app);

// 404 handler 
app.use(notFound);

// global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception, exiting:', err);
  server.close(() => process.exit(1));
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection, exiting:', reason);
  server.close(() => process.exit(1));
});


