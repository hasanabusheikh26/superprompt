/**
 * @fileoverview Enhanced User model with security and features
 * @description Mongoose schema for user management with advanced security
 * @author SuperPrompt Team
 * @version 2.0.0
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ],
    index: true
  },
  password: {
    type: String,
    required: function() {
      return !this.oauthProvider; // Password required only for non-OAuth users
    },
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include in queries by default
  },
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
    default: 'User'
  },
  avatar: {
    type: String,
    default: null
  },
  
  // Account status and verification
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  verificationToken: {
    type: String,
    select: false
  },
  verificationTokenExpires: {
    type: Date,
    select: false
  },
  
  // Password reset
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },
  passwordChangedAt: {
    type: Date,
    default: Date.now
  },
  
  // OAuth integration
  oauthProvider: {
    type: String,
    enum: ['google', 'github', 'microsoft', null],
    default: null
  },
  oauthId: {
    type: String,
    sparse: true, // Allow multiple null values
    index: true
  },
  oauthData: {
    type: mongoose.Schema.Types.Mixed,
    select: false
  },
  
  // User preferences and settings
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en',
      maxlength: 5
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    }
  },
  
  // Subscription and limits
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'past_due'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    stripeCustomerId: String,
    stripeSubscriptionId: String
  },
  
  // Usage tracking
  usage: {
    promptsCreated: {
      type: Number,
      default: 0
    },
    promptsShared: {
      type: Number,
      default: 0
    },
    apiCalls: {
      type: Number,
      default: 0
    },
    storageUsed: {
      type: Number,
      default: 0 // in bytes
    },
    lastUsage: {
      type: Date,
      default: Date.now
    }
  },
  
  // Security tracking
  security: {
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date,
    lastLoginIP: String,
    lastLoginLocation: String,
    deviceTokens: [{
      token: String,
      platform: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String,
      select: false
    },
    backupCodes: [{
      type: String,
      select: false
    }]
  },
  
  // Role and permissions
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin', 'super_admin'],
    default: 'user'
  },
  permissions: [{
    type: String,
    enum: [
      'create_prompts',
      'edit_prompts',
      'delete_prompts',
      'share_prompts',
      'access_analytics',
      'manage_users',
      'manage_system'
    ]
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  
  // Soft delete
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: { updatedAt: 'updatedAt' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ oauthProvider: 1, oauthId: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastActive: -1 });
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ deletedAt: 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
});

// Virtual for full name display
userSchema.virtual('displayName').get(function() {
  return this.name || this.email.split('@')[0];
});

// Virtual for subscription status
userSchema.virtual('isSubscriptionActive').get(function() {
  if (this.subscription.plan === 'free') return true;
  return this.subscription.status === 'active' && 
         (!this.subscription.endDate || this.subscription.endDate > new Date());
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  try {
    // Only hash password if it's modified and exists
    if (!this.isModified('password') || !this.password) {
      return next();
    }
    
    // Update password changed timestamp
    if (this.isModified('password') && !this.isNew) {
      this.passwordChangedAt = Date.now();
    }
    
    // Hash password with dynamic salt rounds based on environment
    const saltRounds = process.env.BCRYPT_SALT_ROUNDS ? 
      parseInt(process.env.BCRYPT_SALT_ROUNDS) : 12;
    
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    
    next();
  } catch (error) {
    logger.error('Password hashing error', {
      error: error.message,
      userId: this._id
    });
    next(error);
  }
});

// Update updatedAt before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    if (!this.password) {
      return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    logger.error('Password comparison error', {
      error: error.message,
      userId: this._id
    });
    return false;
  }
};

userSchema.methods.generateVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.verificationToken = token;
  this.verificationTokenExpires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  return token;
};

userSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = token;
  this.resetPasswordExpires = Date.now() + (60 * 60 * 1000); // 1 hour
  return token;
};

userSchema.methods.incrementLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'security.lockUntil': 1 },
      $set: { 'security.loginAttempts': 1 }
    });
  }
  
  const updates = { $inc: { 'security.loginAttempts': 1 } };
  
  // Lock account after 5 failed attempts
  if (this.security.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { 'security.lockUntil': Date.now() + (2 * 60 * 60 * 1000) }; // 2 hours
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { 'security.loginAttempts': 1, 'security.lockUntil': 1 }
  });
};

userSchema.methods.updateLastLogin = function(ip, location) {
  this.lastLogin = new Date();
  this.lastActive = new Date();
  this.security.lastLoginIP = ip;
  this.security.lastLoginLocation = location;
  return this.save();
};

userSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

userSchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  
  // Remove sensitive fields
  delete user.password;
  delete user.verificationToken;
  delete user.verificationTokenExpires;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  delete user.oauthData;
  delete user.security.twoFactorSecret;
  delete user.security.backupCodes;
  delete user.__v;
  
  return user;
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase(),
    deletedAt: null 
  });
};

userSchema.statics.findActive = function() {
  return this.find({ 
    isActive: true,
    deletedAt: null 
  });
};

userSchema.statics.findBySubscription = function(plan) {
  return this.find({
    'subscription.plan': plan,
    deletedAt: null
  });
};

// Query middleware to exclude deleted users by default
userSchema.pre(/^find/, function(next) {
  // Only apply if deletedAt filter isn't already set
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null });
  }
  next();
});

module.exports = mongoose.model('User', userSchema);