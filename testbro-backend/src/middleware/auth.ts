import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/database';
import { User } from '../types';
import crypto from 'crypto';

// Session storage for token blacklisting (in production, use Redis)
const blacklistedTokens = new Set<string>();
const activeSessions = new Map<string, { userId: string; expiresAt: number; lastActive: number }>();

// Extend Express Request interface to include user and security context
declare global {
  namespace Express {
    interface Request {
      user?: any;
      organizationId?: string;
      projectId?: string;
      sessionId?: string;
      tokenVersion?: number;
    }
  }
}

// JWT payload structure from Supabase with enhanced security fields
interface SupabaseJWTPayload {
  aud: string;
  exp: number;
  iat: number;
  sub: string; // User ID
  email?: string;
  phone?: string;
  app_metadata: Record<string, any>;
  user_metadata: Record<string, any>;
  role?: string;
  session_id?: string;
  token_version?: number;
}

// Security configuration
const SECURITY_CONFIG = {
  MAX_SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  TOKEN_REFRESH_THRESHOLD: 30 * 60 * 1000, // 30 minutes before expiry
  MAX_CONCURRENT_SESSIONS: 5,
  BRUTE_FORCE_WINDOW: 15 * 60 * 1000, // 15 minutes
  MAX_FAILED_ATTEMPTS: 5,
};

// API Key authentication middleware
export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKeyHeader = req.headers['x-api-key'] as string;
    const authHeader = req.headers.authorization;

    let apiKey: string | null = null;

    // Check for API key in header or Bearer token
    if (apiKeyHeader) {
      apiKey = apiKeyHeader;
    } else if (authHeader && authHeader.startsWith('Bearer ') && authHeader.includes('tb_sk_')) {
      apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    if (!apiKey) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'API key required',
        code: 'API_KEY_MISSING',
      });
      return;
    }

    // Verify API key with database
    const { data: apiKeyData, error } = await supabaseAdmin
      .from('api_keys')
      .select(`
        *,
        organizations!inner (
          id,
          name
        )
      `)
      .eq('key_hash', createApiKeyHash(apiKey))
      .eq('status', 'active')
      .single();

    if (error || !apiKeyData) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid API key',
        code: 'API_KEY_INVALID',
      });
      return;
    }

    // Check expiration
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'API key has expired',
        code: 'API_KEY_EXPIRED',
      });
      return;
    }

    // Check rate limiting if configured
    if (apiKeyData.rate_limit) {
      const rateLimitKey = `api_key_${apiKeyData.id}`;
      // Implement rate limiting logic here
    }

    // Set API context
    req.user = {
      id: apiKeyData.created_by,
      apiKey: true,
      apiKeyId: apiKeyData.id,
      organizationId: apiKeyData.organization_id,
      permissions: apiKeyData.permissions || [],
    };

    req.organizationId = apiKeyData.organization_id;

    // Log API key usage
    console.log(`API key used: ${apiKeyData.name} (${apiKeyData.id}) from ${req.ip}`);

    // Update last used timestamp
    await supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'API key authentication failed',
      code: 'API_AUTH_SYSTEM_ERROR',
    });
  }
};

// Combined authentication middleware (JWT or API Key)
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];

  // Check if API key is provided
  if (apiKeyHeader || (authHeader && authHeader.includes('tb_sk_'))) {
    return authenticateApiKey(req, res, next);
  }

  // Default to JWT authentication
  return authenticateUser(req, res, next);
};

// Helper function to create API key hash
const createApiKeyHash = (apiKey: string): string => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header',
        code: 'AUTH_HEADER_MISSING',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Check if token is blacklisted
    if (blacklistedTokens.has(token)) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Token has been revoked',
        code: 'TOKEN_REVOKED',
      });
      return;
    }

    // Verify JWT token with Supabase
    const { data: userData, error: verifyError } = await supabaseAdmin.auth.getUser(token);

    if (verifyError || !userData.user) {
      // Add to blacklist if invalid
      blacklistedTokens.add(token);
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        code: 'TOKEN_INVALID',
      });
      return;
    }

    // Additional JWT payload validation for enhanced security
    try {
      const decoded = jwt.decode(token) as SupabaseJWTPayload;
      if (decoded) {
        // Check token expiration with buffer
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < now) {
          blacklistedTokens.add(token);
          res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Token has expired',
            code: 'TOKEN_EXPIRED',
          });
          return;
        }

        // Check if token is close to expiry and suggest refresh
        const timeToExpiry = (decoded.exp - now) * 1000;
        if (timeToExpiry < SECURITY_CONFIG.TOKEN_REFRESH_THRESHOLD) {
          res.set('X-Token-Refresh-Suggested', 'true');
          res.set('X-Token-Expires-In', timeToExpiry.toString());
        }

        // Session management
        if (decoded.session_id) {
          req.sessionId = decoded.session_id;
          
          // Update session activity
          activeSessions.set(decoded.session_id, {
            userId: userData.user.id,
            expiresAt: decoded.exp * 1000,
            lastActive: Date.now(),
          });
        }
      }
    } catch (jwtError) {
      console.warn('JWT decode error (non-critical):', jwtError);
    }

    // Enhanced user object with security context
    req.user = {
      id: userData.user.id,
      email: userData.user.email || '',
      user_metadata: userData.user.user_metadata || {},
      app_metadata: userData.user.app_metadata || {},
      created_at: userData.user.created_at,
      updated_at: userData.user.updated_at,
      
      // Security context
      lastLoginAt: userData.user.last_sign_in_at,
      emailConfirmed: userData.user.email_confirmed_at !== null,
      role: userData.user.role,
    };

    // Add security headers
    res.set({
      'X-User-ID': userData.user.id,
      'X-Session-Active': 'true',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
    });

    // Log authentication for audit
    console.log(`User authenticated: ${userData.user.id} from ${clientIp} using ${userAgent}`);

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Authentication failed',
      code: 'AUTH_SYSTEM_ERROR',
    });
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: userData } = await supabaseAdmin.auth.getUser(token);

      if (userData.user) {
        req.user = {
          id: userData.user.id,
          email: userData.user.email || '',
          user_metadata: userData.user.user_metadata || {},
          app_metadata: userData.user.app_metadata || {},
          created_at: userData.user.created_at,
          updated_at: userData.user.updated_at,
        };
      }
    }

    next();
  } catch (error) {
    // Don't fail for optional auth, just continue without user
    console.warn('Optional auth failed:', error);
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (requiredRole: 'admin' | 'editor' | 'viewer') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
        return;
      }

      // Get user's role from organization membership
      const { data: membership, error } = await supabaseAdmin
        .from('organization_members')
        .select('role')
        .eq('user_id', req.user.id)
        .eq('organization_id', req.organizationId || req.params.organizationId)
        .single();

      if (error || !membership) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'User is not a member of this organization',
        });
        return;
      }

      const roleHierarchy = { viewer: 1, editor: 2, admin: 3 };
      const userRole = membership.role as keyof typeof roleHierarchy;
      const requiredRoleLevel = roleHierarchy[requiredRole];

      if (roleHierarchy[userRole] < requiredRoleLevel) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: `Insufficient permissions. Required: ${requiredRole}, Current: ${userRole}`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Authorization failed',
      });
    }
  };
};

// Project ownership/membership check
export const requireProjectAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    const projectId = req.params.projectId || req.projectId;
    if (!projectId) {
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Project ID is required',
      });
      return;
    }

    // Check if user has access to the project
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Project not found',
      });
      return;
    }

    // Check organization membership
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('user_id', req.user.id)
      .eq('organization_id', project.organization_id)
      .single();

    if (membershipError || !membership) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Access denied to this project',
      });
      return;
    }

    req.organizationId = project.organization_id;
    next();
  } catch (error) {
    console.error('Project access check error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Access check failed',
    });
  }
};

// Rate limiting middleware (basic implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
            const key = req.user?.id || req.ip || 'anonymous';
        const now = Date.now();
        const _windowStart = now - windowMs;

    const userRequests = requestCounts.get(key) || { count: 0, resetTime: now + windowMs };

    // Reset counter if window has passed
    if (userRequests.resetTime <= now) {
      userRequests.count = 0;
      userRequests.resetTime = now + windowMs;
    }

    userRequests.count++;
    requestCounts.set(key, userRequests);

    // Set headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - userRequests.count).toString(),
      'X-RateLimit-Reset': new Date(userRequests.resetTime).toISOString(),
    });

    if (userRequests.count > maxRequests) {
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
};

// Token and session management utilities
export const tokenUtils = {
  // Blacklist a token (logout, security breach, etc.)
  blacklistToken: (token: string): void => {
    blacklistedTokens.add(token);
    
    // Clean up old tokens periodically (in production, use Redis with TTL)
    if (blacklistedTokens.size > 10000) {
      const tokensArray = Array.from(blacklistedTokens);
      const toKeep = tokensArray.slice(-5000); // Keep latest 5000
      blacklistedTokens.clear();
      toKeep.forEach(t => blacklistedTokens.add(t));
    }
  },

  // Check if token is blacklisted
  isTokenBlacklisted: (token: string): boolean => {
    return blacklistedTokens.has(token);
  },

  // Invalidate all sessions for a user
  invalidateUserSessions: (userId: string): void => {
    for (const [sessionId, session] of activeSessions.entries()) {
      if (session.userId === userId) {
        activeSessions.delete(sessionId);
      }
    }
  },

  // Get active session count for user
  getUserSessionCount: (userId: string): number => {
    let count = 0;
    for (const session of activeSessions.values()) {
      if (session.userId === userId && session.expiresAt > Date.now()) {
        count++;
      }
    }
    return count;
  },

  // Clean up expired sessions
  cleanupExpiredSessions: (): void => {
    const now = Date.now();
    for (const [sessionId, session] of activeSessions.entries()) {
      if (session.expiresAt < now) {
        activeSessions.delete(sessionId);
      }
    }
  },

  // Generate secure session ID
  generateSessionId: (): string => {
    return crypto.randomBytes(32).toString('hex');
  },
};

// Enhanced rate limiting with Redis-like behavior (in-memory for now)
const rateLimitStore = new Map<string, {
  count: number;
  resetTime: number;
  blocked: boolean;
  failedAttempts: number;
}>();

// Brute force protection
export const bruteForceProtection = (
  identifier: string, // IP or user ID
  isFailedAttempt: boolean = false
): { allowed: boolean; retryAfter?: number; reason?: string } => {
  const now = Date.now();
  const record = rateLimitStore.get(identifier) || {
    count: 0,
    resetTime: now + SECURITY_CONFIG.BRUTE_FORCE_WINDOW,
    blocked: false,
    failedAttempts: 0,
  };

  // Reset if window has passed
  if (record.resetTime <= now) {
    record.count = 0;
    record.failedAttempts = 0;
    record.blocked = false;
    record.resetTime = now + SECURITY_CONFIG.BRUTE_FORCE_WINDOW;
  }

  if (isFailedAttempt) {
    record.failedAttempts++;
    if (record.failedAttempts >= SECURITY_CONFIG.MAX_FAILED_ATTEMPTS) {
      record.blocked = true;
      record.resetTime = now + (SECURITY_CONFIG.BRUTE_FORCE_WINDOW * 2); // Double the block time
    }
  } else {
    // Successful attempt, reset failed attempts
    record.failedAttempts = Math.max(0, record.failedAttempts - 1);
  }

  record.count++;
  rateLimitStore.set(identifier, record);

  if (record.blocked) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
      reason: 'TOO_MANY_FAILED_ATTEMPTS',
    };
  }

  return { allowed: true };
};

// Security middleware for sensitive operations
export const requireSecurityValidation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required for security validation',
      });
      return;
    }

    const userAgent = req.headers['user-agent'] || 'unknown';
    const clientIp = req.ip || 'unknown';
    const userId = req.user.id;

    // Check for suspicious activity patterns
    const sessionCount = tokenUtils.getUserSessionCount(userId);
    if (sessionCount > SECURITY_CONFIG.MAX_CONCURRENT_SESSIONS) {
      res.status(429).json({
        error: 'TOO_MANY_SESSIONS',
        message: 'Maximum concurrent sessions exceeded',
        code: 'SECURITY_SESSION_LIMIT',
      });
      return;
    }

    // Check brute force protection
    const bruteForceCheck = bruteForceProtection(clientIp);
    if (!bruteForceCheck.allowed) {
      res.status(429).json({
        error: 'RATE_LIMITED',
        message: 'Too many requests from this IP',
        retryAfter: bruteForceCheck.retryAfter,
        code: bruteForceCheck.reason,
      });
      return;
    }

    // Add security context to request
    req.sessionId = req.sessionId || tokenUtils.generateSessionId();
    
    // Security headers for sensitive operations
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });

    next();
  } catch (error) {
    console.error('Security validation error:', error);
    res.status(500).json({
      error: 'SECURITY_ERROR',
      message: 'Security validation failed',
    });
  }
};

// Cleanup function to be called periodically
export const performSecurityCleanup = (): void => {
  tokenUtils.cleanupExpiredSessions();
  
  // Clean up old rate limit records
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetTime < now && !record.blocked) {
      rateLimitStore.delete(key);
    }
  }
  
  console.log(`Security cleanup completed: ${activeSessions.size} active sessions, ${blacklistedTokens.size} blacklisted tokens`);
};
