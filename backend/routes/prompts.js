const express = require('express');
const { body, validationResult } = require('express-validator');
const Prompt = require('../models/Prompt');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all prompts for user
router.get('/', auth, async (req, res) => {
  try {
    const prompts = await Prompt.find({ userId: req.user._id })
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      prompts
    });
  } catch (error) {
    console.error('Get prompts error:', error);
    res.status(500).json({ error: 'Server error while fetching prompts.' });
  }
});

// Create new prompt
router.post('/', auth, [
  body('content').notEmpty().trim(),
  body('tags').optional().isArray(),
  body('folder').optional().trim(),
  body('isPublic').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { content, tags = [], folder, isPublic = false } = req.body;

    const prompt = new Prompt({
      userId: req.user._id,
      content,
      tags,
      folder,
      isPublic
    });

    await prompt.save();

    res.status(201).json({
      success: true,
      prompt
    });
  } catch (error) {
    console.error('Create prompt error:', error);
    res.status(500).json({ error: 'Server error while creating prompt.' });
  }
});

// Get single prompt
router.get('/:id', auth, async (req, res) => {
  try {
    const prompt = await Prompt.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found.' });
    }

    res.json({
      success: true,
      prompt
    });
  } catch (error) {
    console.error('Get prompt error:', error);
    res.status(500).json({ error: 'Server error while fetching prompt.' });
  }
});

// Update prompt
router.put('/:id', auth, [
  body('content').optional().notEmpty().trim(),
  body('tags').optional().isArray(),
  body('folder').optional().trim(),
  body('isPublic').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const prompt = await Prompt.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found.' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        prompt[key] = req.body[key];
      }
    });

    await prompt.save();

    res.json({
      success: true,
      prompt
    });
  } catch (error) {
    console.error('Update prompt error:', error);
    res.status(500).json({ error: 'Server error while updating prompt.' });
  }
});

// Delete prompt
router.delete('/:id', auth, async (req, res) => {
  try {
    const prompt = await Prompt.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found.' });
    }

    res.json({
      success: true,
      message: 'Prompt deleted successfully.'
    });
  } catch (error) {
    console.error('Delete prompt error:', error);
    res.status(500).json({ error: 'Server error while deleting prompt.' });
  }
});

// Get user's folders
router.get('/folders/list', auth, async (req, res) => {
  try {
    const folders = await Prompt.distinct('folder', {
      userId: req.user._id,
      folder: { $exists: true, $ne: null, $ne: '' }
    });

    res.json({
      success: true,
      folders
    });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ error: 'Server error while fetching folders.' });
  }
});

// Get user's tags
router.get('/tags/list', auth, async (req, res) => {
  try {
    const tags = await Prompt.distinct('tags', {
      userId: req.user._id,
      tags: { $exists: true, $ne: [] }
    });

    res.json({
      success: true,
      tags
    });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Server error while fetching tags.' });
  }
});

// Search prompts
router.get('/search', auth, async (req, res) => {
  try {
    const { query, folder, tags } = req.query;
    const filter = { userId: req.user._id };

    if (query) {
      filter.content = { $regex: query, $options: 'i' };
    }

    if (folder) {
      filter.folder = folder;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    const prompts = await Prompt.find(filter).sort({ updatedAt: -1 });

    res.json({
      success: true,
      prompts
    });
  } catch (error) {
    console.error('Search prompts error:', error);
    res.status(500).json({ error: 'Server error while searching prompts.' });
  }
});

module.exports = router; 