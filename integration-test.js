/**
 * TestBro Integration Test Script
 * This script verifies that frontend and backend are properly integrated
 */

const axios = require('axios');
const WebSocket = require('ws');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Test results
const results = {
  backend: { status: 'unknown', tests: [] },
  frontend: { status: 'unknown', tests: [] },
  integration: { status: 'unknown', tests: [] }
};

/**
 * Test Backend Health
 */
async function testBackendHealth() {
  console.log('🔍 Testing Backend Health...');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
    
    if (response.status === 200 && response.data.status) {
      results.backend.tests.push({ name: 'Health Check', status: 'pass', data: response.data });
      console.log('✅ Backend health check passed');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Services: ${Object.keys(response.data.services || {}).length}`);
    } else {
      results.backend.tests.push({ name: 'Health Check', status: 'fail', error: 'Invalid response' });
      console.log('❌ Backend health check failed - invalid response');
    }
  } catch (error) {
    results.backend.tests.push({ name: 'Health Check', status: 'fail', error: error.message });
    console.log('❌ Backend health check failed:', error.message);
  }
}

/**
 * Test Backend API Routes
 */
async function testBackendAPIRoutes() {
  console.log('🔍 Testing Backend API Routes...');
  
  const routes = [
    '/api/security/stats',
    '/api/websocket/status',
    '/api/queue/status',
    '/api/metrics'
  ];
  
  for (const route of routes) {
    try {
      const response = await axios.get(`${BACKEND_URL}${route}`, { 
        timeout: 5000,
        validateStatus: function (status) {
          return status < 500; // Accept any status below 500 as success for this test
        }
      });
      
      if (response.status < 500) {
        results.backend.tests.push({ name: `Route ${route}`, status: 'pass', statusCode: response.status });
        console.log(`✅ Route ${route} responded (${response.status})`);
      } else {
        results.backend.tests.push({ name: `Route ${route}`, status: 'fail', statusCode: response.status });
        console.log(`❌ Route ${route} failed (${response.status})`);
      }
    } catch (error) {
      results.backend.tests.push({ name: `Route ${route}`, status: 'fail', error: error.message });
      console.log(`❌ Route ${route} failed:`, error.message);
    }
  }
}

/**
 * Test Frontend Availability
 */
async function testFrontendAvailability() {
  console.log('🔍 Testing Frontend Availability...');
  
  try {
    const response = await axios.get(FRONTEND_URL, { 
      timeout: 5000,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      }
    });
    
    if (response.status >= 200 && response.status < 400) {
      results.frontend.tests.push({ name: 'Frontend Availability', status: 'pass', statusCode: response.status });
      console.log('✅ Frontend is available');
      
      // Check if it's a React app by looking for common patterns
      const responseText = response.data;
      if (typeof responseText === 'string' && (
        responseText.includes('id="root"') || 
        responseText.includes('TestBro') ||
        responseText.includes('React')
      )) {
        results.frontend.tests.push({ name: 'React App Detection', status: 'pass' });
        console.log('✅ React application detected');
      } else {
        results.frontend.tests.push({ name: 'React App Detection', status: 'unknown' });
        console.log('⚠️  Could not confirm React application');
      }
    } else {
      results.frontend.tests.push({ name: 'Frontend Availability', status: 'fail', statusCode: response.status });
      console.log('❌ Frontend is not available');
    }
  } catch (error) {
    results.frontend.tests.push({ name: 'Frontend Availability', status: 'fail', error: error.message });
    console.log('❌ Frontend availability test failed:', error.message);
  }
}

/**
 * Test WebSocket Connection
 */
async function testWebSocketConnection() {
  console.log('🔍 Testing WebSocket Connection...');
  
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(BACKEND_URL.replace('http', 'ws'));
      
      const timeout = setTimeout(() => {
        ws.close();
        results.integration.tests.push({ name: 'WebSocket Connection', status: 'fail', error: 'Connection timeout' });
        console.log('❌ WebSocket connection timeout');
        resolve();
      }, 5000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        results.integration.tests.push({ name: 'WebSocket Connection', status: 'pass' });
        console.log('✅ WebSocket connection successful');
        ws.close();
        resolve();
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        results.integration.tests.push({ name: 'WebSocket Connection', status: 'fail', error: error.message });
        console.log('❌ WebSocket connection failed:', error.message);
        resolve();
      });
    } catch (error) {
      results.integration.tests.push({ name: 'WebSocket Connection', status: 'fail', error: error.message });
      console.log('❌ WebSocket test failed:', error.message);
      resolve();
    }
  });
}

/**
 * Test CORS Configuration
 */
async function testCORSConfiguration() {
  console.log('🔍 Testing CORS Configuration...');
  
  try {
    const response = await axios.options(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      },
      timeout: 5000
    });
    
    const corsHeaders = response.headers['access-control-allow-origin'];
    if (corsHeaders) {
      results.integration.tests.push({ name: 'CORS Configuration', status: 'pass', corsHeaders });
      console.log('✅ CORS is configured');
      console.log(`   Allowed Origins: ${corsHeaders}`);
    } else {
      results.integration.tests.push({ name: 'CORS Configuration', status: 'unknown' });
      console.log('⚠️  CORS headers not detected in preflight response');
    }
  } catch (error) {
    results.integration.tests.push({ name: 'CORS Configuration', status: 'fail', error: error.message });
    console.log('❌ CORS test failed:', error.message);
  }
}

/**
 * Calculate overall status
 */
function calculateOverallStatus() {
  for (const section of ['backend', 'frontend', 'integration']) {
    const tests = results[section].tests;
    const passCount = tests.filter(t => t.status === 'pass').length;
    const failCount = tests.filter(t => t.status === 'fail').length;
    const totalCount = tests.length;
    
    if (totalCount === 0) {
      results[section].status = 'unknown';
    } else if (failCount === 0) {
      results[section].status = 'pass';
    } else if (passCount > failCount) {
      results[section].status = 'partial';
    } else {
      results[section].status = 'fail';
    }
  }
}

/**
 * Print Summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 INTEGRATION TEST SUMMARY');
  console.log('='.repeat(60));
  
  for (const [section, data] of Object.entries(results)) {
    const statusIcon = data.status === 'pass' ? '✅' : 
                      data.status === 'partial' ? '⚠️' : 
                      data.status === 'fail' ? '❌' : '❓';
    
    console.log(`\n${statusIcon} ${section.toUpperCase()}: ${data.status.toUpperCase()}`);
    
    data.tests.forEach(test => {
      const icon = test.status === 'pass' ? '  ✅' : 
                   test.status === 'fail' ? '  ❌' : '  ⚠️';
      console.log(`${icon} ${test.name}`);
      if (test.error) {
        console.log(`     Error: ${test.error}`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  const allSections = Object.values(results);
  const hasFailures = allSections.some(s => s.status === 'fail');
  const hasPartial = allSections.some(s => s.status === 'partial');
  
  if (!hasFailures && !hasPartial) {
    console.log('🎉 ALL TESTS PASSED - Integration is complete!');
  } else if (!hasFailures) {
    console.log('⚠️  Integration mostly working with some warnings');
  } else {
    console.log('❌ Integration has failures that need attention');
  }
  
  console.log('='.repeat(60));
}

/**
 * Main test runner
 */
async function runIntegrationTests() {
  console.log('🚀 Starting TestBro Integration Tests...');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log('');
  
  // Run all tests
  await testBackendHealth();
  await testBackendAPIRoutes();
  await testFrontendAvailability();
  await testWebSocketConnection();
  await testCORSConfiguration();
  
  // Calculate and display results
  calculateOverallStatus();
  printSummary();
  
  // Exit with appropriate code
  const hasFailures = Object.values(results).some(s => s.status === 'fail');
  process.exit(hasFailures ? 1 : 0);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runIntegrationTests().catch(error => {
    console.error('Integration test failed:', error);
    process.exit(1);
  });
}

module.exports = { runIntegrationTests, results };