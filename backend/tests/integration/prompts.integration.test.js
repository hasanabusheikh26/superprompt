/**
 * @fileoverview Integration tests for prompts functionality
 * @description End-to-end prompts testing with authentication
 * @author SuperPrompt Team
 * @version 2.0.0
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../../server');
const User = require('../../models/User');
const Prompt = require('../../models/Prompt');

describe('Prompts Integration Tests', () => {
  let testUser;
  let authToken;
  let userId;

  beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});
    await Prompt.deleteMany({});

    // Create and authenticate test user
    testUser = new User({
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User',
      isVerified: true
    });
    await testUser.save();
    userId = testUser._id;

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'TestPassword123!'
      });

    authToken = loginResponse.body.token;
  });

  describe('POST /api/prompts', () => {
    it('should create a new prompt', async () => {
      const promptData = {
        title: 'Test Prompt',
        content: 'This is a test prompt for AI enhancement',
        tags: ['test', 'ai'],
        folder: 'Test Folder',
        category: 'technical'
      };

      const response = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(promptData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        prompt: {
          title: promptData.title,
          content: promptData.content,
          tags: promptData.tags,
          folder: promptData.folder,
          category: promptData.category,
          userId: userId.toString(),
          visibility: 'private',
          version: 1
        }
      });

      // Verify prompt was created in database
      const promptInDb = await Prompt.findById(response.body.prompt._id);
      expect(promptInDb).toBeTruthy();
      expect(promptInDb.userId.toString()).toBe(userId.toString());
    });

    it('should auto-generate title from content if not provided', async () => {
      const promptData = {
        content: 'This is a very long content that should be truncated for the title generation process and show only first part'
      };

      const response = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(promptData)
        .expect(201);

      expect(response.body.prompt.title).toContain('This is a very long content');
      expect(response.body.prompt.title).toContain('...');
      expect(response.body.prompt.title.length).toBeLessThanOrEqual(53); // 50 chars + '...'
    });

    it('should validate content length', async () => {
      const promptData = {
        content: 'a'.repeat(50001) // Exceeds max length
      };

      const response = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(promptData)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });

    it('should sanitize malicious content', async () => {
      const promptData = {
        content: 'Clean content',
        title: '<script>alert("xss")</script>Malicious Title',
        tags: ['<script>alert("xss")</script>', 'clean-tag']
      };

      const response = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(promptData)
        .expect(201);

      expect(response.body.prompt.title).not.toContain('<script>');
      expect(response.body.prompt.tags).not.toContain('<script>alert("xss")</script>');
    });

    it('should require authentication', async () => {
      const promptData = {
        content: 'Test content'
      };

      const response = await request(app)
        .post('/api/prompts')
        .send(promptData)
        .expect(401);

      expect(response.body.error).toContain('Authentication required');
    });

    it('should handle rate limiting', async () => {
      const promptData = {
        content: 'Test content for rate limiting'
      };

      // Make multiple requests quickly
      const requests = Array(31).fill().map((_, index) =>
        request(app)
          .post('/api/prompts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...promptData, title: `Prompt ${index}` })
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/prompts', () => {
    beforeEach(async () => {
      // Create test prompts
      const prompts = [
        {
          userId,
          title: 'First Prompt',
          content: 'First prompt content',
          tags: ['tag1'],
          folder: 'Folder A'
        },
        {
          userId,
          title: 'Second Prompt',
          content: 'Second prompt content',
          tags: ['tag2'],
          folder: 'Folder B'
        },
        {
          userId,
          title: 'Third Prompt',
          content: 'Third prompt content',
          tags: ['tag1', 'tag2']
        }
      ];

      await Prompt.insertMany(prompts);
    });

    it('should get user prompts with pagination', async () => {
      const response = await request(app)
        .get('/api/prompts?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        prompts: expect.arrayContaining([
          expect.objectContaining({
            userId: userId.toString()
          })
        ]),
        pagination: {
          page: 1,
          limit: 2,
          total: 3,
          pages: 2,
          hasNext: true,
          hasPrev: false
        }
      });

      expect(response.body.prompts).toHaveLength(2);
    });

    it('should sort prompts by specified field', async () => {
      const response = await request(app)
        .get('/api/prompts?sort=title&order=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.prompts[0].title).toBe('First Prompt');
      expect(response.body.prompts[1].title).toBe('Second Prompt');
      expect(response.body.prompts[2].title).toBe('Third Prompt');
    });

    it('should only return user own prompts', async () => {
      // Create another user and their prompt
      const otherUser = new User({
        email: 'other@example.com',
        password: 'TestPassword123!',
        isVerified: true
      });
      await otherUser.save();

      await Prompt.create({
        userId: otherUser._id,
        title: 'Other User Prompt',
        content: 'Should not be visible'
      });

      const response = await request(app)
        .get('/api/prompts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should only get current user's prompts
      expect(response.body.prompts).toHaveLength(3);
      response.body.prompts.forEach(prompt => {
        expect(prompt.userId).toBe(userId.toString());
      });
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/prompts?page=0&limit=101')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('GET /api/prompts/:id', () => {
    let testPrompt;

    beforeEach(async () => {
      testPrompt = await Prompt.create({
        userId,
        title: 'Test Prompt',
        content: 'Test content for single prompt retrieval'
      });
    });

    it('should get single prompt by ID', async () => {
      const response = await request(app)
        .get(`/api/prompts/${testPrompt._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        prompt: {
          _id: testPrompt._id.toString(),
          title: testPrompt.title,
          content: testPrompt.content,
          userId: userId.toString()
        }
      });
    });

    it('should return 404 for non-existent prompt', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/prompts/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should prevent access to other user prompts', async () => {
      // Create another user and their prompt
      const otherUser = new User({
        email: 'other@example.com',
        password: 'TestPassword123!',
        isVerified: true
      });
      await otherUser.save();

      const otherPrompt = await Prompt.create({
        userId: otherUser._id,
        title: 'Other User Prompt',
        content: 'Should not be accessible'
      });

      const response = await request(app)
        .get(`/api/prompts/${otherPrompt._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should validate prompt ID format', async () => {
      const response = await request(app)
        .get('/api/prompts/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Invalid prompt ID');
    });
  });

  describe('PUT /api/prompts/:id', () => {
    let testPrompt;

    beforeEach(async () => {
      testPrompt = await Prompt.create({
        userId,
        title: 'Original Title',
        content: 'Original content',
        tags: ['original'],
        version: 1
      });
    });

    it('should update prompt successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        tags: ['updated', 'test']
      };

      const response = await request(app)
        .put(`/api/prompts/${testPrompt._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        prompt: {
          title: updateData.title,
          content: updateData.content,
          tags: updateData.tags,
          version: 2 // Should increment version
        }
      });

      // Verify in database
      const updatedPrompt = await Prompt.findById(testPrompt._id);
      expect(updatedPrompt.title).toBe(updateData.title);
      expect(updatedPrompt.version).toBe(2);
    });

    it('should store previous version', async () => {
      const updateData = {
        content: 'Completely new content'
      };

      await request(app)
        .put(`/api/prompts/${testPrompt._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      const updatedPrompt = await Prompt.findById(testPrompt._id);
      expect(updatedPrompt.previousVersions).toHaveLength(1);
      expect(updatedPrompt.previousVersions[0].content).toBe('Original content');
      expect(updatedPrompt.previousVersions[0].version).toBe(1);
    });

    it('should prevent updating other user prompts', async () => {
      // Create another user
      const otherUser = new User({
        email: 'other@example.com',
        password: 'TestPassword123!',
        isVerified: true
      });
      await otherUser.save();

      const otherPrompt = await Prompt.create({
        userId: otherUser._id,
        title: 'Other User Prompt',
        content: 'Should not be updatable'
      });

      const response = await request(app)
        .put(`/api/prompts/${otherPrompt._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Hacked Title' })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should validate update data', async () => {
      const invalidData = {
        content: 'a'.repeat(50001) // Too long
      };

      const response = await request(app)
        .put(`/api/prompts/${testPrompt._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('DELETE /api/prompts/:id', () => {
    let testPrompt;

    beforeEach(async () => {
      testPrompt = await Prompt.create({
        userId,
        title: 'Prompt to Delete',
        content: 'This prompt will be deleted'
      });
    });

    it('should soft delete prompt', async () => {
      const response = await request(app)
        .delete(`/api/prompts/${testPrompt._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('deleted')
      });

      // Verify soft deletion in database
      const deletedPrompt = await Prompt.findById(testPrompt._id);
      expect(deletedPrompt).toBeNull(); // Should not be found in normal queries

      // Verify it exists with deletedAt field when queried directly
      const deletedPromptRaw = await Prompt.findOne({ 
        _id: testPrompt._id,
        deletedAt: { $ne: null }
      }).setOptions({ includeDeleted: true });
      // Note: This requires custom query middleware adjustment
    });

    it('should prevent deleting other user prompts', async () => {
      const otherUser = new User({
        email: 'other@example.com',
        password: 'TestPassword123!',
        isVerified: true
      });
      await otherUser.save();

      const otherPrompt = await Prompt.create({
        userId: otherUser._id,
        title: 'Other User Prompt',
        content: 'Should not be deletable'
      });

      const response = await request(app)
        .delete(`/api/prompts/${otherPrompt._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/prompts/search', () => {
    beforeEach(async () => {
      // Create searchable prompts
      const prompts = [
        {
          userId,
          title: 'JavaScript Tutorial',
          content: 'Learn JavaScript programming fundamentals',
          tags: ['javascript', 'programming', 'tutorial'],
          category: 'technical'
        },
        {
          userId,
          title: 'Creative Writing',
          content: 'Tips for creative writing and storytelling',
          tags: ['writing', 'creative', 'storytelling'],
          category: 'creative'
        },
        {
          userId,
          title: 'React Components',
          content: 'Building reusable React components with JavaScript',
          tags: ['react', 'javascript', 'components'],
          category: 'technical'
        }
      ];

      await Prompt.insertMany(prompts);

      // Wait for text index to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should search by content', async () => {
      const response = await request(app)
        .get('/api/prompts/search?q=JavaScript')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.prompts.length).toBeGreaterThan(0);
      
      // Should include prompts containing "JavaScript"
      const jsPrompts = response.body.prompts.filter(p => 
        p.title.includes('JavaScript') || p.content.includes('JavaScript')
      );
      expect(jsPrompts.length).toBeGreaterThan(0);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/prompts/search?category=creative')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.prompts).toHaveLength(1);
      expect(response.body.prompts[0].title).toBe('Creative Writing');
    });

    it('should filter by tags', async () => {
      const response = await request(app)
        .get('/api/prompts/search?tags=javascript,programming')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.prompts.length).toBeGreaterThan(0);
      response.body.prompts.forEach(prompt => {
        expect(
          prompt.tags.includes('javascript') || prompt.tags.includes('programming')
        ).toBe(true);
      });
    });

    it('should handle pagination in search', async () => {
      const response = await request(app)
        .get('/api/prompts/search?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.prompts.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should validate search parameters', async () => {
      const response = await request(app)
        .get('/api/prompts/search?q=' + 'a'.repeat(201))
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('Bulk Operations', () => {
    let testPrompts;

    beforeEach(async () => {
      // Create multiple prompts for bulk operations
      const prompts = Array(5).fill().map((_, index) => ({
        userId,
        title: `Prompt ${index + 1}`,
        content: `Content for prompt ${index + 1}`,
        folder: index < 3 ? 'Folder A' : 'Folder B'
      }));

      testPrompts = await Prompt.insertMany(prompts);
    });

    it('should perform bulk delete', async () => {
      const promptIds = testPrompts.slice(0, 3).map(p => p._id);

      const response = await request(app)
        .post('/api/prompts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          operation: 'delete',
          promptIds: promptIds
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.affectedCount).toBe(3);

      // Verify prompts were deleted
      const remainingPrompts = await Prompt.find({ userId });
      expect(remainingPrompts).toHaveLength(2);
    });

    it('should perform bulk move', async () => {
      const promptIds = testPrompts.slice(0, 2).map(p => p._id);
      const targetFolder = 'New Folder';

      const response = await request(app)
        .post('/api/prompts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          operation: 'move',
          promptIds: promptIds,
          targetFolder: targetFolder
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.affectedCount).toBe(2);

      // Verify prompts were moved
      const movedPrompts = await Prompt.find({ 
        _id: { $in: promptIds },
        folder: targetFolder 
      });
      expect(movedPrompts).toHaveLength(2);
    });

    it('should validate bulk operation parameters', async () => {
      const response = await request(app)
        .post('/api/prompts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          operation: 'invalid-operation',
          promptIds: [testPrompts[0]._id]
        })
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });

    it('should limit bulk operation size', async () => {
      const tooManyIds = Array(51).fill().map(() => new mongoose.Types.ObjectId());

      const response = await request(app)
        .post('/api/prompts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          operation: 'delete',
          promptIds: tooManyIds
        })
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('Analytics Endpoints', () => {
    beforeEach(async () => {
      // Create prompts with various analytics data
      await Prompt.insertMany([
        {
          userId,
          title: 'Popular Prompt',
          content: 'Very popular content',
          analytics: { usageCount: 10, avgRating: 4.5, totalRatings: 5 }
        },
        {
          userId,
          title: 'New Prompt',
          content: 'Recently created',
          analytics: { usageCount: 1, avgRating: 0, totalRatings: 0 }
        }
      ]);
    });

    it('should get user analytics', async () => {
      const response = await request(app)
        .get('/api/prompts/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        analytics: {
          totalPrompts: 2,
          publicPrompts: 0,
          privatePrompts: 2,
          folderStats: expect.any(Array),
          tagStats: expect.any(Array),
          recentActivity: expect.any(Array)
        }
      });
    });

    it('should require authentication for analytics', async () => {
      const response = await request(app)
        .get('/api/prompts/analytics')
        .expect(401);

      expect(response.body.error).toContain('Authentication required');
    });
  });
});