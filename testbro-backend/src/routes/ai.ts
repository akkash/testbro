import express, { Request, Response } from 'express';
import { supabaseAdmin, TABLES } from '../config/database';
import { authenticate, requireProjectAccess } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { aiService } from '../services/aiService';
import { AIGenerateTestRequest } from '../types';

const router = express.Router();

// Apply authentication to all routes (supports both JWT and API key)
router.use(authenticate);

/**
 * POST /api/ai/generate-test
 * Generate test case using AI
 */
router.post('/generate-test', validate(schemas.generateTest), requireProjectAccess, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const request: AIGenerateTestRequest = req.body;

  try {
    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabaseAdmin
      .from(TABLES.PROJECTS)
      .select('id, name, organization_id')
      .eq('id', request.project_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    // Verify target exists
    const { data: target, error: targetError } = await supabaseAdmin
      .from('test_targets')
      .select('*')
      .eq('id', request.target_id)
      .eq('project_id', request.project_id)
      .single();

    if (targetError || !target) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Test target not found',
      });
    }

    // Generate test using AI
    const result = await aiService.generateTest({
      ...request,
      target_url: target.url,
    });

    // Save AI-generated test case
    const testCaseData = {
      ...result.testCase,
      project_id: request.project_id,
      target_id: request.target_id,
      suite_id: null,
      created_by: userId,
      status: 'draft', // AI-generated tests start as drafts
    };

    const { data: savedTestCase, error: saveError } = await supabaseAdmin
      .from('test_cases')
      .insert(testCaseData)
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save AI-generated test case:', saveError);
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: 'Failed to save generated test case',
      });
    }

    // Log AI usage for analytics
    await logAIUsage(userId, request, result.metadata);

    res.json({
      data: {
        test_case: savedTestCase,
        metadata: result.metadata,
      },
      message: 'Test case generated successfully',
    });

  } catch (error) {
    console.error('AI test generation error:', error);
    res.status(500).json({
      error: 'AI_GENERATION_FAILED',
      message: 'Failed to generate test case using AI',
    });
  }
}));

/**
 * POST /api/ai/analyze-execution
 * Analyze test execution results using AI
 */
router.post('/analyze-execution', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { execution_id } = req.body;

  if (!execution_id) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Execution ID is required',
    });
  }

  try {
    // Verify execution exists and user has access
    const { data: execution, error: execError } = await supabaseAdmin
      .from(TABLES.TEST_EXECUTIONS)
      .select(`
        *,
        projects (
          id,
          name,
          organization_id
        )
      `)
      .eq('id', execution_id)
      .single();

    if (execError || !execution) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Execution not found',
      });
    }

    // Check user access to the project
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', execution.projects.organization_id)
      .single();

    if (!membership) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Access denied to this execution',
      });
    }

    // Get execution logs
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('execution_logs')
      .select('*')
      .eq('execution_id', execution_id)
      .order('timestamp', { ascending: true });

    if (logsError) {
      console.error('Failed to fetch execution logs:', logsError);
    }

    // Get screenshots from logs
    const screenshots = logs
      ?.filter(log => log.metadata?.screenshot_url)
      .map(log => log.metadata.screenshot_url) || [];

    // Analyze execution
    const analysis = await aiService.analyzeExecution(
      execution,
      logs || [],
      screenshots
    );

    // Save analysis results
    const insightData = {
      execution_id,
      type: 'ux',
      severity: analysis.score >= 80 ? 'low' : analysis.score >= 60 ? 'medium' : 'high',
      title: 'AI Execution Analysis',
      description: analysis.recommendations.join('\n'),
      suggestion: analysis.recommendations.join('\n'),
      confidence_score: analysis.score / 100,
      created_at: new Date().toISOString(),
    };

    const { error: insightError } = await supabaseAdmin
      .from('ai_insights')
      .insert(insightData);

    if (insightError) {
      console.error('Failed to save AI insights:', insightError);
    }

    // Save UX score
    const uxScoreData = {
      execution_id,
      overall_score: analysis.score,
      dimensions: {
        clarity: 0,
        accessibility: 0,
        performance: 0,
        consistency: 0,
        error_handling: 0,
      },
      critical_issues: analysis.insights.filter(i => i.severity === 'critical'),
      recommendations: analysis.recommendations,
      created_at: new Date().toISOString(),
    };

    const { error: uxError } = await supabaseAdmin
      .from('ux_scores')
      .insert(uxScoreData);

    if (uxError) {
      console.error('Failed to save UX score:', uxError);
    }

    // Log AI usage
    await logAIUsage(userId, { type: 'analysis', execution_id }, {
      prompt: 'Execution analysis',
      model: 'gpt-4',
      confidence_score: analysis.score / 100,
      tokens_used: 0,
    });

    res.json({
      data: {
        insights: analysis.insights,
        recommendations: analysis.recommendations,
        score: analysis.score,
        execution_id,
      },
      message: 'Execution analyzed successfully',
    });

  } catch (error) {
    console.error('AI execution analysis error:', error);
    res.status(500).json({
      error: 'AI_ANALYSIS_FAILED',
      message: 'Failed to analyze execution using AI',
    });
  }
}));

/**
 * POST /api/ai/optimize-selectors
 * Generate optimized selectors for a target
 */
router.post('/optimize-selectors', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { target_id, html_content } = req.body;

  if (!target_id || !html_content) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Target ID and HTML content are required',
    });
  }

  try {
    // Verify target exists and user has access
    const { data: target, error: targetError } = await supabaseAdmin
      .from('test_targets')
      .select(`
        *,
        projects (
          id,
          name,
          organization_id
        )
      `)
      .eq('id', target_id)
      .single();

    if (targetError || !target) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Test target not found',
      });
    }

    // Check user access to the project
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', target.projects.organization_id)
      .single();

    if (!membership) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Access denied to this target',
      });
    }

    // Generate optimized selectors
    const result = await aiService.optimizeSelectors(
      html_content,
      target.url
    );

    // Log AI usage
    await logAIUsage(userId, { type: 'selector_optimization', target_id }, {
      prompt: 'Selector optimization',
      model: 'gpt-3.5-turbo',
      confidence_score: 0.8,
      tokens_used: 0,
    });

    res.json({
      data: result,
      message: 'Selectors optimized successfully',
    });

  } catch (error) {
    console.error('AI selector optimization error:', error);
    res.status(500).json({
      error: 'AI_OPTIMIZATION_FAILED',
      message: 'Failed to optimize selectors using AI',
    });
  }
}));

/**
 * GET /api/ai/models
 * Get available AI models
 */
router.get('/models', asyncHandler(async (req: Request, res: Response) => {
  const models = [
            {
            id: 'openai/gpt-4',
            name: 'GPT-4',
            description: 'Most capable model for complex test generation',
            context_window: 8192,
            capabilities: ['test_generation', 'analysis', 'optimization'],
            cost_per_1k_tokens: 0.03,
        },
        {
            id: 'openai/gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            description: 'Fast and cost-effective for simpler tasks',
            context_window: 4096,
            capabilities: ['test_generation', 'optimization'],
            cost_per_1k_tokens: 0.002,
        },
        {
            id: 'anthropic/claude-3-haiku',
            name: 'Claude 3 Haiku',
            description: 'Fast and efficient model for test generation',
            context_window: 200000,
            capabilities: ['test_generation', 'analysis'],
            cost_per_1k_tokens: 0.00025,
        },
        {
            id: 'anthropic/claude-3-sonnet',
            name: 'Claude 3 Sonnet',
            description: 'Balanced model for complex analysis',
            context_window: 200000,
            capabilities: ['test_generation', 'analysis', 'optimization'],
            cost_per_1k_tokens: 0.003,
        },
  ];

  res.json({
    data: models,
    message: 'Available AI models retrieved successfully',
  });
}));

/**
 * POST /api/ai/generate-test-steps
 * Generate test steps from natural language prompt (Phase 1 enhancement)
 */
router.post('/generate-test-steps', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { prompt, context, target_url, project_id, model } = req.body;

  if (!prompt) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Prompt is required',
    });
  }

  try {
    const startTime = Date.now();
    
    // Generate test steps using enhanced AI service
    const result = await aiService.generateTestSteps({
      prompt,
      context,
      target_url,
      project_id,
      model,
    });

    const processingTime = Date.now() - startTime;

    // Log AI generation to database
    await aiService.logGeneration({
      user_id: userId,
      prompt,
      request_type: 'test_step_generation',
      project_id,
      model_used: result.metadata.model,
      response_content: result.steps,
      confidence_score: result.confidence_score,
      tokens_used: result.metadata.tokens_used,
      processing_time_ms: processingTime,
      metadata: result.metadata,
    });

    res.json({
      data: {
        steps: result.steps,
        confidence_score: result.confidence_score,
        metadata: result.metadata,
      },
      message: 'Test steps generated successfully',
    });

  } catch (error) {
    console.error('AI test step generation error:', error);
    res.status(500).json({
      error: 'AI_GENERATION_FAILED',
      message: 'Failed to generate test steps using AI',
    });
  }
}));

/**
 * POST /api/ai/analyze-requirements
 * Analyze requirements and suggest test scenarios (Phase 1 enhancement)
 */
router.post('/analyze-requirements', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { requirements, context, project_id } = req.body;

  if (!requirements) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Requirements text is required',
    });
  }

  try {
    const startTime = Date.now();
    
    // Analyze requirements using AI service
    const result = await aiService.analyzeRequirements(requirements, context);

    const processingTime = Date.now() - startTime;

    // Log AI generation to database
    await aiService.logGeneration({
      user_id: userId,
      prompt: requirements,
      request_type: 'requirement_analysis',
      project_id,
      model_used: result.metadata.model,
      response_content: {
        scenarios: result.scenarios,
        coverage_analysis: result.coverage_analysis,
        priority_recommendations: result.priority_recommendations,
      },
      tokens_used: result.metadata.tokens_used,
      processing_time_ms: processingTime,
      metadata: result.metadata,
    });

    res.json({
      data: {
        scenarios: result.scenarios,
        coverage_analysis: result.coverage_analysis,
        priority_recommendations: result.priority_recommendations,
        metadata: result.metadata,
      },
      message: 'Requirements analyzed successfully',
    });

  } catch (error) {
    console.error('AI requirements analysis error:', error);
    res.status(500).json({
      error: 'AI_ANALYSIS_FAILED',
      message: 'Failed to analyze requirements using AI',
    });
  }
}));

/**
 * GET /api/ai/generation-history
 * Get AI generation history for user (Phase 1 enhancement)
 */
router.get('/generation-history', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { 
    limit, 
    offset, 
    request_type, 
    project_id 
  } = req.query;

  try {
    const result = await aiService.getGenerationHistory(userId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      request_type: request_type as string,
      project_id: project_id as string,
    });

    res.json({
      data: result.generations,
      meta: {
        total: result.total,
        pagination: result.metadata,
      },
      message: 'Generation history retrieved successfully',
    });

  } catch (error) {
    console.error('Failed to get AI generation history:', error);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to retrieve generation history',
    });
  }
}));

/**
 * GET /api/ai/usage
 * Get AI usage statistics for user
 */
router.get('/usage', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { period = '30d' } = req.query;

  try {
    // Get AI generation history from new database table
    const result = await aiService.getGenerationHistory(userId, {
      limit: 100,
    });

    const generations = result.generations.filter(gen => {
      const created = new Date(gen.created_at);
      const cutoff = new Date(getDateFromPeriod(period as string));
      return created >= cutoff;
    });

    // Calculate statistics
    const stats = {
      total_requests: generations.length,
      total_tokens: generations.reduce((sum, gen) => sum + (gen.tokens_used || 0), 0),
      average_confidence: generations.length ?
        generations.reduce((sum, gen) => sum + (gen.confidence_score || 0), 0) / generations.length : 0,
      requests_by_type: generations.reduce((acc, gen) => {
        const type = gen.request_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recent_requests: generations.slice(0, 10),
      processing_time_stats: {
        average_ms: generations.length ?
          generations.reduce((sum, gen) => sum + (gen.processing_time_ms || 0), 0) / generations.length : 0,
        fastest_ms: Math.min(...generations.map(gen => gen.processing_time_ms || 0).filter(t => t > 0)),
        slowest_ms: Math.max(...generations.map(gen => gen.processing_time_ms || 0)),
      },
    };

    res.json({
      data: stats,
      message: 'AI usage statistics retrieved successfully',
    });

  } catch (error) {
    console.error('Failed to get AI usage:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch AI usage statistics',
    });
  }
}));

/**
 * Helper function to log AI usage
 */
async function logAIUsage(
  userId: string,
  request: any,
  metadata: {
    prompt: string;
    model: string;
    confidence_score: number;
    tokens_used: number;
  }
) {
  try {
    const { error } = await supabaseAdmin
      .from('ai_usage_logs')
      .insert({
        user_id: userId,
        request_type: request.type || 'test_generation',
        request_data: request,
        model: metadata.model,
        prompt: metadata.prompt,
        confidence_score: metadata.confidence_score,
        tokens_used: metadata.tokens_used,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to log AI usage:', error);
    }
  } catch (error) {
    console.error('AI usage logging error:', error);
  }
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

export default router;
