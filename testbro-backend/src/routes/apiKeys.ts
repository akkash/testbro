import express, { Request, Response } from 'express';
import { supabaseAdmin } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';
import { validate, validateParams, paramSchemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { APIKeyService } from '../services/apiKeyService';
import { RateLimitService } from '../services/rateLimitService';
import Redis from 'ioredis';
import Joi from 'joi';

const router = express.Router();

// Initialize services
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const rateLimitService = new RateLimitService(redis);
const apiKeyService = new APIKeyService();

// Apply authentication to all routes (supports both JWT and API key)
router.use(authenticate);

// Validation schemas for API key management
const apiKeySchemas = {
  createAPIKey: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    permissions: Joi.array().items(
      Joi.string().valid('read', 'write', 'delete', 'execute', 'admin', 'webhook', 'analytics', 'ai', 'export', 'integration')
    ).min(1).required(),
    expiresAt: Joi.date().greater('now').optional(),
    rateLimit: Joi.object({
      requests: Joi.number().min(1).max(10000).required(),
      windowMs: Joi.number().min(1000).max(24 * 60 * 60 * 1000).required(),
    }).optional(),
    ipWhitelist: Joi.array().items(Joi.string().ip()).max(50).optional(),
    allowedEndpoints: Joi.array().items(Joi.string().max(200)).max(100).optional(),
    metadata: Joi.object().optional(),
  }),

  updateAPIKey: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    isActive: Joi.boolean().optional(),
    rateLimit: Joi.object({
      requests: Joi.number().min(1).max(10000).required(),
      windowMs: Joi.number().min(1000).max(24 * 60 * 60 * 1000).required(),
    }).optional(),
    ipWhitelist: Joi.array().items(Joi.string().ip()).max(50).optional(),
    allowedEndpoints: Joi.array().items(Joi.string().max(200)).max(100).optional(),
    metadata: Joi.object().optional(),
  }),
};

/**
 * GET /api/api-keys
 * List all API keys for the user's organization
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { organization_id } = req.query;

  // Get user's organizations
  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId);

  if (membershipError || !memberships) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch user organizations',
    });
  }

  const organizationIds = memberships.map(m => m.organization_id);
  const targetOrgId = organization_id as string || organizationIds[0];

  if (!organizationIds.includes(targetOrgId)) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this organization',
    });
  }

  try {
    const apiKeys = await apiKeyService.listAPIKeys(targetOrgId, userId);
    
    res.json({
      data: apiKeys,
      organization_id: targetOrgId,
      total: apiKeys.length,
    });
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to list API keys',
    });
  }
}));

/**
 * POST /api/api-keys
 * Create a new API key
 */
router.post('/', validate(apiKeySchemas.createAPIKey), requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, permissions, expiresAt, rateLimit, ipWhitelist, allowedEndpoints, metadata } = req.body;
  const { organization_id } = req.query;

  // Get user's organizations with admin role
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single();

  if (membershipError || !membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Admin role required to create API keys',
    });
  }

  const targetOrgId = organization_id as string || membership.organization_id;

  try {
    // Check API key limits
    const existingKeys = await apiKeyService.listAPIKeys(targetOrgId);
    if (existingKeys.length >= 50) { // Limit per organization
      return res.status(400).json({
        error: 'LIMIT_EXCEEDED',
        message: 'Maximum number of API keys reached (50 per organization)',
      });
    }

    // Validate permission combinations
    const hasAdminPermission = permissions.includes('admin');
    if (hasAdminPermission && permissions.length > 1) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Admin permission cannot be combined with other permissions',
      });
    }

    const apiKey = await apiKeyService.generateAPIKey(
      {
        name,
        permissions,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        rateLimit,
        ipWhitelist,
        allowedEndpoints,
        metadata,
      },
      targetOrgId,
      userId
    );

    // Log API key creation for audit
    console.log('API key created', {
      keyId: apiKey.id,
      name: apiKey.name,
      organizationId: targetOrgId,
      userId,
      permissions,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      data: {
        ...apiKey,
        key: apiKey.key, // This is the only time the key is returned in plain text
      },
      message: 'API key created successfully',
      warning: 'This is the only time the API key will be shown. Please store it securely.',
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create API key',
    });
  }
}));

/**
 * GET /api/api-keys/:id
 * Get API key details
 */
router.get('/:id', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const keyId = req.params.id;

  try {
    const { data: apiKey, error } = await supabaseAdmin
      .from('api_keys')
      .select(`
        *,
        organizations!inner (
          id,
          name
        )
      `)
      .eq('id', keyId)
      .single();

    if (error || !apiKey) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'API key not found',
      });
    }

    // Check if user has access to this API key
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', apiKey.organization_id)
      .single();

    if (!membership) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Access denied to this API key',
      });
    }

    // Get usage statistics
    const usage = await apiKeyService.getAPIKeyUsage(keyId, 30);

    res.json({
      data: {
        id: apiKey.id,
        name: apiKey.name,
        permissions: apiKey.permissions,
        isActive: apiKey.is_active,
        expiresAt: apiKey.expires_at,
        lastUsedAt: apiKey.last_used_at,
        usageCount: apiKey.usage_count,
        rateLimit: apiKey.rate_limit,
        ipWhitelist: apiKey.ip_whitelist,
        allowedEndpoints: apiKey.allowed_endpoints,
        metadata: apiKey.metadata,
        createdAt: apiKey.created_at,
        updatedAt: apiKey.updated_at,
        organization: apiKey.organizations,
      },
      usage,
    });
  } catch (error) {
    console.error('Get API key error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get API key details',
    });
  }
}));

/**
 * PUT /api/api-keys/:id
 * Update API key
 */
router.put('/:id', validateParams(paramSchemas.id), validate(apiKeySchemas.updateAPIKey), requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const keyId = req.params.id;
  const updates = req.body;

  try {
    // Check if API key exists and user has access
    const { data: existingKey, error: fetchError } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .single();

    if (fetchError || !existingKey) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'API key not found',
      });
    }

    // Check user access
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', existingKey.organization_id)
      .eq('role', 'admin')
      .single();

    if (!membership) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Admin access required to update API keys',
      });
    }

    // Update API key
    const { data: updatedKey, error: updateError } = await supabaseAdmin
      .from('api_keys')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', keyId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        error: 'UPDATE_FAILED',
        message: 'Failed to update API key',
      });
    }

    // Log API key update for audit
    console.log('API key updated', {
      keyId,
      updates,
      userId,
      timestamp: new Date().toISOString(),
    });

    res.json({
      data: {
        ...updatedKey,
        key: '••••••••', // Never return the actual key
      },
      message: 'API key updated successfully',
    });
  } catch (error) {
    console.error('Update API key error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update API key',
    });
  }
}));

/**
 * DELETE /api/api-keys/:id
 * Revoke/delete API key
 */
router.delete('/:id', validateParams(paramSchemas.id), requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const keyId = req.params.id;

  try {
    const success = await apiKeyService.revokeAPIKey(keyId, userId);
    
    if (!success) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'API key not found or access denied',
      });
    }

    // Log API key revocation for audit
    console.log('API key revoked', {
      keyId,
      userId,
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: 'API key revoked successfully',
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to revoke API key',
    });
  }
}));

/**
 * GET /api/api-keys/:id/usage
 * Get API key usage statistics
 */
router.get('/:id/usage', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const keyId = req.params.id;
  const { days = 30 } = req.query;

  try {
    // Check if user has access to this API key
    const { data: apiKey, error } = await supabaseAdmin
      .from('api_keys')
      .select('organization_id')
      .eq('id', keyId)
      .single();

    if (error || !apiKey) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'API key not found',
      });
    }

    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', apiKey.organization_id)
      .single();

    if (!membership) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Access denied to this API key',
      });
    }

    const usage = await apiKeyService.getAPIKeyUsage(keyId, parseInt(days as string) || 30);
    
    res.json({
      data: usage,
      period: `${days} days`,
    });
  } catch (error) {
    console.error('Get API key usage error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get API key usage',
    });
  }
}));

/**
 * POST /api/api-keys/:id/regenerate
 * Regenerate API key (creates new key, deactivates old one)
 */
router.post('/:id/regenerate', validateParams(paramSchemas.id), requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const keyId = req.params.id;

  try {
    // Get existing key details
    const { data: existingKey, error: fetchError } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .single();

    if (fetchError || !existingKey) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'API key not found',
      });
    }

    // Check user access
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', existingKey.organization_id)
      .eq('role', 'admin')
      .single();

    if (!membership) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Admin access required to regenerate API keys',
      });
    }

    // Deactivate old key
    await apiKeyService.revokeAPIKey(keyId, userId);

    // Create new key with same settings
    const newAPIKey = await apiKeyService.generateAPIKey(
      {
        name: `${existingKey.name} (Regenerated)`,
        permissions: existingKey.permissions,
        expiresAt: existingKey.expires_at ? new Date(existingKey.expires_at) : undefined,
        rateLimit: existingKey.rate_limit,
        ipWhitelist: existingKey.ip_whitelist,
        allowedEndpoints: existingKey.allowed_endpoints,
        metadata: existingKey.metadata,
      },
      existingKey.organization_id,
      userId
    );

    // Log API key regeneration for audit
    console.log('API key regenerated', {
      oldKeyId: keyId,
      newKeyId: newAPIKey.id,
      userId,
      timestamp: new Date().toISOString(),
    });

    res.json({
      data: {
        ...newAPIKey,
        key: newAPIKey.key, // Return new key only once
      },
      message: 'API key regenerated successfully',
      warning: 'This is the only time the new API key will be shown. Please store it securely.',
      oldKeyRevoked: true,
    });
  } catch (error) {
    console.error('Regenerate API key error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to regenerate API key',
    });
  }
}));

export default router;