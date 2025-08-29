import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateUser } from '../middleware/auth';
import { logger, LogCategory } from '../services/loggingService';
import { BrowserControlService } from '../services/browserControlService';
import { ActionRecordingService } from '../services/actionRecordingService';
import { TestPlaybackService } from '../services/testPlaybackService';
import { ScreenshotService } from '../services/screenshotService';
import { CodeGenerationService } from '../services/codeGenerationService';
import { getWebSocketService } from '../services/websocketService';

const router = express.Router();

// Apply authentication to all browser control routes
router.use(authenticateUser);

// Initialize services (deferred until needed)
let browserControlService: BrowserControlService;
let actionRecordingService: ActionRecordingService;
let testPlaybackService: TestPlaybackService;
let screenshotService: ScreenshotService;
const codeGenerationService = new CodeGenerationService();

// Initialize services when first needed
const getServices = () => {
  if (!browserControlService) {
    const wsService = getWebSocketService();
    if (!wsService) {
      throw new Error('WebSocket service not initialized');
    }
    browserControlService = new BrowserControlService(wsService);
    actionRecordingService = new ActionRecordingService(wsService);
    testPlaybackService = new TestPlaybackService(wsService);
    screenshotService = new ScreenshotService(wsService);
  }
  return {
    browserControlService,
    actionRecordingService,
    testPlaybackService,
    screenshotService
  };
};

/**
 * POST /api/browser-control/sessions
 * Create a new browser session
 */
router.post('/sessions', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { browserControlService } = getServices();
    const { project_id, target_id, browser_type = 'chromium', options = {} } = req.body;
    const userId = (req as any).user?.id;

    if (!project_id || !target_id) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'project_id and target_id are required'
      });
    }

    const session = await browserControlService.createSession(
      project_id,
      target_id,
      userId,
      browser_type,
      options
    );

    res.status(201).json({
      data: session,
      message: 'Browser session created successfully'
    });

  } catch (error) {
    logger.error('Failed to create browser session', LogCategory.BROWSER, {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: (req as any).user?.id
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create browser session'
    });
  }
}));

/**
 * POST /api/browser-control/sessions/:sessionId/navigate
 * Navigate to a URL
 */
router.post('/sessions/:sessionId/navigate', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { browserControlService } = getServices();
    const { sessionId } = req.params;
    const { url, waitUntil = 'domcontentloaded' } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'url is required'
      });
    }

    await browserControlService.navigate(sessionId, url, waitUntil);

    res.json({
      message: 'Navigation completed successfully',
      data: { sessionId, url }
    });

  } catch (error) {
    logger.error('Navigation failed', LogCategory.BROWSER, {
      sessionId: req.params.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Navigation failed'
    });
  }
}));

/**
 * POST /api/browser-control/sessions/:sessionId/click
 * Click on an element
 */
router.post('/sessions/:sessionId/click', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { browserControlService } = getServices();
    const { sessionId } = req.params;
    const { selector, options = {} } = req.body;

    if (!selector) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'selector is required'
      });
    }

    await browserControlService.click(sessionId, selector, options);

    res.json({
      message: 'Click completed successfully',
      data: { sessionId, selector }
    });

  } catch (error) {
    logger.error('Click failed', LogCategory.BROWSER, {
      sessionId: req.params.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Click failed'
    });
  }
}));

/**
 * POST /api/browser-control/sessions/:sessionId/type
 * Type text into an element
 */
router.post('/sessions/:sessionId/type', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { browserControlService } = getServices();
    const { sessionId } = req.params;
    const { selector, text, options = {} } = req.body;

    if (!selector || !text) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'selector and text are required'
      });
    }

    await browserControlService.type(sessionId, selector, text, options);

    res.json({
      message: 'Type completed successfully',
      data: { sessionId, selector, textLength: text.length }
    });

  } catch (error) {
    logger.error('Type failed', LogCategory.BROWSER, {
      sessionId: req.params.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Type failed'
    });
  }
}));

/**
 * POST /api/browser-control/sessions/:sessionId/screenshot
 * Take a screenshot
 */
router.post('/sessions/:sessionId/screenshot', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { browserControlService } = getServices();
    const { sessionId } = req.params;
    const { options = {} } = req.body;

    const screenshotUrl = await browserControlService.takeScreenshot(sessionId, options);

    res.json({
      message: 'Screenshot captured successfully',
      data: { sessionId, screenshotUrl }
    });

  } catch (error) {
    logger.error('Screenshot failed', LogCategory.BROWSER, {
      sessionId: req.params.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Screenshot failed'
    });
  }
}));

/**
 * DELETE /api/browser-control/sessions/:sessionId
 * Close a browser session
 */
router.delete('/sessions/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { browserControlService } = getServices();
    const { sessionId } = req.params;

    await browserControlService.closeSession(sessionId);

    res.json({
      message: 'Browser session closed successfully',
      data: { sessionId }
    });

  } catch (error) {
    logger.error('Failed to close session', LogCategory.BROWSER, {
      sessionId: req.params.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to close session'
    });
  }
}));

/**
 * POST /api/browser-control/recording/start
 * Start recording actions
 */
router.post('/recording/start', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { browserControlService, actionRecordingService } = getServices();
    const { browser_session_id, name, project_id, target_id, options = {} } = req.body;
    const userId = (req as any).user?.id;

    if (!browser_session_id || !name || !project_id || !target_id) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'browser_session_id, name, project_id, and target_id are required'
      });
    }

    // Get the browser session's page (this would need to be implemented in browserControlService)
    const sessionInfo = browserControlService.getSessionInfo(browser_session_id);
    if (!sessionInfo) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Browser session not found'
      });
    }

    // For now, we'll simulate getting the page - in real implementation,
    // browserControlService would expose the page object
    const session = await actionRecordingService.startRecording(
      browser_session_id,
      null as any, // page would come from browserControlService
      name,
      project_id,
      target_id,
      userId,
      options
    );

    res.status(201).json({
      data: session,
      message: 'Recording started successfully'
    });

  } catch (error) {
    logger.error('Failed to start recording', LogCategory.BROWSER, {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: (req as any).user?.id
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to start recording'
    });
  }
}));

/**
 * POST /api/browser-control/recording/:sessionId/stop
 * Stop recording actions
 */
router.post('/recording/:sessionId/stop', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { actionRecordingService } = getServices();
    const { sessionId } = req.params;

    const session = await actionRecordingService.stopRecording(sessionId);

    res.json({
      data: session,
      message: 'Recording stopped successfully'
    });

  } catch (error) {
    logger.error('Failed to stop recording', LogCategory.BROWSER, {
      sessionId: req.params.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to stop recording'
    });
  }
}));

/**
 * POST /api/browser-control/playback/start
 * Start playback of recorded actions
 */
router.post('/playback/start', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { testPlaybackService } = getServices();
    const { recording_session_id, browser_session_id, options = {} } = req.body;
    const userId = (req as any).user?.id;

    if (!recording_session_id || !browser_session_id) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'recording_session_id and browser_session_id are required'
      });
    }

    const session = await testPlaybackService.startPlayback(
      recording_session_id,
      browser_session_id,
      null as any, // page would come from browserControlService
      userId,
      options
    );

    res.status(201).json({
      data: session,
      message: 'Playback started successfully'
    });

  } catch (error) {
    logger.error('Failed to start playback', LogCategory.BROWSER, {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: (req as any).user?.id
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to start playback'
    });
  }
}));

/**
 * POST /api/browser-control/playback/:sessionId/pause
 * Pause playback
 */
router.post('/playback/:sessionId/pause', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { testPlaybackService } = getServices();
    const { sessionId } = req.params;

    await testPlaybackService.pausePlayback(sessionId);

    res.json({
      message: 'Playback paused successfully',
      data: { sessionId }
    });

  } catch (error) {
    logger.error('Failed to pause playback', LogCategory.BROWSER, {
      sessionId: req.params.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to pause playback'
    });
  }
}));

/**
 * POST /api/browser-control/playback/:sessionId/resume
 * Resume playback
 */
router.post('/playback/:sessionId/resume', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { testPlaybackService } = getServices();
    const { sessionId } = req.params;

    await testPlaybackService.resumePlayback(sessionId);

    res.json({
      message: 'Playback resumed successfully',
      data: { sessionId }
    });

  } catch (error) {
    logger.error('Failed to resume playback', LogCategory.BROWSER, {
      sessionId: req.params.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to resume playback'
    });
  }
}));

/**
 * POST /api/browser-control/playback/:sessionId/stop
 * Stop playback
 */
router.post('/playback/:sessionId/stop', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { testPlaybackService } = getServices();
    const { sessionId } = req.params;

    const session = await testPlaybackService.stopPlayback(sessionId);

    res.json({
      data: session,
      message: 'Playback stopped successfully'
    });

  } catch (error) {
    logger.error('Failed to stop playback', LogCategory.BROWSER, {
      sessionId: req.params.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to stop playback'
    });
  }
}));

/**
 * POST /api/browser-control/generate-code
 * Generate Playwright test code from recording
 */
router.post('/generate-code', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { recording_session_id, options = {} } = req.body;
    const userId = (req as any).user?.id;

    if (!recording_session_id) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'recording_session_id is required'
      });
    }

    const generatedTest = await codeGenerationService.generatePlaywrightTest(
      recording_session_id,
      userId,
      {
        language: 'typescript',
        framework: 'playwright-test',
        includeComments: true,
        includeScreenshots: true,
        ...options
      }
    );

    res.status(201).json({
      data: generatedTest,
      message: 'Code generated successfully'
    });

  } catch (error) {
    logger.error('Failed to generate code', LogCategory.BROWSER, {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: (req as any).user?.id
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to generate code'
    });
  }
}));

/**
 * GET /api/browser-control/sessions
 * Get active browser sessions
 */
router.get('/sessions', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { browserControlService } = getServices();
    const activeSessions = browserControlService.getActiveSessions();

    res.json({
      data: activeSessions,
      count: activeSessions.length
    });

  } catch (error) {
    logger.error('Failed to get active sessions', LogCategory.BROWSER, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get active sessions'
    });
  }
}));

/**
 * GET /api/browser-control/recording/:sessionId
 * Get recording session details
 */
router.get('/recording/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { actionRecordingService } = getServices();
    const { sessionId } = req.params;

    const session = await actionRecordingService.getRecordingSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Recording session not found'
      });
    }

    const actions = await actionRecordingService.getRecordingActions(sessionId);

    res.json({
      data: {
        session,
        actions,
        actionCount: actions.length
      }
    });

  } catch (error) {
    logger.error('Failed to get recording session', LogCategory.BROWSER, {
      sessionId: req.params.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get recording session'
    });
  }
}));

export default router;