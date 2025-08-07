const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('../routes/auth');
const User = require('../models/User');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  describe('POST /api/auth/signup', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should reject signup with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should reject signup with short password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should reject signup with existing email', async () => {
      // Create first user
      await createTestUser(User, { email: 'existing@example.com' });

      const userData = {
        email: 'existing@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    it('should hash password correctly', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/signup')
        .send(userData);

      const user = await User.findOne({ email: userData.email });
      expect(user.password).not.toBe(userData.password);
      expect(user.password).toMatch(/^\$2[aby]\$\d{1,2}\$/); // bcrypt hash pattern
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await createTestUser(User, {
        email: 'login@example.com',
        password: 'password123'
      });
    });

    it('should login user with valid credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email or password');
    });

    it('should reject login with wrong password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email or password');
    });

    it('should update lastLogin timestamp', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'password123'
      };

      const beforeLogin = new Date();
      await request(app)
        .post('/api/auth/login')
        .send(loginData);

      const user = await User.findOne({ email: loginData.email });
      expect(user.lastLogin.getTime()).toBeGreaterThan(beforeLogin.getTime());
    });
  });

  describe('GET /api/auth/validate', () => {
    let testUser;
    let validToken;

    beforeEach(async () => {
      testUser = await createTestUser(User);
      validToken = generateTestToken(testUser._id);
    });

    it('should validate valid token', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .get('/api/auth/validate');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should reject token for non-existent user', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId();
      const token = generateTestToken(nonExistentUserId);

      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/refresh', () => {
    let testUser;
    let validToken;

    beforeEach(async () => {
      testUser = await createTestUser(User);
      validToken = generateTestToken(testUser._id);
    });

    it('should refresh valid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.token).not.toBe(validToken);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/reset-password', () => {
    beforeEach(async () => {
      await createTestUser(User, { email: 'reset@example.com' });
    });

    it('should send reset email for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'reset@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset email sent');
    });

    it('should handle non-existent user gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('User not found');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/auth/verify', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser(User, {
        email: 'verify@example.com',
        isVerified: false,
        verificationToken: 'test-verification-token'
      });
    });

    it('should verify user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify?token=test-verification-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Email verified successfully');

      // Check that user is now verified
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.isVerified).toBe(true);
      expect(updatedUser.verificationToken).toBeUndefined();
    });

    it('should reject invalid verification token', async () => {
      const response = await request(app)
        .get('/api/auth/verify?token=invalid-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid verification token');
    });
  });

  describe('POST /api/auth/reset-password/:token', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser(User, {
        email: 'reset@example.com',
        resetPasswordToken: 'test-reset-token',
        resetPasswordExpires: new Date(Date.now() + 3600000) // 1 hour from now
      });
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'newpassword123';
      const response = await request(app)
        .post('/api/auth/reset-password/test-reset-token')
        .send({ password: newPassword });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset successfully');

      // Check that reset tokens are cleared
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.resetPasswordToken).toBeUndefined();
      expect(updatedUser.resetPasswordExpires).toBeUndefined();
    });

    it('should reject short password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password/test-reset-token')
        .send({ password: '123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid reset token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password/invalid-token')
        .send({ password: 'newpassword123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid or expired reset token');
    });
  });
}); 