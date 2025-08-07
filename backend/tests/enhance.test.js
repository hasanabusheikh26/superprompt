const request = require('supertest');
const express = require('express');
const enhanceRoutes = require('../routes/enhance');

const app = express();
app.use(express.json());
app.use('/api', enhanceRoutes);

describe('Enhance Routes', () => {
  describe('POST /api/enhance', () => {
    it('should enhance text with custom instruction', async () => {
      const requestData = {
        text: 'Hello world',
        instruction: 'Make it formal'
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.originalText).toBe(requestData.text);
      expect(response.body.enhancedText).toBeDefined();
      expect(response.body.instruction).toBe(requestData.instruction);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should enhance text with predefined instruction', async () => {
      const requestData = {
        text: 'Write a function to add numbers',
        instruction: 'detailed'
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enhancedText).toBeDefined();
    });

    it('should enhance text with examples instruction', async () => {
      const requestData = {
        text: 'Explain recursion',
        instruction: 'examples'
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enhancedText).toBeDefined();
    });

    it('should enhance text with clarify instruction', async () => {
      const requestData = {
        text: 'This is a very long and complicated explanation that could be simplified',
        instruction: 'clarify'
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enhancedText).toBeDefined();
    });

    it('should enhance text with step-by-step instruction', async () => {
      const requestData = {
        text: 'How to make coffee',
        instruction: 'stepbystep'
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enhancedText).toBeDefined();
    });

    it('should enhance text with simple language instruction', async () => {
      const requestData = {
        text: 'The quantum mechanical properties of subatomic particles exhibit wave-particle duality',
        instruction: 'simple'
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enhancedText).toBeDefined();
    });

    it('should enhance text with specific instruction', async () => {
      const requestData = {
        text: 'Create a function',
        instruction: 'specific'
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enhancedText).toBeDefined();
    });

    it('should use default enhancement when no instruction provided', async () => {
      const requestData = {
        text: 'Hello world'
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enhancedText).toBeDefined();
      expect(response.body.instruction).toBe('custom');
    });

    it('should reject request without text', async () => {
      const requestData = {
        instruction: 'Make it formal'
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Text is required');
    });

    it('should reject request with empty text', async () => {
      const requestData = {
        text: '',
        instruction: 'Make it formal'
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Text is required');
    });

    it('should reject request with non-string text', async () => {
      const requestData = {
        text: 123,
        instruction: 'Make it formal'
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must be a string');
    });

    it('should reject request with text too long', async () => {
      const longText = 'a'.repeat(5001);
      const requestData = {
        text: longText,
        instruction: 'Make it formal'
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Text too long');
    });

    it('should handle special characters in text', async () => {
      const requestData = {
        text: 'Hello world! How are you? This is a test with "quotes" and <tags>.',
        instruction: 'Make it formal'
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enhancedText).toBeDefined();
    });

    it('should handle unicode characters', async () => {
      const requestData = {
        text: 'Hello 世界! Привет мир!',
        instruction: 'Make it formal'
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enhancedText).toBeDefined();
    });

    it('should handle multiline text', async () => {
      const requestData = {
        text: 'Line 1\nLine 2\nLine 3',
        instruction: 'Make it formal'
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enhancedText).toBeDefined();
    });

    it('should work with different enhancement types', async () => {
      const enhancementTypes = [
        'detailed',
        'examples',
        'clarify',
        'stepbystep',
        'simple',
        'specific',
        'improve',
        'professional',
        'creative',
        'engaging'
      ];

      for (const type of enhancementTypes) {
        const requestData = {
          text: 'Test text',
          instruction: type
        };

        const response = await request(app)
          .post('/api/enhance')
          .send(requestData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.enhancedText).toBeDefined();
      }
    });

    it('should handle fallback enhancement when AI fails', async () => {
      // Mock OpenAI to fail
      const originalOpenAI = require('openai');
      jest.spyOn(originalOpenAI.OpenAI.prototype.chat.completions, 'create')
        .mockRejectedValueOnce(new Error('OpenAI API error'));

      const requestData = {
        text: 'Hello world',
        instruction: 'Make it formal'
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enhancedText).toBeDefined();
      expect(response.body.enhancedText).toContain('Hello world');
    });

    it('should handle empty instruction gracefully', async () => {
      const requestData = {
        text: 'Hello world',
        instruction: ''
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enhancedText).toBeDefined();
    });

    it('should handle null instruction gracefully', async () => {
      const requestData = {
        text: 'Hello world',
        instruction: null
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enhancedText).toBeDefined();
    });

    it('should handle undefined instruction gracefully', async () => {
      const requestData = {
        text: 'Hello world'
        // instruction is undefined
      };

      const response = await request(app)
        .post('/api/enhance')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enhancedText).toBeDefined();
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api/');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('AI Prompt Enhancer API');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.status).toBe('running');
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });
}); 