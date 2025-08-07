const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const promptRoutes = require('../routes/prompts');
const User = require('../models/User');
const Prompt = require('../models/Prompt');

const app = express();
app.use(express.json());
app.use('/api/prompts', promptRoutes);

describe('Prompt Routes', () => {
  let testUser;
  let testUser2;
  let authToken;

  beforeEach(async () => {
    testUser = await createTestUser(User, { email: 'user1@example.com' });
    testUser2 = await createTestUser(User, { email: 'user2@example.com' });
    authToken = generateTestToken(testUser._id);
  });

  describe('GET /api/prompts', () => {
    beforeEach(async () => {
      await createTestPrompt(Prompt, testUser._id, { content: 'User 1 prompt 1' });
      await createTestPrompt(Prompt, testUser._id, { content: 'User 1 prompt 2' });
      await createTestPrompt(Prompt, testUser2._id, { content: 'User 2 prompt' });
    });

    it('should get all prompts for authenticated user', async () => {
      const response = await request(app)
        .get('/api/prompts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.prompts).toHaveLength(2);
      expect(response.body.prompts[0].userId).toBe(testUser._id.toString());
      expect(response.body.prompts[1].userId).toBe(testUser._id.toString());
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/prompts');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return empty array for user with no prompts', async () => {
      const newUser = await createTestUser(User, { email: 'newuser@example.com' });
      const newToken = generateTestToken(newUser._id);

      const response = await request(app)
        .get('/api/prompts')
        .set('Authorization', `Bearer ${newToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.prompts).toHaveLength(0);
    });
  });

  describe('POST /api/prompts', () => {
    it('should create a new prompt successfully', async () => {
      const promptData = {
        content: 'Test prompt content',
        tags: ['test', 'example'],
        folder: 'test-folder',
        isPublic: false
      };

      const response = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(promptData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.prompt.content).toBe(promptData.content);
      expect(response.body.prompt.tags).toEqual(promptData.tags);
      expect(response.body.prompt.folder).toBe(promptData.folder);
      expect(response.body.prompt.isPublic).toBe(promptData.isPublic);
      expect(response.body.prompt.userId).toBe(testUser._id.toString());
    });

    it('should reject prompt creation without content', async () => {
      const promptData = {
        tags: ['test'],
        folder: 'test-folder'
      };

      const response = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(promptData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should reject prompt creation without authentication', async () => {
      const promptData = {
        content: 'Test prompt content'
      };

      const response = await request(app)
        .post('/api/prompts')
        .send(promptData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should create prompt with minimal data', async () => {
      const promptData = {
        content: 'Minimal prompt'
      };

      const response = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(promptData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.prompt.content).toBe(promptData.content);
      expect(response.body.prompt.tags).toEqual([]);
      expect(response.body.prompt.folder).toBeUndefined();
      expect(response.body.prompt.isPublic).toBe(false);
    });
  });

  describe('GET /api/prompts/:id', () => {
    let testPrompt;

    beforeEach(async () => {
      testPrompt = await createTestPrompt(Prompt, testUser._id, {
        content: 'Test prompt for retrieval'
      });
    });

    it('should get prompt by ID for owner', async () => {
      const response = await request(app)
        .get(`/api/prompts/${testPrompt._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.prompt._id).toBe(testPrompt._id.toString());
      expect(response.body.prompt.content).toBe(testPrompt.content);
    });

    it('should reject access to prompt by non-owner', async () => {
      const otherToken = generateTestToken(testUser2._id);

      const response = await request(app)
        .get(`/api/prompts/${testPrompt._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Prompt not found');
    });

    it('should reject access to non-existent prompt', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/prompts/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Prompt not found');
    });

    it('should reject access without authentication', async () => {
      const response = await request(app)
        .get(`/api/prompts/${testPrompt._id}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/prompts/:id', () => {
    let testPrompt;

    beforeEach(async () => {
      testPrompt = await createTestPrompt(Prompt, testUser._id, {
        content: 'Original content',
        tags: ['original'],
        folder: 'original-folder'
      });
    });

    it('should update prompt successfully', async () => {
      const updateData = {
        content: 'Updated content',
        tags: ['updated', 'test'],
        folder: 'updated-folder',
        isPublic: true
      };

      const response = await request(app)
        .put(`/api/prompts/${testPrompt._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.prompt.content).toBe(updateData.content);
      expect(response.body.prompt.tags).toEqual(updateData.tags);
      expect(response.body.prompt.folder).toBe(updateData.folder);
      expect(response.body.prompt.isPublic).toBe(updateData.isPublic);
    });

    it('should update only provided fields', async () => {
      const updateData = {
        content: 'Only content updated'
      };

      const response = await request(app)
        .put(`/api/prompts/${testPrompt._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.prompt.content).toBe(updateData.content);
      expect(response.body.prompt.tags).toEqual(testPrompt.tags);
      expect(response.body.prompt.folder).toBe(testPrompt.folder);
    });

    it('should reject update by non-owner', async () => {
      const otherToken = generateTestToken(testUser2._id);

      const response = await request(app)
        .put(`/api/prompts/${testPrompt._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ content: 'Unauthorized update' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Prompt not found');
    });

    it('should reject update without authentication', async () => {
      const response = await request(app)
        .put(`/api/prompts/${testPrompt._id}`)
        .send({ content: 'Unauthorized update' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/prompts/:id', () => {
    let testPrompt;

    beforeEach(async () => {
      testPrompt = await createTestPrompt(Prompt, testUser._id);
    });

    it('should delete prompt successfully', async () => {
      const response = await request(app)
        .delete(`/api/prompts/${testPrompt._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Prompt deleted successfully');

      // Verify prompt is actually deleted
      const deletedPrompt = await Prompt.findById(testPrompt._id);
      expect(deletedPrompt).toBeNull();
    });

    it('should reject deletion by non-owner', async () => {
      const otherToken = generateTestToken(testUser2._id);

      const response = await request(app)
        .delete(`/api/prompts/${testPrompt._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Prompt not found');
    });

    it('should reject deletion without authentication', async () => {
      const response = await request(app)
        .delete(`/api/prompts/${testPrompt._id}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/prompts/folders/list', () => {
    beforeEach(async () => {
      await createTestPrompt(Prompt, testUser._id, { folder: 'folder1' });
      await createTestPrompt(Prompt, testUser._id, { folder: 'folder2' });
      await createTestPrompt(Prompt, testUser._id, { folder: 'folder1' });
      await createTestPrompt(Prompt, testUser2._id, { folder: 'other-user-folder' });
    });

    it('should get user folders', async () => {
      const response = await request(app)
        .get('/api/prompts/folders/list')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.folders).toHaveLength(2);
      expect(response.body.folders).toContain('folder1');
      expect(response.body.folders).toContain('folder2');
      expect(response.body.folders).not.toContain('other-user-folder');
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/prompts/folders/list');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/prompts/tags/list', () => {
    beforeEach(async () => {
      await createTestPrompt(Prompt, testUser._id, { tags: ['tag1', 'tag2'] });
      await createTestPrompt(Prompt, testUser._id, { tags: ['tag2', 'tag3'] });
      await createTestPrompt(Prompt, testUser2._id, { tags: ['other-user-tag'] });
    });

    it('should get user tags', async () => {
      const response = await request(app)
        .get('/api/prompts/tags/list')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tags).toHaveLength(3);
      expect(response.body.tags).toContain('tag1');
      expect(response.body.tags).toContain('tag2');
      expect(response.body.tags).toContain('tag3');
      expect(response.body.tags).not.toContain('other-user-tag');
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/prompts/tags/list');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/prompts/search', () => {
    beforeEach(async () => {
      await createTestPrompt(Prompt, testUser._id, {
        content: 'JavaScript programming guide',
        tags: ['javascript', 'programming'],
        folder: 'coding'
      });
      await createTestPrompt(Prompt, testUser._id, {
        content: 'Python tutorial for beginners',
        tags: ['python', 'tutorial'],
        folder: 'coding'
      });
      await createTestPrompt(Prompt, testUser._id, {
        content: 'Cooking recipe for pasta',
        tags: ['cooking', 'recipe'],
        folder: 'cooking'
      });
    });

    it('should search by content', async () => {
      const response = await request(app)
        .get('/api/prompts/search?query=javascript')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.prompts).toHaveLength(1);
      expect(response.body.prompts[0].content).toContain('JavaScript');
    });

    it('should search by folder', async () => {
      const response = await request(app)
        .get('/api/prompts/search?folder=coding')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.prompts).toHaveLength(2);
    });

    it('should search by tags', async () => {
      const response = await request(app)
        .get('/api/prompts/search?tags=javascript,programming')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.prompts).toHaveLength(1);
    });

    it('should combine multiple search criteria', async () => {
      const response = await request(app)
        .get('/api/prompts/search?query=tutorial&folder=coding')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.prompts).toHaveLength(1);
      expect(response.body.prompts[0].content).toContain('tutorial');
    });

    it('should return empty results for no matches', async () => {
      const response = await request(app)
        .get('/api/prompts/search?query=nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.prompts).toHaveLength(0);
    });

    it('should reject search without authentication', async () => {
      const response = await request(app)
        .get('/api/prompts/search?query=test');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });
}); 