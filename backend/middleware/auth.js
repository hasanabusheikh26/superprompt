/**
 * @fileoverview Authentication middleware with enhanced security
 * @description JWT validation, role-based access, security logging
 * @author SuperPrompt Team
 * @version 2.0.0
 */

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { logger, securityLogger } = require('../utils/logger');
const { AuthService } = require('../services/authService');

/**
 * Enhanced authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const auth = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    // Extract token from multiple sources
    const token = extractToken(req);
    
    if (!token) {
      securityLogger('Access denied', {
        reason: 'No token provided',
        url: req.originalUrl,
        ip: req.ip
      });
      return res.status(401).json({ 
        error: 'Access denied. Authentication required.',
        code: 'NO_TOKEN'
      });
    }

    // Verify token with enhanced validation
    const decoded = AuthService.verifyToken(token);
    
    // Find user and check if account is active
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      securityLogger('Access denied', {
        reason: 'User not found',
        userId: decoded.userId,
        url: req.originalUrl,
        ip: req.ip
      });
      return res.status(401).json({ 
        error: 'Invalid token. User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      securityLogger('Access denied', {
        reason: 'Account deactivated',
        userId: user._id,
        url: req.originalUrl,
        ip: req.ip
      });
      return res.status(403).json({ 
        error: 'Account has been deactivated.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    if (!user.isVerified && req.originalUrl !== '/api/auth/verify') {
      return res.status(403).json({ 
        error: 'Please verify your email address.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // Add user and token to request
    req.user = user;
    req.token = token;
    req.authTime = Date.now() - startTime;

    // Log successful authentication
    logger.debug('Authentication successful', {
      userId: user._id,
      endpoint: req.originalUrl,
      duration: `${Date.now() - startTime}ms`
    });

    next();

  } catch (error) {
    const errorCode = getJWTErrorCode(error);
    
    securityLogger('Access denied', {
      reason: error.message,
      url: req.originalUrl,
      ip: req.ip
    });
    
    logger.warn('Authentication failed', {
      error: error.message,
      endpoint: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(401).json({ 
      error: 'Invalid or expired token.',
      code: errorCode
    });
  }
};

/**
 * Optional authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const decoded = AuthService.verifyToken(token);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = user;
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication on error
    next();
  }
};

/**
 * Role-based authorization middleware
 * @param {Array} allowedRoles - Array of allowed roles
 * @returns {Function} Middleware function
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role || 'user';
    
    if (!allowedRoles.includes(userRole)) {
      securityLogger('Access denied', {
        reason: `Insufficient role: ${userRole}`,
        userId: req.user._id,
        url: req.originalUrl,
        ip: req.ip
      });
      
      return res.status(403).json({ 
        error: 'Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

/**
 * Ownership validation middleware
 * @param {string} resourceField - Field name containing the resource ID
 * @param {string} ownerField - Field name containing the owner ID
 * @returns {Function} Middleware function
 */
const checkOwnership = (resourceField = 'id', ownerField = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required.',
          code: 'AUTH_REQUIRED'
        });
      }

      const resourceId = req.params[resourceField];
      
      // Find the resource and check ownership
      const Model = getModelForEndpoint(req.originalUrl);
      if (!Model) {
        return next(); // Skip ownership check if model not found
      }

      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({ 
          error: 'Resource not found.',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      if (resource[ownerField].toString() !== req.user._id.toString()) {
        securityLogger('Access denied', {
          reason: 'Resource ownership violation',
          userId: req.user._id,
          url: req.originalUrl,
          ip: req.ip
        });
        
        return res.status(403).json({ 
          error: 'Access denied. You can only access your own resources.',
          code: 'OWNERSHIP_VIOLATION'
        });
      }

      req.resource = resource;
      next();

    } catch (error) {
      logger.error('Ownership check failed', {
        error: error.message,
        userId: req.user?._id,
        resourceId: req.params[resourceField]
      });
      
      res.status(500).json({ 
        error: 'Server error during authorization check.' 
      });
    }
  };
};

/**
 * API key authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key required.',
        code: 'API_KEY_REQUIRED'
      });
    }

    // TODO: Implement API key validation
    // For now, just check if it matches environment variable
    if (apiKey !== process.env.API_KEY) {
      securityLogger('Access denied', {
        reason: 'Invalid API key',
        url: req.originalUrl,
        ip: req.ip
      });
      return res.status(401).json({ 
        error: 'Invalid API key.',
        code: 'INVALID_API_KEY'
      });
    }

    logger.info('API key authentication successful', {
      endpoint: req.originalUrl,
      ip: req.ip
    });

    next();

  } catch (error) {
    logger.error('API key authentication failed', {
      error: error.message,
      endpoint: req.originalUrl,
      ip: req.ip
    });
    
    res.status(500).json({ 
      error: 'Server error during API authentication.' 
    });
  }
};

/**
 * Rate limiting middleware for sensitive operations
 */
const sensitiveOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each user to 3 requests per windowMs
  keyGenerator: (req) => {
    return req.user?._id || req.ip;
  },
  message: { 
    error: 'Too many sensitive operations attempted. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Extract token from request headers or cookies
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token
 */
function extractToken(req) {
  // Check Authorization header
  const authHeader = req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }

  // Check cookies
  if (req.cookies?.authToken) {
    return req.cookies.authToken;
  }

  // Check custom header
  if (req.header('X-Auth-Token')) {
    return req.header('X-Auth-Token');
  }

  return null;
}

/**
 * Get JWT error code for better client handling
 * @param {Error} error - JWT error
 * @returns {string} Error code
 */
function getJWTErrorCode(error) {
  if (error.name === 'TokenExpiredError') {
    return 'TOKEN_EXPIRED';
  } else if (error.name === 'JsonWebTokenError') {
    return 'TOKEN_INVALID';
  } else if (error.name === 'NotBeforeError') {
    return 'TOKEN_NOT_ACTIVE';
  }
  return 'TOKEN_ERROR';
}

/**
 * Get model based on endpoint for ownership checking
 * @param {string} url - Request URL
 * @returns {Object|null} Mongoose model
 */
function getModelForEndpoint(url) {
  if (url.includes('/prompts')) {
    return require('../models/Prompt');
  }
  // Add more models as needed
  return null;
}

module.exports = {
  auth,
  authenticateToken: auth, // Alias for backward compatibility
  optionalAuth,
  authorize,
  checkOwnership,
  apiKeyAuth,
  sensitiveOperationLimiter,
  extractToken
};