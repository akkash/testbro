import express from 'express';
import { authenticate } from '../middleware/auth';
import { DomainCrawlerService } from '../services/domainCrawlerService';
import { VisualAIService } from '../services/visualAiService';
import { getWebSocketService } from '../services/websocketService';
import { QueueService } from '../services/queueService';
import { AIService } from '../services/aiService';
import { ScreenshotService } from '../services/screenshotService';
import { 
  CreateDomainCrawlRequest,
  VisualComparisonRequest,
  APIResponse,
  APIError
} from '../types';
import { supabaseAdmin } from '../config/database';
import { logger, LogCategory } from '../services/loggingService';

const router = express.Router();

// Get the WebSocket service instance that should be already initialized by server.ts
const wsService = getWebSocketService();
if (!wsService) {
  throw new Error('WebSocket service not initialized. Make sure server.ts initializes the service first.');
}

// Initialize services with proper dependencies
const queueService = new QueueService();
const aiService = new AIService();
const screenshotService = new ScreenshotService(wsService);
const visualAIService = new VisualAIService(aiService, screenshotService, wsService);
const domainCrawlerService = new DomainCrawlerService(wsService, queueService, visualAIService);

/**
 * POST /api/domain-testing/sessions
 * Create a new domain crawl session
 */
router.post('/sessions', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' } as APIError);
    }

    const request: CreateDomainCrawlRequest = req.body;

    // Validate request
    if (!request.name || !request.seed_url || !request.project_id || !request.target_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, seed_url, project_id, target_id' 
      } as APIError);
    }

    // Verify user has access to project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        organization_members!inner(user_id, role, status)
      `)
      .eq('id', request.project_id)
      .eq('organization_members.user_id', userId)
      .eq('organization_members.status', 'active')
      .single();

    if (!project) {
      return res.status(403).json({ 
        error: 'Access denied to project' 
      } as APIError);
    }

    // Create crawl session
    const session = await domainCrawlerService.createDomainCrawlSession(request, userId);

    const response: APIResponse<typeof session> = {
      data: session,
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    res.status(201).json(response);

  } catch (error) {
    logger.error('Failed to create domain crawl session', LogCategory.API, { error });
    res.status(500).json({ 
      error: 'Failed to create domain crawl session',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as APIError);
  }
});

/**
 * GET /api/domain-testing/sessions/:sessionId
 * Get domain crawl session details
 */
router.get('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' } as APIError);
    }

    // Get session with project access check
    const { data: session } = await supabaseAdmin
      .from('domain_crawl_sessions')
      .select(`
        *,
        projects!inner(
          *,
          organization_members!inner(user_id, role, status)
        )
      `)
      .eq('id', sessionId)
      .eq('projects.organization_members.user_id', userId)
      .eq('projects.organization_members.status', 'active')
      .single();

    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found or access denied' 
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
    logger.error('Failed to get domain crawl session', LogCategory.API, { error, sessionId: req.params.sessionId });
    res.status(500).json({ 
      error: 'Failed to get domain crawl session' 
    } as APIError);
  }
});

/**
 * GET /api/domain-testing/sessions/:sessionId/progress
 * Get crawl progress for a session
 */
router.get('/sessions/:sessionId/progress', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' } as APIError);
    }

    // Verify access to session
    const session = await domainCrawlerService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found' 
      } as APIError);
    }

    // Get progress
    const progress = await domainCrawlerService.getCrawlProgress(sessionId);
    
    // Get visual checkpoint summary
    const visualSummary = await visualAIService.getVisualCheckpointSummary(sessionId);

    const response: APIResponse<{
      crawl_progress: typeof progress;
      visual_summary: typeof visualSummary;
    }> = {
      data: {
        crawl_progress: progress,
        visual_summary: visualSummary
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);

  } catch (error) {
    logger.error('Failed to get crawl progress', LogCategory.API, { error, sessionId: req.params.sessionId });
    res.status(500).json({ 
      error: 'Failed to get crawl progress' 
    } as APIError);
  }
});

/**
 * GET /api/domain-testing/sessions/:sessionId/pages
 * Get crawled pages for a session
 */
router.get('/sessions/:sessionId/pages', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;
    const { page = 1, limit = 20, status, page_type } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' } as APIError);
    }

    // Verify access to session
    const session = await domainCrawlerService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found' 
      } as APIError);
    }

    // Build query
    let query = supabaseAdmin
      .from('domain_crawl_pages')
      .select('*', { count: 'exact' })
      .eq('session_id', sessionId);

    if (status) {
      query = query.eq('status', status);
    }

    if (page_type) {
      query = query.eq('page_type', page_type);
    }

    const offset = (Number(page) - 1) * Number(limit);
    query = query
      .order('discovered_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    const { data: pages, count, error } = await query;

    if (error) {
      throw error;
    }

    const response: APIResponse<typeof pages> = {
      data: pages || [],
      meta: {
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil((count || 0) / Number(limit)),
          totalItems: count || 0,
          itemsPerPage: Number(limit),
          hasNextPage: offset + Number(limit) < (count || 0),
          hasPreviousPage: Number(page) > 1,
          nextPage: offset + Number(limit) < (count || 0) ? Number(page) + 1 : null,
          previousPage: Number(page) > 1 ? Number(page) - 1 : null
        },
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);

  } catch (error) {
    logger.error('Failed to get crawled pages', LogCategory.API, { error, sessionId: req.params.sessionId });
    res.status(500).json({ 
      error: 'Failed to get crawled pages' 
    } as APIError);
  }
});

/**
 * GET /api/domain-testing/sessions/:sessionId/checkpoints
 * Get visual checkpoints for a session
 */
router.get('/sessions/:sessionId/checkpoints', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;
    const { status, checkpoint_type, page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' } as APIError);
    }

    // Verify access to session
    const session = await domainCrawlerService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found' 
      } as APIError);
    }

    // Build query
    let query = supabaseAdmin
      .from('visual_checkpoints')
      .select(`
        *,
        domain_crawl_pages!inner(url, title, page_type)
      `, { count: 'exact' })
      .eq('session_id', sessionId);

    if (status) {
      query = query.eq('comparison_status', status);
    }

    if (checkpoint_type) {
      query = query.eq('checkpoint_type', checkpoint_type);
    }

    const offset = (Number(page) - 1) * Number(limit);
    query = query
      .order('captured_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    const { data: checkpoints, count, error } = await query;

    if (error) {
      throw error;
    }

    const response: APIResponse<typeof checkpoints> = {
      data: checkpoints || [],
      meta: {
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil((count || 0) / Number(limit)),
          totalItems: count || 0,
          itemsPerPage: Number(limit),
          hasNextPage: offset + Number(limit) < (count || 0),
          hasPreviousPage: Number(page) > 1,
          nextPage: offset + Number(limit) < (count || 0) ? Number(page) + 1 : null,
          previousPage: Number(page) > 1 ? Number(page) - 1 : null
        },
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);

  } catch (error) {
    logger.error('Failed to get visual checkpoints', LogCategory.API, { error, sessionId: req.params.sessionId });
    res.status(500).json({ 
      error: 'Failed to get visual checkpoints' 
    } as APIError);
  }
});

/**
 * POST /api/domain-testing/checkpoints/:checkpointId/review
 * Review and approve/reject visual checkpoint
 */
router.post('/checkpoints/:checkpointId/review', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { checkpointId } = req.params;
    const { action, comments }: VisualComparisonRequest = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' } as APIError);
    }

    if (!action || !['approve_baseline', 'reject_baseline', 'update_baseline', 'ignore_differences'].includes(action)) {
      return res.status(400).json({ 
        error: 'Invalid action' 
      } as APIError);
    }

    // Verify access to checkpoint
    const { data: checkpoint } = await supabaseAdmin
      .from('visual_checkpoints')
      .select(`
        *,
        domain_crawl_sessions!inner(
          project_id,
          projects!inner(
            organization_members!inner(user_id, role, status)
          )
        )
      `)
      .eq('id', checkpointId)
      .eq('domain_crawl_sessions.projects.organization_members.user_id', userId)
      .eq('domain_crawl_sessions.projects.organization_members.status', 'active')
      .single();

    if (!checkpoint) {
      return res.status(404).json({ 
        error: 'Checkpoint not found or access denied' 
      } as APIError);
    }

    // Perform review action
    await visualAIService.reviewVisualCheckpoint(checkpointId, action, userId, comments);

    const response: APIResponse<{ message: string }> = {
      data: { message: 'Checkpoint reviewed successfully' },
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);

  } catch (error) {
    logger.error('Failed to review visual checkpoint', LogCategory.API, { error, checkpointId: req.params.checkpointId });
    res.status(500).json({ 
      error: 'Failed to review visual checkpoint',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as APIError);
  }
});

/**
 * GET /api/domain-testing/projects/:projectId/checkpoints/review
 * Get checkpoints that need review for a project
 */
router.get('/projects/:projectId/checkpoints/review', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' } as APIError);
    }

    // Verify access to project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        organization_members!inner(user_id, role, status)
      `)
      .eq('id', projectId)
      .eq('organization_members.user_id', userId)
      .eq('organization_members.status', 'active')
      .single();

    if (!project) {
      return res.status(403).json({ 
        error: 'Access denied to project' 
      } as APIError);
    }

    // Get checkpoints needing review
    const checkpoints = await visualAIService.getCheckpointsNeedingReview(projectId);

    const response: APIResponse<typeof checkpoints> = {
      data: checkpoints,
      meta: {
        count: checkpoints.length,
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);

  } catch (error) {
    logger.error('Failed to get checkpoints for review', LogCategory.API, { error, projectId: req.params.projectId });
    res.status(500).json({ 
      error: 'Failed to get checkpoints for review' 
    } as APIError);
  }
});

/**
 * DELETE /api/domain-testing/sessions/:sessionId
 * Cancel or delete a domain crawl session
 */
router.delete('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' } as APIError);
    }

    // Verify access and ownership
    const { data: session } = await supabaseAdmin
      .from('domain_crawl_sessions')
      .select(`
        *,
        projects!inner(
          organization_members!inner(user_id, role, status)
        )
      `)
      .eq('id', sessionId)
      .eq('created_by', userId) // Only creator can delete
      .eq('projects.organization_members.user_id', userId)
      .eq('projects.organization_members.status', 'active')
      .single();

    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found or access denied' 
      } as APIError);
    }

    // Update status to cancelled if running
    if (session.status === 'running') {
      await supabaseAdmin
        .from('domain_crawl_sessions')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }

    const response: APIResponse<{ message: string }> = {
      data: { message: 'Session cancelled successfully' },
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);

  } catch (error) {
    logger.error('Failed to cancel domain crawl session', LogCategory.API, { error, sessionId: req.params.sessionId });
    res.status(500).json({ 
      error: 'Failed to cancel domain crawl session' 
    } as APIError);
  }
});

/**
 * GET /api/domain-testing/sessions/:sessionId/results
 * Get comprehensive results for a completed session
 */
router.get('/sessions/:sessionId/results', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' } as APIError);
    }

    // Verify access to session
    const session = await domainCrawlerService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found' 
      } as APIError);
    }

    // Get all pages
    const { data: pages } = await supabaseAdmin
      .from('domain_crawl_pages')
      .select('*')
      .eq('session_id', sessionId);

    // Get all checkpoints
    const checkpoints = await visualAIService.getSessionCheckpoints(sessionId);

    // Calculate summary statistics
    const totalPagesCrawled = pages?.filter(p => p.status === 'crawled').length || 0;
    const totalCheckpoints = checkpoints.length;
    const visualIssuesFound = checkpoints.filter(c => c.comparison_status === 'failed').length;
    const avgPageLoadTime = pages?.reduce((acc, p) => acc + (p.load_time_ms || 0), 0) / (pages?.length || 1) || 0;
    
    // Page types distribution
    const pageTypesDistribution = pages?.reduce((acc, page) => {
      const type = page.page_type || 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Most common issues (simplified)
    const mostCommonIssues = checkpoints
      .filter(c => c.comparison_status === 'failed')
      .map(c => c.checkpoint_type)
      .reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const results = {
      session,
      pages: pages || [],
      checkpoints,
      summary: {
        total_pages_crawled: totalPagesCrawled,
        total_checkpoints: totalCheckpoints,
        visual_issues_found: visualIssuesFound,
        coverage_percentage: session.pages_discovered > 0 ? (totalPagesCrawled / session.pages_discovered) * 100 : 0,
        avg_page_load_time: Math.round(avgPageLoadTime),
        most_common_issues: Object.entries(mostCommonIssues).map(([issue, count]) => `${issue}: ${count}`),
        page_types_discovered: pageTypesDistribution
      }
    };

    const response: APIResponse<typeof results> = {
      data: results,
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);

  } catch (error) {
    logger.error('Failed to get domain test results', LogCategory.API, { error, sessionId: req.params.sessionId });
    res.status(500).json({ 
      error: 'Failed to get domain test results' 
    } as APIError);
  }
});

export default router;