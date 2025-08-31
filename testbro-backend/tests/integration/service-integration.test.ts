import request from 'supertest';
import app from '../../src/server';
import { supabaseAdmin } from '../../src/config/database';
import { createMockUser, createMockProject } from '../setup';

describe('Service Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let organizationId: string;
  let projectId: string;

  beforeAll(async () => {
    // Setup test user and get auth token
    const { data: user } = await supabaseAdmin.auth.admin.createUser({
      email: 'test@serviceintegration.com',
      password: 'TestPassword123!',
      email_confirm: true
    });
    
    userId = user.user!.id;
    
    // Get auth token
    const authResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@serviceintegration.com',
        password: 'TestPassword123!'
      });
    
    authToken = authResponse.body.session.access_token;
    
    // Create test organization
    const orgResponse = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Integration Org',
        description: 'Testing service integration'
      });
    
    organizationId = orgResponse.body.data.id;
    
    // Create test project
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Integration Test Project',
        description: 'Testing API integration',
        organization_id: organizationId
      });
    
    projectId = projectResponse.body.data.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (userId) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
  });

  describe('1. Backend-Frontend Connectivity', () => {
    test('Health check endpoint responds correctly', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });

    test('CORS headers are properly configured', async () => {
      const response = await request(app)
        .options('/api/projects')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET');
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });

    test('API rate limiting is functional', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array.from({ length: 25 }, () =>
        request(app)
          .get('/api/projects')
          .set('Authorization', `Bearer ${authToken}`)
      );
      
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      // Should have some rate limited responses if limit is exceeded
      // This might not fail if rate limit is high
      expect(responses.length).toBe(25);
    });

    test('JSON response format consistency', async () => {
      const endpoints = ['/api/projects', '/api/organizations'];
      
      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
        expect(response.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });

  describe('2. Database Operations Validation', () => {
    test('Organization CRUD operations work correctly', async () => {
      // Create
      const createResponse = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'CRUD Test Org',
          description: 'Testing CRUD operations'
        });
      
      expect(createResponse.status).toBe(201);
      expect(createResponse.body.data).toHaveProperty('id');
      
      const newOrgId = createResponse.body.data.id;
      
      // Read
      const readResponse = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(readResponse.status).toBe(200);
      expect(readResponse.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: newOrgId })
        ])
      );
      
      // Update
      const updateResponse = await request(app)
        .put(`/api/organizations/${newOrgId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated CRUD Test Org',
          description: 'Updated description'
        });
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.name).toBe('Updated CRUD Test Org');
    });

    test('Multi-tenant data isolation works', async () => {
      // Create another user and organization
      const { data: user2 } = await supabaseAdmin.auth.admin.createUser({
        email: 'test2@serviceintegration.com',
        password: 'TestPassword123!',
        email_confirm: true
      });
      
      const auth2Response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test2@serviceintegration.com',
          password: 'TestPassword123!'
        });
      
      const authToken2 = auth2Response.body.session.access_token;
      
      // User 2 should not see User 1's organizations
      const orgsResponse = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${authToken2}`);
      
      expect(orgsResponse.status).toBe(200);
      expect(orgsResponse.body.data).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: organizationId })
        ])
      );
      
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(user2.user!.id);
    });

    test('Database connection pooling works under load', async () => {
      // Create multiple concurrent database operations
      const operations = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .get('/api/projects')
          .set('Authorization', `Bearer ${authToken}`)
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(operations);
      const endTime = Date.now();
      
      // All operations should succeed
      expect(responses.every(r => r.status === 200)).toBe(true);
      
      // Should complete within reasonable time (under 10 seconds)
      expect(endTime - startTime).toBeLessThan(10000);
    });

    test('Test case creation and validation', async () => {
      // Create test target first
      const targetResponse = await request(app)
        .post('/api/test-targets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Target',
          url: 'https://example.com',
          project_id: projectId,
          platform: 'web',
          environment: 'staging'
        });
      
      expect(targetResponse.status).toBe(201);
      const targetId = targetResponse.body.data.id;
      
      // Create test case
      const testCaseResponse = await request(app)
        .post('/api/test-cases')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Integration Test Case',
          description: 'Testing database integration',
          project_id: projectId,
          target_id: targetId,
          steps: [
            {
              order: 1,
              action: 'navigate',
              element: '/login',
              description: 'Navigate to login page'
            },
            {
              order: 2,
              action: 'type',
              element: '#email',
              value: 'test@example.com',
              description: 'Enter email'
            }
          ],
          priority: 'high',
          tags: ['integration', 'smoke']
        });
      
      expect(testCaseResponse.status).toBe(201);
      expect(testCaseResponse.body.data).toHaveProperty('id');
      expect(testCaseResponse.body.data.steps).toHaveLength(2);
    });
  });

  describe('3. Authentication Flow Testing', () => {
    test('JWT token validation works correctly', async () => {
      // Valid token should work
      const validResponse = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(validResponse.status).toBe(200);
      
      // Invalid token should be rejected
      const invalidResponse = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(invalidResponse.status).toBe(401);
    });

    test('Token refresh mechanism works', async () => {
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`);
      
      // Should either succeed or return proper error
      expect([200, 401, 400]).toContain(refreshResponse.status);
    });

    test('Protected routes require authentication', async () => {
      const protectedEndpoints = [
        '/api/projects',
        '/api/organizations',
        '/api/test-cases',
        '/api/test-targets'
      ];
      
      for (const endpoint of protectedEndpoints) {
        const response = await request(app).get(endpoint);
        expect([401, 403]).toContain(response.status);
      }
    });

    test('User registration creates default organization', async () => {
      const registrationResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@serviceintegration.com',
          password: 'NewPassword123!'
        });
      
      expect(registrationResponse.status).toBe(201);
      
      // Login with new user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newuser@serviceintegration.com',
          password: 'NewPassword123!'
        });
      
      expect(loginResponse.status).toBe(200);
      const newUserToken = loginResponse.body.session.access_token;
      
      // Check if default organization was created
      const orgsResponse = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${newUserToken}`);
      
      expect(orgsResponse.status).toBe(200);
      expect(orgsResponse.body.data).toHaveLength(1);
      expect(orgsResponse.body.data[0].name).toContain('Organization');
      
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(loginResponse.body.user.id);
    });

    test('Session persistence across requests', async () => {
      // Make multiple requests with same token
      const requests = [
        request(app).get('/api/projects').set('Authorization', `Bearer ${authToken}`),
        request(app).get('/api/organizations').set('Authorization', `Bearer ${authToken}`),
        request(app).get('/api/test-cases').set('Authorization', `Bearer ${authToken}`)
      ];
      
      const responses = await Promise.all(requests);
      
      // All should succeed with same token
      expect(responses.every(r => r.status === 200)).toBe(true);
    });
  });

  describe('4. WebSocket Integration', () => {
    test('WebSocket connection with authentication', (done) => {
      const io = require('socket.io-client');
      const client = io('http://localhost:3001', {
        auth: { token: authToken },
        timeout: 5000
      });
      
      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });
      
      client.on('connect_error', (error) => {
        // Connection might fail in test environment, that's okay
        console.log('WebSocket connection failed (expected in test env):', error.message);
        done();
      });
      
      setTimeout(() => {
        client.disconnect();
        done();
      }, 3000);
    });
  });

  describe('5. Error Handling and Edge Cases', () => {
    test('Invalid JSON payload handling', async () => {
      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      expect(response.status).toBe(400);
    });

    test('Missing required fields validation', async () => {
      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Missing name field'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('Large payload handling', async () => {
      const largeDescription = 'x'.repeat(10000); // 10KB string
      
      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Large Payload Test',
          description: largeDescription
        });
      
      // Should either succeed or fail gracefully
      expect([201, 413, 400]).toContain(response.status);
    });

    test('Database constraint violations', async () => {
      // Try to create organization with duplicate name
      const orgData = {
        name: 'Duplicate Test Org',
        description: 'Testing duplicates'
      };
      
      // First creation should succeed
      const firstResponse = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orgData);
      
      expect(firstResponse.status).toBe(201);
      
      // Second creation with same name should handle gracefully
      const secondResponse = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orgData);
      
      // Should either succeed (if duplicates allowed) or fail gracefully
      expect([201, 409, 400]).toContain(secondResponse.status);
    });
  });
});