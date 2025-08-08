/**
 * @fileoverview Database seeding script
 * @description Seeds the database with initial data for development
 * @author SuperPrompt Team
 * @version 2.0.0
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Prompt = require('../models/Prompt');
const { logger } = require('../utils/logger');

// Sample data
const sampleUsers = [
  {
    email: 'admin@superprompt.com',
    password: 'SuperAdmin123!',
    name: 'Admin User',
    role: 'admin',
    isVerified: true,
    subscription: {
      plan: 'enterprise',
      status: 'active'
    }
  },
  {
    email: 'demo@superprompt.com',
    password: 'DemoUser123!',
    name: 'Demo User',
    role: 'user',
    isVerified: true,
    subscription: {
      plan: 'pro',
      status: 'active'
    }
  },
  {
    email: 'test@superprompt.com',
    password: 'TestUser123!',
    name: 'Test User',
    role: 'user',
    isVerified: true,
    subscription: {
      plan: 'free',
      status: 'active'
    }
  }
];

const samplePrompts = [
  {
    title: 'Email Writing Assistant',
    content: 'Write a professional email to [RECIPIENT] about [TOPIC]. Use a [TONE] tone and include [SPECIFIC_DETAILS]. Make sure to be clear, concise, and actionable.',
    description: 'Template for writing professional emails with customizable tone and content.',
    tags: ['email', 'professional', 'communication', 'business'],
    category: 'work',
    template: {
      isTemplate: true,
      variables: [
        { name: 'RECIPIENT', type: 'text', required: true, defaultValue: 'colleague' },
        { name: 'TOPIC', type: 'text', required: true, defaultValue: 'project update' },
        { name: 'TONE', type: 'select', required: true, options: ['formal', 'friendly', 'urgent'], defaultValue: 'professional' },
        { name: 'SPECIFIC_DETAILS', type: 'text', required: false, defaultValue: 'relevant details' }
      ],
      instructions: 'Replace the bracketed placeholders with your specific information.'
    },
    visibility: 'public',
    isPublic: true
  },
  {
    title: 'Creative Story Starter',
    content: 'Write the opening paragraph of a [GENRE] story set in [SETTING]. The main character is a [CHARACTER_DESCRIPTION] who discovers [DISCOVERY]. Use vivid imagery and create an immediate hook for the reader.',
    description: 'Generate engaging story openings for creative writing.',
    tags: ['creative', 'writing', 'story', 'fiction'],
    category: 'creative',
    template: {
      isTemplate: true,
      variables: [
        { name: 'GENRE', type: 'select', required: true, options: ['fantasy', 'sci-fi', 'mystery', 'romance', 'thriller'], defaultValue: 'fantasy' },
        { name: 'SETTING', type: 'text', required: true, defaultValue: 'a mysterious forest' },
        { name: 'CHARACTER_DESCRIPTION', type: 'text', required: true, defaultValue: 'young archaeologist' },
        { name: 'DISCOVERY', type: 'text', required: true, defaultValue: 'an ancient artifact' }
      ]
    },
    visibility: 'public',
    isPublic: true
  },
  {
    title: 'Code Review Checklist',
    content: `Review the following [LANGUAGE] code for:
1. Code quality and readability
2. Performance optimization opportunities
3. Security vulnerabilities
4. Best practices adherence
5. Documentation completeness

Focus on [SPECIFIC_AREAS] and provide actionable feedback with examples.`,
    description: 'Comprehensive code review template for development teams.',
    tags: ['code', 'review', 'development', 'quality'],
    category: 'technical',
    template: {
      isTemplate: true,
      variables: [
        { name: 'LANGUAGE', type: 'select', required: true, options: ['JavaScript', 'Python', 'Java', 'C#', 'Go', 'Rust'], defaultValue: 'JavaScript' },
        { name: 'SPECIFIC_AREAS', type: 'text', required: false, defaultValue: 'error handling and input validation' }
      ]
    },
    visibility: 'public',
    isPublic: true
  },
  {
    title: 'Meeting Agenda Template',
    content: `Create a meeting agenda for a [MEETING_TYPE] scheduled for [DURATION]. Include:

**Meeting Details:**
- Purpose: [PURPOSE]
- Attendees: [ATTENDEES]
- Date & Time: [DATE_TIME]

**Agenda Items:**
1. Welcome & Introductions (5 min)
2. [AGENDA_ITEM_1] ([TIME_1] min)
3. [AGENDA_ITEM_2] ([TIME_2] min)
4. [AGENDA_ITEM_3] ([TIME_3] min)
5. Action Items & Next Steps (10 min)

**Preparation:**
- [PREPARATION_ITEMS]

**Expected Outcomes:**
- [EXPECTED_OUTCOMES]`,
    description: 'Structured meeting agenda template for better meeting management.',
    tags: ['meeting', 'agenda', 'productivity', 'management'],
    category: 'work',
    template: {
      isTemplate: true,
      variables: [
        { name: 'MEETING_TYPE', type: 'select', required: true, options: ['team sync', 'project review', 'client meeting', 'brainstorming'], defaultValue: 'team sync' },
        { name: 'DURATION', type: 'select', required: true, options: ['30 minutes', '45 minutes', '60 minutes', '90 minutes'], defaultValue: '60 minutes' },
        { name: 'PURPOSE', type: 'text', required: true, defaultValue: 'weekly team synchronization' },
        { name: 'ATTENDEES', type: 'text', required: true, defaultValue: 'team members' },
        { name: 'DATE_TIME', type: 'text', required: true, defaultValue: 'TBD' }
      ]
    },
    visibility: 'public',
    isPublic: true
  },
  {
    title: 'Learning Path Creator',
    content: `Create a comprehensive learning path for [SKILL/TOPIC]. Structure it as follows:

**Learning Objective:** Master [SKILL/TOPIC] at [LEVEL] level

**Prerequisites:**
- [PREREQUISITE_1]
- [PREREQUISITE_2]

**Learning Modules:**

**Module 1: Foundations**
- Duration: [DURATION_1]
- Key Concepts: [CONCEPTS_1]
- Resources: [RESOURCES_1]
- Practice: [PRACTICE_1]

**Module 2: Intermediate**
- Duration: [DURATION_2]
- Key Concepts: [CONCEPTS_2]
- Resources: [RESOURCES_2]
- Practice: [PRACTICE_2]

**Module 3: Advanced**
- Duration: [DURATION_3]
- Key Concepts: [CONCEPTS_3]
- Resources: [RESOURCES_3]
- Practice: [PRACTICE_3]

**Assessment:**
- [ASSESSMENT_METHOD]

**Next Steps:**
- [NEXT_STEPS]`,
    description: 'Create structured learning paths for skill development.',
    tags: ['learning', 'education', 'skill-development', 'curriculum'],
    category: 'educational',
    template: {
      isTemplate: true,
      variables: [
        { name: 'SKILL/TOPIC', type: 'text', required: true, defaultValue: 'React.js development' },
        { name: 'LEVEL', type: 'select', required: true, options: ['beginner', 'intermediate', 'advanced'], defaultValue: 'intermediate' }
      ]
    },
    visibility: 'public',
    isPublic: true
  }
];

/**
 * Connect to database
 */
async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/superprompt';
    await mongoose.connect(mongoURI);
    logger.info('Connected to database for seeding');
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    process.exit(1);
  }
}

/**
 * Clear existing data
 */
async function clearData() {
  try {
    await User.deleteMany({});
    await Prompt.deleteMany({});
    logger.info('Cleared existing data');
  } catch (error) {
    logger.error('Error clearing data', { error: error.message });
    throw error;
  }
}

/**
 * Seed users
 */
async function seedUsers() {
  try {
    const users = [];
    
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      users.push(user);
      logger.info('Created user', { email: user.email, role: user.role });
    }
    
    return users;
  } catch (error) {
    logger.error('Error seeding users', { error: error.message });
    throw error;
  }
}

/**
 * Seed prompts
 */
async function seedPrompts(users) {
  try {
    const prompts = [];
    
    // Assign prompts to users (mostly to demo user)
    const demoUser = users.find(u => u.email === 'demo@superprompt.com');
    const testUser = users.find(u => u.email === 'test@superprompt.com');
    
    for (let i = 0; i < samplePrompts.length; i++) {
      const promptData = samplePrompts[i];
      const assignedUser = i < 3 ? demoUser : testUser;
      
      const prompt = new Prompt({
        ...promptData,
        userId: assignedUser._id,
        analytics: {
          usageCount: Math.floor(Math.random() * 50),
          avgRating: Math.random() * 2 + 3, // 3-5 rating
          totalRatings: Math.floor(Math.random() * 20),
          views: Math.floor(Math.random() * 200),
          favorites: Math.floor(Math.random() * 30)
        }
      });
      
      await prompt.save();
      prompts.push(prompt);
      logger.info('Created prompt', { title: prompt.title, user: assignedUser.email });
    }
    
    // Create some private prompts for variety
    const privatePrompts = [
      {
        userId: demoUser._id,
        title: 'Personal Journal Template',
        content: 'Reflect on today: What went well? What could be improved? What am I grateful for?',
        tags: ['personal', 'reflection', 'journal'],
        category: 'personal',
        visibility: 'private'
      },
      {
        userId: testUser._id,
        title: 'Bug Report Template',
        content: 'Bug: [DESCRIPTION]\nSteps to reproduce: [STEPS]\nExpected: [EXPECTED]\nActual: [ACTUAL]\nEnvironment: [ENV]',
        tags: ['bug', 'testing', 'development'],
        category: 'technical',
        visibility: 'private'
      }
    ];
    
    for (const promptData of privatePrompts) {
      const prompt = new Prompt(promptData);
      await prompt.save();
      prompts.push(prompt);
      logger.info('Created private prompt', { title: prompt.title });
    }
    
    return prompts;
  } catch (error) {
    logger.error('Error seeding prompts', { error: error.message });
    throw error;
  }
}

/**
 * Main seeding function
 */
async function seed() {
  try {
    logger.info('Starting database seeding...');
    
    await connectDB();
    
    // Check if data already exists
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      logger.warn('Database already contains data. Use --force to override.');
      if (!process.argv.includes('--force')) {
        process.exit(0);
      }
    }
    
    await clearData();
    const users = await seedUsers();
    const prompts = await seedPrompts(users);
    
    logger.info('Seeding completed successfully', {
      users: users.length,
      prompts: prompts.length
    });
    
    // Display login credentials
    console.log('\n🎉 Seeding completed successfully!\n');
    console.log('📧 Sample Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    sampleUsers.forEach(user => {
      console.log(`👤 ${user.name} (${user.role})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Plan: ${user.subscription.plan}`);
      console.log('');
    });
    console.log('🚀 Start the server and visit http://localhost:3000');
    console.log('📚 API Documentation: http://localhost:3000/api/docs');
    
  } catch (error) {
    logger.error('Seeding failed', { error: error.message, stack: error.stack });
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Handle command line arguments
if (require.main === module) {
  seed();
}

module.exports = { seed };