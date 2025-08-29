import express, { Request, Response } from 'express';
import { supabaseAdmin } from '../config/database';
import { authenticateUser, requireProjectAccess, requireRole } from '../middleware/auth';
import { validate, validateParams, paramSchemas } from '../middleware/validation';
import { schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { paginationService } from '../services/paginationService';
import { databaseService } from '../services/databaseService';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateUser);

/**
 * GET /api/test-cases
 * Get test cases with filtering and pagination
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    page = 1,
    limit = 20,
    project_id,
    suite_id,
    target_id,
    status,
    priority,
    ai_generated,
    tags,
    search,
    sort_by = 'updated_at',
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
    .from('test_cases')
    .select(`
      *,
      projects (
        id,
        name,
        organization_id
      ),
      test_targets (
        id,
        name,
        url
      )
    `)
    .in('projects.organization_id', organizationIds);

  // Apply filters
  if (project_id) {
    query = query.eq('project_id', project_id);
  }

  if (suite_id) {
    query = query.eq('suite_id', suite_id);
  }

  if (target_id) {
    query = query.eq('target_id', target_id);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (priority) {
    query = query.eq('priority', priority);
  }

  if (ai_generated !== undefined) {
    query = query.eq('ai_generated', ai_generated === 'true');
  }

  if (tags) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    query = query.contains('tags', tagArray);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // Apply sorting
  const validSortFields = ['name', 'created_at', 'updated_at', 'priority'];
  const sortField = validSortFields.includes(sort_by as string) ? sort_by : 'updated_at';
  const sortDirection = sort_order === 'asc' ? { ascending: true } : { ascending: false };

  query = query.order(sortField as any, sortDirection);

  // Apply pagination
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  query = query.range(offset, offset + parseInt(limit as string) - 1);

  const { data: testCases, error, count } = await query;

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch test cases',
    });
  }

  res.json({
    data: testCases,
    meta: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: count,
      total_pages: Math.ceil((count || 0) / parseInt(limit as string)),
    },
  });
}));

/**
 * GET /api/test-cases/:id
 * Get test case by ID
 */
router.get('/:id', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const { data: testCase, error } = await supabaseAdmin
    .from('test_cases')
    .select(`
      *,
      projects (
        id,
        name,
        organization_id
      ),
      test_targets (
        id,
        name,
        url,
        platform
      ),
      test_suites (
        id,
        name
      )
    `)
    .eq('id', id)
    .single();

  if (error || !testCase) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test case not found',
    });
  }

  // Check user access
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', testCase.projects.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this test case',
    });
  }

  res.json({ data: testCase });
}));

/**
 * POST /api/test-cases
 * Create new test case
 */
router.post('/', validate(schemas.createTestCase), requireProjectAccess, requireRole('editor'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const testCaseData = req.body;

  // Verify target belongs to project
  const { data: target, error: targetError } = await supabaseAdmin
    .from('test_targets')
    .select('id')
    .eq('id', testCaseData.target_id)
    .eq('project_id', testCaseData.project_id)
    .single();

  if (targetError || !target) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Test target not found or does not belong to the specified project',
    });
  }

  // Verify suite belongs to project (if provided)
  if (testCaseData.suite_id) {
    const { data: suite, error: suiteError } = await supabaseAdmin
      .from('test_suites')
      .select('id')
      .eq('id', testCaseData.suite_id)
      .eq('project_id', testCaseData.project_id)
      .single();

    if (suiteError || !suite) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Test suite not found or does not belong to the specified project',
      });
    }
  }

  const { data: testCase, error } = await supabaseAdmin
    .from('test_cases')
    .insert({
      ...testCaseData,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to create test case',
    });
  }

  res.status(201).json({
    data: testCase,
    message: 'Test case created successfully',
  });
}));

/**
 * PUT /api/test-cases/:id
 * Update test case
 */
router.put('/:id', validateParams(paramSchemas.id), validate(schemas.createTestCase), requireRole('editor'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const updateData = req.body;

  // First get the test case to check access
  const { data: existingTestCase, error: fetchError } = await supabaseAdmin
    .from('test_cases')
    .select(`
      project_id,
      projects (
        organization_id
      )
    `)
    .eq('id', id)
    .single();

  if (fetchError || !existingTestCase) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test case not found',
    });
  }

  // Check user access
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', (existingTestCase as any).projects?.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this test case',
    });
  }

  const { data: testCase, error } = await supabaseAdmin
    .from('test_cases')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to update test case',
    });
  }

  res.json({
    data: testCase,
    message: 'Test case updated successfully',
  });
}));

/**
 * DELETE /api/test-cases/:id
 * Delete test case
 */
router.delete('/:id', validateParams(paramSchemas.id), requireRole('editor'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // First get the test case to check access
  const { data: existingTestCase, error: fetchError } = await supabaseAdmin
    .from('test_cases')
    .select(`
      project_id,
      projects (
        organization_id
      )
    `)
    .eq('id', id)
    .single();

  if (fetchError || !existingTestCase) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test case not found',
    });
  }

  // Check user access
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', (existingTestCase as any).projects?.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this test case',
    });
  }

  const { error } = await supabaseAdmin
    .from('test_cases')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to delete test case',
    });
  }

  res.json({
    message: 'Test case deleted successfully',
  });
}));

/**
 * GET /api/test-cases/:id/versions
 * Get test case version history
 */
router.get('/:id/versions', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // This would require a versions table in a production system
  // For now, return the current version
  const { data: testCase, error } = await supabaseAdmin
    .from('test_cases')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !testCase) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test case not found',
    });
  }

  res.json({
    data: [{
      version: 1,
      test_case: testCase,
      created_at: testCase.created_at,
      created_by: testCase.created_by,
    }],
  });
}));

/**
 * POST /api/test-cases/:id/duplicate
 * Duplicate test case
 */
router.post('/:id/duplicate', validateParams(paramSchemas.id), requireRole('editor'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { name, description } = req.body;

  // Get original test case
  const { data: originalTestCase, error: fetchError } = await supabaseAdmin
    .from('test_cases')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !originalTestCase) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test case not found',
    });
  }

  // Create duplicate
  const { data: duplicatedTestCase, error } = await supabaseAdmin
    .from('test_cases')
    .insert({
      name: name || `${originalTestCase.name} (Copy)`,
      description: description || originalTestCase.description,
      project_id: originalTestCase.project_id,
      suite_id: originalTestCase.suite_id,
      target_id: originalTestCase.target_id,
      steps: originalTestCase.steps,
      tags: originalTestCase.tags,
      priority: originalTestCase.priority,
      status: 'draft', // Duplicates start as drafts
      ai_generated: false, // Duplicates are not AI-generated
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to duplicate test case',
    });
  }

  res.status(201).json({
    data: duplicatedTestCase,
    message: 'Test case duplicated successfully',
  });
}));

/**
 * PATCH /api/test-cases/:id/steps/:stepId
 * Update a specific step in a test case
 */
router.patch('/:id/steps/:stepId', validateParams(paramSchemas.idAndStepId), validate(schemas.updateTestStep), requireRole('editor'), asyncHandler(async (req: Request, res: Response) => {
  const { id, stepId } = req.params;
  const userId = req.user!.id;
  const updateData = req.body;

  // First get the test case to check access and current steps
  const { data: existingTestCase, error: fetchError } = await supabaseAdmin
    .from('test_cases')
    .select(`
      steps,
      project_id,
      projects (
        organization_id
      )
    `)
    .eq('id', id)
    .single();

  if (fetchError || !existingTestCase) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test case not found',
    });
  }

  // Check user access
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', (existingTestCase as any).projects?.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this test case',
    });
  }

  // Find and update the specific step
  const steps = existingTestCase.steps || [];
  const stepIndex = steps.findIndex((step: any) => step.id === stepId);
  
  if (stepIndex === -1) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test step not found',
    });
  }

  // Update the step with new data
  steps[stepIndex] = {
    ...steps[stepIndex],
    ...updateData,
    updated_at: new Date().toISOString(),
  };

  // Update the test case with modified steps
  const { data: testCase, error } = await supabaseAdmin
    .from('test_cases')
    .update({
      steps: steps,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to update test step',
    });
  }

  res.json({
    data: testCase,
    message: 'Test step updated successfully',
  });
}));

/**
 * DELETE /api/test-cases/:id/steps/:stepId
 * Delete a specific step from a test case
 */
router.delete('/:id/steps/:stepId', validateParams(paramSchemas.idAndStepId), requireRole('editor'), asyncHandler(async (req: Request, res: Response) => {
  const { id, stepId } = req.params;
  const userId = req.user!.id;

  // First get the test case to check access and current steps
  const { data: existingTestCase, error: fetchError } = await supabaseAdmin
    .from('test_cases')
    .select(`
      steps,
      project_id,
      projects (
        organization_id
      )
    `)
    .eq('id', id)
    .single();

  if (fetchError || !existingTestCase) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test case not found',
    });
  }

  // Check user access
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', (existingTestCase as any).projects?.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this test case',
    });
  }

  // Find and remove the specific step
  const steps = existingTestCase.steps || [];
  const stepIndex = steps.findIndex((step: any) => step.id === stepId);
  
  if (stepIndex === -1) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test step not found',
    });
  }

  // Remove the step
  steps.splice(stepIndex, 1);

  // Reorder remaining steps
  steps.forEach((step: any, index: number) => {
    step.order = index + 1;
  });

  // Update the test case with modified steps
  const { data: testCase, error } = await supabaseAdmin
    .from('test_cases')
    .update({
      steps: steps,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to delete test step',
    });
  }

  res.json({
    data: testCase,
    message: 'Test step deleted successfully',
  });
}));

/**
 * POST /api/test-cases/:id/steps
 * Add a new step to a test case
 */
router.post('/:id/steps', validateParams(paramSchemas.id), validate(schemas.createTestStep), requireRole('editor'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const newStep = req.body;

  // First get the test case to check access and current steps
  const { data: existingTestCase, error: fetchError } = await supabaseAdmin
    .from('test_cases')
    .select(`
      steps,
      project_id,
      projects (
        organization_id
      )
    `)
    .eq('id', id)
    .single();

  if (fetchError || !existingTestCase) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test case not found',
    });
  }

  // Check user access
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', (existingTestCase as any).projects?.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this test case',
    });
  }

  // Add the new step
  const steps = existingTestCase.steps || [];
  newStep.id = `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // Generate unique ID
  newStep.order = steps.length + 1; // Add at the end
  steps.push(newStep);

  // Update the test case with new step
  const { data: testCase, error } = await supabaseAdmin
    .from('test_cases')
    .update({
      steps: steps,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to add test step',
    });
  }

  res.status(201).json({
    data: testCase,
    message: 'Test step added successfully',
  });
}));

export default router;

// Helper functions for aggregation queries
async function getStatusBreakdown(organizationIds: string[], orgParams: string[]) {
  try {
    const query = `
      SELECT 
        tc.status,
        COUNT(*) as count
      FROM test_cases tc
      INNER JOIN projects p ON tc.project_id = p.id
      WHERE p.organization_id = ANY($1)
      GROUP BY tc.status
      ORDER BY count DESC
    `;
    const result = await databaseService.query(query, [organizationIds]);
    return result.rows;
  } catch (error) {
    console.error('Failed to get status breakdown:', error);
    return [];
  }
}

async function getPriorityBreakdown(organizationIds: string[], orgParams: string[]) {
  try {
    const query = `
      SELECT 
        tc.priority,
        COUNT(*) as count
      FROM test_cases tc
      INNER JOIN projects p ON tc.project_id = p.id
      WHERE p.organization_id = ANY($1)
      GROUP BY tc.priority
      ORDER BY 
        CASE tc.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END
    `;
    const result = await databaseService.query(query, [organizationIds]);
    return result.rows;
  } catch (error) {
    console.error('Failed to get priority breakdown:', error);
    return [];
  }
}

async function getAvgExecutionTimeByPriority(organizationIds: string[], orgParams: string[]) {
  try {
    const query = `
      SELECT 
        tc.priority,
        AVG(EXTRACT(EPOCH FROM (te.completed_at - te.started_at))) as avg_time_seconds,
        COUNT(te.id) as execution_count
      FROM test_cases tc
      INNER JOIN projects p ON tc.project_id = p.id
      INNER JOIN test_executions te ON tc.id = te.test_case_id
      WHERE p.organization_id = ANY($1)
        AND te.status = 'completed'
        AND te.completed_at IS NOT NULL
      GROUP BY tc.priority
      ORDER BY 
        CASE tc.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END
    `;
    const result = await databaseService.query(query, [organizationIds]);
    return result.rows.map(row => ({
      ...row,
      avg_time_seconds: parseFloat(row.avg_time_seconds || '0'),
      execution_count: parseInt(row.execution_count || '0'),
    }));
  } catch (error) {
    console.error('Failed to get avg execution time by priority:', error);
    return [];
  }
}
