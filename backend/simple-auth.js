// Simple auth server for testing
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Simple in-memory user storage
const users = new Map();
const JWT_SECRET = process.env.JWT_SECRET || 'superprompt-secret-key-2024';

// Configure CORS for Chrome extensions
app.use(cors({
  origin: ['chrome-extension://*', 'https://v0.dev', 'https://superprompt-7hwu9skcf-hass-projects-b72778ab.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

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

// Text enhancement endpoint
app.post('/api/enhance', async (req, res) => {
  try {
    const { text, instruction } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required.' });
    }

    // Simple text enhancement (you can integrate OpenAI here)
    let enhancedText = text;
    
    if (instruction) {
      enhancedText = `Enhanced: ${text}\n\nInstruction: ${instruction}\n\nResult: ${text} (enhanced based on your instruction)`;
    } else {
      enhancedText = `Enhanced: ${text}\n\nThis text has been processed by SuperPrompt.`;
    }

    res.json({
      success: true,
      enhancedText,
      originalText: text,
      instruction: instruction || 'No specific instruction provided'
    });

  } catch (error) {
    console.error('Enhancement error:', error);
    res.status(500).json({ error: 'Server error during text enhancement.' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'SuperPrompt Auth API',
    version: '1.0.0',
    endpoints: [
      'POST /api/auth/signup',
      'POST /api/auth/login',
      'GET /api/auth/validate',
      'POST /api/auth/refresh',
      'POST /api/auth/reset-password'
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