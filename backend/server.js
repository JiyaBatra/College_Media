const express = require('express');
const compression = require('compression');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { initDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const logger = require('./utils/logger');
const { globalLimiter } = require('./middleware/rateLimitMiddleware');
const { sanitizeAll, validateContentType, preventParameterPollution } = require('./middleware/sanitizationMiddleware');
require('./utils/redisClient'); // Initialize Redis client

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(compression()); // Compress all responses
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply global rate limiter
app.use(globalLimiter);

// Apply input sanitization (XSS & NoSQL injection protection)
app.use(sanitizeAll);

// Validate Content-Type for POST/PUT/PATCH requests
app.use(validateContentType);

// Prevent parameter pollution
app.use(preventParameterPollution(['tags', 'categories'])); // Allow arrays for specific params

// Static file serving for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic route
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: null,
    message: 'College Media API is running!'
  });
});

// Initialize database connection and start server
const startServer = async () => {
  let dbConnection;

  try {
    dbConnection = await initDB();

    // Set the database connection globally so routes can access it
    app.set('dbConnection', dbConnection);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Database initialization error:', error);
    // Don't exit, just use mock database
    dbConnection = { useMongoDB: false, mongoose: null };
    app.set('dbConnection', dbConnection);

    logger.warn('Using file-based database as fallback');
  }

  // Import and register routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/messages', require('./routes/messages'));
  app.use('/api/account', require('./routes/account'));

  // 404 Not Found Handler (must be after all routes)
  app.use(notFound);

  // Global Error Handler (must be last)
  app.use(errorHandler);

  // Start the server
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
};

startServer();