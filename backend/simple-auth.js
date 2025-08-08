// Simple auth server for testing
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Simple in-memory user storage
const users = new Map();
const JWT_SECRET = process.env.JWT_SECRET || 'superprompt-secret-key-2024';

// Configure CORS for Chrome extensions and web pages
app.use(cors({
  origin: '*', // Allow all origins
  credentials: false, // Don't allow credentials with wildcard origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

app.use(express.json());

// Handle preflight requests for all routes
app.options('*', cors());

// Add CORS headers to all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Auth middleware
const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    const user = users.get(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Signup
app.post('/api/auth/signup', (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Check if user exists
    for (let [id, user] of users) {
      if (user.email === email) {
        return res.status(400).json({ error: 'User already exists with this email.' });
      }
    }

    // Create user
    const userId = 'user_' + Date.now();
    const user = {
      id: userId,
      email,
      name: name || 'User',
      createdAt: new Date(),
      lastLogin: new Date()
    };

    users.set(userId, user);

    // Generate token
    const token = generateToken(userId);

    res.status(201).json({
      success: true,
      token,
      user
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup.' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user
    let user = null;
    for (let [id, u] of users) {
      if (u.email === email) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Simple password check (in real app, use bcrypt)
    if (password.length < 8) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Update last login
    user.lastLogin = new Date();
    users.set(user.id, user);

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      token,
      user
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Validate token
app.get('/api/auth/validate', auth, (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Server error during token validation.' });
  }
});

// Refresh token
app.post('/api/auth/refresh', auth, (req, res) => {
  try {
    const token = generateToken(req.user.id);
    res.json({
      success: true,
      token
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Server error during token refresh.' });
  }
});

// Reset password (simplified)
app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    // Check if user exists
    let userExists = false;
    for (let [id, user] of users) {
      if (user.email === email) {
        userExists = true;
        break;
      }
    }

    if (!userExists) {
      return res.status(400).json({ error: 'User not found with this email.' });
    }

    res.json({ success: true, message: 'Password reset email sent.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error during password reset.' });
  }
});

// Text enhancement endpoint with better prompt generation
app.post('/api/enhance', async (req, res) => {
  // Set CORS headers for this specific endpoint
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  
  try {
    const { text, instruction } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required.' });
    }

    // Enhanced text processing based on instruction
    let enhancedText = text;
    let score = 85; // Default improvement score
    
    if (instruction) {
      const normalizedInstruction = instruction.toLowerCase();
      
      if (normalizedInstruction.includes('formal') || normalizedInstruction.includes('professional')) {
        enhancedText = enhanceForFormal(text);
        score = 92;
      } else if (normalizedInstruction.includes('friendly') || normalizedInstruction.includes('casual')) {
        enhancedText = enhanceForFriendly(text);
        score = 88;
      } else if (normalizedInstruction.includes('concise') || normalizedInstruction.includes('brief')) {
        enhancedText = enhanceForConcise(text);
        score = 85;
      } else if (normalizedInstruction.includes('detailed') || normalizedInstruction.includes('explain')) {
        enhancedText = enhanceForDetailed(text);
        score = 93;
      } else if (normalizedInstruction.includes('simple') || normalizedInstruction.includes('easy')) {
        enhancedText = enhanceForSimple(text);
        score = 80;
      } else if (normalizedInstruction.includes('step') || normalizedInstruction.includes('guide')) {
        enhancedText = enhanceForSteps(text);
        score = 90;
      } else {
        // General enhancement
        enhancedText = enhanceGeneral(text, instruction);
        score = 87;
      }
    } else {
      enhancedText = enhanceGeneral(text);
      score = 82;
    }

    res.json({
      success: true,
      enhancedText,
      originalText: text,
      instruction: instruction || 'General enhancement',
      score,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Enhancement error:', error);
    res.status(500).json({ error: 'Server error during text enhancement.' });
  }
});

// Handle OPTIONS requests for the enhance endpoint
app.options('/api/enhance', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// SuperPrompt System Prompt for AI Enhancement
const SUPERPROMPT_SYSTEM = `You are the Prompt Engine for SuperPrompt — a system that helps users craft high-performance, context-aware prompts for LLMs like ChatGPT, Claude, Gemini, and more.

You must ensure all generated prompts are:
- Clear, complete, and structured
- Optimized for the intended tool (ChatGPT, Claude, etc.)
- Ignoring vague, nonsensical, or contradictory inputs
- Respecting the intent of the user without hallucinating or inventing details

🛠️ Platform Context:
SuperPrompt is a productivity-focused browser extension with cloud sync, prompt organization (tags, folders), and analytics. Users are developers, marketers, designers, researchers, and operations professionals.

🎯 Primary Goals:
1. Help users generate prompts that get better results from AI
2. Suggest edits that clarify, refine, or expand user intent
3. Store and tag effective prompts for re-use
4. Reject unclear or confusing prompts, and guide users to improve them

✅ Guidelines:
- If a prompt is vague or nonsensical, reply: "This input is unclear. Can you rephrase or give more detail?"
- If the prompt lacks a goal, suggest goal-oriented versions (e.g., "Generate social media ideas for a launch campaign.")
- Always assume the prompt is going into an AI tool — tailor it accordingly
- Use bullet points, context, and step-by-step formatting when helpful
- Never respond with AI completions — only structure the user's input into a better prompt

📦 Examples:

❌ Bad Input: "Can you make this better"
✅ Your Output: "The request is unclear. What is 'this'? Please provide the original prompt or text."

❌ Bad Input: "Hello there"
✅ Your Output: "This prompt doesn't contain a task or context. Please specify what you want to generate."

✔️ Input: "Write a prompt to summarize YouTube videos"
✔️ Output:
"Summarize this YouTube video:
- Topic: [e.g. productivity hacks]
- Tone: Professional and concise
- Include: Key takeaways, timestamps, actionable advice"

This system ensures useless or irrelevant inputs are filtered and every generated prompt is AI-usable with consistent output quality.`;

// Enhanced enhancement functions using the SuperPrompt system
function enhanceForFormal(text) {
  return applySystemPrompt(text, 'formal');
}

function applySystemPrompt(text, style = 'general', instruction = '') {
  // Analyze the input based on SuperPrompt guidelines
  if (!text || text.trim().length < 3) {
    return "This input is unclear. Can you rephrase or give more detail?";
  }

  // Check for vague inputs
  const vaguePatterns = ['make this better', 'improve this', 'fix this', 'help me', 'hello', 'hi', 'can you help', 'please help'];
  if (vaguePatterns.some(pattern => text.toLowerCase().includes(pattern)) && text.length < 20) {
    return "This prompt doesn't contain a specific task or context. Please specify:\n• What you want to generate or accomplish\n• The target audience or use case\n• Any specific requirements or constraints\n\nExample: 'Create a social media campaign for a product launch' instead of 'help me with marketing'";
  }

  // Apply SuperPrompt enhancement based on style
  switch (style) {
    case 'formal':
    case 'professional':
      return enhanceWithStructure(text, 'professional');
    case 'detailed':
    case 'comprehensive':
      return enhanceWithStructure(text, 'comprehensive');
    case 'concise':
    case 'brief':
      return enhanceWithStructure(text, 'concise');
    case 'friendly':
      return enhanceWithStructure(text, 'friendly');
    case 'simple':
      return enhanceWithStructure(text, 'simple');
    case 'steps':
      return enhanceWithStructure(text, 'steps');
    default:
      return enhanceWithStructure(text, 'optimized', instruction);
  }
}

function enhanceWithStructure(text, type, instruction = '') {
  const basePrompt = text.trim();
  
  switch (type) {
    case 'professional':
      return `**Professional AI Prompt:**

${basePrompt}

**Context & Requirements:**
• Target audience: Professional/business context
• Output format: Structured and formal
• Tone: Authoritative and clear
• Length: Comprehensive but focused

**Success criteria:**
• Delivers actionable, professional-grade results
• Uses appropriate business language
• Maintains clarity and precision
• Follows industry best practices

*This prompt is optimized for professional AI tools like ChatGPT, Claude, or Gemini.*`;

    case 'comprehensive':
      return `**Detailed AI Prompt:**

${basePrompt}

**Detailed Instructions:**
• Break down the task into clear components
• Provide comprehensive coverage of the topic
• Include relevant context and background
• Consider multiple perspectives or approaches

**Expected Output:**
• Thorough analysis or response
• Step-by-step breakdown when applicable
• Supporting details and examples
• Actionable recommendations

**Quality Standards:**
• Evidence-based information
• Clear structure and organization
• Practical applicability
• Professional presentation

*Optimized for in-depth AI analysis and detailed responses.*`;

    case 'concise':
      // Extract the core request
      const coreRequest = basePrompt.split('.')[0] || basePrompt;
      return `**Concise AI Prompt:**

${coreRequest}

**Requirements:**
• Keep response brief and focused
• Prioritize key information only
• Use bullet points or numbered lists
• Avoid unnecessary details

**Output format:**
• Direct and actionable
• Maximum clarity with minimum words
• Essential points only

*Optimized for quick, focused AI responses.*`;

    case 'friendly':
      return `**Conversational AI Prompt:**

${basePrompt}

**Tone & Style:**
• Friendly and approachable
• Conversational but informative
• Warm and engaging
• Accessible to general audience

**Response Guidelines:**
• Use relatable examples and analogies
• Maintain enthusiasm and positivity
• Include encouraging language
• Make complex topics easy to understand

**Success criteria:**
• Creates connection with audience
• Maintains professional quality
• Easy to understand and follow
• Engaging and memorable

*This prompt creates warm, accessible AI responses while maintaining quality.*`;

    case 'simple':
      return `**Simple AI Prompt:**

${basePrompt}

**Simplification Requirements:**
• Use plain, everyday language
• Avoid jargon and technical terms
• Break complex ideas into basic concepts
• Include relatable examples

**Output format:**
• Short sentences and paragraphs
• Clear, logical progression
• Visual elements (bullets, numbers) when helpful
• Easy to scan and understand

**Target audience:**
• General public or beginners
• No specialized knowledge assumed
• Accessible to all education levels

*This prompt ensures AI responses are clear and accessible to everyone.*`;

    case 'steps':
      return `**Step-by-Step AI Prompt:**

${basePrompt}

**Structure Requirements:**
• Break down into sequential phases
• Number each step clearly
• Include substeps when necessary
• Provide checkpoints and validation

**Expected format:**
• Phase-based organization
• Clear prerequisites for each step
• Actionable instructions
• Expected outcomes for each phase

**Success criteria:**
• Easy to follow progression
• No steps skipped or assumed
• Clear completion criteria
• Practical implementation focus

*This prompt generates systematic, implementable step-by-step guidance.*`;

    default: // optimized
      return `**Enhanced AI Prompt:**

${basePrompt}

**Context:**
• Purpose: [Specify the goal or outcome needed]
• Audience: [Define who will use this information]
• Format: [Describe preferred response structure]

**Instructions:**
• Provide clear, actionable guidance
• Use structured formatting (bullets, numbers, headers)
• Include relevant examples where helpful
• Ensure response is immediately usable

**Success metrics:**
• Clarity and usefulness of output
• Appropriate depth and detail
• Professional quality and accuracy

${instruction ? `**Special Focus:** ${instruction}` : ''}

*This prompt is structured for optimal AI tool performance across ChatGPT, Claude, Gemini, and similar platforms.*`;
  }
}

function enhanceForFriendly(text) {
  return applySystemPrompt(text, 'friendly');
}

function enhanceForConcise(text) {
  return applySystemPrompt(text, 'concise');
}

function enhanceForDetailed(text) {
  return applySystemPrompt(text, 'detailed');
}

function enhanceForSimple(text) {
  return applySystemPrompt(text, 'simple');
}

function enhanceForSteps(text) {
  return applySystemPrompt(text, 'steps');
}

function enhanceGeneral(text, instruction = '') {
  return applySystemPrompt(text, 'general', instruction);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'SuperPrompt Auth API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/auth/signup',
      'POST /api/auth/login',
      'GET /api/auth/validate',
      'POST /api/auth/refresh',
      'POST /api/auth/reset-password',
      'POST /api/enhance'
    ]
  });
});

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
  console.log(`Simple Auth API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; 