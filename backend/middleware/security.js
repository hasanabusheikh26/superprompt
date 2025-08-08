/**
 * @fileoverview Security middleware
 * @description Comprehensive security middleware stack
 * @author SuperPrompt Team
 * @version 2.0.0
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const DOMPurify = require('isomorphic-dompurify');
const cors = require('cors');
const compression = require('compression');
const { logger, securityLogger } = require('../utils/logger');

/**
 * Security headers middleware
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
    reportOnly: process.env.CSP_REPORT_ONLY === 'true'
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * CORS configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:3001', 'chrome-extension://*'];
    
    // Check for chrome extension
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }
    
    // Check exact matches
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check wildcard patterns
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      return callback(null, true);
    }
    
    // Log blocked origin for security monitoring
    securityLogger('CORS blocked', {
      origin,
      allowedOrigins,
      userAgent: this.req?.get('user-agent'),
      ip: this.req?.ip
    });
    
    callback(new Error('CORS: Origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-Request-ID'
  ],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};

/**
 * Global rate limiting
 */
const globalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
  handler: (req, res) => {
    securityLogger('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      path: req.path,
      method: req.method
    });
    
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    });
  }
});

/**
 * Authentication rate limiting
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5,
  message: {
    error: 'Too many authentication attempts, please try again later',
    retryAfter: 900 // 15 minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    securityLogger('Auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      path: req.path,
      email: req.body?.email
    });
    
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later',
      retryAfter: 900
    });
  }
});

/**
 * Sensitive operations rate limiting
 */
const sensitiveRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'Too many sensitive operations, please try again later',
    retryAfter: 3600
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    securityLogger('Sensitive operation rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      path: req.path
    });
    
    res.status(429).json({
      error: 'Too many sensitive operations, please try again later',
      retryAfter: 3600
    });
  }
});

/**
 * Input sanitization middleware
 */
const inputSanitization = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    logger.error('Input sanitization error', {
      error: error.message,
      url: req.originalUrl,
      method: req.method
    });
    
    res.status(400).json({
      error: 'Invalid input data'
    });
  }
};

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    // Remove potential XSS payloads
    return DOMPurify.sanitize(obj, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });
  }
  
  return obj;
}

/**
 * Security logging middleware
 */
const securityLogging = (req, res, next) => {
  // Log suspicious patterns
  const suspiciousPatterns = [
    /(<script|javascript:|on\w+\s*=)/i,
    /(union\s+select|drop\s+table|insert\s+into)/i,
    /(\.\.\/|\.\.\\)/,
    /(<iframe|<object|<embed)/i
  ];
  
  const requestString = JSON.stringify({
    url: req.originalUrl,
    body: req.body,
    query: req.query
  });
  
  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(requestString)) {
      securityLogger('Suspicious request pattern detected', {
        pattern: pattern.source,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        query: req.query
      });
    }
  });
  
  next();
};

/**
 * Secure compression middleware
 */
const secureCompression = compression({
  filter: (req, res) => {
    // Don't compress responses if the request is suspicious
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Fallback to standard filter
    return compression.filter(req, res);
  },
  level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
  threshold: 1024 // Only compress responses larger than 1KB
});

/**
 * Request size limiting middleware
 */
const requestSizeLimit = (req, res, next) => {
  const maxSize = parseInt(process.env.MAX_REQUEST_SIZE) || 10 * 1024 * 1024; // 10MB
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    securityLogger('Request size limit exceeded', {
      contentLength: req.headers['content-length'],
      maxSize,
      ip: req.ip,
      url: req.originalUrl
    });
    
    return res.status(413).json({
      error: 'Request entity too large',
      maxSize: `${maxSize / 1024 / 1024}MB`
    });
  }
  
  next();
};

/**
 * API security headers middleware
 */
const apiSecurityHeaders = (req, res, next) => {
  // API-specific security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  next();
};

/**
 * Content Security Policy for API responses
 */
const apiCSP = (req, res, next) => {
  res.set('Content-Security-Policy', "default-src 'none'");
  next();
};

/**
 * IP whitelisting middleware (for admin endpoints)
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip;
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      securityLogger('IP not whitelisted', {
        ip: clientIP,
        allowedIPs,
        url: req.originalUrl
      });
      
      return res.status(403).json({
        error: 'Access forbidden: IP not whitelisted'
      });
    }
    
    next();
  };
};

/**
 * Honeypot middleware (for bot detection)
 */
const honeypot = (req, res, next) => {
  // Check for honeypot fields in request body
  const honeypotFields = ['website', 'url', 'homepage'];
  
  if (req.body) {
    const hasHoneypot = honeypotFields.some(field => 
      req.body[field] && req.body[field].trim() !== ''
    );
    
    if (hasHoneypot) {
      securityLogger('Honeypot triggered', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        honeypotFields: honeypotFields.filter(field => req.body[field]),
        url: req.originalUrl
      });
      
      // Silently reject the request
      return res.status(200).json({ success: true });
    }
  }
  
  next();
};

module.exports = {
  securityHeaders,
  corsOptions,
  globalRateLimit,
  authRateLimit,
  sensitiveRateLimit,
  inputSanitization,
  securityLogging,
  secureCompression,
  requestSizeLimit,
  apiSecurityHeaders,
  apiCSP,
  ipWhitelist,
  honeypot
};