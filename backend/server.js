// server.js - Backend API for AI Prompt Enhancement

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
    message: 'AI Prompt Enhancer API', 
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
    const { text, instruction, enhancementType = 'custom' } = req.body;

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

    // Use instruction if provided, otherwise fall back to enhancement type
    const enhancementInstruction = instruction || enhancementType;

    // Enhance the text
    const enhancedText = await enhanceText(text, enhancementInstruction);

    res.json({
      success: true,
      originalText: text,
      enhancedText: enhancedText,
      instruction: enhancementInstruction,
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
async function enhanceText(text, instruction) {
  try {
    // If OpenAI API key is available, use AI enhancement
    if (process.env.OPENAI_API_KEY) {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Handle custom instructions vs predefined ones
      let systemPrompt, userPrompt;
      
      const predefinedInstructions = {
        detailed: 'Make this prompt more detailed and comprehensive with specific requirements',
        examples: 'Add concrete examples to make this prompt clearer',
        clarify: 'Shorten this prompt while making it clearer and more direct',
        stepbystep: 'Rewrite this prompt with step-by-step instructions',
        simple: 'Rewrite this prompt in very simple language that a 5-year-old could understand',
        specific: 'Make this prompt more specific and precise with exact requirements'
      };

      if (predefinedInstructions[instruction]) {
        // Use predefined enhancement
        systemPrompt = 'You are an AI prompt enhancement specialist. Your job is to improve prompts to get better results from AI models.';
        userPrompt = `Enhance this prompt: "${text}"\n\nImprovement needed: ${predefinedInstructions[instruction]}\n\nReturn only the enhanced prompt, nothing else.`;
      } else {
        // Use custom instruction
        systemPrompt = 'You are an AI prompt enhancement specialist. Follow the user\'s specific instruction to improve the given prompt.';
        userPrompt = `Original prompt: "${text}"\n\nInstruction: ${instruction}\n\nReturn only the enhanced prompt, nothing else.`;
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 400,
        temperature: 0.7
      });

      const enhanced = response.choices[0]?.message?.content?.trim();
      return enhanced || getFallbackEnhancement(text, instruction);
      
    } else {
      // Fallback to rule-based enhancement
      return getFallbackEnhancement(text, instruction);
    }
  } catch (error) {
    console.error('AI enhancement failed, using fallback:', error);
    return getFallbackEnhancement(text, instruction);
  }
}

// Fallback enhancement function
function getFallbackEnhancement(text, instruction) {
  const promptEnhancements = {
    'detailed': (t) => `${t}\n\nPlease be comprehensive and detailed in your response. Include:\n- Specific examples\n- Step-by-step explanations\n- Relevant context and background\n- Practical applications`,
    
    'examples': (t) => `${t}\n\nPlease include concrete, real-world examples in your response to illustrate each point clearly.`,
    
    'clarify': (t) => {
      const simplified = t.replace(/\b(basically|actually|really|just|maybe|perhaps|kind of|sort of)\b/gi, '')
                          .replace(/\s+/g, ' ')
                          .trim();
      return `${simplified}. Please provide a clear, direct response.`;
    },
    
    'stepbystep': (t) => `${t}\n\nPlease structure your response as a clear step-by-step guide with numbered steps.`,
    
    'simple': (t) => `Explain this in very simple terms: ${t}\n\nUse simple words and concepts that anyone can understand.`,
    
    'specific': (t) => `${t}\n\nPlease be very specific and precise in your response. Include exact details, measurements, timeframes, and concrete information wherever possible.`,
    
    'improve': (t) => `Please provide a detailed response to: ${t}. Include specific examples, clear explanations, and actionable insights.`,
    
    'professional': (t) => `${t}\n\nPlease provide a professional, formal response suitable for business or academic contexts.`,
    
    'creative': (t) => `${t}\n\nPlease approach this creatively and think outside the box. Explore unique angles and innovative ideas.`,
    
    'engaging': (t) => `${t}\n\nPlease make your response engaging, interesting, and compelling to read.`
  };

  // Use predefined enhancement if available
  if (promptEnhancements[instruction]) {
    return promptEnhancements[instruction](text);
  }

  // For custom instructions, create a prompt
  return `${text}\n\n[Enhanced with instruction: ${instruction}]`;
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
  console.log(`AI Prompt Enhancer API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;