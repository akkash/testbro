import express, { Request, Response } from 'express';
import { supabaseAdmin, TABLES } from '../config/database';
import { authenticateUser, requireProjectAccess } from '../middleware/auth';
import { validate, validateParams, paramSchemas } from '../middleware/validation';
import { schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { paginationService } from '../services/paginationService';
import { APIResponse } from '../types';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateUser);

/**
 * GET /api/projects
 * Get projects with filtering and pagination
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const paginationParams = paginationService.parsePaginationParams(req.query as any);
    const { search, status, sort_by, sort_order } = req.query;

    // Get user's organization IDs first using Supabase
    const { data: orgMemberships, error: orgError } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId);

    if (orgError) {
      throw new Error(orgError.message);
    }

    const organizationIds = orgMemberships.map(row => row.organization_id);

    if (organizationIds.length === 0) {
      return res.json({
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: paginationParams.limit,
          hasNextPage: false,
          hasPreviousPage: false,
          nextPage: null,
          previousPage: null,
        },
        meta: {
          sortField: paginationParams.sortField,
          sortOrder: paginationParams.sortOrder,
          executionTime: 0,
        }
      });
    }

    // Build query with filters
    let query = supabaseAdmin
      .from(TABLES.PROJECTS)
      .select(`
        *,
        organizations (
          id,
          name
        ),
        test_cases (count),
        test_targets (count)
      `, { count: 'exact' })
      .in('organization_id', organizationIds);

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Apply sorting
    const sortField = (sort_by as string) || paginationParams.sortField || 'updated_at';
    const sortDirection = (sort_order as string) || paginationParams.sortOrder || 'desc';
    query = query.order(sortField, { ascending: sortDirection === 'asc' });

    // Apply pagination
    const offset = (paginationParams.page - 1) * paginationParams.limit;
    query = query.range(offset, offset + paginationParams.limit - 1);

    const { data: projects, error: projectsError, count } = await query;

    if (projectsError) {
      throw new Error(projectsError.message);
    }

    // Transform data to include counts
    const transformedProjects = projects?.map(project => ({
      ...project,
      test_cases_count: project.test_cases?.[0]?.count || 0,
      test_targets_count: project.test_targets?.[0]?.count || 0,
      organization_name: project.organizations?.name
    })) || [];

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / paginationParams.limit);

    const response: APIResponse<any[]> = {
      data: transformedProjects,
      meta: {
        pagination: {
          currentPage: paginationParams.page,
          totalPages,
          totalItems,
          itemsPerPage: paginationParams.limit,
          hasNextPage: paginationParams.page < totalPages,
          hasPreviousPage: paginationParams.page > 1,
          nextPage: paginationParams.page < totalPages ? paginationParams.page + 1 : null,
          previousPage: paginationParams.page > 1 ? paginationParams.page - 1 : null,
          // Legacy compatibility
          page: paginationParams.page,
          limit: paginationParams.limit,
          total: totalItems,
          total_pages: totalPages
        },
        sortField,
        sortOrder: sortDirection,
        search: search as string,
        filters: {
          status
        },
        executionTime: 0,
        timestamp: new Date().toISOString()
      }
    };

    return res.json(response);

  } catch (error) {
    console.error('Projects fetch error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch projects',
    });
  }
}));

/**
 * GET /api/projects/:id
 * Get project by ID
 */
router.get('/:id', validateParams(paramSchemas.id), requireProjectAccess, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data: project, error } = await supabaseAdmin
      .from(TABLES.PROJECTS)
      .select(`
        *,
        organizations (
          id,
          name
        ),
        test_cases (
          id,
          name,
          status,
          priority,
          created_at
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

    if (error || !project) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    // Add additional computed fields
    const enrichedProject = {
      ...project,
      test_cases_count: project.test_cases?.length || 0,
      test_targets_count: project.test_targets?.length || 0,
      organization_name: project.organizations?.name
    };

    const response: APIResponse<any> = {
      data: enrichedProject,
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Project fetch error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch project',
    });
  }
}));

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', validate(schemas.createProject), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, description, organization_id, tags = [] } = req.body;

  try {
    // Verify user has access to the organization
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organization_id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not have access to this organization',
      });
    }

    // Create the project
    const { data: project, error: projectError } = await supabaseAdmin
      .from(TABLES.PROJECTS)
      .insert({
        name,
        description,
        organization_id,
        created_by: userId,
        tags,
        status: 'active'
      })
      .select()
      .single();

    if (projectError) {
      if (projectError.code === '23505') {
        return res.status(409).json({
          error: 'CONFLICT',
          message: 'A project with this name already exists in the organization',
        });
      }
      throw new Error(projectError.message);
    }

    res.status(201).json({ data: project });

  } catch (error) {
    console.error('Project creation error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create project',
    });
  }
}));

/**
 * PUT /api/projects/:id
 * Update a project
 */
router.put('/:id', 
  validateParams(paramSchemas.id), 
  validate(schemas.updateProject), 
  requireProjectAccess, 
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, status, tags } = req.body;

    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.status = status;
      if (tags !== undefined) updateData.tags = tags;

      const { data: project, error } = await supabaseAdmin
        .from(TABLES.PROJECTS)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({
            error: 'CONFLICT',
            message: 'A project with this name already exists in the organization',
          });
        }
        throw new Error(error.message);
      }

      res.json({ data: project });

    } catch (error) {
      console.error('Project update error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update project',
      });
    }
  })
);

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete('/:id', 
  validateParams(paramSchemas.id), 
  requireProjectAccess, 
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      // Check if project has test cases or executions
      const [testCasesResult, executionsResult] = await Promise.all([
        supabaseAdmin
          .from('test_cases')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', id),
        supabaseAdmin
          .from(TABLES.TEST_EXECUTIONS)
          .select('id', { count: 'exact', head: true })
          .eq('project_id', id)
      ]);

      if (testCasesResult.count && testCasesResult.count > 0) {
        return res.status(409).json({
          error: 'CONFLICT',
          message: 'Cannot delete project with existing test cases. Please delete test cases first.',
        });
      }

      if (executionsResult.count && executionsResult.count > 0) {
        return res.status(409).json({
          error: 'CONFLICT',
          message: 'Cannot delete project with existing test executions.',
        });
      }

      // Delete the project
      const { error } = await supabaseAdmin
        .from(TABLES.PROJECTS)
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      res.status(204).send();

    } catch (error) {
      console.error('Project deletion error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to delete project',
      });
    }
  })
);

/**
 * GET /api/projects/:id/stats
 * Get detailed project statistics
 */
router.get('/:id/stats', 
  validateParams(paramSchemas.id), 
  requireProjectAccess, 
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      // Get project basic info
      const { data: project, error: projectError } = await supabaseAdmin
        .from(TABLES.PROJECTS)
        .select('name, created_at')
        .eq('id', id)
        .single();

      if (projectError || !project) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Get statistics in parallel
      const [testCasesResult, executionsResult, targetsResult] = await Promise.all([
        // Test cases stats
        supabaseAdmin
          .from('test_cases')
          .select('id, status, priority, ai_generated, created_at')
          .eq('project_id', id),
        
        // Executions stats
        supabaseAdmin
          .from(TABLES.TEST_EXECUTIONS)
          .select('id, status, started_at, duration_seconds, browser')
          .eq('project_id', id)
          .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()), // Last 30 days
        
        // Test targets
        supabaseAdmin
          .from('test_targets')
          .select('id, platform, environment')
          .eq('project_id', id)
      ]);

      const testCases = testCasesResult.data || [];
      const executions = executionsResult.data || [];
      const targets = targetsResult.data || [];

      // Calculate test case statistics
      const testCaseStats = {
        total: testCases.length,
        active: testCases.filter(tc => tc.status === 'active').length,
        draft: testCases.filter(tc => tc.status === 'draft').length,
        ai_generated: testCases.filter(tc => tc.ai_generated).length,
        by_priority: {
          critical: testCases.filter(tc => tc.priority === 'critical').length,
          high: testCases.filter(tc => tc.priority === 'high').length,
          medium: testCases.filter(tc => tc.priority === 'medium').length,
          low: testCases.filter(tc => tc.priority === 'low').length
        }
      };

      // Calculate execution statistics
      const executionStats = {
        total: executions.length,
        passed: executions.filter(e => e.status === 'completed').length,
        failed: executions.filter(e => e.status === 'failed').length,
        running: executions.filter(e => e.status === 'running').length,
        success_rate: executions.length > 0 ? 
          (executions.filter(e => e.status === 'completed').length / executions.length) * 100 : 0,
        avg_duration_seconds: executions.length > 0 ? 
          executions.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / executions.length : 0,
        by_browser: executions.reduce((acc, e) => {
          acc[e.browser] = (acc[e.browser] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      // Calculate target statistics
      const targetStats = {
        total: targets.length,
        by_platform: targets.reduce((acc, t) => {
          acc[t.platform] = (acc[t.platform] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        by_environment: targets.reduce((acc, t) => {
          acc[t.environment] = (acc[t.environment] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      // Calculate growth metrics
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const growth = {
        test_cases_last_30_days: testCases.filter(tc => new Date(tc.created_at) >= last30Days).length,
        test_cases_last_7_days: testCases.filter(tc => new Date(tc.created_at) >= last7Days).length,
        executions_last_30_days: executions.length, // Already filtered to 30 days
        executions_last_7_days: executions.filter(e => new Date(e.started_at) >= last7Days).length
      };

      const stats = {
        project_name: project.name,
        project_created_at: project.created_at,
        test_cases: testCaseStats,
        executions: executionStats,
        targets: targetStats,
        growth
      };

      res.json({ data: stats });

    } catch (error) {
      console.error('Project stats error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch project statistics',
      });
    }
  })
);

export default router;