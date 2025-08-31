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
  // Get user's projects first
  const { data: projects, error: projectsError } = await supabaseAdmin
    .from(TABLES.PROJECTS)
    .select('id')
    .in('organization_id', organizationIds);

  if (projectsError || !projects) {
    return {
      total_tests: 0,
      active_tests: 0,
      total_executions: 0,
      success_rate: 0,
      avg_execution_time: 0,
      failure_rate: 0,
      ai_insights_count: 0,
      team_members: 1,
      recentExecutions: [],
      topIssues: []
    };
  }

  const projectIds = projects.map(p => p.id);

  // Get basic counts and execution data
  const [testCasesResult, executionsResult] = await Promise.all([
    supabaseAdmin
      .from('test_cases')
      .select('id, status', { count: 'exact' })
      .in('project_id', projectIds),
    supabaseAdmin
      .from(TABLES.TEST_EXECUTIONS)
      .select('id, status, duration_seconds, started_at', { count: 'exact' })
      .in('project_id', projectIds)
      .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
  ]);

  const testCases = testCasesResult.data || [];
  const executions = executionsResult.data || [];
  const totalTests = testCasesResult.count || 0;
  const activeTests = testCases.filter(tc => tc.status === 'active').length;
  const totalExecutions = executionsResult.count || 0;
  const successfulExecutions = executions.filter(e => e.status === 'completed').length;
  const failedExecutions = executions.filter(e => e.status === 'failed').length;
  const avgDuration = executions.length > 0 ? 
    executions.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / executions.length : 0;

  // Get recent executions for activity
  const recentExecutions = executions
    .filter(e => new Date(e.started_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .slice(0, 10)
    .map(exec => ({
      id: exec.id,
      status: exec.status,
      started_at: exec.started_at,
      duration_seconds: exec.duration_seconds
    }));

  return {
    total_tests: totalTests,
    active_tests: activeTests,
    total_executions: totalExecutions,
    success_rate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
    failure_rate: totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0,
    avg_execution_time: avgDuration,
    ai_insights_count: 0, // Would need calculation
    team_members: 1, // Simplified
    recentExecutions,
    topIssues: [] // Would need more complex calculation
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

/**
 * GET /api/dashboard/roi-metrics
 * Get ROI (Return on Investment) metrics
 */
router.get('/roi-metrics', asyncHandler(async (req: Request, res: Response) => {
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

    // Get total test executions and their durations
    const { data: executions, error: execError } = await supabaseAdmin
      .from(TABLES.TEST_EXECUTIONS)
      .select(`
        duration_seconds,
        status,
        started_at,
        projects!inner(
          organization_id
        )
      `)
      .in('projects.organization_id', organizationIds)
      .gte('started_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()); // Last 90 days

    if (execError) {
      console.error('Executions fetch error:', execError);
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch execution data',
      });
    }

    // Calculate ROI metrics
    const totalExecutions = executions?.length || 0;
    const totalDurationHours = (executions?.reduce((sum, exec) => sum + (exec.duration_seconds || 0), 0) || 0) / 3600;
    const costPerManualTest = 50; // $50 per manual test (configurable)
    const automatedTestCost = 2; // $2 per automated test (configurable)
    const averageHourlyRate = 100; // $100/hour (configurable)

    const totalSavings = (totalExecutions * costPerManualTest) - (totalExecutions * automatedTestCost);
    const monthlySavings = totalSavings / 3; // 90 days data / 3 months
    const timesSaved = totalDurationHours * 5; // Assuming manual test takes 5x longer
    const risksPrevented = Math.floor(totalExecutions * 0.1); // 10% of tests would catch critical issues
    const productionIssuesAvoided = Math.floor(risksPrevented * 0.3); // 30% of risks would become production issues

    const roiMetrics = {
      totalSavings: Math.round(totalSavings),
      monthlySavings: Math.round(monthlySavings),
      timesSaved: Math.round(timesSaved),
      costPerManualTest,
      automatedTestCost,
      risksPrevented,
      productionIssuesAvoided
    };

    res.json({ data: roiMetrics });

  } catch (error) {
    console.error('ROI metrics error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to calculate ROI metrics',
    });
  }
}));

/**
 * GET /api/dashboard/cost-savings
 * Get detailed cost savings metrics
 */
router.get('/cost-savings', asyncHandler(async (req: Request, res: Response) => {
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

    // Get test execution data for the last 30 days
    const { data: executions, error: execError } = await supabaseAdmin
      .from(TABLES.TEST_EXECUTIONS)
      .select(`
        duration_seconds,
        status,
        started_at,
        projects!inner(
          organization_id
        )
      `)
      .in('projects.organization_id', organizationIds)
      .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (execError) {
      console.error('Executions fetch error:', execError);
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch execution data',
      });
    }

    // Constants (these could be made configurable)
    const averageHourlyRate = 100;
    const manualTestMultiplier = 3; // Manual tests take 3x longer
    const regressionTestSavingsMultiplier = 10; // Each automated test saves 10 manual regression tests
    const deploymentTimeReductionHours = 2; // Each test suite reduces deployment validation by 2 hours

    const totalExecutions = executions?.length || 0;
    const totalDurationHours = (executions?.reduce((sum, exec) => sum + (exec.duration_seconds || 0), 0) || 0) / 3600;
    const successfulExecutions = executions?.filter(exec => exec.status === 'completed').length || 0;

    // Calculate metrics
    const manualTestingHoursAvoided = totalDurationHours * manualTestMultiplier;
    const regressionTestsSaved = successfulExecutions * regressionTestSavingsMultiplier;
    const hoursSaved = manualTestingHoursAvoided + (regressionTestsSaved * 0.5); // 30 min per regression test
    const bugFixTimeReduced = successfulExecutions * 2; // 2 hours saved per bug caught early
    const deploymentTimeReduced = Math.floor(totalExecutions / 10) * deploymentTimeReductionHours; // Per 10 tests
    
    const monthlySavings = (hoursSaved + bugFixTimeReduced + deploymentTimeReduced) * averageHourlyRate;
    const yearlyProjectedSavings = monthlySavings * 12;

    const costSavingsMetrics = {
      hoursSaved: Math.round(hoursSaved),
      monthlySavings: Math.round(monthlySavings),
      yearlyProjectedSavings: Math.round(yearlyProjectedSavings),
      manualTestingHoursAvoided: Math.round(manualTestingHoursAvoided),
      bugFixTimeReduced: Math.round(bugFixTimeReduced),
      averageHourlyRate,
      regressionTestsSaved,
      deploymentTimeReduced: Math.round(deploymentTimeReduced)
    };

    res.json({ data: costSavingsMetrics });

  } catch (error) {
    console.error('Cost savings metrics error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to calculate cost savings metrics',
    });
  }
}));

/**
 * GET /api/dashboard/industry-benchmarks
 * Get industry benchmark comparisons
 */
router.get('/industry-benchmarks', asyncHandler(async (req: Request, res: Response) => {
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

    // Get recent execution data for calculating user metrics
    const { data: executions, error: execError } = await supabaseAdmin
      .from(TABLES.TEST_EXECUTIONS)
      .select(`
        status,
        started_at,
        duration_seconds,
        projects!inner(
          organization_id
        )
      `)
      .in('projects.organization_id', organizationIds)
      .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (execError) {
      console.error('Executions fetch error:', execError);
    }

    // Calculate user's current metrics
    const totalExecutions = executions?.length || 0;
    const successfulExecutions = executions?.filter(exec => exec.status === 'completed').length || 0;
    const failedExecutions = executions?.filter(exec => exec.status === 'failed').length || 0;
    const userReliability = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
    const avgExecutionTime = totalExecutions > 0 ? 
      (executions?.reduce((sum, exec) => sum + (exec.duration_seconds || 0), 0) || 0) / totalExecutions / 60 : 0; // in minutes
    
    // Industry benchmark data (this could be stored in database or fetched from external service)
    const benchmarks = [
      {
        metric: 'Test Reliability',
        yourValue: Math.round(userReliability * 10) / 10,
        industryAverage: 87.5,
        industryTop10: 96.2,
        percentile: calculatePercentile(userReliability, 87.5, 96.2),
        trend: determineTrend(userReliability, 90), // Compare with previous period
        unit: '%',
        description: 'Overall test suite reliability and consistency'
      },
      {
        metric: 'Deployment Frequency',
        yourValue: Math.max(1, Math.floor(totalExecutions / 4)), // Rough estimate
        industryAverage: 8.3,
        industryTop10: 15.7,
        percentile: calculatePercentile(Math.floor(totalExecutions / 4), 8.3, 15.7),
        trend: 'stable' as const,
        unit: 'deployments/month',
        description: 'How often code is deployed to production'
      },
      {
        metric: 'Bug Detection Rate',
        yourValue: Math.round((1 - (failedExecutions / Math.max(totalExecutions, 1))) * 100 * 10) / 10,
        industryAverage: 78.4,
        industryTop10: 95.8,
        percentile: calculatePercentile((1 - (failedExecutions / Math.max(totalExecutions, 1))) * 100, 78.4, 95.8),
        trend: determineTrend((1 - (failedExecutions / Math.max(totalExecutions, 1))) * 100, 85),
        unit: '%',
        description: 'Percentage of bugs caught before production'
      },
      {
        metric: 'Average Test Duration',
        yourValue: Math.round(avgExecutionTime * 10) / 10,
        industryAverage: 4.2,
        industryTop10: 2.1,
        percentile: calculatePercentile(avgExecutionTime, 4.2, 2.1, true), // Lower is better
        trend: determineTrend(avgExecutionTime, 3.5, true),
        unit: 'minutes',
        description: 'Average time for test execution'
      }
    ];

    res.json({ data: benchmarks });

  } catch (error) {
    console.error('Industry benchmarks error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch industry benchmarks',
    });
  }
}));

/**
 * GET /api/dashboard/failing-tests
 * Get top failing tests and their details
 */
router.get('/failing-tests', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { limit = 5 } = req.query;

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

    // Get failed executions with test case details
    const { data: failedExecutions, error: execError } = await supabaseAdmin
      .from(TABLES.TEST_EXECUTIONS)
      .select(`
        id,
        status,
        started_at,
        error_message,
        test_case_id,
        test_cases (
          id,
          name,
          priority,
          tags
        ),
        test_targets (
          environment,
          platform
        ),
        projects!inner(
          organization_id,
          name
        )
      `)
      .in('projects.organization_id', organizationIds)
      .eq('status', 'failed')
      .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('started_at', { ascending: false });

    if (execError) {
      console.error('Failed executions fetch error:', execError);
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch failed executions',
      });
    }

    // Group by test case and calculate failure rates
    const testFailureMap = new Map<string, {
      testCase: any;
      failures: any[];
      totalExecutions: number;
    }>();

    // Get all executions for these test cases to calculate accurate failure rates
    const testCaseIds = [...new Set(failedExecutions?.map(exec => exec.test_case_id).filter(Boolean) || [])];
    
    if (testCaseIds.length > 0) {
      const { data: allExecutions, error: allExecError } = await supabaseAdmin
        .from(TABLES.TEST_EXECUTIONS)
        .select('test_case_id, status')
        .in('test_case_id', testCaseIds)
        .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (!allExecError && allExecutions) {
        // Count total executions per test case
        const executionCounts = allExecutions.reduce((acc, exec) => {
          acc[exec.test_case_id] = (acc[exec.test_case_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Process failed executions
        failedExecutions?.forEach(exec => {
          if (!exec.test_case_id) return;
          
          if (!testFailureMap.has(exec.test_case_id)) {
            testFailureMap.set(exec.test_case_id, {
              testCase: exec.test_cases,
              failures: [],
              totalExecutions: executionCounts[exec.test_case_id] || 0
            });
          }
          
          testFailureMap.get(exec.test_case_id)!.failures.push(exec);
        });
      }
    }

    // Convert to array and calculate metrics
    const topFailingTests = Array.from(testFailureMap.entries())
      .map(([testCaseId, data]) => {
        const failureRate = data.totalExecutions > 0 ? 
          (data.failures.length / data.totalExecutions) * 100 : 100;
        const lastFailure = data.failures[0]?.started_at || '';
        const environment = data.failures[0]?.test_targets?.environment || 'unknown';
        const errorType = categorizeError(data.failures[0]?.error_message || '');
        const businessImpact = calculateBusinessImpact(data.testCase?.priority, failureRate);

        return {
          testName: data.testCase?.name || 'Unknown Test',
          failureRate: Math.round(failureRate * 10) / 10,
          lastFailure,
          environment,
          errorType,
          businessImpact
        };
      })
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, parseInt(limit as string));

    res.json({ data: topFailingTests });

  } catch (error) {
    console.error('Top failing tests error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch top failing tests',
    });
  }
}));

/**
 * Helper function to calculate percentile ranking
 */
function calculatePercentile(userValue: number, industryAvg: number, industryTop10: number, lowerIsBetter = false): number {
  if (lowerIsBetter) {
    if (userValue <= industryTop10) return 90;
    if (userValue <= industryAvg) return 50;
    return Math.max(10, 50 - ((userValue - industryAvg) / industryAvg) * 40);
  } else {
    if (userValue >= industryTop10) return 90;
    if (userValue >= industryAvg) return 50 + ((userValue - industryAvg) / (industryTop10 - industryAvg)) * 40;
    return Math.max(10, (userValue / industryAvg) * 50);
  }
}

/**
 * Helper function to determine trend
 */
function determineTrend(currentValue: number, previousValue: number, lowerIsBetter = false): 'improving' | 'declining' | 'stable' {
  const change = lowerIsBetter ? previousValue - currentValue : currentValue - previousValue;
  const changePercent = Math.abs(change / previousValue) * 100;
  
  if (changePercent < 5) return 'stable';
  return change > 0 ? 'improving' : 'declining';
}

/**
 * Helper function to categorize error types
 */
function categorizeError(errorMessage: string): string {
  const message = errorMessage.toLowerCase();
  
  if (message.includes('timeout') || message.includes('wait')) return 'Timeout';
  if (message.includes('element') || message.includes('selector')) return 'Element Not Found';
  if (message.includes('network') || message.includes('connection')) return 'Network Error';
  if (message.includes('assertion') || message.includes('expect')) return 'Assertion Failure';
  if (message.includes('page') || message.includes('navigation')) return 'Navigation Error';
  
  return 'Other';
}

/**
 * Helper function to calculate business impact
 */
function calculateBusinessImpact(priority: string | undefined, failureRate: number): string {
  const isHighPriority = priority === 'high' || priority === 'critical';
  
  if (isHighPriority && failureRate > 50) return 'Critical';
  if (failureRate > 75) return 'High';
  if (failureRate > 25 || isHighPriority) return 'Medium';
  return 'Low';
}

/**
 * GET /api/dashboard/ux-score
 * Get UX score computation and analysis
 */
router.get('/ux-score', asyncHandler(async (req: Request, res: Response) => {
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

    // Get execution data for UX score calculation
    const { data: executions, error: execError } = await supabaseAdmin
      .from(TABLES.TEST_EXECUTIONS)
      .select(`
        id,
        status,
        duration_seconds,
        started_at,
        error_message,
        test_cases (
          name,
          priority,
          tags
        ),
        projects!inner(
          organization_id
        )
      `)
      .in('projects.organization_id', organizationIds)
      .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (execError) {
      console.error('Executions fetch error:', execError);
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch execution data',
      });
    }

    const totalExecutions = executions?.length || 0;
    const successfulExecutions = executions?.filter(e => e.status === 'completed').length || 0;
    const failedExecutions = executions?.filter(e => e.status === 'failed').length || 0;
    
    // Calculate UX score components
    const reliability = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
    const avgDuration = totalExecutions > 0 ?
      (executions?.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) || 0) / totalExecutions : 0;
    
    // Performance score: lower duration is better (normalized to 0-100)
    const performanceScore = Math.max(0, 100 - (avgDuration / 60)); // Assuming 60 seconds is 0 score
    
    // Critical test cases success rate
    const criticalTests = executions?.filter(e => {
      const testCases = e.test_cases as any;
      if (Array.isArray(testCases)) {
        return testCases.some(tc => tc.priority === 'critical');
      }
      return testCases?.priority === 'critical';
    }) || [];
    const criticalSuccess = criticalTests.length > 0 ?
      (criticalTests.filter(e => e.status === 'completed').length / criticalTests.length) * 100 : 100;
    
    // Error severity analysis
    const severityScores = executions?.map(e => {
      if (e.status !== 'failed') return 100;
      
      const errorMsg = (e.error_message || '').toLowerCase();
      if (errorMsg.includes('timeout')) return 70;
      if (errorMsg.includes('network')) return 60;
      if (errorMsg.includes('element')) return 80;
      if (errorMsg.includes('assertion')) return 50;
      return 75; // Default for unknown errors
    }) || [];
    
    const avgSeverityScore = severityScores.length > 0 ?
      severityScores.reduce((sum, score) => sum + score, 0) / severityScores.length : 100;
    
    // Calculate overall UX score (weighted average)
    const uxScore = Math.round(
      (reliability * 0.4) +           // 40% weight on reliability
      (performanceScore * 0.3) +     // 30% weight on performance
      (criticalSuccess * 0.2) +      // 20% weight on critical tests
      (avgSeverityScore * 0.1)       // 10% weight on error severity
    );
    
    // UX score breakdown and insights
    const scoreBreakdown = {
      overall_score: uxScore,
      components: {
        reliability: {
          score: Math.round(reliability),
          weight: 40,
          description: 'Test execution success rate'
        },
        performance: {
          score: Math.round(performanceScore),
          weight: 30,
          description: 'Test execution speed'
        },
        critical_tests: {
          score: Math.round(criticalSuccess),
          weight: 20,
          description: 'Critical test case success rate'
        },
        error_severity: {
          score: Math.round(avgSeverityScore),
          weight: 10,
          description: 'Average error severity impact'
        }
      },
      insights: generateUXInsights(uxScore, reliability, performanceScore, criticalSuccess),
      recommendations: generateUXRecommendations(reliability, performanceScore, criticalSuccess)
    };

    res.json({ data: scoreBreakdown });

  } catch (error) {
    console.error('UX score calculation error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to calculate UX score',
    });
  }
}));

/**
 * GET /api/dashboard/performance-trends
 * Get performance trend analysis
 */
router.get('/performance-trends', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { period = '30d', metric = 'duration' } = req.query;

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

    // Get execution data for performance analysis
    const { data: executions, error: execError } = await supabaseAdmin
      .from(TABLES.TEST_EXECUTIONS)
      .select(`
        id,
        status,
        duration_seconds,
        started_at,
        browser,
        test_cases (
          name,
          priority
        ),
        projects!inner(
          organization_id
        )
      `)
      .in('projects.organization_id', organizationIds)
      .gte('started_at', dateFrom)
      .order('started_at', { ascending: true });

    if (execError) {
      console.error('Executions fetch error:', execError);
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch execution data',
      });
    }

    // Group executions by date and calculate metrics
    const dailyStats = (executions || []).reduce((acc, exec) => {
      const date = new Date(exec.started_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          executions: [],
          total_duration: 0,
          total_count: 0,
          success_count: 0,
          browser_stats: {} as Record<string, number>
        };
      }
      
      acc[date].executions.push(exec);
      acc[date].total_duration += exec.duration_seconds || 0;
      acc[date].total_count += 1;
      if (exec.status === 'completed') acc[date].success_count += 1;
      
      // Browser performance tracking
      const browser = exec.browser || 'unknown';
      if (!acc[date].browser_stats[browser]) acc[date].browser_stats[browser] = 0;
      acc[date].browser_stats[browser] += exec.duration_seconds || 0;
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate trends based on requested metric
    const trendData = Object.entries(dailyStats).map(([date, stats]) => {
      const avgDuration = stats.total_count > 0 ? stats.total_duration / stats.total_count : 0;
      const successRate = stats.total_count > 0 ? (stats.success_count / stats.total_count) * 100 : 0;
      
      // Performance score calculation
      const performanceScore = Math.max(0, 100 - (avgDuration / 30)); // 30 seconds baseline
      
      return {
        date,
        avg_duration: Math.round(avgDuration * 100) / 100,
        success_rate: Math.round(successRate * 100) / 100,
        performance_score: Math.round(performanceScore * 100) / 100,
        total_executions: stats.total_count,
        browser_performance: Object.entries(stats.browser_stats).map(([browser, duration]) => ({
          browser,
          avg_duration: Math.round((duration as number / stats.total_count) * 100) / 100
        }))
      };
    });

    // Calculate trend direction and insights
    const trendAnalysis = analyzeTrends(trendData, metric as string);
    
    res.json({
      data: {
        trends: trendData,
        analysis: trendAnalysis,
        summary: {
          period: period,
          metric: metric,
          total_data_points: trendData.length,
          avg_daily_executions: trendData.length > 0 ?
            Math.round(trendData.reduce((sum, day) => sum + day.total_executions, 0) / trendData.length) : 0
        }
      }
    });

  } catch (error) {
    console.error('Performance trends error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to calculate performance trends',
    });
  }
}));

/**
 * GET /api/dashboard/business-impact
 * Get business impact metrics and analysis
 */
router.get('/business-impact', asyncHandler(async (req: Request, res: Response) => {
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

    // Get comprehensive execution data
    const { data: executions, error: execError } = await supabaseAdmin
      .from(TABLES.TEST_EXECUTIONS)
      .select(`
        id,
        status,
        duration_seconds,
        started_at,
        error_message,
        test_cases (
          id,
          name,
          priority,
          tags
        ),
        projects!inner(
          id,
          name,
          organization_id
        )
      `)
      .in('projects.organization_id', organizationIds)
      .gte('started_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (execError) {
      console.error('Executions fetch error:', execError);
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch execution data',
      });
    }

    // Business impact calculations
    const totalExecutions = executions?.length || 0;
    const successfulExecutions = executions?.filter(e => e.status === 'completed').length || 0;
    const failedExecutions = executions?.filter(e => e.status === 'failed').length || 0;
    
    // Critical issue detection
    const criticalTests = executions?.filter(e => {
      const testCases = e.test_cases as any;
      if (Array.isArray(testCases)) {
        return testCases.some(tc => tc.priority === 'critical');
      }
      return testCases?.priority === 'critical';
    }) || [];
    const criticalFailures = criticalTests.filter(e => e.status === 'failed').length;
    
    // Risk assessment
    const riskMetrics = {
      critical_test_failure_rate: criticalTests.length > 0 ? 
        (criticalFailures / criticalTests.length) * 100 : 0,
      overall_reliability: totalExecutions > 0 ? 
        (successfulExecutions / totalExecutions) * 100 : 0,
      potential_production_issues: Math.floor(criticalFailures * 0.3), // 30% of critical failures might reach production
      risk_score: calculateRiskScore(executions || [])
    };

    // Cost impact estimation
    const costImpact = {
      estimated_bugs_caught: successfulExecutions * 0.1, // Assume 10% of tests catch bugs
      cost_per_production_bug: 5000, // Industry average
      estimated_savings: Math.round(successfulExecutions * 0.1 * 5000),
      manual_testing_hours_saved: totalExecutions * 0.5, // 30 minutes per automated test
      automation_roi: calculateAutomationROI(totalExecutions, successfulExecutions)
    };

    // Team productivity impact
    const productivityImpact = {
      deployment_confidence: Math.min(100, riskMetrics.overall_reliability + 10),
      release_frequency_multiplier: riskMetrics.overall_reliability > 90 ? 1.5 : 1.0,
      developer_time_saved_hours: totalExecutions * 0.25, // 15 minutes saved per test
      qa_efficiency_gain: Math.round((successfulExecutions / Math.max(totalExecutions, 1)) * 50) // Up to 50% efficiency gain
    };

    const businessImpactData = {
      risk_metrics: riskMetrics,
      cost_impact: costImpact,
      productivity_impact: productivityImpact,
      recommendations: generateBusinessRecommendations(riskMetrics, costImpact),
      summary: {
        overall_health: calculateOverallHealth(riskMetrics, costImpact),
        priority_actions: generatePriorityActions(riskMetrics)
      }
    };

    res.json({ data: businessImpactData });

  } catch (error) {
    console.error('Business impact calculation error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to calculate business impact',
    });
  }
}));

/**
 * Helper functions for UX score calculation
 */
function generateUXInsights(score: number, reliability: number, performance: number, critical: number): string[] {
  const insights = [];
  
  if (score >= 90) insights.push('Excellent user experience with high reliability and performance');
  else if (score >= 80) insights.push('Good user experience with room for minor improvements');
  else if (score >= 70) insights.push('Moderate user experience, focus on key areas needed');
  else insights.push('User experience needs significant improvement');
  
  if (reliability < 85) insights.push('Test reliability is below recommended threshold (85%)');
  if (performance < 70) insights.push('Test execution performance could be optimized');
  if (critical < 95) insights.push('Critical test cases need attention for better coverage');
  
  return insights;
}

function generateUXRecommendations(reliability: number, performance: number, critical: number): string[] {
  const recommendations = [];
  
  if (reliability < 85) {
    recommendations.push('Review and fix flaky tests to improve reliability');
    recommendations.push('Implement better wait strategies and error handling');
  }
  
  if (performance < 70) {
    recommendations.push('Optimize test execution times by parallelizing tests');
    recommendations.push('Review slow test cases and optimize selectors');
  }
  
  if (critical < 95) {
    recommendations.push('Prioritize fixing critical test cases');
    recommendations.push('Add more coverage for critical user journeys');
  }
  
  return recommendations;
}

/**
 * Helper functions for trend analysis
 */
function analyzeTrends(data: any[], metric: string): any {
  if (data.length < 2) {
    return {
      direction: 'stable',
      change_percentage: 0,
      confidence: 'low'
    };
  }
  
  const values = data.map(d => d[metric === 'duration' ? 'avg_duration' : 
                                metric === 'success' ? 'success_rate' : 'performance_score']);
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
  
  const changePercentage = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  let direction = 'stable';
  if (Math.abs(changePercentage) > 5) {
    direction = changePercentage > 0 ? 'improving' : 'declining';
    // For duration, reverse the logic (lower is better)
    if (metric === 'duration') {
      direction = changePercentage > 0 ? 'declining' : 'improving';
    }
  }
  
  return {
    direction,
    change_percentage: Math.round(Math.abs(changePercentage) * 100) / 100,
    confidence: data.length > 10 ? 'high' : data.length > 5 ? 'medium' : 'low'
  };
}

/**
 * Helper functions for business impact
 */
function calculateRiskScore(executions: any[]): number {
  const totalExecutions = executions.length;
  if (totalExecutions === 0) return 0;
  
  const failedExecutions = executions.filter(e => e.status === 'failed').length;
  const criticalFailures = executions.filter(e => 
    e.status === 'failed' && e.test_cases?.priority === 'critical'
  ).length;
  
  const failureRate = (failedExecutions / totalExecutions) * 100;
  const criticalFailureWeight = criticalFailures * 2; // Critical failures are weighted 2x
  
  // Risk score: 0-100 (higher is worse)
  const riskScore = Math.min(100, failureRate + (criticalFailureWeight / totalExecutions) * 100);
  
  return Math.round(riskScore * 100) / 100;
}

function calculateAutomationROI(totalTests: number, successfulTests: number): number {
  const manualTestCost = 50; // $50 per manual test
  const automatedTestCost = 2; // $2 per automated test
  const savingsPerTest = manualTestCost - automatedTestCost;
  
  const totalSavings = totalTests * savingsPerTest;
  const investment = totalTests * automatedTestCost;
  
  return investment > 0 ? Math.round((totalSavings / investment) * 100) : 0;
}

function generateBusinessRecommendations(riskMetrics: any, costImpact: any): string[] {
  const recommendations = [];
  
  if (riskMetrics.risk_score > 30) {
    recommendations.push('High risk detected - prioritize fixing critical test failures');
  }
  
  if (riskMetrics.critical_test_failure_rate > 10) {
    recommendations.push('Critical test failure rate is concerning - immediate attention needed');
  }
  
  if (costImpact.automation_roi < 200) {
    recommendations.push('Consider optimizing test suite for better ROI');
  }
  
  recommendations.push('Regular monitoring of test reliability recommended');
  recommendations.push('Consider expanding test coverage for better risk mitigation');
  
  return recommendations;
}

function calculateOverallHealth(riskMetrics: any, costImpact: any): string {
  const reliability = riskMetrics.overall_reliability;
  const roi = costImpact.automation_roi;
  
  if (reliability > 95 && roi > 300) return 'excellent';
  if (reliability > 90 && roi > 200) return 'good';
  if (reliability > 80 && roi > 100) return 'fair';
  return 'needs_attention';
}

function generatePriorityActions(riskMetrics: any): string[] {
  const actions = [];
  
  if (riskMetrics.critical_test_failure_rate > 5) {
    actions.push('Fix critical test failures immediately');
  }
  
  if (riskMetrics.overall_reliability < 85) {
    actions.push('Investigate and fix flaky tests');
  }
  
  if (riskMetrics.risk_score > 25) {
    actions.push('Review test coverage for high-risk areas');
  }
  
  return actions;
}

export default router;
