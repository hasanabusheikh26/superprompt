/**
 * @fileoverview Logging utility
 * @description Winston-based structured logging system
 * @author SuperPrompt Team
 * @version 2.0.0
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logEntry = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logEntry += ` ${JSON.stringify(meta)}`;
    }
    
    return logEntry;
  })
);

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Create logs directory if it doesn't exist
const logsDir = process.env.LOG_DIRECTORY || './logs';

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: logFormat,
  transports: [],
  exitOnError: false
});

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let logEntry = `${timestamp} [${level}]: ${message}`;
        
        if (Object.keys(meta).length > 0) {
          logEntry += `\n${JSON.stringify(meta, null, 2)}`;
        }
        
        return logEntry;
      })
    )
  }));
}

// File transports for production
if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
  // Combined log file
  logger.add(new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: process.env.LOG_FILE_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_FILE_MAX_FILES || '14d',
    auditFile: path.join(logsDir, 'audit.json'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));

  // Error log file
  logger.add(new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: process.env.LOG_FILE_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_FILE_MAX_FILES || '14d',
    auditFile: path.join(logsDir, 'error-audit.json'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));

  // HTTP log file
  logger.add(new DailyRotateFile({
    filename: path.join(logsDir, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    maxSize: process.env.LOG_FILE_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_FILE_MAX_FILES || '7d',
    auditFile: path.join(logsDir, 'http-audit.json'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
}

// External logging services (production)
if (process.env.NODE_ENV === 'production') {
  // Papertrail transport
  if (process.env.PAPERTRAIL_HOST && process.env.PAPERTRAIL_PORT) {
    const Papertrail = require('winston-papertrail').Papertrail;
    
    logger.add(new Papertrail({
      host: process.env.PAPERTRAIL_HOST,
      port: parseInt(process.env.PAPERTRAIL_PORT),
      hostname: 'superprompt-api',
      program: 'api',
      colorize: true
    }));
  }

  // Sentry transport for errors
  if (process.env.SENTRY_DSN) {
    const Sentry = require('@sentry/node');
    
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1
    });

    // Custom Sentry transport
    class SentryTransport extends winston.Transport {
      log(info, callback) {
        if (info.level === 'error') {
          Sentry.captureException(new Error(info.message), {
            extra: info,
            level: 'error'
          });
        } else if (info.level === 'warn') {
          Sentry.captureMessage(info.message, {
            extra: info,
            level: 'warning'
          });
        }
        
        callback();
      }
    }

    logger.add(new SentryTransport());
  }
}

// HTTP request logger middleware
const httpLogger = winston.createLogger({
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      silent: process.env.NODE_ENV === 'test'
    })
  ]
});

// Express middleware for HTTP logging
const httpLoggerMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Capture original end function
  const originalEnd = res.end;
  
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    // Get response size
    const contentLength = res.get('content-length') || 0;
    
    // Log request/response details
    httpLogger.http('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: `${contentLength}b`,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      userId: req.user?._id,
      timestamp: new Date().toISOString()
    });
    
    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Security logger for authentication and authorization events
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5
    })
  ]
});

// Performance logger for monitoring
const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'performance.log'),
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 3
    })
  ]
});

// Utility functions
const logError = (error, context = {}) => {
  logger.error(error.message, {
    stack: error.stack,
    ...context
  });
};

const logSecurity = (event, details = {}) => {
  securityLogger.info(event, {
    timestamp: new Date().toISOString(),
    ...details
  });
};

const logPerformance = (operation, duration, details = {}) => {
  performanceLogger.info('Performance metric', {
    operation,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Request ID middleware for tracing
const requestIdMiddleware = (req, res, next) => {
  req.id = Math.random().toString(36).substring(2, 15);
  res.set('X-Request-ID', req.id);
  next();
};

// Error logging middleware
const errorLoggerMiddleware = (error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?._id,
    requestId: req.id
  });
  
  next(error);
};

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, closing logger...');
  logger.end();
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, closing logger...');
  logger.end();
});

// Export logger and middleware
module.exports = {
  logger,
  httpLogger: httpLoggerMiddleware,
  securityLogger: logSecurity,
  performanceLogger: logPerformance,
  errorLogger: errorLoggerMiddleware,
  requestIdMiddleware,
  logError
};