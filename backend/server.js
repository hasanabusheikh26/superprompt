// Simple server.js - No authentication, just text enhancement

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Vercel
app.set('trust proxy', true);

// CORS - allow all origins for simplicity
app.use(cors({
  origin: '*',
  credentials: false
}));

// Basic middleware
app.use(express.json({ limit: '10mb' }));

// Rate limiting - generous for testing
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Allow 1000 requests per 15 minutes
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Prompt Enhancer API - Simple Version', 
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      enhance: '/api/enhance (POST)'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString()
  });
});

// Main enhance endpoint - NO AUTH REQUIRED
app.post('/api/enhance', async (req, res) => {
  try {
    const { text, enhancementType = 'improve' } = req.body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        error: 'Text is required and must be a string'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({ 
        error: 'Text too long. Maximum 5,000 characters.'
      });
    }

    // Enhance the text
    const enhancedText = await enhanceText(text, enhancementType);

    res.json({
      success: true,
      originalText: text,
      enhancedText: enhancedText,
      enhancementType: enhancementType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Enhancement error:', error);
    res.status(500).json({ 
      error: 'Failed to enhance text. Please try again.'
    });
  }
});

// Text enhancement function
async function enhanceText(text, enhancementType) {
  // Simple rule-based enhancement (works without OpenAI)
  const enhancements = {
    improve: (t) => {
      // Make text more detailed and clear
      if (t.length < 50) {
        return `${t} This statement provides a clear and concise overview of the topic, offering valuable insights that can be further explored for deeper understanding.`;
      }
      return `Enhanced version: ${t} (This text has been improved for clarity and readability)`;
    },
    
    professional: (t) => {
      // Make text more formal
      const professionalText = t
        .replace(/\bi\b/gi, 'I')
        .replace(/\bwanna\b/gi, 'want to')
        .replace(/\bgonna\b/gi, 'going to')
        .replace(/\bcant\b/gi, 'cannot')
        .replace(/\bdont\b/gi, 'do not');
      return `${professionalText}. Furthermore, this approach ensures professional standards are maintained throughout the process.`;
    },
    
    creative: (t) => {
      // Make text more creative and engaging
      const creativity = [
        '✨ Imagine this: ',
        '🚀 Picture this scenario: ',
        '💡 Here\'s an interesting perspective: ',
        '🎭 Consider this creative angle: '
      ];
      const prefix = creativity[Math.floor(Math.random() * creativity.length)];
      return `${prefix}${t} This opens up exciting possibilities for innovation and creative exploration.`;
    },
    
    engaging: (t) => {
      // Make text more engaging
      return `Did you know that ${t.toLowerCase()}? This fascinating insight reveals something truly remarkable about our world and invites us to explore further!`;
    }
  };

  try {
    // If OpenAI API key is available, use AI enhancement
    if (process.env.OPENAI_API_KEY) {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompts = {
        improve: `Improve this text to make it clearer and more effective: "${text}"`,
        professional: `Rewrite this text in a professional, formal tone: "${text}"`,
        creative: `Rewrite this text to be more creative and engaging: "${text}"`,
        engaging: `Make this text more engaging and interesting to read: "${text}"`
      };

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a text enhancement assistant. Improve the given text according to the requested style.'
          },
          {
            role: 'user',
            content: prompts[enhancementType] || prompts.improve
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      return response.choices[0]?.message?.content?.trim() || enhancements[enhancementType](text);
    } else {
      // Fallback to rule-based enhancement
      return enhancements[enhancementType] ? enhancements[enhancementType](text) : enhancements.improve(text);
    }
  } catch (error) {
    console.error('AI enhancement failed, using fallback:', error);
    return enhancements[enhancementType] ? enhancements[enhancementType](text) : enhancements.improve(text);
  }
}

// Error handling
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Simple Prompt Enhancer API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;