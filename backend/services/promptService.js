/**
 * @fileoverview Prompt service layer
 * @description Handles all prompt-related business logic
 * @author SuperPrompt Team
 * @version 2.0.0
 */

const mongoose = require('mongoose');
const Prompt = require('../models/Prompt');
const User = require('../models/User');
const { logger } = require('../utils/logger');

class PromptService {
  /**
   * Create a new prompt
   * @param {string} userId - User ID
   * @param {object} promptData - Prompt data
   * @returns {Promise<object>} Created prompt
   */
  static async createPrompt(userId, promptData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check user limits based on subscription
      const userPromptCount = await Prompt.countDocuments({ userId });
      const limits = this.getSubscriptionLimits(user.subscription.plan);

      if (userPromptCount >= limits.maxPrompts) {
        const error = new Error(`You've reached the maximum number of prompts for your ${user.subscription.plan} plan`);
        error.code = 'LIMIT_EXCEEDED';
        throw error;
      }

      // Create prompt
      const prompt = new Prompt({
        ...promptData,
        userId
      });

      await prompt.save();

      // Update user usage stats
      await this.updateUserUsage(userId, 'promptsCreated');

      logger.info('Prompt created', {
        promptId: prompt._id,
        userId,
        title: prompt.title
      });

      return prompt.toJSON();

    } catch (error) {
      logger.error('Prompt creation failed', {
        error: error.message,
        userId,
        promptData: { title: promptData.title }
      });
      throw error;
    }
  }

  /**
   * Get user's prompts with pagination and filtering
   * @param {string} userId - User ID
   * @param {object} options - Query options
   * @returns {Promise<object>} Prompts with pagination
   */
  static async getUserPrompts(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = 'createdAt',
        order = 'desc',
        folder,
        tags,
        category,
        search
      } = options;

      // Build query
      const query = { userId };

      if (folder) {
        query.folder = folder;
      }

      if (tags && tags.length > 0) {
        query.tags = { $in: tags };
      }

      if (category) {
        query.category = category;
      }

      if (search) {
        query.$text = { $search: search };
      }

      // Build sort object
      const sortObj = {};
      sortObj[sort] = order === 'desc' ? -1 : 1;

      // If searching, add text score sort
      if (search) {
        sortObj.score = { $meta: 'textScore' };
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const prompts = await Prompt.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email');

      // Get total count for pagination
      const total = await Prompt.countDocuments(query);
      const pages = Math.ceil(total / limit);

      logger.info('User prompts retrieved', {
        userId,
        count: prompts.length,
        total,
        page,
        filters: { folder, tags, category, search }
      });

      return {
        prompts: prompts.map(p => p.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      logger.error('Get user prompts failed', {
        error: error.message,
        userId,
        options
      });
      throw error;
    }
  }

  /**
   * Get a single prompt by ID
   * @param {string} promptId - Prompt ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Prompt data
   */
  static async getPromptById(promptId, userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(promptId)) {
        throw new Error('Invalid prompt ID');
      }

      const prompt = await Prompt.findById(promptId).populate('userId', 'name email');

      if (!prompt) {
        throw new Error('Prompt not found');
      }

      // Check access permissions
      if (!prompt.canAccess(userId, 'read')) {
        throw new Error('Prompt not found'); // Don't reveal existence
      }

      // Increment view count if not the owner
      if (prompt.userId._id.toString() !== userId) {
        await prompt.incrementViews();
      }

      logger.info('Prompt retrieved', {
        promptId,
        userId,
        owner: prompt.userId._id.toString()
      });

      return prompt.toJSON();

    } catch (error) {
      logger.error('Get prompt failed', {
        error: error.message,
        promptId,
        userId
      });
      throw error;
    }
  }

  /**
   * Update a prompt
   * @param {string} promptId - Prompt ID
   * @param {string} userId - User ID
   * @param {object} updateData - Update data
   * @returns {Promise<object>} Updated prompt
   */
  static async updatePrompt(promptId, userId, updateData) {
    try {
      if (!mongoose.Types.ObjectId.isValid(promptId)) {
        throw new Error('Invalid prompt ID');
      }

      const prompt = await Prompt.findById(promptId);

      if (!prompt) {
        throw new Error('Prompt not found');
      }

      // Check permissions
      if (!prompt.canAccess(userId, 'edit')) {
        throw new Error('Prompt not found'); // Don't reveal existence
      }

      // Update prompt
      Object.assign(prompt, updateData);
      await prompt.save();

      logger.info('Prompt updated', {
        promptId,
        userId,
        changes: Object.keys(updateData)
      });

      return prompt.toJSON();

    } catch (error) {
      logger.error('Prompt update failed', {
        error: error.message,
        promptId,
        userId
      });
      throw error;
    }
  }

  /**
   * Delete a prompt (soft delete)
   * @param {string} promptId - Prompt ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Deletion result
   */
  static async deletePrompt(promptId, userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(promptId)) {
        throw new Error('Invalid prompt ID');
      }

      const prompt = await Prompt.findById(promptId);

      if (!prompt) {
        throw new Error('Prompt not found');
      }

      // Check permissions
      if (!prompt.canAccess(userId, 'delete')) {
        throw new Error('Prompt not found'); // Don't reveal existence
      }

      // Soft delete
      await prompt.softDelete(userId);

      logger.info('Prompt deleted', {
        promptId,
        userId,
        title: prompt.title
      });

      return { message: 'Prompt deleted successfully' };

    } catch (error) {
      logger.error('Prompt deletion failed', {
        error: error.message,
        promptId,
        userId
      });
      throw error;
    }
  }

  /**
   * Search prompts
   * @param {string} searchTerm - Search term
   * @param {string} userId - User ID (optional for public search)
   * @param {object} options - Search options
   * @returns {Promise<object>} Search results
   */
  static async searchPrompts(searchTerm, userId = null, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        tags,
        includePublic = true
      } = options;

      const prompts = await Prompt.search(searchTerm, userId, {
        skip: (page - 1) * limit,
        limit: parseInt(limit)
      });

      // Apply additional filters
      let filteredPrompts = prompts;

      if (category) {
        filteredPrompts = filteredPrompts.filter(p => p.category === category);
      }

      if (tags && tags.length > 0) {
        filteredPrompts = filteredPrompts.filter(p => 
          tags.some(tag => p.tags.includes(tag))
        );
      }

      // Get total count (approximate for text search)
      const total = filteredPrompts.length;
      const pages = Math.ceil(total / limit);

      logger.info('Prompts searched', {
        searchTerm,
        userId,
        results: filteredPrompts.length,
        filters: { category, tags }
      });

      return {
        prompts: filteredPrompts.map(p => p.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      logger.error('Prompt search failed', {
        error: error.message,
        searchTerm,
        userId
      });
      throw error;
    }
  }

  /**
   * Perform bulk operations on prompts
   * @param {string} userId - User ID
   * @param {object} operationData - Operation data
   * @returns {Promise<object>} Operation result
   */
  static async bulkOperation(userId, operationData) {
    try {
      const { operation, promptIds, ...operationParams } = operationData;

      if (!Array.isArray(promptIds) || promptIds.length === 0) {
        throw new Error('No prompts specified');
      }

      if (promptIds.length > 50) {
        throw new Error('Too many prompts selected. Maximum 50 allowed per operation.');
      }

      // Validate prompt IDs
      promptIds.forEach(id => {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error(`Invalid prompt ID: ${id}`);
        }
      });

      // Find prompts that user can access
      const prompts = await Prompt.find({
        _id: { $in: promptIds },
        userId
      });

      if (prompts.length !== promptIds.length) {
        throw new Error('Some prompts not found or access denied');
      }

      let result;

      switch (operation) {
        case 'delete':
          result = await this.bulkDelete(prompts, userId);
          break;
        case 'move':
          result = await this.bulkMove(prompts, operationParams.targetFolder);
          break;
        case 'tag':
          result = await this.bulkTag(prompts, operationParams.tags);
          break;
        case 'categorize':
          result = await this.bulkCategorize(prompts, operationParams.category);
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      logger.info('Bulk operation completed', {
        operation,
        userId,
        promptCount: prompts.length,
        affectedCount: result.affectedCount
      });

      return result;

    } catch (error) {
      logger.error('Bulk operation failed', {
        error: error.message,
        operation: operationData.operation,
        userId
      });
      throw error;
    }
  }

  /**
   * Get user analytics
   * @param {string} userId - User ID
   * @returns {Promise<object>} Analytics data
   */
  static async getUserAnalytics(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get prompt statistics
      const totalPrompts = await Prompt.countDocuments({ userId });
      const publicPrompts = await Prompt.countDocuments({ userId, isPublic: true });
      const privatePrompts = totalPrompts - publicPrompts;

      // Get folder statistics
      const folderStats = await Prompt.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: '$folder', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Get tag statistics
      const tagStats = await Prompt.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      // Get recent activity
      const recentActivity = await Prompt.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(10)
        .select('title updatedAt analytics.usageCount');

      // Get usage trends (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentPrompts = await Prompt.countDocuments({
        userId,
        createdAt: { $gte: thirtyDaysAgo }
      });

      const analytics = {
        totalPrompts,
        publicPrompts,
        privatePrompts,
        recentPrompts,
        folderStats: folderStats.map(stat => ({
          folder: stat._id || 'Uncategorized',
          count: stat.count
        })),
        tagStats: tagStats.map(stat => ({
          tag: stat._id,
          count: stat.count
        })),
        recentActivity: recentActivity.map(prompt => ({
          id: prompt._id,
          title: prompt.title,
          lastUsed: prompt.updatedAt,
          usageCount: prompt.analytics.usageCount
        })),
        userStats: {
          joinDate: user.createdAt,
          subscription: user.subscription.plan,
          totalUsage: user.usage.promptsCreated,
          lastActive: user.lastActive
        }
      };

      logger.info('User analytics retrieved', {
        userId,
        totalPrompts,
        publicPrompts
      });

      return analytics;

    } catch (error) {
      logger.error('Get user analytics failed', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Clone a prompt
   * @param {string} promptId - Original prompt ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Cloned prompt
   */
  static async clonePrompt(promptId, userId) {
    try {
      const originalPrompt = await Prompt.findById(promptId);

      if (!originalPrompt) {
        throw new Error('Prompt not found');
      }

      // Check if user can access the prompt
      if (!originalPrompt.canAccess(userId, 'read')) {
        throw new Error('Prompt not found');
      }

      // Clone the prompt
      const clonedPrompt = originalPrompt.clone(userId);
      await clonedPrompt.save();

      logger.info('Prompt cloned', {
        originalId: promptId,
        clonedId: clonedPrompt._id,
        userId
      });

      return clonedPrompt.toJSON();

    } catch (error) {
      logger.error('Prompt cloning failed', {
        error: error.message,
        promptId,
        userId
      });
      throw error;
    }
  }

  // Helper methods for bulk operations
  static async bulkDelete(prompts, userId) {
    for (const prompt of prompts) {
      await prompt.softDelete(userId);
    }
    return { affectedCount: prompts.length };
  }

  static async bulkMove(prompts, targetFolder) {
    for (const prompt of prompts) {
      prompt.folder = targetFolder;
      await prompt.save();
    }
    return { affectedCount: prompts.length };
  }

  static async bulkTag(prompts, tags) {
    for (const prompt of prompts) {
      prompt.tags = [...new Set([...prompt.tags, ...tags])];
      await prompt.save();
    }
    return { affectedCount: prompts.length };
  }

  static async bulkCategorize(prompts, category) {
    for (const prompt of prompts) {
      prompt.category = category;
      await prompt.save();
    }
    return { affectedCount: prompts.length };
  }

  // Helper method to get subscription limits
  static getSubscriptionLimits(plan) {
    const limits = {
      free: { maxPrompts: 100, maxStorage: 10 * 1024 * 1024 }, // 10MB
      pro: { maxPrompts: 1000, maxStorage: 100 * 1024 * 1024 }, // 100MB
      enterprise: { maxPrompts: 10000, maxStorage: 1024 * 1024 * 1024 } // 1GB
    };

    return limits[plan] || limits.free;
  }

  // Helper method to update user usage
  static async updateUserUsage(userId, field, increment = 1) {
    try {
      const updateObj = {};
      updateObj[`usage.${field}`] = increment;
      updateObj['usage.lastUsage'] = new Date();

      await User.findByIdAndUpdate(userId, { $inc: updateObj });
    } catch (error) {
      logger.warn('Failed to update user usage', {
        error: error.message,
        userId,
        field
      });
    }
  }
}

module.exports = { PromptService };