import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/database';
import { RateLimitService } from './rateLimitService';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// API Key permissions
export type APIKeyPermission = 
  | 'read'           // Read access to resources
  | 'write'          // Create/update resources
  | 'delete'         // Delete resources
  | 'execute'        // Execute tests
  | 'admin'          // Administrative access
  | 'webhook'        // Webhook endpoint access
  | 'analytics'      // Analytics data access
  | 'ai'             // AI service access
  | 'export'         // Data export access
  | 'integration';   // External service integration

// API Key configuration
export interface APIKeyConfig {
  name: string;
  permissions: APIKeyPermission[];
  expiresAt?: Date;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  ipWhitelist?: string[];
  allowedEndpoints?: string[];
  metadata?: Record<string, any>;
}

// API Key structure
export interface APIKey {
  id: string;
  key: string;
  name: string;
  organizationId: string;
  userId: string;
  permissions: APIKeyPermission[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  ipWhitelist?: string[];
  allowedEndpoints?: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// API Key usage tracking
export interface APIKeyUsage {
  keyId: string;
  endpoint: string;
  method: string;
  ip: string;
  userAgent: string;
  responseStatus: number;
  responseTime: number;
  timestamp: Date;
  errorMessage?: string;
}

export class APIKeyService {
  private rateLimitService: RateLimitService;

  constructor() {
    const redis = new (require('ioredis'))(process.env.REDIS_URL || 'redis://localhost:6379');
    this.rateLimitService = new RateLimitService(redis);
  }

  // Generate a new API key
  async generateAPIKey(config: APIKeyConfig, organizationId: string, userId: string): Promise<APIKey> {
    try {
      // Generate secure API key
      const keyId = crypto.randomUUID();
      const keySecret = this.generateSecureKey();
      const apiKey = `tbk_${keyId.replace(/-/g, '')}_${keySecret}`;

      // Validate permissions
      this.validatePermissions(config.permissions);

      // Create API key record
      const newAPIKey = {
        id: uuidv4(),
        key: await this.hashAPIKey(apiKey),
        name: config.name,
        organization_id: organizationId,
        user_id: userId,
        permissions: config.permissions,
        is_active: true,
        expires_at: config.expiresAt?.toISOString() || null,
        last_used_at: null,
        usage_count: 0,
        rate_limit: config.rateLimit || null,
        ip_whitelist: config.ipWhitelist || null,
        allowed_endpoints: config.allowedEndpoints || null,
        metadata: config.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Store in database
      const { data: apiKeyRecord, error } = await supabaseAdmin
        .from('api_keys')
        .insert(newAPIKey)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create API key: ${error.message}`);
      }

      // Log API key creation
      console.log(`API key created: ${config.name} for organization ${organizationId}`);

      return {
        id: apiKeyRecord.id,
        key: apiKey, // Return the plain key only once
        name: apiKeyRecord.name,
        organizationId: apiKeyRecord.organization_id,
        userId: apiKeyRecord.user_id,
        permissions: apiKeyRecord.permissions,
        isActive: apiKeyRecord.is_active,
        expiresAt: apiKeyRecord.expires_at ? new Date(apiKeyRecord.expires_at) : undefined,
        lastUsedAt: apiKeyRecord.last_used_at ? new Date(apiKeyRecord.last_used_at) : undefined,
        usageCount: apiKeyRecord.usage_count,
        rateLimit: apiKeyRecord.rate_limit,
        ipWhitelist: apiKeyRecord.ip_whitelist,
        allowedEndpoints: apiKeyRecord.allowed_endpoints,
        metadata: apiKeyRecord.metadata || {},
        createdAt: new Date(apiKeyRecord.created_at),
        updatedAt: new Date(apiKeyRecord.updated_at),
      };
    } catch (error) {
      console.error('API key generation error:', error);
      throw error;
    }
  }

  // Authenticate API key
  async authenticateAPIKey(apiKey: string): Promise<APIKey | null> {
    try {
      if (!apiKey || !apiKey.startsWith('tbk_')) {
        return null;
      }

      const hashedKey = await this.hashAPIKey(apiKey);

      // Fetch API key from database
      const { data: keyRecord, error } = await supabaseAdmin
        .from('api_keys')
        .select('*')
        .eq('key', hashedKey)
        .eq('is_active', true)
        .single();

      if (error || !keyRecord) {
        return null;
      }

      // Check expiration
      if (keyRecord.expires_at && new Date() > new Date(keyRecord.expires_at)) {
        await this.deactivateAPIKey(keyRecord.id);
        return null;
      }

      // Update last used timestamp
      await this.updateLastUsed(keyRecord.id);

      return {
        id: keyRecord.id,
        key: hashedKey,
        name: keyRecord.name,
        organizationId: keyRecord.organization_id,
        userId: keyRecord.user_id,
        permissions: keyRecord.permissions,
        isActive: keyRecord.is_active,
        expiresAt: keyRecord.expires_at ? new Date(keyRecord.expires_at) : undefined,
        lastUsedAt: keyRecord.last_used_at ? new Date(keyRecord.last_used_at) : undefined,
        usageCount: keyRecord.usage_count,
        rateLimit: keyRecord.rate_limit,
        ipWhitelist: keyRecord.ip_whitelist,
        allowedEndpoints: keyRecord.allowed_endpoints,
        metadata: keyRecord.metadata || {},
        createdAt: new Date(keyRecord.created_at),
        updatedAt: new Date(keyRecord.updated_at),
      };
    } catch (error) {
      console.error('API key authentication error:', error);
      return null;
    }
  }

  // API key authentication middleware
  requireAPIKey(requiredPermissions: APIKeyPermission[] = []) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const apiKey = this.extractAPIKey(req);
        
        if (!apiKey) {
          res.status(401).json({
            error: 'API_KEY_MISSING',
            message: 'API key is required',
            code: 'AUTH_API_KEY_MISSING',
          });
          return;
        }

        // Authenticate API key
        const keyData = await this.authenticateAPIKey(apiKey);
        
        if (!keyData) {
          res.status(401).json({
            error: 'API_KEY_INVALID',
            message: 'Invalid or expired API key',
            code: 'AUTH_API_KEY_INVALID',
          });
          return;
        }

        // Check IP whitelist
        if (keyData.ipWhitelist && keyData.ipWhitelist.length > 0) {
          const clientIP = req.ip || 'unknown';
          if (!keyData.ipWhitelist.includes(clientIP)) {
            res.status(403).json({
              error: 'IP_NOT_ALLOWED',
              message: 'Your IP address is not allowed for this API key',
              code: 'AUTH_IP_RESTRICTED',
            });
            return;
          }
        }

        // Check endpoint permissions
        if (keyData.allowedEndpoints && keyData.allowedEndpoints.length > 0) {
          const endpoint = req.path;
          const isAllowed = keyData.allowedEndpoints.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(endpoint);
          });

          if (!isAllowed) {
            res.status(403).json({
              error: 'ENDPOINT_NOT_ALLOWED',
              message: 'This API key cannot access this endpoint',
              code: 'AUTH_ENDPOINT_RESTRICTED',
            });
            return;
          }
        }

        // Check required permissions
        if (requiredPermissions.length > 0) {
          const hasPermission = requiredPermissions.every(permission => 
            keyData.permissions.includes(permission) || keyData.permissions.includes('admin')
          );

          if (!hasPermission) {
            res.status(403).json({
              error: 'INSUFFICIENT_PERMISSIONS',
              message: `Required permissions: ${requiredPermissions.join(', ')}`,
              code: 'AUTH_INSUFFICIENT_PERMISSIONS',
            });
            return;
          }
        }

        // Apply rate limiting if configured
        if (keyData.rateLimit) {
          const rateLimiter = this.rateLimitService.createLimiter({
            windowMs: keyData.rateLimit.windowMs,
            maxRequests: keyData.rateLimit.requests,
            keyGenerator: () => `api_key:${keyData.id}`,
            message: 'API key rate limit exceeded',
          });

          await new Promise<void>((resolve, reject) => {
            rateLimiter(req, res, (error) => {
              if (error) reject(error);
              else resolve();
            });
          });
        }

        // Add API key context to request
        req.apiKey = keyData;
        req.user = {
          id: keyData.userId,
          apiKeyAuth: true,
          permissions: keyData.permissions,
        };
        req.organizationId = keyData.organizationId;

        // Track usage
        this.trackAPIKeyUsage(keyData.id, req, res);

        // Set response headers
        res.set({
          'X-API-Key-Name': keyData.name,
          'X-API-Key-Permissions': keyData.permissions.join(','),
          'X-Rate-Limit-Remaining': res.get('X-RateLimit-Remaining') || 'unlimited',
        });

        next();
      } catch (error) {
        console.error('API key middleware error:', error);
        res.status(500).json({
          error: 'API_KEY_AUTH_ERROR',
          message: 'API key authentication failed',
        });
      }
    };
  }

  // Revoke API key
  async revokeAPIKey(keyId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('api_keys')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', keyId)
        .eq('user_id', userId);

      if (error) {
        console.error('API key revocation error:', error);
        return false;
      }

      console.log(`API key revoked: ${keyId}`);
      return true;
    } catch (error) {
      console.error('API key revocation error:', error);
      return false;
    }
  }

  // List API keys for user/organization
  async listAPIKeys(organizationId: string, userId?: string): Promise<Omit<APIKey, 'key'>[]> {
    try {
      let query = supabaseAdmin
        .from('api_keys')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: keys, error } = await query;

      if (error) {
        throw new Error(`Failed to list API keys: ${error.message}`);
      }

      return keys.map(key => ({
        id: key.id,
        key: '••••••••', // Mask the key
        name: key.name,
        organizationId: key.organization_id,
        userId: key.user_id,
        permissions: key.permissions,
        isActive: key.is_active,
        expiresAt: key.expires_at ? new Date(key.expires_at) : undefined,
        lastUsedAt: key.last_used_at ? new Date(key.last_used_at) : undefined,
        usageCount: key.usage_count,
        rateLimit: key.rate_limit,
        ipWhitelist: key.ip_whitelist,
        allowedEndpoints: key.allowed_endpoints,
        metadata: key.metadata || {},
        createdAt: new Date(key.created_at),
        updatedAt: new Date(key.updated_at),
      }));
    } catch (error) {
      console.error('List API keys error:', error);
      throw error;
    }
  }

  // Get API key usage statistics
  async getAPIKeyUsage(keyId: string, days: number = 30): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
    dailyUsage: Array<{ date: string; requests: number }>;
  }> {
    try {
      const { data: usage, error } = await supabaseAdmin
        .from('api_key_usage')
        .select('*')
        .eq('key_id', keyId)
        .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        throw new Error(`Failed to get API key usage: ${error.message}`);
      }

      const totalRequests = usage.length;
      const successfulRequests = usage.filter(u => u.response_status < 400).length;
      const failedRequests = totalRequests - successfulRequests;
      const averageResponseTime = usage.reduce((sum, u) => sum + u.response_time, 0) / totalRequests || 0;

      // Group by endpoint
      const endpointCounts = usage.reduce((acc, u) => {
        acc[u.endpoint] = (acc[u.endpoint] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topEndpoints = Object.entries(endpointCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count: count as number }));

      // Group by day
      const dailyUsage = usage.reduce((acc, u) => {
        const date = new Date(u.timestamp).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const dailyUsageArray = Object.entries(dailyUsage)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, requests]) => ({ date, requests: requests as number }));

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        topEndpoints,
        dailyUsage: dailyUsageArray,
      };
    } catch (error) {
      console.error('API key usage statistics error:', error);
      throw error;
    }
  }

  // Private helper methods
  private generateSecureKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async hashAPIKey(apiKey: string): Promise<string> {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  private extractAPIKey(req: Request): string | null {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token.startsWith('tbk_')) {
        return token;
      }
    }

    // Check X-API-Key header
    const apiKeyHeader = req.headers['x-api-key'] as string;
    if (apiKeyHeader && apiKeyHeader.startsWith('tbk_')) {
      return apiKeyHeader;
    }

    // Check query parameter (less secure, for webhooks only)
    const queryKey = req.query.api_key as string;
    if (queryKey && queryKey.startsWith('tbk_')) {
      return queryKey;
    }

    return null;
  }

  private validatePermissions(permissions: APIKeyPermission[]): void {
    const validPermissions: APIKeyPermission[] = [
      'read', 'write', 'delete', 'execute', 'admin', 'webhook', 'analytics', 'ai', 'export', 'integration'
    ];

    for (const permission of permissions) {
      if (!validPermissions.includes(permission)) {
        throw new Error(`Invalid permission: ${permission}`);
      }
    }
  }

  private async updateLastUsed(keyId: string): Promise<void> {
    await supabaseAdmin
      .from('api_keys')
      .update({
        last_used_at: new Date().toISOString(),
        usage_count: supabaseAdmin.rpc('increment_usage_count', { key_id: keyId }),
      })
      .eq('id', keyId);
  }

  private async deactivateAPIKey(keyId: string): Promise<void> {
    await supabaseAdmin
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId);
  }

  private trackAPIKeyUsage(keyId: string, req: Request, res: Response): void {
    const startTime = Date.now();
    
    res.on('finish', async () => {
      try {
        const responseTime = Date.now() - startTime;
        
        await supabaseAdmin
          .from('api_key_usage')
          .insert({
            key_id: keyId,
            endpoint: req.path,
            method: req.method,
            ip: req.ip || 'unknown',
            user_agent: req.headers['user-agent'] || 'unknown',
            response_status: res.statusCode,
            response_time: responseTime,
            timestamp: new Date().toISOString(),
          });
      } catch (error) {
        console.error('API key usage tracking error:', error);
      }
    });
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      apiKey?: APIKey;
    }
  }
}