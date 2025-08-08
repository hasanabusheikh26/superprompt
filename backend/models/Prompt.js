/**
 * @fileoverview Enhanced Prompt model with advanced features
 * @description Mongoose schema for prompt management with versioning, analytics
 * @author SuperPrompt Team
 * @version 2.0.0
 */

const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const promptSchema = new mongoose.Schema({
  // Basic information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    default: function() {
      // Generate title from first 50 chars of content
      return this.content ? 
        this.content.substring(0, 50).replace(/\n/g, ' ').trim() + '...' : 
        'Untitled Prompt';
    }
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    maxlength: [50000, 'Content cannot exceed 50000 characters'],
    minlength: [1, 'Content cannot be empty']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Organization
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  folder: {
    type: String,
    trim: true,
    maxlength: [100, 'Folder name cannot exceed 100 characters'],
    index: true
  },
  category: {
    type: String,
    enum: ['general', 'work', 'creative', 'technical', 'personal', 'educational'],
    default: 'general',
    index: true
  },
  
  // Visibility and sharing
  visibility: {
    type: String,
    enum: ['private', 'public', 'shared', 'team'],
    default: 'private',
    index: true
  },
  isPublic: {
    type: Boolean,
    default: false,
    index: true
  },
  shareSettings: {
    allowCopy: {
      type: Boolean,
      default: true
    },
    allowModify: {
      type: Boolean,
      default: false
    },
    expiresAt: Date,
    password: String,
    maxViews: Number,
    currentViews: {
      type: Number,
      default: 0
    }
  },
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    version: Number,
    content: String,
    modifiedAt: Date,
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changeNote: String
  }],
  
  // Usage analytics
  analytics: {
    usageCount: {
      type: Number,
      default: 0
    },
    lastUsed: Date,
    avgRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    favorites: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    },
    copies: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    }
  },
  
  // AI Enhancement data
  aiData: {
    model: String,
    parameters: mongoose.Schema.Types.Mixed,
    tokens: {
      input: Number,
      output: Number
    },
    cost: Number,
    enhancementHistory: [{
      date: Date,
      originalLength: Number,
      enhancedLength: Number,
      improvement: String
    }]
  },
  
  // Template data
  template: {
    isTemplate: {
      type: Boolean,
      default: false
    },
    variables: [{
      name: String,
      type: {
        type: String,
        enum: ['text', 'number', 'select', 'boolean']
      },
      required: Boolean,
      defaultValue: mongoose.Schema.Types.Mixed,
      options: [String] // For select type
    }],
    instructions: String
  },
  
  // Collaboration
  collaborators: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'owner'],
      default: 'viewer'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Comments and feedback
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    replies: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      content: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  
  // Quality and moderation
  quality: {
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    factors: {
      clarity: Number,
      completeness: Number,
      originality: Number,
      effectiveness: Number
    },
    lastAnalyzed: Date
  },
  moderation: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'approved'
    },
    flagged: {
      type: Boolean,
      default: false
    },
    flagReason: String,
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: Date
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  
  // Soft delete
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { updatedAt: 'updatedAt' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
promptSchema.index({ userId: 1, createdAt: -1 });
promptSchema.index({ userId: 1, folder: 1 });
promptSchema.index({ userId: 1, tags: 1 });
promptSchema.index({ visibility: 1, isPublic: 1 });
promptSchema.index({ category: 1 });
promptSchema.index({ 'analytics.usageCount': -1 });
promptSchema.index({ 'analytics.avgRating': -1 });
promptSchema.index({ updatedAt: -1 });
promptSchema.index({ deletedAt: 1 });

// Text index for search
promptSchema.index({
  title: 'text',
  content: 'text',
  description: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    content: 5,
    description: 3,
    tags: 2
  }
});

// Virtuals
promptSchema.virtual('isOwner').get(function() {
  return (userId) => this.userId.toString() === userId.toString();
});

promptSchema.virtual('wordCount').get(function() {
  return this.content ? this.content.split(/\s+/).length : 0;
});

promptSchema.virtual('readingTime').get(function() {
  const wpm = 200; // Average reading speed
  return Math.ceil(this.wordCount / wpm);
});

promptSchema.virtual('collaboratorCount').get(function() {
  return this.collaborators ? this.collaborators.length : 0;
});

// Middleware
promptSchema.pre('save', function(next) {
  try {
    // Update timestamps
    this.updatedAt = new Date();
    
    // Update version if content changed
    if (this.isModified('content') && !this.isNew) {
      this.version += 1;
      
      // Store previous version if significant change
      const previousContent = this.getUpdate?.()?.$set?.content;
      if (previousContent && previousContent !== this.content) {
        this.previousVersions.push({
          version: this.version - 1,
          content: previousContent,
          modifiedAt: new Date(),
          modifiedBy: this.userId
        });
        
        // Keep only last 10 versions
        if (this.previousVersions.length > 10) {
          this.previousVersions = this.previousVersions.slice(-10);
        }
      }
    }
    
    // Clean up tags
    if (this.tags) {
      this.tags = [...new Set(this.tags.filter(tag => tag && tag.trim()))];
    }
    
    // Update quality score based on content
    if (this.isModified('content')) {
      this.updateQualityScore();
    }
    
    next();
  } catch (error) {
    logger.error('Prompt pre-save error', {
      error: error.message,
      promptId: this._id
    });
    next(error);
  }
});

// Methods
promptSchema.methods.incrementUsage = function() {
  this.analytics.usageCount += 1;
  this.analytics.lastUsed = new Date();
  this.lastAccessedAt = new Date();
  return this.save();
};

promptSchema.methods.addRating = function(rating) {
  const currentTotal = this.analytics.avgRating * this.analytics.totalRatings;
  this.analytics.totalRatings += 1;
  this.analytics.avgRating = (currentTotal + rating) / this.analytics.totalRatings;
  return this.save();
};

promptSchema.methods.addToFavorites = function() {
  this.analytics.favorites += 1;
  return this.save();
};

promptSchema.methods.removeFromFavorites = function() {
  this.analytics.favorites = Math.max(0, this.analytics.favorites - 1);
  return this.save();
};

promptSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  this.lastAccessedAt = new Date();
  return this.save();
};

promptSchema.methods.clone = function(newUserId) {
  const cloned = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    userId: newUserId,
    title: `Copy of ${this.title}`,
    visibility: 'private',
    isPublic: false,
    analytics: {
      usageCount: 0,
      avgRating: 0,
      totalRatings: 0,
      favorites: 0,
      views: 0,
      copies: 0,
      shares: 0
    },
    collaborators: [],
    comments: [],
    version: 1,
    previousVersions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  // Increment original's copy count
  this.analytics.copies += 1;
  this.save();
  
  return cloned;
};

promptSchema.methods.updateQualityScore = function() {
  let score = 50; // Base score
  
  const contentLength = this.content.length;
  const wordCount = this.wordCount;
  
  // Length factors
  if (contentLength > 100 && contentLength < 5000) score += 10;
  if (wordCount > 20 && wordCount < 1000) score += 10;
  
  // Structure factors
  if (this.title && this.title.length > 5) score += 5;
  if (this.description && this.description.length > 10) score += 5;
  if (this.tags && this.tags.length > 0) score += 5;
  
  // Usage factors
  if (this.analytics.avgRating > 3) score += 10;
  if (this.analytics.usageCount > 10) score += 5;
  
  this.quality.score = Math.min(100, Math.max(0, score));
  this.quality.lastAnalyzed = new Date();
};

promptSchema.methods.addCollaborator = function(userId, role = 'viewer', addedBy) {
  // Check if already a collaborator
  const existing = this.collaborators.find(c => 
    c.userId.toString() === userId.toString()
  );
  
  if (existing) {
    existing.role = role;
  } else {
    this.collaborators.push({
      userId,
      role,
      addedBy,
      addedAt: new Date()
    });
  }
  
  return this.save();
};

promptSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(c => 
    c.userId.toString() !== userId.toString()
  );
  return this.save();
};

promptSchema.methods.canAccess = function(userId, action = 'read') {
  // Owner has full access
  if (this.userId.toString() === userId.toString()) {
    return true;
  }
  
  // Public prompts can be read
  if (this.isPublic && action === 'read') {
    return true;
  }
  
  // Check collaborator permissions
  const collaborator = this.collaborators.find(c => 
    c.userId.toString() === userId.toString()
  );
  
  if (collaborator) {
    switch (action) {
      case 'read':
        return true;
      case 'write':
      case 'edit':
        return ['editor', 'owner'].includes(collaborator.role);
      case 'delete':
        return collaborator.role === 'owner';
      default:
        return false;
    }
  }
  
  return false;
};

promptSchema.methods.softDelete = function(deletedBy) {
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

promptSchema.methods.restore = function() {
  this.deletedAt = null;
  this.deletedBy = null;
  return this.save();
};

// Static methods
promptSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId, deletedAt: null };
  return this.find(query, null, options);
};

promptSchema.statics.findPublic = function(options = {}) {
  const query = { 
    isPublic: true, 
    visibility: 'public',
    deletedAt: null,
    'moderation.status': 'approved'
  };
  return this.find(query, null, options);
};

promptSchema.statics.findByCategory = function(category, options = {}) {
  const query = { 
    category, 
    deletedAt: null,
    'moderation.status': 'approved'
  };
  return this.find(query, null, options);
};

promptSchema.statics.search = function(searchTerm, userId = null, options = {}) {
  const query = {
    $text: { $search: searchTerm },
    deletedAt: null
  };
  
  if (userId) {
    query.$or = [
      { userId },
      { isPublic: true, 'moderation.status': 'approved' }
    ];
  } else {
    query.isPublic = true;
    query['moderation.status'] = 'approved';
  }
  
  return this.find(query, { score: { $meta: 'textScore' } }, options)
    .sort({ score: { $meta: 'textScore' } });
};

// Query middleware to exclude deleted prompts by default
promptSchema.pre(/^find/, function(next) {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null });
  }
  next();
});

module.exports = mongoose.model('Prompt', promptSchema);