/**
 * @fileoverview Production-grade Express server
 * @description Main server file with comprehensive middleware and security
 * @author SuperPrompt Team
 * @version 2.0.0
 */

// Load environment variables first
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import middleware
const {
  securityHeaders,
  corsOptions,
  globalRateLimit,
  inputSanitization,
  securityLogging,
  secureCompression,
  requestSizeLimit,
  apiSecurityHeaders,
} = require('./middleware/security');

const { httpLogger, logger } = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const promptRoutes = require('./routes/prompts');
const enhanceRoutes = require('./routes/enhance');

// Initialize Express app
const app = express();

// Trust proxy in production (for rate limiting, IP detection)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ================================
// Core Middleware
// ================================

// Security headers (must be first)
app.use(securityHeaders);

// Request logging
app.use(httpLogger);

// Security logging
app.use(securityLogging);

// Compression
app.use(secureCompression);

// CORS configuration
app.use(cors(corsOptions));

// Rate limiting
app.use(globalRateLimit);

// Request size limiting
app.use(requestSizeLimit);

// Body parsing with size limits
app.use(express.json({ 
  limit: process.env.MAX_REQUEST_SIZE || '10mb',
  strict: true
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_REQUEST_SIZE || '10mb'
}));

// Input sanitization
app.use(inputSanitization);

// API security headers
app.use('/api', apiSecurityHeaders);

// ================================
// Database Connection
// ================================

const connectDB = async () => {
  try {
    const mongoURI = process.env.NODE_ENV === 'test' 
      ? process.env.MONGODB_URI_TEST 
      : process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MongoDB URI not provided in environment variables');
    }

    const options = {
      maxPoolSize: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
      serverSelectionTimeoutMS: parseInt(process.env.DB_TIMEOUT) || 30000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: 'majority'
    };

    await mongoose.connect(mongoURI, options);
    
    logger.info('Database connected successfully', {
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port
    });

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('Database connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Database disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('Database reconnected');
    });

  } catch (error) {
    logger.error('Database connection failed', { 
      error: error.message,
      stack: error.stack 
    });
    
    // Exit process if database connection fails
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// ================================
// API Routes
// ================================

// Health check endpoint (before other middleware)
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.API_VERSION || '2.0.0',
      environment: process.env.NODE_ENV,
      database: {
        status: dbStatus,
        name: mongoose.connection.name
      },
      memory: memUsageMB,
      node: process.version
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/enhance', enhanceRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'SuperPrompt API',
    version: process.env.API_VERSION || '2.0.0',
    description: 'Production-grade API for SuperPrompt Chrome Extension',
    status: 'running',
    timestamp: new Date().toISOString(),
    documentation: '/api/docs',
    health: '/api/health'
  });
});

// API documentation endpoint (if swagger is available)
if (process.env.NODE_ENV !== 'production') {
  try {
    const swaggerUi = require('swagger-ui-express');
    const swaggerDocument = require('./docs/swagger.json');
    
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'SuperPrompt API Documentation'
    }));
  } catch (error) {
    logger.warn('Swagger documentation not available', { error: error.message });
  }
}

// ================================
// Error Handling
// ================================

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  logger.warn('API endpoint not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(404).json({
    error: 'API endpoint not found',
    message: `${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: [
      'GET /api/health',
      'POST /api/auth/signup',
      'POST /api/auth/login',
      'GET /api/prompts',
      'POST /api/enhance'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  // Log the error
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?._id
  });

  // Don't expose error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred',
      requestId: req.id // If you add request ID middleware
    });
  } else {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    });
  }
});

// ================================
// Graceful Shutdown
// ================================

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  try {
    // Close database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason,
    promise: promise
  });
  gracefulShutdown('unhandledRejection');
});

// ================================
// Server Startup
// ================================

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start server
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV,
        version: process.env.API_VERSION || '2.0.0',
        pid: process.pid
      });
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error('Server error', { error: error.message });
      }
      process.exit(1);
    });

    return server;

  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };