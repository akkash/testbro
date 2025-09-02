import express, { Request, Response } from 'express';
import { supabaseAdmin, TABLES } from '../config/database';
import { authenticateUser, requireProjectAccess, requireRole } from '../middleware/auth';
import { validate, validateParams, paramSchemas } from '../middleware/validation';
import { schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { paginationService } from '../services/paginationService';
import { APIResponse } from '../types';
import { secretsEncryption, SecretValue, EncryptedSecret, DecryptedSecret } from '../services/secretsEncryptionService';
import { otpManager, createOtpConfig, type OtpProviderConfig } from '../services/otpProviderService';
import { logger, LogCategory } from '../services/loggingService';
import Joi from 'joi';

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

// =============================================
// PROJECT SECRETS MANAGEMENT ROUTES
// =============================================

// Validation schemas for secrets
const secretSchemas = {
  createSecret: Joi.object({
    secretKey: Joi.string().min(1).max(100).required(),
    secretType: Joi.string().valid('username_password', 'phone_otp', 'api_key', 'custom').required(),
    value: Joi.object({
      username: Joi.string().max(255).optional(),
      password: Joi.string().max(1000).optional(),
      phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
      apiKey: Joi.string().max(1000).optional(),
      custom: Joi.object().optional()
    }).required(),
    description: Joi.string().max(500).optional(),
    metadata: Joi.object().optional()
  }),

  updateSecret: Joi.object({
    secretKey: Joi.string().min(1).max(100).optional(),
    value: Joi.object({
      username: Joi.string().max(255).optional(),
      password: Joi.string().max(1000).optional(),
      phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
      apiKey: Joi.string().max(1000).optional(),
      custom: Joi.object().optional()
    }).optional(),
    description: Joi.string().max(500).optional(),
    metadata: Joi.object().optional(),
    isActive: Joi.boolean().optional()
  })
};

/**
 * POST /api/projects/:id/secrets
 * Create or update a project secret
 */
router.post('/:id/secrets', 
  validateParams(paramSchemas.id),
  requireProjectAccess,
  requireRole('admin'), // Only admins can manage secrets
  validate(secretSchemas.createSecret),
  asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params;
    const { secretKey, secretType, value, description, metadata = {} } = req.body;
    const userId = req.user!.id;
    const clientIp = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      // Check if secret key already exists
      const { data: existingSecret } = await supabaseAdmin
        .from(TABLES.PROJECT_SECRETS)
        .select('id')
        .eq('project_id', projectId)
        .eq('secret_key', secretKey)
        .single();

      // Encrypt the secret value
      const encryptedValue = secretsEncryption.encryptObject(value, `${projectId}:${secretKey}`);
      const encryptedMetadata = secretsEncryption.encryptObject(metadata, `${projectId}:${secretKey}:meta`);

      let result;

      if (existingSecret) {
        // Update existing secret
        const { data: updatedSecret, error } = await supabaseAdmin
          .from(TABLES.PROJECT_SECRETS)
          .update({
            secret_type: secretType,
            encrypted_value: encryptedValue,
            encrypted_metadata: encryptedMetadata,
            description,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSecret.id)
          .select()
          .single();

        if (error) throw error;
        result = updatedSecret;

        // Log audit trail
        await supabaseAdmin.rpc('log_secret_usage', {
          p_secret_id: existingSecret.id,
          p_project_id: projectId,
          p_operation: 'UPDATE',
          p_ip_address: clientIp,
          p_user_agent: userAgent,
          p_metadata: { secretKey, secretType }
        });
      } else {
        // Create new secret
        const { data: newSecret, error } = await supabaseAdmin
          .from(TABLES.PROJECT_SECRETS)
          .insert({
            project_id: projectId,
            secret_key: secretKey,
            secret_type: secretType,
            encrypted_value: encryptedValue,
            encrypted_metadata: encryptedMetadata,
            description,
            created_by: userId
          })
          .select()
          .single();

        if (error) throw error;
        result = newSecret;

        // Log audit trail
        await supabaseAdmin.rpc('log_secret_usage', {
          p_secret_id: newSecret.id,
          p_project_id: projectId,
          p_operation: 'CREATE',
          p_ip_address: clientIp,
          p_user_agent: userAgent,
          p_metadata: { secretKey, secretType }
        });
      }

      // Return response without sensitive data
      const response: APIResponse<Partial<EncryptedSecret>> = {
        data: {
          id: result.id,
          projectId: result.project_id,
          secretKey: result.secret_key,
          secretType: result.secret_type,
          description: result.description,
          isActive: result.is_active,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      };

      res.status(existingSecret ? 200 : 201).json(response);
    } catch (error) {
      console.error('Secret creation/update error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to create or update secret',
      });
    }
  })
);

/**
 * GET /api/projects/:id/secrets
 * Get all secrets for a project (masked for security)
 */
router.get('/:id/secrets',
  validateParams(paramSchemas.id),
  requireProjectAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params;
    const userId = req.user!.id;
    const clientIp = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      // Get all secrets for the project
      const { data: secrets, error } = await supabaseAdmin
        .from(TABLES.PROJECT_SECRETS)
        .select(`
          id,
          secret_key,
          secret_type,
          description,
          is_active,
          last_used_at,
          used_count,
          created_at,
          updated_at
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Log audit trail for read operation
      if (secrets && secrets.length > 0) {
        await supabaseAdmin.rpc('log_secret_usage', {
          p_secret_id: null,
          p_project_id: projectId,
          p_operation: 'READ',
          p_ip_address: clientIp,
          p_user_agent: userAgent,
          p_metadata: { count: secrets.length }
        });
      }

      const response: APIResponse<any[]> = {
        data: secrets || [],
        meta: {
          timestamp: new Date().toISOString(),
          totalSecrets: secrets?.length || 0
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Secrets fetch error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch secrets',
      });
    }
  })
);

/**
 * GET /api/projects/:id/secrets/:key/reveal
 * Reveal a specific secret (admin only)
 */
router.get('/:id/secrets/:key/reveal',
  validateParams(paramSchemas.id),
  requireProjectAccess,
  requireRole('admin'), // Only admins can reveal secrets
  asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId, key: secretKey } = req.params;
    const userId = req.user!.id;
    const clientIp = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      // Get the specific secret
      const { data: secret, error } = await supabaseAdmin
        .from(TABLES.PROJECT_SECRETS)
        .select('*')
        .eq('project_id', projectId)
        .eq('secret_key', secretKey)
        .eq('is_active', true)
        .single();

      if (error || !secret) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Secret not found',
        });
      }

      // Decrypt the secret value
      const decryptedValue = secretsEncryption.decryptObject(
        secret.encrypted_value,
        `${projectId}:${secretKey}`
      );

      const decryptedMetadata = secretsEncryption.decryptObject(
        secret.encrypted_metadata,
        `${projectId}:${secretKey}:meta`
      );

      // Log audit trail
      await supabaseAdmin.rpc('log_secret_usage', {
        p_secret_id: secret.id,
        p_project_id: projectId,
        p_operation: 'READ',
        p_ip_address: clientIp,
        p_user_agent: userAgent,
        p_metadata: { secretKey, revealed: true }
      });

      const decryptedSecret: DecryptedSecret = {
        id: secret.id,
        projectId: secret.project_id,
        secretKey: secret.secret_key,
        secretType: secret.secret_type,
        value: decryptedValue,
        metadata: decryptedMetadata,
        description: secret.description,
        isActive: secret.is_active,
        lastUsedAt: secret.last_used_at,
        usedCount: secret.used_count,
        createdBy: secret.created_by,
        createdAt: secret.created_at,
        updatedAt: secret.updated_at
      };

      const response: APIResponse<DecryptedSecret> = {
        data: decryptedSecret,
        meta: {
          timestamp: new Date().toISOString(),
          warning: 'This contains sensitive data - handle with care'
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Secret reveal error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to reveal secret',
      });
    }
  })
);

/**
 * DELETE /api/projects/:id/secrets/:key
 * Delete a project secret
 */
router.delete('/:id/secrets/:key',
  validateParams(paramSchemas.id),
  requireProjectAccess,
  requireRole('admin'), // Only admins can delete secrets
  asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId, key: secretKey } = req.params;
    const userId = req.user!.id;
    const clientIp = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      // Get the secret to verify it exists and get its ID for audit
      const { data: secret, error: fetchError } = await supabaseAdmin
        .from(TABLES.PROJECT_SECRETS)
        .select('id')
        .eq('project_id', projectId)
        .eq('secret_key', secretKey)
        .single();

      if (fetchError || !secret) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Secret not found',
        });
      }

      // Log audit trail before deletion
      await supabaseAdmin.rpc('log_secret_usage', {
        p_secret_id: secret.id,
        p_project_id: projectId,
        p_operation: 'DELETE',
        p_ip_address: clientIp,
        p_user_agent: userAgent,
        p_metadata: { secretKey }
      });

      // Delete the secret
      const { error: deleteError } = await supabaseAdmin
        .from(TABLES.PROJECT_SECRETS)
        .delete()
        .eq('id', secret.id);

      if (deleteError) throw deleteError;

      const response: APIResponse<{ deleted: boolean }> = {
        data: { deleted: true },
        meta: {
          timestamp: new Date().toISOString(),
          secretKey
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Secret deletion error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to delete secret',
      });
    }
  })
);

// =============================================
// OTP Provider Configuration Endpoints
// =============================================

/**
 * GET /api/projects/:id/otp-config
 * Get OTP provider configuration status
 * Only admin users can access this endpoint
 */
router.get('/:id/otp-config',
  validateParams(paramSchemas.id),
  requireProjectAccess,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Get available providers and current configuration
      const availableProviders = otpManager.getAvailableProviders();
      const currentProvider = otpManager.getCurrentProviderName();
      const validationResults = await otpManager.validateAllProviders();

      logger.info('OTP configuration accessed', LogCategory.SECURITY, {
        projectId: req.params.id,
        userId: req.user!.id,
        currentProvider
      });

      res.json({
        data: {
          currentProvider,
          availableProviders,
          providerStatus: validationResults,
          supportedProviders: [
            {
              name: 'mock',
              displayName: 'Mock Provider (Testing)',
              description: 'For development and testing purposes',
              configFields: ['defaultMockOtp', 'otpLength', 'validityMinutes']
            },
            {
              name: 'twilio',
              displayName: 'Twilio SMS',
              description: 'Production SMS delivery via Twilio',
              configFields: ['twilioAccountSid', 'twilioAuthToken', 'twilioFromNumber']
            },
            {
              name: 'aws-sns',
              displayName: 'AWS SNS',
              description: 'Enterprise SMS via Amazon SNS',
              configFields: ['awsAccessKeyId', 'awsSecretAccessKey', 'awsRegion']
            }
          ]
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to get OTP configuration', LogCategory.SECURITY, {
        projectId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to get OTP configuration',
      });
    }
  })
);

/**
 * POST /api/projects/:id/otp-config
 * Configure OTP provider for the project
 * Only admin users can access this endpoint
 */
router.post('/:id/otp-config',
  validateParams(paramSchemas.id),
  requireProjectAccess,
  requireRole('admin'),
  validate(Joi.object({
    provider: Joi.string().valid('mock', 'twilio', 'aws-sns').required(),
    config: Joi.object({
      // Twilio fields
      twilioAccountSid: Joi.string().when('provider', {
        is: 'twilio',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
      twilioAuthToken: Joi.string().when('provider', {
        is: 'twilio',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
      twilioFromNumber: Joi.string().when('provider', {
        is: 'twilio',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),

      // AWS SNS fields
      awsAccessKeyId: Joi.string().when('provider', {
        is: 'aws-sns',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
      awsSecretAccessKey: Joi.string().when('provider', {
        is: 'aws-sns',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
      awsRegion: Joi.string().when('provider', {
        is: 'aws-sns',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),

      // Mock provider fields
      defaultMockOtp: Joi.string().when('provider', {
        is: 'mock',
        then: Joi.optional(),
        otherwise: Joi.forbidden()
      }),
      mockOtps: Joi.object().pattern(
        Joi.string(), // phone number
        Joi.string()  // OTP
      ).when('provider', {
        is: 'mock',
        then: Joi.optional(),
        otherwise: Joi.forbidden()
      }),

      // Common fields
      otpLength: Joi.number().integer().min(4).max(8).optional(),
      validityMinutes: Joi.number().integer().min(1).max(60).optional(),
      maxRetries: Joi.number().integer().min(1).max(10).optional()
    }).required()
  })),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { provider, config } = req.body;
      const projectId = req.params.id;
      const userId = req.user!.id;

      // Create OTP configuration
      const otpConfig = createOtpConfig(provider, config);
      
      // Configure the provider
      const success = await otpManager.configureProvider(otpConfig);
      
      if (!success) {
        return res.status(400).json({
          error: 'CONFIGURATION_FAILED',
          message: `Failed to configure ${provider} provider. Please check your credentials.`,
        });
      }

      // Log the configuration change for audit
      logger.info('OTP provider configured', LogCategory.SECURITY, {
        projectId,
        userId,
        provider,
        configFields: Object.keys(config)
      });

      // Return success with masked configuration
      const maskedConfig = this.maskSensitiveConfig(config);
      
      res.json({
        data: {
          provider,
          configured: true,
          config: maskedConfig,
          validationPassed: true
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to configure OTP provider', LogCategory.SECURITY, {
        projectId: req.params.id,
        userId: req.user!.id,
        provider: req.body.provider,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to configure OTP provider',
      });
    }
  });


/**
 * POST /api/projects/:id/otp-test
 * Test OTP provider configuration
 * Only admin users can access this endpoint
 */
router.post('/:id/otp-test',
  validateParams(paramSchemas.id),
  requireProjectAccess,
  requireRole('admin'),
  validate(Joi.object({
    phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
    provider: Joi.string().valid('mock', 'twilio', 'aws-sns').optional(),
    customMessage: Joi.string().max(160).optional()
  })),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { phoneNumber, provider, customMessage } = req.body;
      const projectId = req.params.id;
      const userId = req.user!.id;

      logger.info('OTP test requested', LogCategory.SECURITY, {
        projectId,
        userId,
        phoneNumber: phoneNumber.substring(0, 4) + '****',
        provider: provider || 'current'
      });

      // Request OTP from the specified or current provider
      const otp = await otpManager.getOtp(phoneNumber, {
        customMessage: customMessage || `TestBro.ai test OTP: {OTP}. This is a test message.`,
        timeout: 30000
      }, provider);

      res.json({
        data: {
          success: true,
          testOtp: otp, // In production, you might want to mask this
          phoneNumber: phoneNumber.substring(0, 4) + '****',
          provider: provider || otpManager.getCurrentProviderName(),
          message: 'OTP sent successfully'
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('OTP test failed', LogCategory.SECURITY, {
        projectId: req.params.id,
        userId: req.user!.id,
        phoneNumber: req.body.phoneNumber?.substring(0, 4) + '****',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(400).json({
        error: 'OTP_TEST_FAILED',
        message: error instanceof Error ? error.message : 'Failed to send test OTP',
      });
    }
  })
);

// Helper function to mask sensitive configuration
function maskSensitiveConfig(config: any): any {
  const masked = { ...config };
  
  // Mask sensitive fields
  const sensitiveFields = [
    'twilioAuthToken',
    'awsSecretAccessKey',
    'twilioAccountSid'
  ];
  
  sensitiveFields.forEach(field => {
    if (masked[field]) {
      const value = masked[field];
      if (value.length > 8) {
        masked[field] = value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
      } else {
        masked[field] = '*'.repeat(value.length);
      }
    }
  });
  
  return masked;
}

export default router;