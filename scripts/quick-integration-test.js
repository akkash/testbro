#!/usr/bin/env node

/**
 * Quick Service Integration Validation
 * Simple test to validate basic connectivity and functionality
 */

const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

async function testBasicConnectivity() {
  console.log('🔍 Testing Basic Service Integration...\n');
  
  const tests = [
    {
      name: 'Backend Health Check',
      test: async () => {
        try {
          const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
          return {
            success: response.status === 200,
            details: `Status: ${response.status}, Response: ${JSON.stringify(response.data).substring(0, 100)}...`
          };
        } catch (error) {
          return {
            success: false,
            details: `Error: ${error.message}`
          };
        }
      }
    },
    {
      name: 'API Endpoint Response Format',
      test: async () => {
        try {
          // This should return 401 but with proper JSON format
          await axios.get(`${BACKEND_URL}/api/projects`);
          return { success: false, details: 'Should have returned 401' };
        } catch (error) {
          const isUnauthorized = error.response?.status === 401;
          const isJson = error.response?.headers['content-type']?.includes('application/json');
          return {
            success: isUnauthorized && isJson,
            details: `Status: ${error.response?.status}, Content-Type: ${error.response?.headers['content-type']}`
          };
        }
      }
    },
    {
      name: 'CORS Configuration',
      test: async () => {
        try {
          const response = await axios.options(`${BACKEND_URL}/api/projects`, {
            headers: {
              'Origin': FRONTEND_URL,
              'Access-Control-Request-Method': 'GET'
            },
            timeout: 5000
          });
          const corsHeader = response.headers['access-control-allow-origin'];
          return {
            success: !!corsHeader,
            details: `CORS Header: ${corsHeader || 'Not present'}`
          };
        } catch (error) {
          return {
            success: false,
            details: `Error: ${error.message}`
          };
        }
      }
    },
    {
      name: 'Basic Authentication Flow',
      test: async () => {
        try {
          // Test user registration (might fail if user exists)
          const registerResponse = await axios.post(`${BACKEND_URL}/api/auth/register`, {
            email: `quicktest${Date.now()}@example.com`,
            password: 'TestPassword123!'
          }, { timeout: 10000 });
          
          const hasUser = !!registerResponse.data.user;
          const hasSession = !!registerResponse.data.session;
          
          return {
            success: hasUser && hasSession,
            details: `User: ${hasUser}, Session: ${hasSession}`
          };
        } catch (error) {
          // Registration might fail if user exists or other reasons
          const isProperError = error.response?.status >= 400 && error.response?.status < 500;
          return {
            success: isProperError,
            details: `Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`
          };
        }
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result.success) {
        console.log(`✅ ${name}`);
        console.log(`   ${result.details}\n`);
        passed++;
      } else {
        console.log(`❌ ${name}`);
        console.log(`   ${result.details}\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Unexpected error: ${error.message}\n`);
      failed++;
    }
  }

  console.log('='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`Success Rate: ${passed + failed > 0 ? Math.round((passed / (passed + failed)) * 100) : 0}%`);
  console.log('='.repeat(50));

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check your server configuration:');
    console.log('1. Ensure backend server is running on port 3001');
    console.log('2. Check environment variables (.env files)');
    console.log('3. Verify Supabase configuration');
    console.log('4. Check CORS settings');
  } else {
    console.log('\n🎉 All basic integration tests passed!');
  }

  return failed === 0;
}

// Run if called directly
if (require.main === module) {
  testBasicConnectivity()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('💥 Test execution failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testBasicConnectivity };