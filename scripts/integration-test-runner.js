#!/usr/bin/env node

/**
 * TestBro Service Integration Testing - Command Center
 * Main entry point for all integration testing options
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function showHelp() {
  console.log(`
🚀 TestBro Service Integration Testing Command Center

Usage: node integration-test-runner.js [command] [options]

Commands:
  quick        Run quick connectivity validation
  full         Run comprehensive integration tests  
  backend      Run backend-only integration tests
  frontend     Run frontend-only integration tests
  jest         Run Jest-based integration tests
  help         Show this help message

Options:
  --backend-url=URL    Backend server URL (default: http://localhost:3001)
  --frontend-url=URL   Frontend server URL (default: http://localhost:5173)
  --verbose           Enable verbose output
  --report            Generate detailed report

Examples:
  node integration-test-runner.js quick
  node integration-test-runner.js full --verbose
  node integration-test-runner.js backend --backend-url=http://localhost:8080
  
PowerShell Alternative (Windows):
  .\\scripts\\service-integration-test.ps1
  .\\scripts\\service-integration-test.ps1 -BackendOnly -Verbose

Test Coverage:
  ✅ Backend-Frontend Connectivity
     - Health check endpoints
     - CORS configuration  
     - API response format
     - Rate limiting
     
  ✅ Database Operations Validation
     - Connection testing
     - CRUD operations
     - Multi-tenant isolation
     - Concurrent operations
     
  ✅ Authentication Flow Testing
     - User registration
     - Login/logout
     - JWT token validation
     - Protected route access
     - Session management
     
  ✅ Integration Scenarios
     - Complete user journeys
     - Error handling consistency
     - Real-time communication
     - Performance validation

For detailed documentation, see: SERVICE_INTEGRATION_TESTING.md
`);
}

function runCommand(command, options = {}) {
  const { verbose = false, backendUrl, frontendUrl } = options;
  
  // Set environment variables
  const env = { ...process.env };
  if (backendUrl) env.BACKEND_URL = backendUrl;
  if (frontendUrl) env.FRONTEND_URL = frontendUrl;
  if (verbose) env.DEBUG = '1';

  try {
    switch (command) {
      case 'quick':
        console.log('🏃‍♂️ Running Quick Integration Test...\n');
        execSync('node quick-integration-test.js', { 
          cwd: __dirname, 
          stdio: 'inherit',
          env 
        });
        break;
        
      case 'full':
        console.log('🔬 Running Full Integration Test Suite...\n');
        execSync('node service-integration-test.js', { 
          cwd: __dirname, 
          stdio: 'inherit',
          env 
        });
        break;
        
      case 'backend':
        console.log('⚙️ Running Backend Integration Tests...\n');
        execSync('npm test -- tests/integration/service-integration.test.ts', { 
          cwd: path.join(__dirname, '../testbro-backend'),
          stdio: 'inherit',
          env 
        });
        break;
        
      case 'frontend':
        console.log('🎨 Running Frontend Integration Tests...\n');
        execSync('npm test -- src/__tests__/integration/frontend-integration.test.tsx', { 
          cwd: path.join(__dirname, '../testbro-frontend'),
          stdio: 'inherit',
          env 
        });
        break;
        
      case 'jest':
        console.log('🧪 Running Jest Integration Tests...\n');
        console.log('Backend tests:');
        execSync('npm test -- tests/integration/service-integration.test.ts', { 
          cwd: path.join(__dirname, '../testbro-backend'),
          stdio: 'inherit',
          env 
        });
        console.log('\nFrontend tests:');
        execSync('npm test -- src/__tests__/integration/frontend-integration.test.tsx', { 
          cwd: path.join(__dirname, '../testbro-frontend'),
          stdio: 'inherit',
          env 
        });
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`💥 Command failed: ${error.message}`);
    process.exit(1);
  }
}

function parseArgs(args) {
  const command = args[0] || 'help';
  const options = {};
  
  args.slice(1).forEach(arg => {
    if (arg.startsWith('--backend-url=')) {
      options.backendUrl = arg.split('=')[1];
    } else if (arg.startsWith('--frontend-url=')) {
      options.frontendUrl = arg.split('=')[1];
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--report') {
      options.generateReport = true;
    }
  });
  
  return { command, options };
}

function checkPrerequisites() {
  const checks = [
    { name: 'Node.js', cmd: 'node --version' },
    { name: 'NPM', cmd: 'npm --version' },
    { name: 'Backend directory', path: '../testbro-backend' },
    { name: 'Frontend directory', path: '../testbro-frontend' }
  ];
  
  for (const check of checks) {
    try {
      if (check.cmd) {
        execSync(check.cmd, { stdio: 'ignore' });
      } else if (check.path) {
        if (!fs.existsSync(path.join(__dirname, check.path))) {
          throw new Error('Directory not found');
        }
      }
    } catch (error) {
      console.error(`❌ ${check.name} check failed`);
      return false;
    }
  }
  
  return true;
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const { command, options } = parseArgs(args);
  
  if (command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }
  
  console.log('🔍 Checking prerequisites...');
  if (!checkPrerequisites()) {
    console.error('Prerequisites check failed. Please ensure Node.js and project directories are available.');
    process.exit(1);
  }
  
  runCommand(command, options);
}

module.exports = { runCommand, showHelp, checkPrerequisites };