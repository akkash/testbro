import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { logger, LogCategory } from '../services/loggingService';
import { 
  FullWebsiteTestService, 
  FullWebsiteTestConfig, 
  PreFlowStep 
} from '../services/fullWebsiteTestService';
import { getWebSocketService } from '../services/websocketService';
import { QueueService } from '../services/queueService';
import { supabaseAdmin } from '../config/database';
import { body, param, query } from 'express-validator';
import { APIResponse, APIError } from '../types';

const router = express.Router();

// Initialize services
const wsService = getWebSocketService();
const queueService = new QueueService();

if (!wsService) {
  throw new Error('WebSocket service not initialized');
}

const fullWebsiteTestService = new FullWebsiteTestService(wsService, queueService);

// Validation schemas
const validateFullWebsiteTestConfig = [
  body('name').notEmpty().withMessage('Test name is required'),
  body('project_id').isUUID().withMessage('Valid project ID is required'),
  body('target_id').isUUID().withMessage('Valid target ID is required'),
  body('base_url').isURL().withMessage('Valid base URL is required'),
  
  // Sitemap discovery configuration
  body('sitemap_discovery.max_depth').optional().isInt({ min: 1, max: 10 }),
  body('sitemap_discovery.max_urls').optional().isInt({ min: 1, max: 10000 }),
  body('sitemap_discovery.follow_external_links').optional().isBoolean(),
  body('sitemap_discovery.respect_robots_txt').optional().isBoolean(),
  body('sitemap_discovery.include_patterns').optional().isArray(),
  body('sitemap_discovery.exclude_patterns').optional().isArray(),
  body('sitemap_discovery.discover_sitemaps').optional().isBoolean(),
  body('sitemap_discovery.crawl_internal_links').optional().isBoolean(),
  body('sitemap_discovery.timeout_ms').optional().isInt({ min: 5000, max: 60000 }),
  
  // Screenshot configuration
  body('screenshot_options.enabled').optional().isBoolean(),
  body('screenshot_options.fullPage').optional().isBoolean(),
  body('screenshot_options.width').optional().isInt({ min: 320, max: 1920 }),
  body('screenshot_options.height').optional().isInt({ min: 240, max: 1080 }),
  body('screenshot_options.quality').optional().isInt({ min: 1, max: 100 }),
  body('screenshot_options.format').optional().isIn(['png', 'jpeg']),
  body('screenshot_options.capture_mobile').optional().isBoolean(),
  body('screenshot_options.capture_tablet').optional().isBoolean(),
  body('screenshot_options.compare_with_baseline').optional().isBoolean(),
  body('screenshot_options.baseline_session_id').optional().isUUID(),
  
  // Pre-flow configuration
  body('pre_flow.enabled').optional().isBoolean(),
  body('pre_flow.steps').optional().isArray(),
  
  // Monitoring configuration
  body('monitoring.enabled').optional().isBoolean(),
  body('monitoring.check_interval_minutes').optional().isInt({ min: 1, max: 1440 }),
  body('monitoring.timeout_seconds').optional().isInt({ min: 5, max: 300 }),
  body('monitoring.monitor_404_pages').optional().isBoolean(),
  body('monitoring.monitor_load_times').optional().isBoolean(),
  body('monitoring.monitor_content_changes').optional().isBoolean(),
  body('monitoring.alert_on_errors').optional().isBoolean(),
  body('monitoring.load_time_threshold_ms').optional().isInt({ min: 100, max: 30000 }),
  
  // General configuration
  body('batch_size').optional().isInt({ min: 1, max: 20 }),
  body('delay_between_requests').optional().isInt({ min: 0, max: 10000 }),
  body('max_concurrent_sessions').optional().isInt({ min: 1, max: 5 }),
  body('enable_real_time_updates').optional().isBoolean()
];

/**
 * POST /api/full-website-test/start
 * Start a comprehensive full website test
 */
router.post('/start', 
  authenticate,
  validateFullWebsiteTestConfig,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const config: FullWebsiteTestConfig = {
      name: req.body.name,
      project_id: req.body.project_id,
      target_id: req.body.target_id,
      base_url: req.body.base_url,
      
      // Default configurations with overrides
      sitemap_discovery: {
        max_depth: req.body.sitemap_discovery?.max_depth || 3,
        max_urls: req.body.sitemap_discovery?.max_urls || 500,
        follow_external_links: req.body.sitemap_discovery?.follow_external_links || false,
        respect_robots_txt: req.body.sitemap_discovery?.respect_robots_txt || true,
        include_patterns: req.body.sitemap_discovery?.include_patterns || ['*'],
        exclude_patterns: req.body.sitemap_discovery?.exclude_patterns || [
          '*/admin/*', '*/wp-admin/*', '*/login/*', '*/auth/*',
          '*/logout/*', '*/register/*', '*/cart/*', '*/checkout/*',
          '*.pdf', '*.doc', '*.docx', '*.zip', '*.mp3', '*.mp4'
        ],
        discover_sitemaps: req.body.sitemap_discovery?.discover_sitemaps || true,
        crawl_internal_links: req.body.sitemap_discovery?.crawl_internal_links || true,
        timeout_ms: req.body.sitemap_discovery?.timeout_ms || 30000
      },
      
      screenshot_options: {
        enabled: req.body.screenshot_options?.enabled || true,
        fullPage: req.body.screenshot_options?.fullPage || true,
        width: req.body.screenshot_options?.width || 1280,
        height: req.body.screenshot_options?.height || 720,
        quality: req.body.screenshot_options?.quality || 90,
        format: req.body.screenshot_options?.format || 'png',
        capture_mobile: req.body.screenshot_options?.capture_mobile || false,
        capture_tablet: req.body.screenshot_options?.capture_tablet || false,
        compare_with_baseline: req.body.screenshot_options?.compare_with_baseline || false,
        baseline_session_id: req.body.screenshot_options?.baseline_session_id
      },
      
      pre_flow: {
        enabled: req.body.pre_flow?.enabled || false,
        steps: req.body.pre_flow?.steps || []
      },
      
      monitoring: {
        enabled: req.body.monitoring?.enabled || false,
        check_interval_minutes: req.body.monitoring?.check_interval_minutes || 60,
        timeout_seconds: req.body.monitoring?.timeout_seconds || 30,
        monitor_404_pages: req.body.monitoring?.monitor_404_pages || true,
        monitor_load_times: req.body.monitoring?.monitor_load_times || true,
        monitor_content_changes: req.body.monitoring?.monitor_content_changes || true,
        alert_on_errors: req.body.monitoring?.alert_on_errors || true,
        load_time_threshold_ms: req.body.monitoring?.load_time_threshold_ms || 3000
      },
      
      batch_size: req.body.batch_size || 5,
      delay_between_requests: req.body.delay_between_requests || 1000,
      max_concurrent_sessions: req.body.max_concurrent_sessions || 2,
      enable_real_time_updates: req.body.enable_real_time_updates !== false
    };

    try {
      // Verify user has access to project
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select(`
          *,
          organization_members!inner(user_id, role, status)
        `)
        .eq('id', config.project_id)
        .eq('organization_members.user_id', userId)
        .eq('organization_members.status', 'active')
        .single();

      if (projectError || !project) {
        return res.status(403).json({
          error: 'Access denied to project'
        } as APIError);
      }

      // Verify target exists
      const { data: target, error: targetError } = await supabaseAdmin
        .from('test_targets')
        .select('*')
        .eq('id', config.target_id)
        .eq('project_id', config.project_id)
        .single();

      if (targetError || !target) {
        return res.status(404).json({
          error: 'Test target not found'
        } as APIError);
      }

      // Start the full website test
      const session = await fullWebsiteTestService.startFullWebsiteTest(config, userId);

      const response: APIResponse<typeof session> = {
        data: session,
        meta: {
          timestamp: new Date().toISOString()
        }
      };

      res.status(201).json(response);

      logger.info('Full website test started', LogCategory.API, {
        sessionId: session.id,
        projectId: config.project_id,
        targetId: config.target_id,
        userId
      });

    } catch (error) {
      logger.error('Failed to start full website test', LogCategory.API, {
        projectId: config.project_id,
        targetId: config.target_id,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to start full website test',
        message: error instanceof Error ? error.message : 'Unknown error'
      } as APIError);
    }
  })
);

/**
 * GET /api/full-website-test/sessions/:sessionId
 * Get test session details
 */
router.get('/sessions/:sessionId',
  authenticate,
  [param('sessionId').isUUID().withMessage('Valid session ID is required')],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    try {
      const session = await fullWebsiteTestService.getTestSession(sessionId);

      if (!session) {
        return res.status(404).json({
          error: 'Test session not found'
        } as APIError);
      }

      // Verify user has access to the project
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select(`
          *,
          organization_members!inner(user_id, role, status)
        `)
        .eq('id', session.project_id)
        .eq('organization_members.user_id', userId)
        .eq('organization_members.status', 'active')
        .single();

      if (!project) {
        return res.status(403).json({
          error: 'Access denied to test session'
        } as APIError);
      }

      const response: APIResponse<typeof session> = {
        data: session,
        meta: {
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('Failed to get test session', LogCategory.API, {
        sessionId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to get test session'
      } as APIError);
    }
  })
);

/**
 * GET /api/full-website-test/sessions/:sessionId/results
 * Get comprehensive test results
 */
router.get('/sessions/:sessionId/results',
  authenticate,
  [param('sessionId').isUUID().withMessage('Valid session ID is required')],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    try {
      const results = await fullWebsiteTestService.getTestResults(sessionId);

      if (!results) {
        return res.status(404).json({
          error: 'Test results not found'
        } as APIError);
      }

      // Verify user has access to the project
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select(`
          *,
          organization_members!inner(user_id, role, status)
        `)
        .eq('id', results.session.project_id)
        .eq('organization_members.user_id', userId)
        .eq('organization_members.status', 'active')
        .single();

      if (!project) {
        return res.status(403).json({
          error: 'Access denied to test results'
        } as APIError);
      }

      const response: APIResponse<typeof results> = {
        data: results,
        meta: {
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('Failed to get test results', LogCategory.API, {
        sessionId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to get test results'
      } as APIError);
    }
  })
);

/**
 * POST /api/full-website-test/sessions/:sessionId/cancel
 * Cancel a running test
 */
router.post('/sessions/:sessionId/cancel',
  authenticate,
  [param('sessionId').isUUID().withMessage('Valid session ID is required')],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    try {
      const session = await fullWebsiteTestService.getTestSession(sessionId);

      if (!session) {
        return res.status(404).json({
          error: 'Test session not found'
        } as APIError);
      }

      // Verify user has access to the project
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select(`
          *,
          organization_members!inner(user_id, role, status)
        `)
        .eq('id', session.project_id)
        .eq('organization_members.user_id', userId)
        .eq('organization_members.status', 'active')
        .single();

      if (!project) {
        return res.status(403).json({
          error: 'Access denied to test session'
        } as APIError);
      }

      // Only allow the creator or admin to cancel
      if (session.created_by !== userId && project.organization_members[0]?.role !== 'admin') {
        return res.status(403).json({
          error: 'Only the test creator or admin can cancel this test'
        } as APIError);
      }

      const success = await fullWebsiteTestService.cancelTest(sessionId);

      if (success) {
        res.json({
          message: 'Test cancelled successfully',
          session_id: sessionId
        });
      } else {
        res.status(400).json({
          error: 'Failed to cancel test or test is not running'
        } as APIError);
      }

    } catch (error) {
      logger.error('Failed to cancel test', LogCategory.API, {
        sessionId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to cancel test'
      } as APIError);
    }
  })
);

/**
 * GET /api/full-website-test/sessions
 * Get user's test sessions with filtering and pagination
 */
router.get('/sessions',
  authenticate,
  [
    query('project_id').optional().isUUID(),
    query('status').optional().isIn([
      'pending', 'discovering_urls', 'taking_screenshots', 
      'analyzing_changes', 'monitoring', 'completed', 'failed', 'cancelled'
    ]),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { 
      project_id, 
      status, 
      page = 1, 
      limit = 20 
    } = req.query as any;

    try {
      // Get user's accessible projects first
      const { data: userProjects } = await supabaseAdmin
        .from('projects')
        .select('id')
        .in('organization_id', 
          supabaseAdmin
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', userId)
            .eq('status', 'active')
        );

      if (!userProjects || userProjects.length === 0) {
        return res.json({
          data: [],
          meta: {
            pagination: {
              currentPage: parseInt(page),
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: parseInt(limit),
              hasNextPage: false,
              hasPreviousPage: false,
              nextPage: null,
              previousPage: null
            }
          }
        });
      }

      const accessibleProjectIds = userProjects.map(p => p.id);

      // Build query
      let query = supabaseAdmin
        .from('full_website_test_sessions')
        .select('*', { count: 'exact' })
        .in('project_id', accessibleProjectIds)
        .order('created_at', { ascending: false });

      // Apply filters
      if (project_id) {
        query = query.eq('project_id', project_id);
      }

      if (status) {
        query = query.eq('status', status);
      }

      // Apply pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query = query.range(offset, offset + parseInt(limit) - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const totalPages = Math.ceil((count || 0) / parseInt(limit));
      const currentPage = parseInt(page);

      const response: APIResponse<typeof data> = {
        data: data || [],
        meta: {
          pagination: {
            currentPage,
            totalPages,
            totalItems: count || 0,
            itemsPerPage: parseInt(limit),
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1,
            nextPage: currentPage < totalPages ? currentPage + 1 : null,
            previousPage: currentPage > 1 ? currentPage - 1 : null
          },
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('Failed to get test sessions', LogCategory.API, {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to get test sessions'
      } as APIError);
    }
  })
);

/**
 * GET /api/full-website-test/templates
 * Get predefined test configuration templates
 */
router.get('/templates',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const templates = [
      {
        id: 'basic-scan',
        name: 'Basic Website Scan',
        description: 'Quick scan of main pages with basic health checks',
        config: {
          sitemap_discovery: {
            max_depth: 2,
            max_urls: 100,
            crawl_internal_links: true,
            discover_sitemaps: true
          },
          screenshot_options: {
            enabled: true,
            fullPage: true,
            capture_mobile: false,
            capture_tablet: false,
            compare_with_baseline: false
          },
          pre_flow: {
            enabled: false,
            steps: []
          },
          monitoring: {
            enabled: false
          },
          batch_size: 5,
          delay_between_requests: 1000
        }
      },
      {
        id: 'comprehensive-audit',
        name: 'Comprehensive Website Audit',
        description: 'Full website audit with screenshots, monitoring, and change detection',
        config: {
          sitemap_discovery: {
            max_depth: 3,
            max_urls: 500,
            crawl_internal_links: true,
            discover_sitemaps: true
          },
          screenshot_options: {
            enabled: true,
            fullPage: true,
            capture_mobile: true,
            capture_tablet: true,
            compare_with_baseline: true
          },
          pre_flow: {
            enabled: false,
            steps: []
          },
          monitoring: {
            enabled: true,
            check_interval_minutes: 60,
            monitor_404_pages: true,
            monitor_load_times: true,
            monitor_content_changes: true,
            alert_on_errors: true,
            load_time_threshold_ms: 3000
          },
          batch_size: 3,
          delay_between_requests: 2000
        }
      },
      {
        id: 'authenticated-scan',
        name: 'Authenticated Website Scan',
        description: 'Scan protected pages after login with cookie acceptance',
        config: {
          sitemap_discovery: {
            max_depth: 3,
            max_urls: 300,
            crawl_internal_links: true,
            discover_sitemaps: true
          },
          screenshot_options: {
            enabled: true,
            fullPage: true,
            capture_mobile: false,
            capture_tablet: false,
            compare_with_baseline: false
          },
          pre_flow: {
            enabled: true,
            steps: [
              {
                action: 'navigate',
                url: 'https://example.com'
              },
              {
                action: 'accept_cookies'
              },
              {
                action: 'navigate',
                url: 'https://example.com/login'
              },
              {
                action: 'login',
                credentials: {
                  email: 'test@example.com',
                  password: 'password123'
                }
              }
            ]
          },
          monitoring: {
            enabled: false
          },
          batch_size: 3,
          delay_between_requests: 1500
        }
      },
      {
        id: 'performance-focused',
        name: 'Performance-Focused Test',
        description: 'Focus on page load times and performance metrics',
        config: {
          sitemap_discovery: {
            max_depth: 2,
            max_urls: 200,
            crawl_internal_links: true,
            discover_sitemaps: true
          },
          screenshot_options: {
            enabled: false
          },
          pre_flow: {
            enabled: false,
            steps: []
          },
          monitoring: {
            enabled: true,
            check_interval_minutes: 30,
            monitor_404_pages: false,
            monitor_load_times: true,
            monitor_content_changes: false,
            alert_on_errors: false,
            load_time_threshold_ms: 2000
          },
          batch_size: 10,
          delay_between_requests: 500
        }
      }
    ];

    const response: APIResponse<typeof templates> = {
      data: templates,
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);
  })
);

export default router;
