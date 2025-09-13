import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger, LogCategory } from '../services/loggingService';
import { 
  browserAutomationService, 
  BrowserSessionConfig,
  BrowserAction 
} from '../services/browserAutomationService';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /api/browser/create-session
 * Create a new browser automation session (Phase 1)
 */
router.post('/create-session', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { 
    browserType = 'chromium',
    viewport = { width: 1280, height: 720 },
    deviceType = 'desktop',
    headless = true,
    timeout = 30000,
    projectId,
    testCaseId
  } = req.body;

  try {
    const config: Partial<BrowserSessionConfig> = {
      browserType,
      viewport,
      deviceType,
      headless,
      timeout,
    };

    const result = await browserAutomationService.createSession(userId, config, {
      projectId,
      testCaseId,
    });

    res.status(201).json({
      data: {
        sessionId: result.sessionId,
        config: result.session.config,
        status: result.session.status,
        createdAt: result.session.createdAt,
      },
      message: 'Browser session created successfully',
    });

    logger.info('Browser session created', LogCategory.BROWSER, {
      sessionId: result.sessionId,
      userId,
      browserType,
    });

  } catch (error) {
    logger.error('Failed to create browser session', LogCategory.BROWSER, {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    });

    res.status(500).json({
      error: 'SESSION_CREATION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to create browser session',
    });
  }
}));

/**
 * POST /api/browser/execute-action
 * Execute an action in a browser session (Phase 1)
 */
router.post('/execute-action', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { sessionId, action }: { sessionId: string; action: BrowserAction } = req.body;

  if (!sessionId || !action) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'sessionId and action are required',
    });
  }

  try {
    // Verify session belongs to user
    const session = await browserAutomationService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: 'Browser session not found or access denied',
      });
    }

    const result = await browserAutomationService.executeAction(sessionId, action);

    res.json({
      data: result,
      message: 'Action executed successfully',
    });

    logger.info('Browser action executed', LogCategory.BROWSER, {
      sessionId,
      action: action.type,
      success: result.success,
      duration: result.duration,
    });

  } catch (error) {
    logger.error('Browser action execution failed', LogCategory.BROWSER, {
      sessionId,
      action: req.body.action?.type,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'ACTION_EXECUTION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to execute action',
    });
  }
}));

/**
 * GET /api/browser/screenshot/:sessionId
 * Take a screenshot of the current page (Phase 1)
 */
router.get('/screenshot/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { sessionId } = req.params;
  const { fullPage = true } = req.query;

  try {
    // Verify session belongs to user
    const session = await browserAutomationService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: 'Browser session not found or access denied',
      });
    }

    const screenshotAction: BrowserAction = {
      type: 'screenshot',
      options: { fullPage: fullPage === 'true' },
    };

    const result = await browserAutomationService.executeAction(sessionId, screenshotAction);

    if (!result.success) {
      throw new Error(result.error || 'Screenshot failed');
    }

    res.json({
      data: {
        screenshotPath: result.screenshot,
        sessionId,
        timestamp: result.timestamp,
      },
      message: 'Screenshot captured successfully',
    });

  } catch (error) {
    logger.error('Screenshot capture failed', LogCategory.BROWSER, {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'SCREENSHOT_FAILED',
      message: error instanceof Error ? error.message : 'Failed to capture screenshot',
    });
  }
}));

/**
 * GET /api/browser/session/:sessionId
 * Get browser session details (Phase 1)
 */
router.get('/session/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { sessionId } = req.params;

  try {
    const session = await browserAutomationService.getSession(sessionId);
    
    if (!session || session.userId !== userId) {
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: 'Browser session not found or access denied',
      });
    }

    // Get current page info
    const pageInfo = await browserAutomationService.getPageInfo(sessionId);

    res.json({
      data: {
        sessionId: session.id,
        status: session.status,
        config: session.config,
        pageInfo,
        stats: {
          actionsExecuted: session.actionsExecuted,
          screenshotsTaken: session.screenshotsTaken,
          errorsEncountered: session.errorsEncountered,
        },
        timestamps: {
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
        },
      },
      message: 'Session details retrieved successfully',
    });

  } catch (error) {
    logger.error('Failed to get session details', LogCategory.BROWSER, {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'SESSION_DETAILS_FAILED',
      message: 'Failed to retrieve session details',
    });
  }
}));

/**
 * DELETE /api/browser/close-session/:sessionId
 * Close a browser session (Phase 1)
 */
router.delete('/close-session/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { sessionId } = req.params;

  try {
    // Verify session belongs to user
    const session = await browserAutomationService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: 'Browser session not found or access denied',
      });
    }

    await browserAutomationService.closeSession(sessionId);

    res.json({
      data: { sessionId },
      message: 'Browser session closed successfully',
    });

    logger.info('Browser session closed', LogCategory.BROWSER, {
      sessionId,
      userId,
    });

  } catch (error) {
    logger.error('Failed to close browser session', LogCategory.BROWSER, {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'SESSION_CLOSE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to close browser session',
    });
  }
}));

/**
 * GET /api/browser/stats
 * Get browser automation statistics (Phase 1)
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  try {
    const stats = browserAutomationService.getStats();

    res.json({
      data: stats,
      message: 'Browser automation statistics retrieved successfully',
    });

  } catch (error) {
    logger.error('Failed to get browser stats', LogCategory.BROWSER, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'STATS_RETRIEVAL_FAILED',
      message: 'Failed to retrieve browser statistics',
    });
  }
}));

/**
 * POST /api/browser/batch-actions
 * Execute multiple actions in sequence (Phase 1 enhancement)
 */
router.post('/batch-actions', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { sessionId, actions }: { sessionId: string; actions: BrowserAction[] } = req.body;

  if (!sessionId || !Array.isArray(actions) || actions.length === 0) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'sessionId and actions array are required',
    });
  }

  try {
    // Verify session belongs to user
    const session = await browserAutomationService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: 'Browser session not found or access denied',
      });
    }

    const results = [];
    let totalDuration = 0;

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      try {
        const result = await browserAutomationService.executeAction(sessionId, action);
        results.push({
          actionIndex: i,
          action: action.type,
          success: result.success,
          duration: result.duration,
          data: result.data,
          error: result.error,
        });
        totalDuration += result.duration;

        // Stop on failure unless explicitly configured to continue
        if (!result.success && !action.options?.continueOnFailure) {
          break;
        }
      } catch (error) {
        results.push({
          actionIndex: i,
          action: action.type,
          success: false,
          duration: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        break;
      }
    }

    const summary = {
      totalActions: actions.length,
      completedActions: results.length,
      successfulActions: results.filter(r => r.success).length,
      failedActions: results.filter(r => !r.success).length,
      totalDuration,
    };

    res.json({
      data: {
        results,
        summary,
      },
      message: 'Batch actions completed',
    });

    logger.info('Batch actions executed', LogCategory.BROWSER, {
      sessionId,
      ...summary,
    });

  } catch (error) {
    logger.error('Batch action execution failed', LogCategory.BROWSER, {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'BATCH_EXECUTION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to execute batch actions',
    });
  }
}));

export default router;
