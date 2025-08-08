/**
 * @fileoverview Enhancement routes
 * @description API routes for text enhancement using AI
 * @author SuperPrompt Team
 * @version 2.0.0
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { sensitiveRateLimit } = require('../middleware/security');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/enhance
 * Enhance text using AI
 */
router.post('/',
  sensitiveRateLimit,
  authenticateToken,
  [
    body('text')
      .isString()
      .trim()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Text must be between 1 and 10000 characters'),
    body('instruction')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Instruction must be less than 500 characters'),
    body('tone')
      .optional()
      .isIn(['professional', 'casual', 'formal', 'friendly', 'persuasive'])
      .withMessage('Invalid tone specified')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { text, instruction, tone = 'professional' } = req.body;
      const userId = req.user.id;

      // For now, return a mock enhancement
      // In production, this would call OpenAI or another AI service
      const enhancedText = mockEnhanceText(text, instruction, tone);

      // Log the enhancement
      logger.info('Text enhanced', {
        userId,
        originalLength: text.length,
        enhancedLength: enhancedText.length,
        tone,
        hasInstruction: !!instruction
      });

      res.json({
        success: true,
        original: text,
        enhanced: enhancedText,
        metadata: {
          tone,
          instruction,
          model: 'mock-gpt-3.5-turbo',
          tokens: {
            input: Math.ceil(text.length / 4),
            output: Math.ceil(enhancedText.length / 4)
          }
        }
      });

    } catch (error) {
      logger.error('Text enhancement failed', {
        error: error.message,
        userId: req.user?.id,
        textLength: req.body?.text?.length
      });

      res.status(500).json({
        error: 'Enhancement failed',
        message: 'Unable to enhance text at this time'
      });
    }
  }
);

/**
 * Mock text enhancement function
 * In production, this would call OpenAI API
 */
function mockEnhanceText(text, instruction, tone) {
  const enhancements = {
    professional: {
      prefix: 'In a professional context, ',
      suffix: ' This approach ensures clarity and effectiveness.',
      style: 'formal and structured'
    },
    casual: {
      prefix: 'Here\'s a casual take: ',
      suffix: ' Hope that helps!',
      style: 'relaxed and friendly'
    },
    formal: {
      prefix: 'Formally speaking, ',
      suffix: ' This methodology is recommended for optimal results.',
      style: 'academic and precise'
    },
    friendly: {
      prefix: 'In a friendly way, ',
      suffix: ' Let me know if you need any clarification!',
      style: 'warm and approachable'
    },
    persuasive: {
      prefix: 'Consider this compelling approach: ',
      suffix: ' This strategy will deliver the results you\'re looking for.',
      style: 'convincing and action-oriented'
    }
  };

  const enhancement = enhancements[tone] || enhancements.professional;
  
  let enhanced = text;

  // Apply instruction if provided
  if (instruction) {
    enhanced = `${instruction}: ${enhanced}`;
  }

  // Apply tone enhancement
  enhanced = `${enhancement.prefix}${enhanced}${enhancement.suffix}`;

  // Clean up the text
  enhanced = enhanced
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/([.!?])\s*([A-Z])/g, '$1 $2');

  return enhanced;
}

module.exports = router;