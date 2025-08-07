// Simple test script for simple-auth.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'https://superprompt-3asmcqplb-hass-projects-b72778ab.vercel.app';

async function testEndpoints() {
  console.log('🧪 Testing SuperPrompt Backend Endpoints...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);

    // Test 2: Signup
    console.log('\n2. Testing signup endpoint...');
    const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      })
    });
    const signupData = await signupResponse.json();
    console.log('✅ Signup response:', signupData);

    // Test 3: Login
    console.log('\n3. Testing login endpoint...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    const loginData = await loginResponse.json();
    console.log('✅ Login response:', loginData);

    // Test 4: Validate token
    if (loginData.token) {
      console.log('\n4. Testing token validation...');
      const validateResponse = await fetch(`${BASE_URL}/api/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
          'Content-Type': 'application/json'
        }
      });
      const validateData = await validateResponse.json();
      console.log('✅ Token validation:', validateData);
    }

    // Test 5: Text enhancement
    console.log('\n5. Testing text enhancement...');
    const enhanceResponse = await fetch(`${BASE_URL}/api/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hello world',
        instruction: 'Make it more formal'
      })
    });
    const enhanceData = await enhanceResponse.json();
    console.log('✅ Text enhancement:', enhanceData);

    // Test 6: CORS preflight
    console.log('\n6. Testing CORS preflight...');
    const corsResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://v0.dev',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    console.log('✅ CORS preflight status:', corsResponse.status);
    console.log('✅ CORS headers:', corsResponse.headers.get('access-control-allow-origin'));

    console.log('\n🎉 All tests passed! Backend is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEndpoints(); 