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
 * GET /api/test-targets
 * Get test targets with filtering and pagination
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    page = 1,
    limit = 20,
    project_id,
    platform,
    environment,
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
    .from('test_targets')
    .select(`
      *,
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

  if (platform) {
    query = query.eq('platform', platform);
  }

  if (environment) {
    query = query.eq('environment', environment);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,url.ilike.%${search}%`);
  }

  // Apply sorting
  const validSortFields = ['name', 'url', 'platform', 'environment', 'created_at', 'updated_at'];
  const sortField = validSortFields.includes(sort_by as string) ? sort_by : 'updated_at';
  const sortDirection = sort_order === 'asc' ? { ascending: true } : { ascending: false };

  query = query.order(sortField as any, sortDirection);

  // Apply pagination
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  query = query.range(offset, offset + parseInt(limit as string) - 1);

  const { data: testTargets, error, count } = await query;

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch test targets',
    });
  }

  res.json({
    data: testTargets,
    meta: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: count,
      total_pages: Math.ceil((count || 0) / parseInt(limit as string)),
    },
  });
}));

/**
 * GET /api/test-targets/:id
 * Get test target by ID
 */
router.get('/:id', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const { data: testTarget, error } = await supabaseAdmin
    .from('test_targets')
    .select(`
      *,
      projects (
        id,
        name,
        organization_id
      ),
      test_cases (
        id,
        name,
        description,
        priority,
        status
      )
    `)
    .eq('id', id)
    .single();

  if (error || !testTarget) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test target not found',
    });
  }

  // Check user access
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', testTarget.projects.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this test target',
    });
  }

  res.json({ data: testTarget });
}));

/**
 * POST /api/test-targets
 * Create new test target
 */
router.post('/', validate(schemas.createTestTarget), requireProjectAccess, requireRole('editor'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id; // Required for authentication but not used in this endpoint
  const targetData = req.body;

  // Check if URL is already registered for this project
  const { data: existingTarget, error: _checkError } = await supabaseAdmin
    .from('test_targets')
    .select('id')
    .eq('url', targetData.url)
    .eq('project_id', targetData.project_id)
    .single();

  if (existingTarget) {
    return res.status(409).json({
      error: 'CONFLICT',
      message: 'A test target with this URL already exists for this project',
    });
  }

  const { data: testTarget, error } = await supabaseAdmin
    .from('test_targets')
    .insert({
      ...targetData,
      auth_config: targetData.auth_config || {},
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to create test target',
    });
  }

  res.status(201).json({
    data: testTarget,
    message: 'Test target created successfully',
  });
}));

/**
 * PUT /api/test-targets/:id
 * Update test target
 */
router.put('/:id', validateParams(paramSchemas.id), validate(schemas.createTestTarget), requireRole('editor'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const updateData = req.body;

  // First get the test target to check access
  const { data: targetToUpdate, error: fetchError } = await supabaseAdmin
    .from('test_targets')
    .select(`
      project_id,
      projects (
        organization_id
      )
    `)
    .eq('id', id)
    .single();

  if (fetchError || !targetToUpdate) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test target not found',
    });
  }

  // Check user access
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', (targetToUpdate as any).projects?.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this test target',
    });
  }

  // Check if URL is already registered for this project (excluding current target)
  if (updateData.url) {
    const { data: existingTarget, error: _checkError } = await supabaseAdmin
      .from('test_targets')
      .select('id')
      .eq('url', updateData.url)
      .eq('project_id', targetToUpdate.project_id)
      .neq('id', id)
      .single();

    if (existingTarget) {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'A test target with this URL already exists for this project',
      });
    }
  }

  const { data: testTarget, error } = await supabaseAdmin
    .from('test_targets')
    .update({
      ...updateData,
      auth_config: updateData.auth_config || {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to update test target',
    });
  }

  res.json({
    data: testTarget,
    message: 'Test target updated successfully',
  });
}));

/**
 * DELETE /api/test-targets/:id
 * Delete test target
 */
router.delete('/:id', validateParams(paramSchemas.id), requireRole('editor'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // First get the test target to check access
  const { data: existingTarget, error: fetchError } = await supabaseAdmin
    .from('test_targets')
    .select(`
      project_id,
      projects (
        organization_id
      )
    `)
    .eq('id', id)
    .single();

  if (fetchError || !existingTarget) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test target not found',
    });
  }

  // Check user access
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', (existingTarget as any).projects?.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this test target',
    });
  }

  // Check if target has associated test cases
  const { data: testCases, error: casesError } = await supabaseAdmin
    .from('test_cases')
    .select('id')
    .eq('target_id', id)
    .limit(1);

  if (casesError) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to check test cases',
    });
  }

  if (testCases && testCases.length > 0) {
    return res.status(409).json({
      error: 'CONFLICT',
      message: 'Cannot delete test target with associated test cases. Please delete or reassign the test cases first.',
    });
  }

  const { error } = await supabaseAdmin
    .from('test_targets')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to delete test target',
    });
  }

  res.json({
    message: 'Test target deleted successfully',
  });
}));

/**
 * POST /api/test-targets/:id/test-connection
 * Test connection to target URL
 */
router.post('/:id/test-connection', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Get test target
  const { data: target, error: fetchError } = await supabaseAdmin
    .from('test_targets')
    .select(`
      url,
      auth_config,
      projects (
        organization_id
      )
    `)
    .eq('id', id)
    .single();

  if (fetchError || !target) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test target not found',
    });
  }

  // Check user access
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', (target as any).projects?.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this test target',
    });
  }

  try {
    // Test connection using Playwright
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Set timeout for connection test
    page.setDefaultTimeout(30000);

    const startTime = Date.now();
    const response = await page.goto(target.url, {
      waitUntil: 'domcontentloaded',
    });
    const loadTime = Date.now() - startTime;

    const connectionResult = {
      success: response?.ok() || false,
      status_code: response?.status(),
      load_time_ms: loadTime,
      url: target.url,
      title: await page.title(),
      user_agent: 'Chrome/91.0.4472.124', // Default Chrome user agent
    };

    await browser.close();

    res.json({
      data: connectionResult,
      message: connectionResult.success ? 'Connection successful' : 'Connection failed',
    });

  } catch (error) {
    console.error('Connection test failed:', error);
    res.status(500).json({
      error: 'CONNECTION_FAILED',
      message: 'Failed to test connection to target URL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

/**
 * GET /api/test-targets/:id/screenshot
 * Take screenshot of target URL
 */
router.get('/:id/screenshot', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { full_page = 'false' } = req.query;

  // Get test target
  const { data: target, error: fetchError } = await supabaseAdmin
    .from('test_targets')
    .select(`
      url,
      projects (
        organization_id
      )
    `)
    .eq('id', id)
    .single();

  if (fetchError || !target) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Test target not found',
    });
  }

  // Check user access
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', (target as any).projects?.organization_id)
    .single();

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this test target',
    });
  }

  try {
    // Take screenshot using Playwright
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(target.url, { waitUntil: 'domcontentloaded' });

    const screenshot = await page.screenshot({
      fullPage: full_page === 'true',
      type: 'png',
    });

    await browser.close();

    // Return screenshot as base64
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${id}_screenshot.png"`);
    res.send(screenshot);

  } catch (error) {
    console.error('Screenshot failed:', error);
    res.status(500).json({
      error: 'SCREENSHOT_FAILED',
      message: 'Failed to take screenshot of target URL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

export default router;
