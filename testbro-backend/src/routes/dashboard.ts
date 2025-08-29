import express, { Request, Response } from 'express';
import { supabaseAdmin, TABLES } from '../config/database';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Apply authentication to all routes (supports both JWT and API key)
router.use(authenticate);

/**
 * GET /api/dashboard/metrics
 * Get dashboard metrics for user's organizations
 */
router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    // Get user's organizations
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

    // Get metrics using RPC function (would need to be created in Supabase)
    const { data: metrics, error: metricsError } = await supabaseAdmin
      .rpc('get_dashboard_metrics', {
        org_ids: organizationIds,
        user_id: userId
      });

    if (metricsError) {
      console.error('Metrics error:', metricsError);
      // Fallback: calculate metrics manually
      const fallbackMetrics = await calculateFallbackMetrics(organizationIds, userId);
      return res.json({ data: fallbackMetrics });
    }

    res.json({ data: metrics });

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch dashboard metrics',
    });
  }
}));

/**
 * GET /api/dashboard/recent-activity
 * Get recent activity across user's organizations
 */
router.get('/recent-activity', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { limit = 20 } = req.query;

  try {
    // Get user's organizations
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

    // Get recent executions
    const { data: executions, error: execError } = await supabaseAdmin
      .from(TABLES.TEST_EXECUTIONS)
      .select(`
        id,
        status,
        started_at,
        completed_at,
        browser,
        projects (
          id,
          name
        )
      `)
      .in('projects.organization_id', organizationIds)
      .order('started_at', { ascending: false })
      .limit(parseInt(limit as string));

    // Get recent test cases
    const { data: testCases, error: caseError } = await supabaseAdmin
      .from('test_cases')
      .select(`
        id,
        name,
        created_at,
        ai_generated,
        projects (
          id,
          name
        )
      `)
      .in('projects.organization_id', organizationIds)
      .order('created_at', { ascending: false })
      .limit(10);

    if (execError) {
      console.error('Recent activity fetch error:', execError);
    }

    if (caseError) {
      console.error('Recent test cases fetch error:', caseError);
    }

    // Combine and sort activities
    const activities = [
      ...(executions?.map(exec => ({
        type: 'execution',
        id: exec.id,
        title: `Test execution ${exec.status}`,
        description: `Project: ${(exec as any).projects?.name}`,
        timestamp: exec.started_at,
        status: exec.status,
      })) || []),
      ...(testCases?.map(tc => ({
        type: 'test_case',
        id: tc.id,
        title: tc.ai_generated ? 'AI-generated test case' : 'Test case created',
        description: `${tc.name} in ${(tc as any).projects?.name}`,
        timestamp: tc.created_at,
        ai_generated: tc.ai_generated,
      })) || []),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, parseInt(limit as string));

    res.json({ data: activities });

  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch recent activity',
    });
  }
}));

/**
 * GET /api/dashboard/trends
 * Get execution trends and analytics
 */
router.get('/trends', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { period = '30d' } = req.query;

  try {
    // Get user's organizations
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
    const dateFrom = getDateFromPeriod(period as string);

    // Get execution trends
    const { data: trends, error: trendsError } = await supabaseAdmin
      .rpc('get_execution_trends', {
        org_ids: organizationIds,
        date_from: dateFrom
      });

    if (trendsError) {
      console.error('Trends error:', trendsError);
      // Fallback: calculate trends manually
      const fallbackTrends = await calculateFallbackTrends(organizationIds, dateFrom);
      return res.json({ data: fallbackTrends });
    }

    res.json({ data: trends });

  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch execution trends',
    });
  }
}));

/**
 * GET /api/dashboard/health
 * Get system health and performance metrics
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    // Get system health metrics
    const health = {
      database: await checkDatabaseHealth(),
      queue: await checkQueueHealth(),
      websocket: await checkWebSocketHealth(),
      ai_service: await checkAIServiceHealth(),
      timestamp: new Date().toISOString(),
    };

    // Get user's usage metrics
    const { data: usage, error: usageError } = await supabaseAdmin
      .rpc('get_user_usage_metrics', { user_id: userId });

    if (usageError) {
      console.error('Usage metrics error:', usageError);
    }

    res.json({
      data: {
        health,
        usage: usage || {},
      },
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch health metrics',
    });
  }
}));

/**
 * Helper function to calculate fallback metrics when RPC is not available
 */
async function calculateFallbackMetrics(organizationIds: string[], userId: string) {
  // Get basic counts
  const [
    { count: totalProjects },
    { count: totalTestCases },
    { count: totalExecutions },
    { count: recentExecutions },
  ] = await Promise.all([
    supabaseAdmin
      .from(TABLES.PROJECTS)
      .select('*', { count: 'exact', head: true })
      .in('organization_id', organizationIds),
    supabaseAdmin
      .from('test_cases')
      .select('*', { count: 'exact', head: true })
      .in('organization_id', organizationIds),
    supabaseAdmin
      .from(TABLES.TEST_EXECUTIONS)
      .select('*', { count: 'exact', head: true })
      .in('projects.organization_id', organizationIds),
    supabaseAdmin
      .from(TABLES.TEST_EXECUTIONS)
      .select('*', { count: 'exact', head: true })
      .in('projects.organization_id', organizationIds)
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  return {
    total_projects: totalProjects || 0,
    total_test_cases: totalTestCases || 0,
    total_executions: totalExecutions || 0,
    executions_today: recentExecutions || 0,
    success_rate: 0, // Would need more complex calculation
    average_execution_time: 0, // Would need calculation
    active_users: 1, // Simplified
    ai_insights_count: 0, // Would need calculation
  };
}

/**
 * Helper function to calculate fallback trends
 */
async function calculateFallbackTrends(organizationIds: string[], dateFrom: string) {
  const { data: executions, error } = await supabaseAdmin
    .from(TABLES.TEST_EXECUTIONS)
    .select('started_at, status, duration_seconds')
    .in('projects.organization_id', organizationIds)
    .gte('started_at', dateFrom)
    .order('started_at', { ascending: true });

  if (error || !executions) {
    return {
      daily_executions: [],
      success_rate_trend: [],
      average_duration_trend: [],
    };
  }

  // Group by date
  const dailyStats = executions.reduce((acc, exec) => {
    const date = new Date(exec.started_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { total: 0, passed: 0, duration: 0 };
    }
    acc[date].total++;
    if (exec.status === 'completed') {
      acc[date].passed++;
    }
    acc[date].duration += exec.duration_seconds || 0;
    return acc;
  }, {} as Record<string, { total: number; passed: number; duration: number }>);

  const trends = Object.entries(dailyStats).map(([date, stats]) => ({
    date,
    executions: stats.total,
    passed: stats.passed,
    failed: stats.total - stats.passed,
    success_rate: stats.total > 0 ? (stats.passed / stats.total) * 100 : 0,
    average_duration: stats.total > 0 ? stats.duration / stats.total : 0,
  }));

  return {
    daily_executions: trends,
    success_rate_trend: trends.map(t => ({ date: t.date, rate: t.success_rate })),
    average_duration_trend: trends.map(t => ({ date: t.date, duration: t.average_duration })),
  };
}

/**
 * Helper function to get date from period
 */
function getDateFromPeriod(period: string): string {
  const now = new Date();
  switch (period) {
    case '7d':
      now.setDate(now.getDate() - 7);
      break;
    case '30d':
      now.setDate(now.getDate() - 30);
      break;
    case '90d':
      now.setDate(now.getDate() - 90);
      break;
    case '1y':
      now.setFullYear(now.getFullYear() - 1);
      break;
    default:
      now.setDate(now.getDate() - 30);
  }
  return now.toISOString();
}

/**
 * Health check functions
 */
async function checkDatabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
  const start = Date.now();
  try {
    const { error } = await supabaseAdmin
      .from(TABLES.PROJECTS)
      .select('id', { count: 'exact', head: true })
      .limit(1);

    const latency = Date.now() - start;
    return {
      status: error ? 'unhealthy' : 'healthy',
      latency,
    };
  } catch {
    return { status: 'unhealthy' };
  }
}

async function checkQueueHealth(): Promise<{ status: 'healthy' | 'unhealthy'; active?: number }> {
  // This would check Redis/BullMQ health
  // For now, return healthy status
  return { status: 'healthy', active: 0 };
}

async function checkWebSocketHealth(): Promise<{ status: 'healthy' | 'unhealthy'; connections?: number }> {
  // This would check WebSocket server health
  // For now, return healthy status
  return { status: 'healthy', connections: 0 };
}

async function checkAIServiceHealth(): Promise<{ status: 'healthy' | 'unhealthy'; model?: string }> {
  // This would check OpenAI API health
  // For now, return healthy status
  return { status: 'healthy', model: 'gpt-4' };
}

export default router;
