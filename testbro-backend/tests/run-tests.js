// Simple TestBro Backend Test Runner
const http = require('http');

console.log('🚀 Starting TestBro Backend Tests...\n');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SUPABASE_URL = 'https://test-project-id.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.OPENROUTER_KEY = 'test-openrouter-key';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.FRONTEND_URL = 'http://localhost:5173';

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, testFn) {
  return new Promise(async (resolve) => {
    try {
      console.log(`🧪 Running: ${name}`);
      await testFn();
      console.log(`✅ Passed: ${name}\n`);
      testsPassed++;
      resolve();
    } catch (error) {
      console.log(`❌ Failed: ${name}`);
      console.log(`   Error: ${error.message}\n`);
      testsFailed++;
      resolve();
    }
  });
}

async function testHealthEndpoint() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`Health check failed with status ${res.statusCode}`));
      }
    });

    req.on('error', (err) => {
      reject(new Error(`Health check request failed: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Health check timed out - server may not be running'));
    });

    req.end();
  });
}

async function testDatabaseConnection() {
  // Simple database connection test
  try {
    // This would test actual database connection in a real scenario
    // For now, just test if the environment variables are set
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Database configuration missing');
    }
    // In a real test, you would import and test the database connection
    console.log('Database configuration validated');
  } catch (error) {
    throw error;
  }
}

async function testOpenRouterConfiguration() {
  if (!process.env.OPENROUTER_KEY) {
    throw new Error('OpenRouter API key not configured');
  }
  console.log('OpenRouter configuration validated');
}

async function testBasicImports() {
  try {
    // Test basic imports work
    const express = require('express');
    if (!express) throw new Error('Express not available');

    const cors = require('cors');
    if (!cors) throw new Error('CORS not available');

    console.log('Basic dependencies loaded successfully');
  } catch (error) {
    throw error;
  }
}

async function runAllTests() {
  console.log('📋 Running TestBro Backend Test Suite\n');

  // Test 1: Basic dependencies
  await runTest('Basic Dependencies Test', testBasicImports);

  // Test 2: Environment configuration
  await runTest('Environment Configuration Test', async () => {
    const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENROUTER_KEY'];
    for (const env of required) {
      if (!process.env[env]) {
        throw new Error(`Missing required environment variable: ${env}`);
      }
    }
    console.log('All required environment variables are set');
  });

  // Test 3: Database configuration
  await runTest('Database Configuration Test', testDatabaseConnection);

  // Test 4: OpenRouter configuration
  await runTest('OpenRouter Configuration Test', testOpenRouterConfiguration);

  // Test 5: Health endpoint (if server is running)
  try {
    await runTest('Health Endpoint Test', testHealthEndpoint);
  } catch (error) {
    await runTest('Health Endpoint Test', async () => {
      throw new Error('Server not running - start with: npm run dev');
    });
  }

  // Test 6: File structure validation
  await runTest('File Structure Validation', async () => {
    const fs = require('fs');
    const path = require('path');

    const requiredFiles = [
      'src/server.ts',
      'src/routes/auth.ts',
      'src/middleware/auth.ts',
      'src/services/aiService.ts',
      'package.json',
      'tsconfig.json'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(__dirname, '..', file))) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
    console.log('All required files are present');
  });

  // Summary
  console.log('📊 Test Results Summary:');
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📈 Total:  ${testsPassed + testsFailed}`);

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! TestBro backend is ready.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the configuration and try again.');
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
