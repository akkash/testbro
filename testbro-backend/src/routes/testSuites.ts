import express, { Request, Response } from 'express';
import { supabaseAdmin } from '../config/database';
import { authenticate, requireProjectAccess, requireRole } from '../middleware/auth';
import { validate, validateParams, paramSchemas } from '../middleware/validation';
import { schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Apply authentication to all routes (supports both JWT and API key)
router.use(authenticate);

/**
 * GET /api/test-suites
 * Get test suites with filtering and pagination
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    page = 1,
    limit = 20,
    project_id,
    target_id,
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
    .from('test_suites')
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

  if (target_id) {
    query = query.eq('target_id', target_id);
  }

  if (tags) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    query = query.contains('tags', tagArray);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // Apply sorting
  const validSortFields = ['name', 'created_at', 'updated_at'];
  const sortField = validSortFields.includes(sort_by as string) ? sort_by : 'updated_at';
  const sortDirection = sort_order === 'asc' ? { ascending: true } : { ascending: false };

  query = query.order(sortField as any, sortDirection);

  // Apply pagination
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  query = query.range(offset, offset + parseInt(limit as string) - 1);

  const { data: testSuites, error, count } = await query;

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch test suites',
    });
  }

  res.json({
    data: testSuites,
    meta: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: count,
      total_pages: Math.ceil((count || 0) / parseInt(limit as string)),
    },
  });
}));

/**
 * GET /api/test-suites/:id
 * Get test suite by ID
 */
router.get('/:id', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const { data: testSuite, error } = await supabaseAdmin
    .from('test_suites')
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
      test_cases (
        id,
        name,
        description,
        priority,
        status,
        steps,
        tags
      )
    `)
    .eq('id', id)
    .single();

  if (error || !testSuite) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test suite not found',
    });
  }

  // Check user access
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', testSuite.projects.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this test suite',
    });
  }

  res.json({ data: testSuite });
}));

/**
 * POST /api/test-suites
 * Create new test suite
 */
router.post('/', validate(schemas.createTestSuite), requireProjectAccess, requireRole('editor'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const suiteData = req.body;

  // Verify target belongs to project
  const { data: target, error: targetError } = await supabaseAdmin
    .from('test_targets')
    .select('id')
    .eq('id', suiteData.target_id)
    .eq('project_id', suiteData.project_id)
    .single();

  if (targetError || !target) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Test target not found or does not belong to the specified project',
    });
  }

  // Verify test cases belong to project (if provided)
  if (suiteData.test_case_ids && suiteData.test_case_ids.length > 0) {
    const { data: testCases, error: casesError } = await supabaseAdmin
      .from('test_cases')
      .select('id')
      .in('id', suiteData.test_case_ids)
      .eq('project_id', suiteData.project_id);

    if (casesError || !testCases || testCases.length !== suiteData.test_case_ids.length) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Some test cases not found or do not belong to the specified project',
      });
    }
  }

  const { data: testSuite, error } = await supabaseAdmin
    .from('test_suites')
    .insert({
      ...suiteData,
      created_by: userId,
      test_case_ids: suiteData.test_case_ids || [],
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to create test suite',
    });
  }

  res.status(201).json({
    data: testSuite,
    message: 'Test suite created successfully',
  });
}));

/**
 * PUT /api/test-suites/:id
 * Update test suite
 */
router.put('/:id', validateParams(paramSchemas.id), validate(schemas.createTestSuite), requireRole('editor'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const updateData = req.body;

  // First get the test suite to check access
  const { data: existingSuite, error: fetchError } = await supabaseAdmin
    .from('test_suites')
    .select(`
      project_id,
      projects (
        organization_id
      )
    `)
    .eq('id', id)
    .single();

  if (fetchError || !existingSuite) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test suite not found',
    });
  }

  // Check user access
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', (existingSuite as any).projects?.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this test suite',
    });
  }

  // Verify test cases belong to project (if provided)
  if (updateData.test_case_ids && updateData.test_case_ids.length > 0) {
    const { data: testCases, error: casesError } = await supabaseAdmin
      .from('test_cases')
      .select('id')
      .in('id', updateData.test_case_ids)
      .eq('project_id', existingSuite.project_id);

    if (casesError || !testCases || testCases.length !== updateData.test_case_ids.length) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Some test cases not found or do not belong to the specified project',
      });
    }
  }

  const { data: testSuite, error } = await supabaseAdmin
    .from('test_suites')
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
      message: 'Failed to update test suite',
    });
  }

  res.json({
    data: testSuite,
    message: 'Test suite updated successfully',
  });
}));

/**
 * DELETE /api/test-suites/:id
 * Delete test suite
 */
router.delete('/:id', validateParams(paramSchemas.id), requireRole('editor'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // First get the test suite to check access
  const { data: existingSuite, error: fetchError } = await supabaseAdmin
    .from('test_suites')
    .select(`
      project_id,
      projects (
        organization_id
      )
    `)
    .eq('id', id)
    .single();

  if (fetchError || !existingSuite) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test suite not found',
    });
  }

  // Check user access
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', (existingSuite as any).projects?.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this test suite',
    });
  }

  const { error } = await supabaseAdmin
    .from('test_suites')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to delete test suite',
    });
  }

  res.json({
    message: 'Test suite deleted successfully',
  });
}));

/**
 * GET /api/test-suites/:id/test-cases
 * Get test cases in a suite
 */
router.get('/:id/test-cases', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // First verify access to the suite
  const { data: suite, error: suiteError } = await supabaseAdmin
    .from('test_suites')
    .select(`
      test_case_ids,
      projects (
        organization_id
      )
    `)
    .eq('id', id)
    .single();

  if (suiteError || !suite) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test suite not found',
    });
  }

  // Check user access
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', (suite as any).projects?.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this test suite',
    });
  }

  // Get test cases
  const { data: testCases, error } = await supabaseAdmin
    .from('test_cases')
    .select('*')
    .in('id', suite.test_case_ids);

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch test cases',
    });
  }

  res.json({ data: testCases });
}));

/**
 * PUT /api/test-suites/:id/test-cases
 * Update test cases in a suite
 */
router.put('/:id/test-cases', validateParams(paramSchemas.id), requireRole('editor'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { test_case_ids } = req.body;

  if (!Array.isArray(test_case_ids)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'test_case_ids must be an array',
    });
  }

  // First get the test suite to check access
  const { data: existingSuite, error: fetchError } = await supabaseAdmin
    .from('test_suites')
    .select(`
      project_id,
      projects (
        organization_id
      )
    `)
    .eq('id', id)
    .single();

  if (fetchError || !existingSuite) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test suite not found',
    });
  }

  // Check user access
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', (existingSuite as any).projects?.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this test suite',
    });
  }

  // Verify test cases belong to project
  if (test_case_ids.length > 0) {
    const { data: testCases, error: casesError } = await supabaseAdmin
      .from('test_cases')
      .select('id')
      .in('id', test_case_ids)
      .eq('project_id', existingSuite.project_id);

    if (casesError || !testCases || testCases.length !== test_case_ids.length) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Some test cases not found or do not belong to the project',
      });
    }
  }

  // Update test suite
  const { data: testSuite, error } = await supabaseAdmin
    .from('test_suites')
    .update({
      test_case_ids: test_case_ids,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to update test suite',
    });
  }

  res.json({
    data: testSuite,
    message: 'Test suite updated successfully',
  });
}));

export default router;
