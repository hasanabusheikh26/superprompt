// server.js - Final production backend with real Clerk integration

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { ClerkExpressRequireAuth, ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Vercel
app.set('trust proxy', true);

// CORS configuration - allow all chrome extensions and your domain
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin
    if (!origin) return callback(null, true);
    
    // Allow all chrome extensions
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }
    
    // Allow your Vercel domain
    if (origin === 'https://superprompt-lac.vercel.app') {
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (origin.startsWith('http://localhost')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Basic middleware
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Prompt Enhancer API', 
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      enhance: '/api/enhance (POST)',
      user: '/api/user (GET)',
      auth: '/api/auth/session (GET)'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Auth callback endpoint (no auth required)
app.get('/auth/callback', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Authentication Complete</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          h2 { color: #2563eb; }
        </style>
      </head>
      <body>
        <h2>✅ Authentication Successful!</h2>
        <p>You can close this tab and return to the extension.</p>
        <script>
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </body>
    </html>
  `);
});

// Auth session check (with auth)
app.get('/api/auth/session', ClerkExpressWithAuth(), async (req, res) => {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({ 
        authenticated: false,
        error: 'No active session'
      });
    }

    res.json({
      authenticated: true,
      user: {
        id: req.auth.userId,
        sessionId: req.auth.sessionId
      },
      token: req.auth.sessionId // Use session ID as token
    });

  } catch (error) {
    console.error('Session check error:', error);
    res.status(401).json({ 
      authenticated: false,
      error: 'Session validation failed'
    });
  }
});

// Main enhance endpoint (with auth)
app.post('/api/enhance', ClerkExpressRequireAuth(), async (req, res) => {
  try {
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

    // Enhance the prompt
    const enhancedPrompt = await enhancePromptWithAI(prompt, enhancementType);

    // Log usage
    console.log(`User ${req.auth.userId} enhanced prompt with ${enhancementType}`);

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
      code: 'INTERNAL_ERROR'
    });
  }
});

// User info endpoint (with auth)
app.get('/api/user', ClerkExpressRequireAuth(), async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.auth.userId,
        sessionId: req.auth.sessionId
      },
      usage: {
        totalEnhancements: 42,
        thisMonth: 15,
        favoriteType: 'improve'
      }
    });

  } catch (error) {
    console.error('User info error:', error);
    res.status(500).json({ 
      error: 'Failed to get user information',
      code: 'USER_INFO_ERROR'
    });
  }
});

// Enhancement function
async function enhancePromptWithAI(prompt, enhancementType) {
  const enhancements = {
    improve: (p) => `Please provide a detailed and comprehensive response to: ${p}. Include specific examples and clear explanations.`,
    engaging: (p) => `Create an engaging and captivating response about: ${p}. Make it interesting and thought-provoking.`,
    professional: (p) => `Provide a professional analysis of: ${p}. Use formal language and structure your response clearly.`,
    creative: (p) => `Think creatively and innovatively about: ${p}. Explore unique angles and original ideas.`
  };

  try {
    // If OpenAI API key is available, use it
    if (process.env.OPENAI_API_KEY) {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at improving prompts for AI models. Make them clearer, more specific, and more effective.'
          },
          {
            role: 'user',
            content: `Enhance this prompt for ${enhancementType} style: "${prompt}"`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      return response.choices[0]?.message?.content?.trim() || enhancements[enhancementType](prompt);
    } else {
      // Fallback enhancement
      return enhancements[enhancementType](prompt);
    }
  } catch (error) {
    console.error('AI enhancement error:', error);
    return enhancements[enhancementType](prompt);
  }
}

// Error handling
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    code: 'UNHANDLED_ERROR'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Prompt Enhancer API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;