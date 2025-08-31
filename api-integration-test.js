#!/usr/bin/env node

/**
 * Comprehensive Integration Test for TestBro API
 * Tests all newly implemented endpoints and validates API contracts
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_EMAIL = `integration-test-${Date.now()}@testbro.ai`;
const TEST_PASSWORD = 'IntegrationTest123!';

class APIIntegrationTester {
  constructor() {
    this.authToken = null;
    this.organizationId = null;
    this.projectId = null;
    this.testCaseId = null;
    this.executionId = null;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(name, testFn) {
    try {
      console.log(`\n🧪 Testing: ${name}`);
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      console.log(`❌ ${name} - FAILED: ${error.message}`);
    }
  }

  async setUp() {
    console.log('🚀 Setting up test environment...');
    
    // 1. Test user registration
    await this.runTest('User Registration', async () => {
      const response = await axios.post(`${BASE_URL}/api/auth/register`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      
      if (response.status !== 201) {
        throw new Error(`Expected 201, got ${response.status}`);
      }
      
      if (!response.data.session?.access_token) {
        throw new Error('No access token returned');
      }
      
      this.authToken = response.data.session.access_token;
    });

    // 2. Get user organizations
    await this.runTest('Get Organizations', async () => {
      const response = await axios.get(`${BASE_URL}/api/organizations`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      
      if (!response.data.data || response.data.data.length === 0) {
        throw new Error('No organizations returned');
      }
      
      this.organizationId = response.data.data[0].organizations.id;
    });

    // 3. Create test project
    await this.runTest('Create Project', async () => {
      const response = await axios.post(`${BASE_URL}/api/projects`, {
        name: 'Integration Test Project',
        description: 'Project for API integration testing',
        organization_id: this.organizationId
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      if (response.status !== 201) {
        throw new Error(`Expected 201, got ${response.status}`);
      }
      
      this.projectId = response.data.data.id;
    });
  }

  async testDashboardEndpoints() {
    console.log('\n📊 Testing Dashboard Endpoints...');
    
    // Test dashboard metrics
    await this.runTest('Dashboard Metrics', async () => {
      const response = await axios.get(`${BASE_URL}/api/dashboard/metrics`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      
      const data = response.data.data;
      const requiredFields = ['total_tests', 'success_rate', 'avg_execution_time'];
      
      for (const field of requiredFields) {
        if (data[field] === undefined) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
    });

    // Test ROI metrics
    await this.runTest('ROI Metrics', async () => {
      const response = await axios.get(`${BASE_URL}/api/dashboard/roi-metrics`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      
      const data = response.data.data;
      const requiredFields = ['monthly_savings', 'yearly_savings', 'time_saved_hours'];
      
      for (const field of requiredFields) {
        if (data[field] === undefined) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
    });

    // Test failing tests
    await this.runTest('Failing Tests', async () => {
      const response = await axios.get(`${BASE_URL}/api/dashboard/failing-tests`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      
      // Should return empty array for new account
      if (!Array.isArray(response.data.data)) {
        throw new Error('Expected array response');
      }
    });
  }

  async testProjectsEndpoints() {
    console.log('\n📋 Testing Projects Endpoints...');
    
    // Test list projects with pagination
    await this.runTest('List Projects with Pagination', async () => {
      const response = await axios.get(`${BASE_URL}/api/projects?limit=5&sort_by=updated_at&sort_order=desc`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      
      const responseData = response.data;
      if (!responseData.data || !responseData.meta?.pagination) {
        throw new Error('Missing data or pagination fields');
      }
      
      // Verify pagination structure
      const pagination = responseData.meta.pagination;
      const requiredPaginationFields = ['currentPage', 'totalPages', 'totalItems', 'itemsPerPage'];
      
      for (const field of requiredPaginationFields) {
        if (pagination[field] === undefined) {
          throw new Error(`Missing pagination field: ${field}`);
        }
      }
    });
  }

  async testExecutionsEndpoints() {
    console.log('\n⚡ Testing Executions Endpoints...');
    
    // Test list executions with filtering
    await this.runTest('List Executions with Filtering', async () => {
      const response = await axios.get(`${BASE_URL}/api/executions?project_id=${this.projectId}&limit=10`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      
      const responseData = response.data;
      if (!responseData.data || !responseData.meta) {
        throw new Error('Missing data or meta fields');
      }
      
      // Should return empty array for new project
      if (!Array.isArray(responseData.data)) {
        throw new Error('Data should be an array');
      }
    });
  }

  async testAPIResponseFormat() {
    console.log('\n🔄 Testing API Response Format Consistency...');
    
    // Test that all endpoints follow APIResponse<T> format
    await this.runTest('Standardized Response Format', async () => {
      const endpoints = [
        '/api/dashboard/metrics',
        '/api/dashboard/roi-metrics',
        '/api/dashboard/failing-tests',
        '/api/projects',
        '/api/executions'
      ];
      
      for (const endpoint of endpoints) {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${this.authToken}` }
        });
        
        // Check for standardized format
        if (!response.data.data) {
          throw new Error(`${endpoint} missing 'data' field`);
        }
        
        if (!response.data.meta) {
          throw new Error(`${endpoint} missing 'meta' field`);
        }
        
        if (!response.data.meta.timestamp) {
          throw new Error(`${endpoint} missing 'meta.timestamp' field`);
        }
      }
    });
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    // Delete test project if it was created
    if (this.projectId) {
      try {
        await axios.delete(`${BASE_URL}/api/projects/${this.projectId}`, {
          headers: { Authorization: `Bearer ${this.authToken}` }
        });
        console.log('✅ Test project deleted');
      } catch (error) {
        console.log('⚠️ Could not delete test project:', error.message);
      }
    }
  }

  async run() {
    console.log('🚀 Starting TestBro API Integration Tests\n');
    console.log('='.repeat(60));
    
    try {
      await this.setUp();
      await this.testDashboardEndpoints();
      await this.testProjectsEndpoints();
      await this.testExecutionsEndpoints();
      await this.testAPIResponseFormat();
    } catch (error) {
      console.log('\n💥 Test suite failed:', error.message);
    } finally {
      await this.cleanup();
    }
    
    this.printResults();
    
    // Exit with appropriate code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Integration Test Results');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📊 Total: ${this.results.passed + this.results.failed}`);
    console.log(`🎯 Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (this.results.failed === 0) {
      console.log('🎉 All integration tests passed! API is ready for production.');
    } else {
      console.log('⚠️ Some tests failed. Please review and fix the issues.');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new APIIntegrationTester();
  tester.run().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { APIIntegrationTester };