// Test script to check auth endpoints
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Simple test endpoints
app.post('/api/auth/signup', (req, res) => {
  console.log('Signup request:', req.body);
  res.json({
    success: true,
    token: 'test-token-' + Date.now(),
    user: {
      id: 'user_' + Date.now(),
      email: req.body.email,
      name: req.body.name || 'Test User'
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  console.log('Login request:', req.body);
  res.json({
    success: true,
    token: 'test-token-' + Date.now(),
    user: {
      id: 'user_' + Date.now(),
      email: req.body.email,
      name: 'Test User'
    }
  });
});

app.get('/api/auth/validate', (req, res) => {
  console.log('Validate request:', req.headers);
  res.json({
    success: true,
    user: {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Test auth server running on port ${PORT}`);
}); 