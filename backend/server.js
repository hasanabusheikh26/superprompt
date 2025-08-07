// server.js - Backend API for AI Prompt Enhancement

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/superprompt', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Trust proxy for Vercel
app.set('trust proxy', true);

// CORS - allow all origins for simplicity
app.use(cors({
  origin: '*',
  credentials: false
}));

// Basic middleware
app.use(express.json({ limit: '10mb' }));

// Import routes
const authRoutes = require('./routes/auth');
const promptRoutes = require('./routes/prompts');
const enhanceRoutes = require('./routes/enhance');

// Rate limiting - generous for testing
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Allow 1000 requests per 15 minutes
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Auth routes
app.use('/api/auth', authRoutes);

// Prompt routes
app.use('/api/prompts', promptRoutes);

// Enhance routes
app.use('/api', enhanceRoutes);



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