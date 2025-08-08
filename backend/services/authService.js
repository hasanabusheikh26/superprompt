/**
 * @fileoverview Authentication service layer
 * @description Handles all authentication business logic
 * @author SuperPrompt Team
 * @version 2.0.0
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const { EmailService } = require('./emailService');

class AuthService {
  /**
   * Generate JWT token
   * @param {string} userId - User ID
   * @param {object} options - Token options
   * @returns {string} JWT token
   */
  static generateToken(userId, options = {}) {
    const payload = {
      userId,
      iat: Math.floor(Date.now() / 1000),
      iss: 'superprompt-api',
      aud: 'superprompt-app'
    };

    const defaultOptions = {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      algorithm: 'HS256'
    };

    return jwt.sign(payload, process.env.JWT_SECRET, { ...defaultOptions, ...options });
  }

  /**
   * Generate refresh token
   * @param {string} userId - User ID
   * @returns {string} Refresh token
   */
  static generateRefreshToken(userId) {
    return this.generateToken(userId, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
    });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {object} Decoded token payload
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'superprompt-api',
        audience: 'superprompt-app'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        const expiredError = new Error('Token expired');
        expiredError.code = 'TOKEN_EXPIRED';
        throw expiredError;
      }
      throw new Error('Invalid token');
    }
  }

  /**
   * Register a new user
   * @param {object} userData - User registration data
   * @returns {object} Created user and token
   */
  static async register(userData) {
    try {
      const { email, password, name } = userData;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        const error = new Error('User with this email already exists');
        error.code = 'USER_EXISTS';
        throw error;
      }

      // Create new user
      const user = new User({
        email: email.toLowerCase().trim(),
        password,
        name: name?.trim() || 'User',
        verificationToken: crypto.randomBytes(32).toString('hex'),
        verificationTokenExpires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      });

      await user.save();

      // Send verification email
      if (process.env.FEATURE_EMAIL_VERIFICATION === 'true') {
        await EmailService.sendVerificationEmail(user);
      } else {
        // Auto-verify in development
        user.isVerified = true;
        await user.save();
      }

      // Generate tokens
      const token = this.generateToken(user._id);
      const refreshToken = this.generateRefreshToken(user._id);

      // Log registration
      logger.info('User registered', {
        userId: user._id,
        email: user.email,
        verified: user.isVerified
      });

      return {
        user: user.toJSON(),
        token,
        refreshToken
      };

    } catch (error) {
      logger.error('Registration failed', {
        error: error.message,
        email: userData.email
      });
      throw error;
    }
  }

  /**
   * Authenticate user login
   * @param {object} credentials - Login credentials
   * @param {string} ip - User IP address
   * @returns {object} User and token
   */
  static async login(credentials, ip = null) {
    try {
      const { email, password } = credentials;

      // Find user with password field
      const user = await User.findOne({ 
        email: email.toLowerCase().trim() 
      }).select('+password +security.loginAttempts +security.lockUntil');

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if account is locked
      if (user.isLocked) {
        const error = new Error('Account is temporarily locked due to too many failed login attempts');
        error.code = 'ACCOUNT_LOCKED';
        throw error;
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        // Increment login attempts
        await user.incrementLoginAttempts();
        throw new Error('Invalid email or password');
      }

      // Check if user is verified
      if (!user.isVerified) {
        const error = new Error('Please verify your email address before logging in');
        error.code = 'EMAIL_NOT_VERIFIED';
        throw error;
      }

      // Reset login attempts on successful login
      await user.resetLoginAttempts();

      // Update last login info
      await user.updateLastLogin(ip);

      // Generate tokens
      const token = this.generateToken(user._id);
      const refreshToken = this.generateRefreshToken(user._id);

      // Log successful login
      logger.info('User logged in', {
        userId: user._id,
        email: user.email,
        ip: ip
      });

      return {
        user: user.toJSON(),
        token,
        refreshToken
      };

    } catch (error) {
      logger.warn('Login attempt failed', {
        error: error.message,
        email: credentials.email,
        ip: ip
      });
      throw error;
    }
  }

  /**
   * Verify email address
   * @param {string} token - Verification token
   * @returns {object} Verification result
   */
  static async verifyEmail(token) {
    try {
      const user = await User.findOne({
        verificationToken: token,
        verificationTokenExpires: { $gt: Date.now() }
      }).select('+verificationToken +verificationTokenExpires');

      if (!user) {
        const error = new Error('Invalid or expired verification token');
        error.code = 'INVALID_TOKEN';
        throw error;
      }

      // Mark user as verified
      user.isVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();

      logger.info('Email verified', {
        userId: user._id,
        email: user.email
      });

      return { message: 'Email verified successfully' };

    } catch (error) {
      logger.error('Email verification failed', {
        error: error.message,
        token: token.substring(0, 8) + '...'
      });
      throw error;
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {object} Reset result
   */
  static async requestPasswordReset(email) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        return { message: 'If an account with that email exists, a password reset link has been sent.' };
      }

      // Generate reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      // Send reset email
      await EmailService.sendPasswordResetEmail(user, resetToken);

      logger.info('Password reset requested', {
        userId: user._id,
        email: user.email
      });

      return { message: 'If an account with that email exists, a password reset link has been sent.' };

    } catch (error) {
      logger.error('Password reset request failed', {
        error: error.message,
        email: email
      });
      throw error;
    }
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {object} Reset result
   */
  static async resetPassword(token, newPassword) {
    try {
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      }).select('+resetPasswordToken +resetPasswordExpires');

      if (!user) {
        const error = new Error('Invalid or expired reset token');
        error.code = 'INVALID_TOKEN';
        throw error;
      }

      // Update password
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      user.passwordChangedAt = new Date();
      await user.save();

      logger.info('Password reset successful', {
        userId: user._id,
        email: user.email
      });

      return { message: 'Password has been reset successfully' };

    } catch (error) {
      logger.error('Password reset failed', {
        error: error.message,
        token: token.substring(0, 8) + '...'
      });
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {object} Change result
   */
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      user.passwordChangedAt = new Date();
      await user.save();

      logger.info('Password changed', {
        userId: user._id,
        email: user.email
      });

      return { message: 'Password changed successfully' };

    } catch (error) {
      logger.error('Password change failed', {
        error: error.message,
        userId: userId
      });
      throw error;
    }
  }

  /**
   * Refresh JWT token
   * @param {string} refreshToken - Refresh token
   * @returns {object} New tokens
   */
  static async refreshToken(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken);
      const user = await User.findById(decoded.userId);

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      const newToken = this.generateToken(user._id);
      const newRefreshToken = this.generateRefreshToken(user._id);

      logger.info('Token refreshed', {
        userId: user._id,
        email: user.email
      });

      return {
        token: newToken,
        refreshToken: newRefreshToken
      };

    } catch (error) {
      logger.warn('Token refresh failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate user session
   * @param {string} userId - User ID
   * @returns {object} User data
   */
  static async validateSession(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.isActive) {
        throw new Error('Invalid session');
      }

      // Update last active
      user.lastActive = new Date();
      await user.save();

      return user.toJSON();

    } catch (error) {
      logger.warn('Session validation failed', {
        error: error.message,
        userId: userId
      });
      throw error;
    }
  }

  /**
   * Logout user (invalidate session)
   * @param {string} userId - User ID
   * @returns {object} Logout result
   */
  static async logout(userId) {
    try {
      // In a more advanced implementation, you would maintain a blacklist
      // of invalidated tokens or use a session store
      logger.info('User logged out', {
        userId: userId
      });

      return { message: 'Logged out successfully' };

    } catch (error) {
      logger.error('Logout failed', {
        error: error.message,
        userId: userId
      });
      throw error;
    }
  }
}

module.exports = { AuthService };