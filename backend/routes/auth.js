/**
 * @fileoverview Authentication routes with production-grade security
 * @description Handles user authentication, email verification, password reset
 * @author SuperPrompt Team
 * @version 2.0.0
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult, param } = require('express-validator');
const helmet = require('helmet');
const DOMPurify = require('isomorphic-dompurify');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { sendEmail } = require('../services/emailService');
const { AuthService } = require('../services/authService');

const router = express.Router();

// Apply helmet security headers to auth routes
router.use(helmet());

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit password reset attempts
  message: { error: 'Too many password reset attempts, please try again later.' },
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = DOMPurify.sanitize(req.body[key].trim());
      }
    }
  }
  next();
};

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', 
  authLimiter,
  sanitizeInput,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be 8+ chars with uppercase, lowercase, number, and special character'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be 2-50 characters'),
  ], 
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Signup validation failed', { 
          errors: errors.array(), 
          ip: req.ip,
          userAgent: req.get('user-agent')
        });
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        logger.warn('Signup attempt with existing email', { email, ip: req.ip });
        return res.status(409).json({ 
          error: 'User already exists with this email.' 
        });
      }

      // Create user using service
      const result = await AuthService.createUser({ email, password, name });
      
      // Send verification email
      await sendEmail.sendVerificationEmail(result.user.email, result.verificationToken);

      // Log successful signup
      logger.info('User signup successful', { 
        userId: result.user._id,
        email: result.user.email,
        duration: Date.now() - startTime
      });

      res.status(201).json({
        success: true,
        token: result.token,
        user: result.user.toJSON(),
        message: 'Account created. Please check your email for verification.'
      });

    } catch (error) {
      logger.error('Signup error', { 
        error: error.message, 
        stack: error.stack,
        ip: req.ip,
        duration: Date.now() - startTime
      });
      
      res.status(500).json({ 
        error: 'Server error during signup. Please try again later.' 
      });
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return token
 * @access  Public
 */
router.post('/login',
  authLimiter,
  sanitizeInput,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Login validation failed', { 
          errors: errors.array(), 
          ip: req.ip 
        });
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password } = req.body;

      // Authenticate user using service
      const result = await AuthService.authenticateUser(email, password);
      
      if (!result.success) {
        logger.warn('Login attempt failed', { 
          email, 
          reason: result.error,
          ip: req.ip 
        });
        return res.status(401).json({ error: result.error });
      }

      // Set secure cookie
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      res.cookie('authToken', result.token, cookieOptions);

      logger.info('User login successful', { 
        userId: result.user._id,
        email: result.user.email,
        duration: Date.now() - startTime
      });

      res.json({
        success: true,
        token: result.token,
        user: result.user.toJSON()
      });

    } catch (error) {
      logger.error('Login error', { 
        error: error.message, 
        stack: error.stack,
        ip: req.ip,
        duration: Date.now() - startTime
      });
      
      res.status(500).json({ 
        error: 'Server error during login. Please try again later.' 
      });
    }
  }
);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify user email with token
 * @access  Public
 */
router.get('/verify',
  [
    param('token').isLength({ min: 32 }).withMessage('Invalid verification token'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Invalid verification token format' 
        });
      }

      const { token } = req.query;
      const result = await AuthService.verifyEmail(token);

      if (!result.success) {
        logger.warn('Email verification failed', { token, ip: req.ip });
        return res.status(400).json({ error: result.error });
      }

      logger.info('Email verification successful', { 
        userId: result.user._id,
        email: result.user.email 
      });

      res.json({ 
        success: true, 
        message: 'Email verified successfully.' 
      });

    } catch (error) {
      logger.error('Email verification error', { 
        error: error.message, 
        token: req.query.token,
        ip: req.ip 
      });
      
      res.status(500).json({ 
        error: 'Server error during verification.' 
      });
    }
  }
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/reset-password',
  resetLimiter,
  sanitizeInput,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Valid email is required' 
        });
      }

      const { email } = req.body;
      const result = await AuthService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      logger.info('Password reset requested', { email, ip: req.ip });
      
      res.json({ 
        success: true, 
        message: 'If an account exists with this email, you will receive a password reset link.' 
      });

    } catch (error) {
      logger.error('Password reset request error', { 
        error: error.message,
        email: req.body.email,
        ip: req.ip 
      });
      
      res.status(500).json({ 
        error: 'Server error during password reset request.' 
      });
    }
  }
);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password/:token',
  sanitizeInput,
  [
    param('token').isLength({ min: 32 }).withMessage('Invalid reset token'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be 8+ chars with uppercase, lowercase, number, and special character'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { token } = req.params;
      const { password } = req.body;

      const result = await AuthService.resetPassword(token, password);

      if (!result.success) {
        logger.warn('Password reset failed', { token, ip: req.ip });
        return res.status(400).json({ error: result.error });
      }

      logger.info('Password reset successful', { 
        userId: result.user._id,
        ip: req.ip 
      });

      res.json({ 
        success: true, 
        message: 'Password reset successfully.' 
      });

    } catch (error) {
      logger.error('Password reset error', { 
        error: error.message,
        token: req.params.token,
        ip: req.ip 
      });
      
      res.status(500).json({ 
        error: 'Server error during password reset.' 
      });
    }
  }
);

/**
 * @route   GET /api/auth/validate
 * @desc    Validate current user token
 * @access  Private
 */
router.get('/validate', auth, async (req, res) => {
  try {
    logger.info('Token validation', { userId: req.user._id });
    
    res.json({
      success: true,
      user: req.user.toJSON()
    });
  } catch (error) {
    logger.error('Token validation error', { 
      error: error.message,
      userId: req.user?._id 
    });
    
    res.status(500).json({ 
      error: 'Server error during token validation.' 
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh authentication token
 * @access  Private
 */
router.post('/refresh', auth, async (req, res) => {
  try {
    const newToken = await AuthService.refreshToken(req.user._id);
    
    // Update secure cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    res.cookie('authToken', newToken, cookieOptions);

    logger.info('Token refresh successful', { userId: req.user._id });

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    logger.error('Token refresh error', { 
      error: error.message,
      userId: req.user?._id 
    });
    
    res.status(500).json({ 
      error: 'Server error during token refresh.' 
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and clear cookies
 * @access  Private
 */
router.post('/logout', auth, async (req, res) => {
  try {
    // Clear auth cookie
    res.clearCookie('authToken');
    
    logger.info('User logout', { userId: req.user._id });
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error', { 
      error: error.message,
      userId: req.user?._id 
    });
    
    res.status(500).json({ 
      error: 'Server error during logout.' 
    });
  }
});

module.exports = router;