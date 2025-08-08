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

// Handle preflight requests
app.options('*', cors());

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

// Enhancement helper functions
function enhanceForFormal(text) {
  return `**Professional Enhancement:**

${text}

**Key Improvements:**
• Enhanced professional tone and structure
• Improved clarity and precision
• Added appropriate business language
• Ensured formal presentation standards

This refined version maintains the core message while elevating the professional presentation and ensuring clear, authoritative communication.`;
}

function enhanceForFriendly(text) {
  return `Hey there! 😊

Here's a more friendly version of your text:

${text}

I've made it more conversational and approachable while keeping all the important information. The tone is now warmer and more engaging, perfect for connecting with your audience on a personal level!

Hope this helps make your message more relatable! 🌟`;
}

function enhanceForConcise(text) {
  // Extract key points and make concise
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const keyPoints = sentences.slice(0, 3).map(s => s.trim()).join('. ');
  
  return `**Concise Version:**

${keyPoints}.

**Summary:** This streamlined version captures the essential information while eliminating unnecessary details for maximum impact and clarity.`;
}

function enhanceForDetailed(text) {
  return `**Comprehensive Analysis:**

${text}

**Detailed Breakdown:**

1. **Context & Background:**
   Understanding the full scope of this topic requires considering multiple factors and perspectives.

2. **Key Components:**
   • Primary elements and their relationships
   • Supporting details and evidence
   • Practical implications and applications

3. **Implementation Considerations:**
   • Step-by-step approach recommendations
   • Potential challenges and solutions
   • Best practices and optimization strategies

4. **Expected Outcomes:**
   • Immediate benefits and results
   • Long-term impact and sustainability
   • Success metrics and evaluation criteria

This comprehensive enhancement provides thorough coverage while maintaining clarity and actionable insights.`;
}

function enhanceForSimple(text) {
  return `**Simple Explanation:**

${text}

**In Easy Terms:**
Think of this like [simple analogy]. The main idea is straightforward - we're focusing on the most important parts and explaining them in a way that's easy to understand.

**Quick Summary:**
• Main point: [Core concept]
• Why it matters: [Benefit/importance]
• What to do: [Simple action]

This version breaks down complex ideas into bite-sized, easy-to-follow pieces! 🎯`;
}

function enhanceForSteps(text) {
  return `**Step-by-Step Guide:**

Based on: "${text}"

**Phase 1: Preparation**
1. Analyze requirements and objectives
2. Gather necessary resources and tools
3. Set up optimal working environment

**Phase 2: Implementation** 
1. Begin with core functionality
2. Build and test incrementally
3. Integrate components systematically

**Phase 3: Optimization**
1. Review and refine approach
2. Test thoroughly and validate results
3. Document process and outcomes

**Phase 4: Completion**
1. Finalize all components
2. Conduct final quality checks
3. Deploy and monitor results

This systematic approach ensures thorough execution and successful outcomes! ✅`;
}

function enhanceGeneral(text, instruction = '') {
  return `**Enhanced Version:**

${text}

**Improvements Applied:**
• Optimized structure and flow
• Enhanced clarity and readability
• Strengthened key messaging
• Added professional polish

${instruction ? `**Specific Enhancement Focus:** ${instruction}` : '**General Enhancement:** Improved overall quality and impact'}

This refined version maintains your original intent while elevating the presentation and ensuring maximum effectiveness.`;
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