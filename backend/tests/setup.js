/**
 * @fileoverview Test setup configuration
 * @description Global test configuration and utilities
 * @author SuperPrompt Team
 * @version 2.0.0
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.BCRYPT_SALT_ROUNDS = '4'; // Lower for faster tests
process.env.LOG_LEVEL = 'error'; // Minimize test logs
process.env.MOCK_EMAIL = 'true';

// Global variables
let mongoServer;

// Setup before all tests
beforeAll(async () => {
  try {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Test database connected');
  } catch (error) {
    console.error('Test setup failed:', error);
    process.exit(1);
  }
});

// Cleanup after each test
afterEach(async () => {
  try {
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error('Test cleanup failed:', error);
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    // Close database connection
    await mongoose.connection.close();
    
    // Stop MongoDB Memory Server
    if (mongoServer) {
      await mongoServer.stop();
    }
    
    console.log('Test database disconnected');
  } catch (error) {
    console.error('Test teardown failed:', error);
  }
});

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  /**
   * Create a test user
   */
  createTestUser: async (overrides = {}) => {
    const User = require('../models/User');
    const userData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User',
      isVerified: true,
      ...overrides
    };
    
    const user = new User(userData);
    await user.save();
    return user;
  },

  /**
   * Create a test prompt
   */
  createTestPrompt: async (userId, overrides = {}) => {
    const Prompt = require('../models/Prompt');
    const promptData = {
      userId,
      title: 'Test Prompt',
      content: 'This is a test prompt content',
      tags: ['test'],
      category: 'general',
      ...overrides
    };
    
    const prompt = new Prompt(promptData);
    await prompt.save();
    return prompt;
  },

  /**
   * Generate test JWT token
   */
  generateTestToken: (userId) => {
    const { AuthService } = require('../services/authService');
    return AuthService.generateToken(userId);
  },

  /**
   * Create authenticated request headers
   */
  getAuthHeaders: (token) => {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  },

  /**
   * Wait for a specified time
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Mock console methods to reduce test noise
   */
  mockConsole: () => {
    const originalConsole = { ...console };
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.info = jest.fn();
    
    return () => {
      Object.assign(console, originalConsole);
    };
  }
};

// Mock nodemailer for email tests
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      accepted: ['test@example.com'],
      rejected: []
    }),
    verify: jest.fn().mockResolvedValue(true)
  }))
}));

// Mock Winston logger for cleaner test output
jest.mock('../utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn()
  };

  return {
    logger: mockLogger,
    httpLogger: jest.fn((req, res, next) => next()),
    securityLogger: jest.fn(),
    performanceLogger: jest.fn(),
    errorLogger: jest.fn((error, req, res, next) => next(error)),
    requestIdMiddleware: jest.fn((req, res, next) => {
      req.id = 'test-request-id';
      next();
    }),
    logError: jest.fn()
  };
});

// Suppress console output during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };
}

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = {
  mongoServer
};