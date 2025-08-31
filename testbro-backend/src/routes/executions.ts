import express, { Request, Response } from 'express';
import multer from 'multer';
import { supabaseAdmin, TABLES } from '../config/database';
import { authenticate, requireProjectAccess } from '../middleware/auth';
import { validate, validateParams, paramSchemas } from '../middleware/validation';
import { schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { queueService } from '../services/queueService';
import { getWebSocketService } from '../services/websocketService';
import { testExecutionService } from '../services/testExecutionService';
import { ExecuteTestRequest, APIResponse } from '../types';

const router = express.Router();

// Configure multer for screenshot uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for screenshots
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Apply authentication to all routes (supports both JWT and API key)
router.use(authenticate);

/**
 * POST /api/executions
 * Execute test case or suite
 */
router.post('/', validate(schemas.executeTest), requireProjectAccess, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const config: ExecuteTestRequest = req.body;

  try {
    let executionId: string;

    if (config.test_case_id) {
      // Execute single test case
      const { data: testCase, error: caseError } = await supabaseAdmin
        .from('test_cases')
        .select(`
          *,
          test_targets (*)
        `)
        .eq('id', config.test_case_id)
        .single();

      if (caseError || !testCase) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Test case not found',
        });
      }

      if (config.target_id && testCase.target_id !== config.target_id) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Test case target does not match specified target',
        });
      }

      const target = config.target_id ? testCase.test_targets :
        await getTestTarget(testCase.target_id);

      if (!target) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Test target not found',
        });
      }

      executionId = await queueService.enqueueTestExecution(
        testCase,
        target,
        config,
        userId
      );

    } else if (config.suite_id) {
      // Execute test suite
      const { data: suite, error: suiteError } = await supabaseAdmin
        .from('test_suites')
        .select(`
          *,
          test_cases (
            *,
            test_targets (*)
          )
        `)
        .eq('id', config.suite_id)
        .single();

      if (suiteError || !suite) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Test suite not found',
        });
      }

      if (!suite.test_cases || suite.test_cases.length === 0) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Test suite has no test cases',
        });
      }

      // For suites, we execute each test case individually
      const executionIds: string[] = [];

      for (const testCase of suite.test_cases) {
        const target = config.target_id ? await getTestTarget(config.target_id) : testCase.test_targets;

        if (!target) {
          console.error(`Test target not found for test case ${testCase.id}`);
          continue;
        }

        const caseExecutionId = await queueService.enqueueTestExecution(
          testCase,
          target,
          { ...config, test_case_id: testCase.id },
          userId
        );

        executionIds.push(caseExecutionId);
      }

      executionId = executionIds[0]; // Return first execution ID for tracking

    } else {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Either test_case_id or suite_id must be provided',
      });
    }

    const response: APIResponse<any> = {
      data: {
        execution_id: executionId,
        message: 'Test execution queued successfully',
        status: 'queued'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    res.status(202).json(response);

  } catch (error) {
    console.error('Failed to queue test execution:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to queue test execution',
    });
  }
}));

/**
 * GET /api/executions/:id
 * Get execution details
 */
router.get('/:id', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const { data: execution, error } = await supabaseAdmin
    .from(TABLES.TEST_EXECUTIONS)
    .select(`
      *,
      test_cases (
        id,
        name,
        description,
        priority,
        tags
      ),
      test_suites (
        id,
        name,
        description
      ),
      test_targets (
        id,
        name,
        url,
        platform,
        environment
      )
    `)
    .eq('id', id)
    .single();

  if (error || !execution) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Execution not found',
    });
  }

  // Check if user has access to this execution's project
  const { data: project, error: projectError } = await supabaseAdmin
    .from(TABLES.PROJECTS)
    .select('organization_id')
    .eq('id', execution.project_id)
    .single();

  if (projectError || !project) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Project not found',
    });
  }

  // Check organization membership
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', project.organization_id)
    .single();

  if (membershipError || !membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this execution',
    });
  }

  const response: APIResponse<any> = {
    data: execution,
    meta: {
      timestamp: new Date().toISOString()
    }
  };

  res.json(response);
}));

/**
 * DELETE /api/executions/:id
 * Cancel execution
 */
router.delete('/:id', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const cancelled = await queueService.cancelExecution(id);

    if (!cancelled) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Execution not found or already completed',
      });
    }

    res.json({
      message: 'Execution cancelled successfully',
      execution_id: id,
    });

  } catch (error) {
    console.error('Failed to cancel execution:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to cancel execution',
    });
  }
}));

/**
 * GET /api/executions/:id/status
 * Get execution status (real-time)
 */
router.get('/:id/status', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const status = await queueService.getExecutionStatus(id);

    if (!status) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Execution not found',
      });
    }

    const response: APIResponse<any> = {
      data: status,
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Failed to get execution status:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get execution status',
    });
  }
}));

/**
 * GET /api/executions/:id/logs
 * Get execution logs with streaming support
 */
router.get('/:id/logs', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { after, level } = req.query;

  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Query logs
  let query = supabaseAdmin
    .from('execution_logs')
    .select('*')
    .eq('execution_id', id)
    .order('timestamp', { ascending: true });

  if (after) {
    query = query.gt('timestamp', after);
  }

  if (level) {
    query = query.eq('level', level);
  }

  const { data: logs, error } = await query;

  if (error) {
    res.write(`data: ${JSON.stringify({ error: 'Failed to fetch logs' })}\n\n`);
    return res.end();
  }

  // Send initial logs
  if (logs) {
    for (const log of logs) {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    }
  }

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 30000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    res.end();
  });
}));

/**
 * GET /api/executions/:id/screenshots
 * Get execution screenshots
 */
router.get('/:id/screenshots', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: screenshots, error } = await supabaseAdmin
    .from('execution_logs')
    .select('timestamp, metadata')
    .eq('execution_id', id)
    .eq('level', 'info')
    .like('message', '%screenshot%')
    .not('metadata', 'is', null);

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch screenshots',
    });
  }

  const screenshotUrls = screenshots
    ?.filter(log => log.metadata?.screenshot_url)
    .map(log => ({
      timestamp: log.timestamp,
      url: log.metadata.screenshot_url,
    })) || [];

  const response: APIResponse<any[]> = {
    data: screenshotUrls,
    meta: {
      timestamp: new Date().toISOString(),
      count: screenshotUrls.length
    }
  };

  res.json(response);
}));

/**
 * GET /api/executions/:id/replay
 * Get execution replay data
 */
router.get('/:id/replay', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: logs, error } = await supabaseAdmin
    .from('execution_logs')
    .select('*')
    .eq('execution_id', id)
    .order('timestamp', { ascending: true });

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch replay data',
    });
  }

  // Structure replay data
  const replayData = {
    execution_id: id,
    events: logs?.map(log => ({
      timestamp: log.timestamp,
      type: log.level === 'info' ? 'action' : 'error',
      message: log.message,
      step_id: log.step_id,
      metadata: log.metadata,
    })) || [],
  };

  res.json({ data: replayData });
}));

/**
 * POST /api/executions/:id/replay/start
 * Start live replay session
 */
router.post('/:id/replay/start', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const wsService = getWebSocketService();
  if (!wsService) {
    return res.status(503).json({
      error: 'SERVICE_UNAVAILABLE',
      message: 'WebSocket service is not available',
    });
  }

  // Check if execution exists and user has access
  const { data: execution, error } = await supabaseAdmin
    .from(TABLES.TEST_EXECUTIONS)
    .select('status, project_id')
    .eq('id', id)
    .single();

  if (error || !execution) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Execution not found',
    });
  }

  // Verify user has access to the project
  const { data: project, error: projectError } = await supabaseAdmin
    .from(TABLES.PROJECTS)
    .select('organization_id')
    .eq('id', execution.project_id)
    .single();

  if (projectError || !project) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Project not found',
    });
  }

  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', project.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this execution',
    });
  }

  // Start replay session
  wsService.emitToUser(userId, {
    type: 'execution_start',
    execution_id: id,
    data: {
      message: 'Replay session started',
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
    user_id: userId,
  });

  res.json({
    message: 'Replay session started',
    execution_id: id,
    websocket_url: `/ws/replay`,
  });
}));

/**
 * GET /api/executions
 * Get executions list with filtering
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    page = 1,
    limit = 20,
    project_id,
    status,
    browser,
    environment,
    date_from,
    date_to,
    sort_by = 'started_at',
    sort_order = 'desc'
  } = req.query;

  // Get user's organizations first
  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId);

  if (membershipError || !memberships) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch user organizations',
    });
  }

  const organizationIds = memberships.map(m => m.organization_id);

  // Build query
  let query = supabaseAdmin
    .from(TABLES.TEST_EXECUTIONS)
    .select(`
      *,
      test_cases (
        id,
        name,
        description,
        priority
      ),
      test_suites (
        id,
        name,
        description
      ),
      test_targets (
        id,
        name,
        url
      ),
      projects (
        id,
        name,
        organization_id
      )
    `)
    .in('projects.organization_id', organizationIds);

  // Apply filters
  if (project_id) {
    query = query.eq('project_id', project_id);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (browser) {
    query = query.eq('browser', browser);
  }

  if (environment) {
    query = query.eq('environment', environment);
  }

  if (date_from) {
    query = query.gte('started_at', date_from);
  }

  if (date_to) {
    query = query.lte('started_at', date_to);
  }

  // Apply sorting
  const validSortFields = ['started_at', 'completed_at', 'duration_seconds', 'status'];
  const sortField = validSortFields.includes(sort_by as string) ? sort_by : 'started_at';
  const sortDirection = sort_order === 'asc' ? { ascending: true } : { ascending: false };

  query = query.order(sortField as any, sortDirection);

  // Apply pagination
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  query = query.range(offset, offset + parseInt(limit as string) - 1);

  const { data: executions, error, count } = await query;

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch executions',
    });
  }

  // Return paginated results
  const response: APIResponse<any[]> = {
    data: executions || [],
    meta: {
      pagination: {
        currentPage: parseInt(page as string),
        totalPages: Math.ceil((count || 0) / parseInt(limit as string)),
        totalItems: count || 0,
        itemsPerPage: parseInt(limit as string),
        hasNextPage: parseInt(page as string) < Math.ceil((count || 0) / parseInt(limit as string)),
        hasPreviousPage: parseInt(page as string) > 1,
        nextPage: parseInt(page as string) < Math.ceil((count || 0) / parseInt(limit as string)) ? parseInt(page as string) + 1 : null,
        previousPage: parseInt(page as string) > 1 ? parseInt(page as string) - 1 : null,
        // Legacy compatibility
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: count || 0,
        total_pages: Math.ceil((count || 0) / parseInt(limit as string))
      },
      filters: {
        status: status as string,
        project_id: project_id as string,
        date_from: date_from as string,
        date_to: date_to as string
      },
      timestamp: new Date().toISOString()
    },
  };

  res.json(response);
}));

/**
 * POST /api/executions/:id/screenshot
 * Upload screenshot for a specific execution step
 */
router.post('/:id/screenshot', 
  validateParams(paramSchemas.id),
  upload.single('screenshot'), 
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { step_id, step_order, timestamp, description } = req.body;

    if (!req.file) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'No screenshot file provided',
      });
    }

    try {
      // Verify user has access to this execution
      const { data: execution, error: execError } = await supabaseAdmin
        .from(TABLES.TEST_EXECUTIONS)
        .select(`
          id,
          project_id,
          projects (
            organization_id,
            organization_members!inner (
              user_id
            )
          )
        `)
        .eq('id', id)
        .eq('projects.organization_members.user_id', userId)
        .single();

      if (execError || !execution) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Access denied to this execution',
        });
      }

      // Upload to Supabase Storage
      const screenshotUrl = await uploadToSupabaseStorage(req.file, {
        execution_id: id,
        step_id,
        userId,
        timestamp: timestamp || new Date().toISOString()
      });

      // Store screenshot metadata in database
      const { error: logError } = await supabaseAdmin
        .from('execution_logs')
        .insert({
          execution_id: id,
          step_id: step_id || null,
          level: 'info',
          message: description || 'Screenshot captured',
          timestamp: timestamp || new Date().toISOString(),
          metadata: {
            screenshot_url: screenshotUrl,
            file_size: req.file.size,
            content_type: req.file.mimetype,
            step_order: step_order || null
          }
        });

      if (logError) {
        console.error('Screenshot metadata logging error:', logError);
      }

      // Emit WebSocket event for real-time updates
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.emitExecutionEvent({
          type: 'screenshot',
          execution_id: id,
          data: {
            screenshot_url: screenshotUrl,
            step_id,
            step_order,
            timestamp: timestamp || new Date().toISOString()
          },
          timestamp: new Date().toISOString(),
        });
      }

      const response: APIResponse<any> = {
        data: {
          screenshot_url: screenshotUrl,
          execution_id: id,
          step_id,
          step_order,
          file_size: req.file.size,
          uploaded_at: new Date().toISOString()
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('Screenshot upload error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to upload screenshot',
      });
    }
  })
);

/**
 * Helper function to get test target
 */
async function getTestTarget(targetId: string) {
  const { data: target, error } = await supabaseAdmin
    .from('test_targets')
    .select('*')
    .eq('id', targetId)
    .single();

  if (error) {
    console.error('Failed to fetch test target:', error);
    return null;
  }

  return target;
}

/**
 * Helper function to upload file to Supabase Storage
 */
async function uploadToSupabaseStorage(
  file: any, // Use any to avoid type conflicts
  metadata: {
    execution_id: string;
    step_id?: string;
    userId: string;
    timestamp: string;
  }
): Promise<string> {
  try {
    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop() || 'png';
    const fileName = `screenshots/${metadata.execution_id}/${metadata.step_id || 'step'}-${Date.now()}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('test-artifacts')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        metadata: {
          execution_id: metadata.execution_id,
          step_id: metadata.step_id || null,
          uploaded_by: metadata.userId,
          original_name: file.originalname,
          timestamp: metadata.timestamp
        }
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      throw new Error('Failed to upload to storage');
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('test-artifacts')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Storage upload error:', error);
    throw error;
  }
}

export default router;
