import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { supabaseAdmin } from '../../src/config/database';

// Mock services to avoid actual browser launching in tests
jest.mock('../../src/services/browserControlService');
jest.mock('../../src/services/actionRecordingService');
jest.mock('../../src/services/testPlaybackService');
jest.mock('../../src/services/screenshotService');
jest.mock('../../src/services/codeGenerationService');

import browserControlRoutes from '../../src/routes/browserControl';
import { authenticateUser } from '../../src/middleware/auth';

describe('Browser Control Integration Tests', () => {
  let app: express.Application;
  let server: any;
  let authToken: string;

  beforeAll(async () => {
    // Setup test app
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req: any, res, next) => {
      req.user = {
        id: 'test-user-id',
        email: 'test@example.com'
      };
      next();
    });
    
    app.use('/api/browser-control', browserControlRoutes);
    
    server = createServer(app);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Browser Session Management', () => {
    test('should create a new browser session', async () => {
      const sessionData = {
        project_id: 'test-project-id',
        target_id: 'test-target-id',
        browser_type: 'chromium',
        options: {
          headless: true,
          viewport: { width: 1280, height: 720 }
        }
      };

      const response = await request(app)
        .post('/api/browser-control/sessions')
        .send(sessionData)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message', 'Browser session created successfully');
    });

    test('should fail to create session without required fields', async () => {
      const response = await request(app)
        .post('/api/browser-control/sessions')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
      expect(response.body.message).toContain('project_id and target_id are required');
    });

    test('should navigate to a URL', async () => {
      const navigationData = {
        url: 'https://example.com',
        waitUntil: 'domcontentloaded'
      };

      const response = await request(app)
        .post('/api/browser-control/sessions/test-session-id/navigate')
        .send(navigationData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Navigation completed successfully');
      expect(response.body.data).toHaveProperty('url', 'https://example.com');
    });

    test('should click on an element', async () => {
      const clickData = {
        selector: '#submit-button',
        options: { timeout: 5000 }
      };

      const response = await request(app)
        .post('/api/browser-control/sessions/test-session-id/click')
        .send(clickData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Click completed successfully');
      expect(response.body.data).toHaveProperty('selector', '#submit-button');
    });

    test('should type text into an element', async () => {
      const typeData = {
        selector: '#username',
        text: 'testuser',
        options: { delay: 50 }
      };

      const response = await request(app)
        .post('/api/browser-control/sessions/test-session-id/type')
        .send(typeData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Type completed successfully');
      expect(response.body.data).toHaveProperty('textLength', 8);
    });

    test('should take a screenshot', async () => {
      const screenshotData = {
        options: { fullPage: true, quality: 90 }
      };

      const response = await request(app)
        .post('/api/browser-control/sessions/test-session-id/screenshot')
        .send(screenshotData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Screenshot captured successfully');
      expect(response.body.data).toHaveProperty('screenshotUrl');
    });

    test('should close a browser session', async () => {
      const response = await request(app)
        .delete('/api/browser-control/sessions/test-session-id')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Browser session closed successfully');
    });

    test('should get active sessions', async () => {
      const response = await request(app)
        .get('/api/browser-control/sessions')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
    });
  });

  describe('Recording Functionality', () => {
    test('should start recording actions', async () => {
      const recordingData = {
        browser_session_id: 'test-session-id',
        name: 'Test Recording',
        project_id: 'test-project-id',
        target_id: 'test-target-id',
        options: {
          captureScreenshots: true,
          includeHoverEvents: false
        }
      };

      const response = await request(app)
        .post('/api/browser-control/recording/start')
        .send(recordingData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Recording started successfully');
      expect(response.body.data).toHaveProperty('name', 'Test Recording');
    });

    test('should stop recording', async () => {
      const response = await request(app)
        .post('/api/browser-control/recording/test-recording-id/stop')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Recording stopped successfully');
    });

    test('should get recording session details', async () => {
      const response = await request(app)
        .get('/api/browser-control/recording/test-recording-id')
        .expect(200);

      expect(response.body.data).toHaveProperty('session');
      expect(response.body.data).toHaveProperty('actions');
      expect(response.body.data).toHaveProperty('actionCount');
    });
  });

  describe('Playback Functionality', () => {
    test('should start playback of recorded actions', async () => {
      const playbackData = {
        recording_session_id: 'test-recording-id',
        browser_session_id: 'test-session-id',
        options: {
          speed: 1.0,
          captureScreenshots: true,
          stopOnError: true
        }
      };

      const response = await request(app)
        .post('/api/browser-control/playback/start')
        .send(playbackData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Playback started successfully');
    });

    test('should pause playback', async () => {
      const response = await request(app)
        .post('/api/browser-control/playback/test-playback-id/pause')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Playback paused successfully');
    });

    test('should resume playback', async () => {
      const response = await request(app)
        .post('/api/browser-control/playback/test-playback-id/resume')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Playback resumed successfully');
    });

    test('should stop playback', async () => {
      const response = await request(app)
        .post('/api/browser-control/playback/test-playback-id/stop')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Playback stopped successfully');
    });
  });

  describe('Code Generation', () => {
    test('should generate Playwright test code', async () => {
      const codeGenData = {
        recording_session_id: 'test-recording-id',
        options: {
          language: 'typescript',
          framework: 'playwright-test',
          includeComments: true,
          includeScreenshots: true,
          testName: 'Generated Test'
        }
      };

      const response = await request(app)
        .post('/api/browser-control/generate-code')
        .send(codeGenData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Code generated successfully');
      expect(response.body.data).toHaveProperty('test_code');
      expect(response.body.data).toHaveProperty('language', 'typescript');
      expect(response.body.data).toHaveProperty('test_framework', 'playwright-test');
    });

    test('should fail to generate code without recording session', async () => {
      const response = await request(app)
        .post('/api/browser-control/generate-code')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
      expect(response.body.message).toContain('recording_session_id is required');
    });
  });
});

describe('System Integration Validation', () => {
  test('should validate all services are properly imported', () => {
    // This test ensures all our new services can be imported without errors
    expect(() => {
      require('../../src/services/browserControlService');
      require('../../src/services/actionRecordingService');
      require('../../src/services/testPlaybackService');
      require('../../src/services/screenshotService');
      require('../../src/services/codeGenerationService');
    }).not.toThrow();
  });

  test('should validate type definitions are properly exported', () => {
    const types = require('../../src/types');
    
    // Check that our new types are exported
    expect(types).toHaveProperty('BrowserSession');
    expect(types).toHaveProperty('RecordingSession');
    expect(types).toHaveProperty('PlaybackSession');
    expect(types).toHaveProperty('RecordedAction');
    expect(types).toHaveProperty('GeneratedPlaywrightTest');
  });
});