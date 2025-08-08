/**
 * @fileoverview Prompts management routes with advanced features
 * @description CRUD operations for user prompts with search, sync, and sharing
 * @author SuperPrompt Team
 * @version 2.0.0
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const DOMPurify = require('isomorphic-dompurify');
const { body, query, param, validationResult } = require('express-validator');
const Prompt = require('../models/Prompt');
const { auth } = require('../middleware/auth');
const { logger, performanceLogger } = require('../utils/logger');
const { PromptService } = require('../services/promptService');

const router = express.Router();

// Apply security headers
router.use(helmet());

// Rate limiting for prompt operations
const promptLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each user to 30 requests per minute
  message: { error: 'Too many prompt operations, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // higher limit for search operations
  message: { error: 'Too many search requests, please try again later.' },
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = DOMPurify.sanitize(req.body[key].trim());
      } else if (Array.isArray(req.body[key])) {
        req.body[key] = req.body[key].map(item => 
          typeof item === 'string' ? DOMPurify.sanitize(item.trim()) : item
        );
      }
    }
  }
  next();
};

/**
 * @route   GET /api/prompts
 * @desc    Get all prompts for authenticated user
 * @access  Private
 */
router.get('/',
  auth,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('sort').optional().isIn(['createdAt', 'updatedAt', 'content']).withMessage('Invalid sort field'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  ],
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const {
        page = 1,
        limit = 20,
        sort = 'updatedAt',
        order = 'desc'
      } = req.query;

      const result = await PromptService.getUserPrompts(req.user._id, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        order
      });

      const duration = Date.now() - startTime;
      performanceLogger.apiResponse('/api/prompts', duration, 200);

      logger.info('Prompts fetched', {
        userId: req.user._id,
        count: result.prompts.length,
        duration: `${duration}ms`
      });

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Get prompts error', {
        error: error.message,
        stack: error.stack,
        userId: req.user._id,
        duration: `${duration}ms`
      });
      
      res.status(500).json({ 
        error: 'Server error while fetching prompts.' 
      });
    }
  }
);

/**
 * @route   POST /api/prompts
 * @desc    Create new prompt
 * @access  Private
 */
router.post('/',
  auth,
  promptLimiter,
  sanitizeInput,
  [
    body('content')
      .notEmpty()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Content is required and must be 1-10000 characters'),
    body('title')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be 1-200 characters'),
    body('tags')
      .optional()
      .isArray({ max: 20 })
      .withMessage('Tags must be an array with maximum 20 items'),
    body('tags.*')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tag must be 1-50 characters'),
    body('folder')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Folder name must be 1-100 characters'),
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
    body('category')
      .optional()
      .isIn(['general', 'work', 'creative', 'technical', 'personal'])
      .withMessage('Invalid category'),
  ],
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const promptData = {
        ...req.body,
        userId: req.user._id
      };

      const prompt = await PromptService.createPrompt(promptData);

      const duration = Date.now() - startTime;
      logger.info('Prompt created', {
        userId: req.user._id,
        promptId: prompt._id,
        duration: `${duration}ms`
      });

      res.status(201).json({
        success: true,
        prompt
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Create prompt error', {
        error: error.message,
        stack: error.stack,
        userId: req.user._id,
        duration: `${duration}ms`
      });
      
      res.status(500).json({ 
        error: 'Server error while creating prompt.' 
      });
    }
  }
);

/**
 * @route   GET /api/prompts/:id
 * @desc    Get single prompt by ID
 * @access  Private
 */
router.get('/:id',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid prompt ID'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Invalid prompt ID format' 
        });
      }

      const prompt = await PromptService.getPromptById(req.params.id, req.user._id);

      if (!prompt) {
        logger.warn('Prompt not found', {
          promptId: req.params.id,
          userId: req.user._id
        });
        return res.status(404).json({ error: 'Prompt not found.' });
      }

      logger.info('Prompt retrieved', {
        promptId: prompt._id,
        userId: req.user._id
      });

      res.json({
        success: true,
        prompt
      });

    } catch (error) {
      logger.error('Get prompt error', {
        error: error.message,
        promptId: req.params.id,
        userId: req.user._id
      });
      
      res.status(500).json({ 
        error: 'Server error while fetching prompt.' 
      });
    }
  }
);

/**
 * @route   PUT /api/prompts/:id
 * @desc    Update existing prompt
 * @access  Private
 */
router.put('/:id',
  auth,
  promptLimiter,
  sanitizeInput,
  [
    param('id').isMongoId().withMessage('Invalid prompt ID'),
    body('content')
      .optional()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Content must be 1-10000 characters'),
    body('title')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be 1-200 characters'),
    body('tags')
      .optional()
      .isArray({ max: 20 })
      .withMessage('Tags must be an array with maximum 20 items'),
    body('folder')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Folder name must be 1-100 characters'),
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
  ],
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const updatedPrompt = await PromptService.updatePrompt(
        req.params.id,
        req.user._id,
        req.body
      );

      if (!updatedPrompt) {
        return res.status(404).json({ error: 'Prompt not found.' });
      }

      const duration = Date.now() - startTime;
      logger.info('Prompt updated', {
        promptId: updatedPrompt._id,
        userId: req.user._id,
        duration: `${duration}ms`
      });

      res.json({
        success: true,
        prompt: updatedPrompt
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Update prompt error', {
        error: error.message,
        promptId: req.params.id,
        userId: req.user._id,
        duration: `${duration}ms`
      });
      
      res.status(500).json({ 
        error: 'Server error while updating prompt.' 
      });
    }
  }
);

/**
 * @route   DELETE /api/prompts/:id
 * @desc    Delete prompt
 * @access  Private
 */
router.delete('/:id',
  auth,
  promptLimiter,
  [
    param('id').isMongoId().withMessage('Invalid prompt ID'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Invalid prompt ID format' 
        });
      }

      const deletedPrompt = await PromptService.deletePrompt(req.params.id, req.user._id);

      if (!deletedPrompt) {
        return res.status(404).json({ error: 'Prompt not found.' });
      }

      logger.info('Prompt deleted', {
        promptId: req.params.id,
        userId: req.user._id
      });

      res.json({
        success: true,
        message: 'Prompt deleted successfully.'
      });

    } catch (error) {
      logger.error('Delete prompt error', {
        error: error.message,
        promptId: req.params.id,
        userId: req.user._id
      });
      
      res.status(500).json({ 
        error: 'Server error while deleting prompt.' 
      });
    }
  }
);

/**
 * @route   GET /api/prompts/folders/list
 * @desc    Get user's folder list
 * @access  Private
 */
router.get('/folders/list', auth, async (req, res) => {
  try {
    const folders = await PromptService.getUserFolders(req.user._id);

    logger.info('Folders retrieved', {
      userId: req.user._id,
      count: folders.length
    });

    res.json({
      success: true,
      folders
    });

  } catch (error) {
    logger.error('Get folders error', {
      error: error.message,
      userId: req.user._id
    });
    
    res.status(500).json({ 
      error: 'Server error while fetching folders.' 
    });
  }
});

/**
 * @route   GET /api/prompts/tags/list
 * @desc    Get user's tag list
 * @access  Private
 */
router.get('/tags/list', auth, async (req, res) => {
  try {
    const tags = await PromptService.getUserTags(req.user._id);

    logger.info('Tags retrieved', {
      userId: req.user._id,
      count: tags.length
    });

    res.json({
      success: true,
      tags
    });

  } catch (error) {
    logger.error('Get tags error', {
      error: error.message,
      userId: req.user._id
    });
    
    res.status(500).json({ 
      error: 'Server error while fetching tags.' 
    });
  }
});

/**
 * @route   GET /api/prompts/search
 * @desc    Search prompts with advanced filters
 * @access  Private
 */
router.get('/search',
  auth,
  searchLimiter,
  [
    query('q').optional().isLength({ min: 1, max: 200 }).withMessage('Query must be 1-200 characters'),
    query('folder').optional().isLength({ min: 1, max: 100 }).withMessage('Folder name too long'),
    query('tags').optional().isLength({ min: 1, max: 500 }).withMessage('Tags parameter too long'),
    query('category').optional().isIn(['general', 'work', 'creative', 'technical', 'personal']),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
  ],
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const searchParams = {
        ...req.query,
        userId: req.user._id
      };

      const result = await PromptService.searchPrompts(searchParams);

      const duration = Date.now() - startTime;
      performanceLogger.apiResponse('/api/prompts/search', duration, 200);

      logger.info('Prompts searched', {
        userId: req.user._id,
        query: req.query.q,
        resultCount: result.prompts.length,
        duration: `${duration}ms`
      });

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Search prompts error', {
        error: error.message,
        userId: req.user._id,
        query: req.query.q,
        duration: `${duration}ms`
      });
      
      res.status(500).json({ 
        error: 'Server error while searching prompts.' 
      });
    }
  }
);

/**
 * @route   POST /api/prompts/bulk
 * @desc    Bulk operations on prompts
 * @access  Private
 */
router.post('/bulk',
  auth,
  promptLimiter,
  sanitizeInput,
  [
    body('operation').isIn(['delete', 'move', 'tag']).withMessage('Invalid bulk operation'),
    body('promptIds').isArray({ min: 1, max: 50 }).withMessage('Must provide 1-50 prompt IDs'),
    body('promptIds.*').isMongoId().withMessage('Invalid prompt ID'),
    body('targetFolder').optional().isLength({ min: 1, max: 100 }).withMessage('Invalid folder name'),
    body('tags').optional().isArray({ max: 20 }).withMessage('Too many tags'),
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

      const { operation, promptIds, targetFolder, tags } = req.body;

      const result = await PromptService.bulkOperation(
        req.user._id,
        operation,
        promptIds,
        { targetFolder, tags }
      );

      logger.info('Bulk operation completed', {
        userId: req.user._id,
        operation,
        promptCount: promptIds.length,
        affectedCount: result.modifiedCount
      });

      res.json({
        success: true,
        message: `Bulk ${operation} completed`,
        affectedCount: result.modifiedCount
      });

    } catch (error) {
      logger.error('Bulk operation error', {
        error: error.message,
        userId: req.user._id,
        operation: req.body.operation
      });
      
      res.status(500).json({ 
        error: 'Server error during bulk operation.' 
      });
    }
  }
);

/**
 * @route   GET /api/prompts/analytics
 * @desc    Get user's prompt analytics
 * @access  Private
 */
router.get('/analytics', auth, async (req, res) => {
  try {
    const analytics = await PromptService.getUserAnalytics(req.user._id);

    logger.info('Analytics retrieved', {
      userId: req.user._id
    });

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    logger.error('Get analytics error', {
      error: error.message,
      userId: req.user._id
    });
    
    res.status(500).json({ 
      error: 'Server error while fetching analytics.' 
    });
  }
});

module.exports = router;