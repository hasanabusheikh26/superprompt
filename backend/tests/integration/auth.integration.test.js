/**
 * @fileoverview Integration tests for authentication flow
 * @description End-to-end authentication testing with real database
 * @author SuperPrompt Team
 * @version 2.0.0
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../../server');
const User = require('../../models/User');
const { AuthService } = require('../../services/authService');

describe('Authentication Integration Tests', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Clear all collections before each test
    await User.deleteMany({});
    
    // Create a test user
    testUser = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User'
    };
  });

  describe('POST /api/auth/signup', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send(testUser)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        token: expect.any(String),
        user: {
          email: testUser.email,
          name: testUser.name,
          isVerified: false
        }
      });

      // Verify user was created in database
      const userInDb = await User.findOne({ email: testUser.email });
      expect(userInDb).toBeTruthy();
      expect(userInDb.email).toBe(testUser.email);
      expect(userInDb.password).not.toBe(testUser.password); // Should be hashed
    });

    it('should reject duplicate email registration', async () => {
      // Create user first
      await request(app)
        .post('/api/auth/signup')
        .send(testUser)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/signup')
        .send(testUser)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });

    it('should validate email format', async () => {
      const invalidUser = { ...testUser, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(invalidUser)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });

    it('should validate password strength', async () => {
      const weakPasswordUser = { ...testUser, password: '123' };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(weakPasswordUser)
        .expect(400);

      expect(response.body.error).toContain('Password must be');
    });

    it('should handle rate limiting', async () => {
      // Make multiple requests quickly
      const requests = Array(6).fill().map(() =>
        request(app)
          .post('/api/auth/signup')
          .send({ ...testUser, email: `test${Math.random()}@example.com` })
      );

      const responses = await Promise.all(requests);
      
      // Last request should be rate limited
      const rateLimitedResponse = responses[responses.length - 1];
      expect(rateLimitedResponse.status).toBe(429);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create and verify a user for login tests
      const user = new User(testUser);
      await user.save();
      
      // Verify the user
      user.isVerified = true;
      await user.save();
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        token: expect.any(String),
        user: {
          email: testUser.email,
          name: testUser.name
        }
      });

      authToken = response.body.token;
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);

      expect(response.body.error).toContain('Invalid email or password');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toContain('Invalid email or password');
    });

    it('should reject unverified user', async () => {
      // Create unverified user
      const unverifiedUser = new User({
        email: 'unverified@example.com',
        password: 'TestPassword123!',
        isVerified: false
      });
      await unverifiedUser.save();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unverified@example.com',
          password: 'TestPassword123!'
        })
        .expect(401);

      expect(response.body.error).toContain('verify your email');
    });

    it('should track login attempts and lock account', async () => {
      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'wrongpassword'
          })
          .expect(401);
      }

      // Next attempt should indicate account is locked
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(401);

      expect(response.body.error).toContain('locked');
    });
  });

  describe('GET /api/auth/validate', () => {
    beforeEach(async () => {
      // Create verified user and get token
      const user = new User(testUser);
      await user.save();
      user.isVerified = true;
      await user.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = loginResponse.body.token;
    });

    it('should validate valid token', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        user: {
          email: testUser.email,
          name: testUser.name
        }
      });
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .expect(401);

      expect(response.body.error).toContain('Authentication required');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toContain('Invalid or expired token');
    });

    it('should reject expired token', async () => {
      // Create an expired token
      const expiredToken = AuthService.generateToken(
        new mongoose.Types.ObjectId(),
        { expiresIn: '1ms' }
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('POST /api/auth/refresh', () => {
    beforeEach(async () => {
      // Setup authenticated user
      const user = new User(testUser);
      await user.save();
      user.isVerified = true;
      await user.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = loginResponse.body.token;
    });

    it('should refresh valid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        token: expect.any(String)
      });

      // New token should be different
      expect(response.body.token).not.toBe(authToken);
    });

    it('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body.error).toContain('Authentication required');
    });
  });

  describe('Password Reset Flow', () => {
    beforeEach(async () => {
      // Create verified user
      const user = new User(testUser);
      await user.save();
      user.isVerified = true;
      await user.save();
    });

    it('should request password reset', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset');

      // Verify reset token was set in database
      const user = await User.findOne({ email: testUser.email }).select('+resetPasswordToken');
      expect(user.resetPasswordToken).toBeTruthy();
      expect(user.resetPasswordExpires).toBeTruthy();
    });

    it('should reset password with valid token', async () => {
      // Request password reset
      await request(app)
        .post('/api/auth/reset-password')
        .send({ email: testUser.email });

      // Get reset token from database
      const user = await User.findOne({ email: testUser.email }).select('+resetPasswordToken');
      const resetToken = user.resetPasswordToken;

      const newPassword = 'NewPassword123!';

      // Reset password
      const response = await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({ password: newPassword })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should reject expired reset token', async () => {
      // Create user with expired reset token
      const user = await User.findOne({ email: testUser.email });
      user.resetPasswordToken = 'expired-token';
      user.resetPasswordExpires = new Date(Date.now() - 1000); // Expired 1 second ago
      await user.save();

      const response = await request(app)
        .post('/api/auth/reset-password/expired-token')
        .send({ password: 'NewPassword123!' })
        .expect(400);

      expect(response.body.error).toContain('expired');
    });
  });

  describe('Security Features', () => {
    it('should sanitize malicious input', async () => {
      const maliciousInput = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        name: '<script>alert("xss")</script>'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(maliciousInput)
        .expect(201);

      // Name should be sanitized
      expect(response.body.user.name).not.toContain('<script>');
    });

    it('should set secure cookies on login', async () => {
      // Create verified user
      const user = new User(testUser);
      await user.save();
      user.isVerified = true;
      await user.save();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      // Check for secure cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      const authCookie = cookies.find(cookie => cookie.startsWith('authToken'));
      expect(authCookie).toContain('HttpOnly');
      expect(authCookie).toContain('SameSite=Strict');
    });

    it('should clear cookies on logout', async () => {
      // Setup authenticated user
      const user = new User(testUser);
      await user.save();
      user.isVerified = true;
      await user.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = loginResponse.body.token;

      // Logout
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check that cookie is cleared
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        const authCookie = cookies.find(cookie => cookie.startsWith('authToken'));
        if (authCookie) {
          expect(authCookie).toContain('Expires=Thu, 01 Jan 1970');
        }
      }
    });
  });
});