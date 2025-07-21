// server.js - Backend API for secure prompt enhancement

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANT: Trust proxy for Vercel/cloud deployment
app.set('trust proxy', true);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['chrome-extension://*'],
  credentials: true
}));

// Rate limiting with proxy support
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

// Clerk authentication middleware
app.use(ClerkExpressWithAuth());

// Root endpoint for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Prompt Enhancer API', 
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      enhance: '/api/enhance (POST)',
      user: '/api/user (GET)'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Main prompt enhancement endpoint
app.post('/api/enhance', async (req, res) => {
  try {
    // Verify authentication
    if (!req.auth?.userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    const { prompt, enhancementType } = req.body;

    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ 
        error: 'Prompt is required and must be a string',
        code: 'INVALID_PROMPT'
      });
    }

    if (prompt.length > 10000) {
      return res.status(400).json({ 
        error: 'Prompt too long. Maximum 10,000 characters.',
        code: 'PROMPT_TOO_LONG'
      });
    }

    const validEnhancements = ['improve', 'engaging', 'professional', 'creative'];
    if (!enhancementType || !validEnhancements.includes(enhancementType)) {
      return res.status(400).json({ 
        error: 'Invalid enhancement type',
        code: 'INVALID_ENHANCEMENT_TYPE',
        validTypes: validEnhancements
      });
    }

    // Check user's usage limits (implement your own logic)
    const canUse = await checkUserUsageLimit(req.auth.userId);
    if (!canUse) {
      return res.status(429).json({ 
        error: 'Usage limit exceeded. Please upgrade your plan.',
        code: 'USAGE_LIMIT_EXCEEDED'
      });
    }

    // Enhance the prompt
    const enhancedPrompt = await enhancePromptWithAI(prompt, enhancementType);

    // Log usage
    await logUsage(req.auth.userId, enhancementType);

    res.json({
      success: true,
      enhancedPrompt,
      enhancementType,
      originalLength: prompt.length,
      enhancedLength: enhancedPrompt.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Enhancement error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// User info endpoint
app.get('/api/user', async (req, res) => {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    // For now, return mock user data since we don't have full Clerk setup
    const mockUser = {
      id: req.auth.userId,
      email: 'user@example.com',
      firstName: 'Demo',
      lastName: 'User',
      createdAt: new Date().toISOString()
    };

    // Get usage stats
    const usageStats = await getUserUsageStats(req.auth.userId);

    res.json({
      success: true,
      user: mockUser,
      usage: usageStats
    });

  } catch (error) {
    console.error('User info error:', error);
    res.status(500).json({ 
      error: 'Failed to get user information',
      code: 'USER_INFO_ERROR'
    });
  }
});

// Prompt enhancement function
async function enhancePromptWithAI(prompt, enhancementType) {
  const enhancementPrompts = {
    improve: `Please improve this prompt to make it clearer, more specific, and more effective for AI models:

Original prompt: "${prompt}"

Enhanced prompt:`,
    
    engaging: `Please rewrite this prompt to make it more engaging, compelling, and likely to produce interesting results:

Original prompt: "${prompt}"

Enhanced prompt:`,
    
    professional: `Please rewrite this prompt to make it more professional, formal, and suitable for business contexts:

Original prompt: "${prompt}"

Enhanced prompt:`,
    
    creative: `Please rewrite this prompt to make it more creative, innovative, and likely to inspire unique responses:

Original prompt: "${prompt}"

Enhanced prompt:`
  };

  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.log('OpenAI API key not configured, using fallback enhancement');
      return fallbackEnhancement(prompt, enhancementType);
    }

    // Example using OpenAI API (you'll need to install openai package)
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at improving prompts for AI models. Your goal is to make prompts clearer, more specific, and more effective while maintaining the original intent.'
        },
        {
          role: 'user',
          content: enhancementPrompts[enhancementType]
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content?.trim() || fallbackEnhancement(prompt, enhancementType);

  } catch (error) {
    console.error('AI enhancement error:', error);
    // Fallback to rule-based enhancement if AI fails
    return fallbackEnhancement(prompt, enhancementType);
  }
}

// Fallback enhancement using simple rules
function fallbackEnhancement(prompt, enhancementType) {
  const enhancements = {
    improve: (p) => `Please provide a detailed and comprehensive response to: ${p}. Include specific examples and clear explanations.`,
    engaging: (p) => `Create an engaging and captivating response about: ${p}. Make it interesting and thought-provoking.`,
    professional: (p) => `Provide a professional analysis of: ${p}. Use formal language and structure your response clearly.`,
    creative: (p) => `Think creatively and innovatively about: ${p}. Explore unique angles and original ideas.`
  };

  return enhancements[enhancementType](prompt);
}

// Usage tracking functions
async function checkUserUsageLimit(userId) {
  // Implement your usage limit logic here
  // This could check against a database, Redis cache, etc.
  
  // For now, return true (no limits) - implement your logic here
  return true;
}

async function logUsage(userId, enhancementType) {
  // Log usage to your database/analytics system
  console.log(`User ${userId} used ${enhancementType} enhancement at ${new Date().toISOString()}`);
  
  // Example: Save to database
  // await db.usage.create({
  //   userId,
  //   enhancementType,
  //   timestamp: new Date()
  // });
}

async function getUserUsageStats(userId) {
  // Return user's usage statistics
  // This would typically come from your database
  
  return {
    totalEnhancements: 42,
    thisMonth: 15,
    favoriteType: 'improve',
    joinDate: '2024-01-01',
    lastUsed: new Date().toISOString()
  };
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    code: 'UNHANDLED_ERROR',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Prompt Enhancer API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
});

module.exports = app;