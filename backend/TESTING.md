# SuperPrompt Testing Guide

This document provides comprehensive information about the testing system for the SuperPrompt backend API.

## 🧪 Test Overview

The testing system covers all major components of the SuperPrompt platform:

### **Test Categories**

1. **Authentication Tests** (`auth.test.js`)
   - User registration and validation
   - Login/logout functionality
   - JWT token management
   - Password reset and email verification
   - OAuth integration (prepared)

2. **Prompts Tests** (`prompts.test.js`)
   - CRUD operations for user prompts
   - User isolation and security
   - Search and filtering functionality
   - Folder and tag management

3. **Enhancement Tests** (`enhance.test.js`)
   - Text enhancement with AI
   - Different enhancement types
   - Error handling and validation
   - Fallback mechanisms

## 🚀 Quick Start

### **Prerequisites**
```bash
# Install dependencies
npm install

# Install testing dependencies
npm install --save-dev jest supertest mongodb-memory-server @types/jest
```

### **Run All Tests**
```bash
# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test categories
npm run test:auth
npm run test:prompts
npm run test:enhance
```

### **Interactive Test Runner**
```bash
# Start interactive test menu
node tests/run-tests.js

# Or run specific commands
node tests/run-tests.js all
node tests/run-tests.js auth
node tests/run-tests.js coverage
```

## 📊 Test Coverage

### **Authentication Coverage**
- ✅ User registration with validation
- ✅ Email format validation
- ✅ Password strength requirements
- ✅ Duplicate email prevention
- ✅ Password hashing verification
- ✅ Login with valid/invalid credentials
- ✅ JWT token generation and validation
- ✅ Token refresh functionality
- ✅ Password reset flow
- ✅ Email verification process
- ✅ User session management

### **Prompts Coverage**
- ✅ Create, read, update, delete prompts
- ✅ User isolation (users can't access others' prompts)
- ✅ Authentication requirements
- ✅ Input validation
- ✅ Search functionality (by content, tags, folders)
- ✅ Folder and tag management
- ✅ Error handling for invalid requests
- ✅ Pagination and sorting

### **Enhancement Coverage**
- ✅ Text enhancement with custom instructions
- ✅ Predefined enhancement types
- ✅ Input validation and sanitization
- ✅ Error handling for malformed requests
- ✅ Fallback mechanisms when AI fails
- ✅ Special character handling
- ✅ Unicode support
- ✅ Performance with large texts

## 🛠️ Test Setup

### **Environment Configuration**
The test suite uses:
- **MongoDB Memory Server**: In-memory database for testing
- **Mocked External Services**: OpenAI API and email services
- **Isolated Test Environment**: Each test runs in isolation

### **Test Utilities**
```javascript
// Global test utilities available in all tests
global.generateTestToken(userId)     // Generate JWT token
global.createTestUser(User, data)    // Create test user
global.createTestPrompt(Prompt, userId, data) // Create test prompt
```

## 📋 Running Tests

### **Command Line Options**

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test file
npx jest tests/auth.test.js

# Run tests matching pattern
npx jest --testNamePattern="should create a new user"

# Run tests in watch mode
npm run test:watch

# Run tests with verbose output
npx jest --verbose
```

### **Interactive Test Runner**

```bash
node tests/run-tests.js
```

This provides an interactive menu:
1. Run all tests
2. Run authentication tests only
3. Run prompts tests only
4. Run enhancement tests only
5. Generate coverage report
6. Run tests in watch mode
7. Exit

## 🔍 Test Structure

### **Authentication Tests**
```javascript
describe('Auth Routes', () => {
  describe('POST /api/auth/signup', () => {
    it('should create a new user successfully', async () => {
      // Test implementation
    });
    
    it('should reject signup with invalid email', async () => {
      // Test implementation
    });
  });
});
```

### **Prompts Tests**
```javascript
describe('Prompt Routes', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    testUser = await createTestUser(User);
    authToken = generateTestToken(testUser._id);
  });

  describe('GET /api/prompts', () => {
    it('should get all prompts for authenticated user', async () => {
      // Test implementation
    });
  });
});
```

### **Enhancement Tests**
```javascript
describe('Enhance Routes', () => {
  describe('POST /api/enhance', () => {
    it('should enhance text with custom instruction', async () => {
      // Test implementation
    });
  });
});
```

## 📈 Coverage Reports

### **Generate Coverage Report**
```bash
npm run test:coverage
```

This generates:
- **Text Report**: Console output with coverage summary
- **HTML Report**: Detailed coverage at `coverage/lcov-report/index.html`
- **LCOV Report**: For CI/CD integration

### **Coverage Metrics**
- **Statements**: Percentage of code statements executed
- **Branches**: Percentage of conditional branches executed
- **Functions**: Percentage of functions called
- **Lines**: Percentage of lines executed

## 🐛 Debugging Tests

### **Debug Individual Test**
```bash
# Run specific test with debugging
npx jest tests/auth.test.js --verbose --no-cache

# Run with console.log output
npx jest tests/auth.test.js --verbose --silent=false
```

### **Common Issues**

1. **MongoDB Connection Issues**
   ```bash
   # Clear Jest cache
   npx jest --clearCache
   ```

2. **Test Timeout Issues**
   ```javascript
   // Increase timeout for slow tests
   it('should complete within 10 seconds', async () => {
     // Test implementation
   }, 10000);
   ```

3. **Mock Issues**
   ```javascript
   // Reset mocks between tests
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

## 🔧 Continuous Integration

### **GitHub Actions Example**
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

### **Pre-commit Hook**
```bash
#!/bin/sh
# .git/hooks/pre-commit
npm test
```

## 📝 Adding New Tests

### **Test File Structure**
```javascript
const request = require('supertest');
const express = require('express');
const yourRoutes = require('../routes/your-route');

const app = express();
app.use(express.json());
app.use('/api/your-route', yourRoutes);

describe('Your Route', () => {
  describe('GET /api/your-route', () => {
    it('should do something', async () => {
      const response = await request(app)
        .get('/api/your-route')
        .expect(200);
      
      expect(response.body).toBeDefined();
    });
  });
});
```

### **Test Best Practices**
1. **Use descriptive test names**
2. **Test both success and failure cases**
3. **Mock external dependencies**
4. **Clean up after each test**
5. **Use beforeEach/afterEach hooks**
6. **Test edge cases and error conditions**

## 🎯 Test Commands Summary

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:auth` | Run authentication tests only |
| `npm run test:prompts` | Run prompts tests only |
| `npm run test:enhance` | Run enhancement tests only |
| `node tests/run-tests.js` | Interactive test runner |

## 📊 Performance Benchmarks

### **Test Execution Times**
- **Authentication Tests**: ~2-3 seconds
- **Prompts Tests**: ~3-4 seconds
- **Enhancement Tests**: ~1-2 seconds
- **Full Test Suite**: ~6-8 seconds

### **Coverage Targets**
- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >95%
- **Lines**: >90%

## 🚨 Troubleshooting

### **Common Error Solutions**

1. **"Jest did not exit"**
   ```bash
   # Clear Jest cache
   npx jest --clearCache
   ```

2. **"MongoDB connection failed"**
   ```bash
   # Restart test environment
   npm run test:coverage
   ```

3. **"OpenAI API error"**
   - Check that OpenAI is properly mocked
   - Verify environment variables are set

4. **"Test timeout"**
   ```javascript
   // Increase timeout for specific test
   it('should complete', async () => {
     // Test implementation
   }, 10000);
   ```

## 📞 Support

For testing issues or questions:
1. Check the test logs for detailed error messages
2. Verify all dependencies are installed
3. Ensure you're running tests from the backend directory
4. Check that MongoDB Memory Server is working correctly

---

**Happy Testing! 🧪✨** 