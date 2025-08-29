import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/database';

// CSRF Configuration
interface CSRFConfig {
  tokenLength: number;
  cookieName: string;
  headerName: string;
  sessionKey: string;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  httpOnly: boolean;
  maxAge: number;
  ignoreMethods: string[];
  origin: string | string[] | RegExp;
}

// Default CSRF configuration
const defaultCSRFConfig: CSRFConfig = {
  tokenLength: 32,
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
  sessionKey: 'csrfToken',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  httpOnly: false, // Frontend needs to read this
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
};

// In-memory token store (use Redis in production)
const tokenStore = new Map<string, {
  token: string;
  userId?: string;
  createdAt: number;
  lastUsed: number;
}>();

export class CSRFProtection {
  private config: CSRFConfig;

  constructor(config: Partial<CSRFConfig> = {}) {
    this.config = { ...defaultCSRFConfig, ...config };
  }

  // Generate CSRF token
  generateToken(userId?: string): string {
    const token = crypto.randomBytes(this.config.tokenLength).toString('hex');
    const now = Date.now();
    
    // Store token with metadata
    tokenStore.set(token, {
      token,
      userId,
      createdAt: now,
      lastUsed: now,
    });

    // Cleanup old tokens
    this.cleanupExpiredTokens();

    return token;
  }

  // Validate CSRF token
  validateToken(token: string, userId?: string): boolean {
    if (!token) {
      return false;
    }

    const tokenData = tokenStore.get(token);
    if (!tokenData) {
      return false;
    }

    // Check if token is expired
    const now = Date.now();
    if (now - tokenData.createdAt > this.config.maxAge) {
      tokenStore.delete(token);
      return false;
    }

    // Check user association if provided
    if (userId && tokenData.userId && tokenData.userId !== userId) {
      return false;
    }

    // Update last used timestamp
    tokenData.lastUsed = now;
    tokenStore.set(token, tokenData);

    return true;
  }

  // CSRF protection middleware
  protect() {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        // Skip CSRF protection for safe methods
        if (this.config.ignoreMethods.includes(req.method)) {
          return next();
        }

        // Skip for API key authentication
        if (req.headers['x-api-key']) {
          return next();
        }

        // Get token from header or body
        const headerToken = req.headers[this.config.headerName] as string;
        const bodyToken = req.body?._csrf;
        const token = headerToken || bodyToken;

        if (!token) {
          res.status(403).json({
            error: 'CSRF_TOKEN_MISSING',
            message: 'CSRF token is required',
            code: 'CSRF_PROTECTION',
          });
          return;
        }

        // Validate token
        const userId = req.user?.id;
        const isValid = this.validateToken(token, userId);

        if (!isValid) {
          // Log potential CSRF attack
          console.warn('CSRF token validation failed', {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            path: req.path,
            method: req.method,
            userId,
            token: token.substring(0, 8) + '...', // Partial token for logging
            timestamp: new Date().toISOString(),
          });

          res.status(403).json({
            error: 'CSRF_TOKEN_INVALID',
            message: 'Invalid or expired CSRF token',
            code: 'CSRF_PROTECTION',
          });
          return;
        }

        next();
      } catch (error) {
        console.error('CSRF protection error:', error);
        res.status(500).json({
          error: 'CSRF_ERROR',
          message: 'CSRF protection failed',
        });
      }
    };
  }

  // Generate and set CSRF token endpoint
  generateTokenEndpoint() {
    return (req: Request, res: Response): void => {
      try {
        const userId = req.user?.id;
        const token = this.generateToken(userId);

        // Set cookie if configured
        if (this.config.cookieName) {
          res.cookie(this.config.cookieName, token, {
            secure: this.config.secure,
            sameSite: this.config.sameSite,
            httpOnly: this.config.httpOnly,
            maxAge: this.config.maxAge,
            path: '/',
          });
        }

        res.json({
          csrfToken: token,
          headerName: this.config.headerName,
          expires: new Date(Date.now() + this.config.maxAge).toISOString(),
        });
      } catch (error) {
        console.error('CSRF token generation error:', error);
        res.status(500).json({
          error: 'CSRF_GENERATION_ERROR',
          message: 'Failed to generate CSRF token',
        });
      }
    };
  }

  // Cleanup expired tokens
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    const expiredTokens: string[] = [];

    for (const [token, data] of tokenStore.entries()) {
      if (now - data.createdAt > this.config.maxAge) {
        expiredTokens.push(token);
      }
    }

    expiredTokens.forEach(token => tokenStore.delete(token));

    if (expiredTokens.length > 0) {
      console.log(`Cleaned up ${expiredTokens.length} expired CSRF tokens`);
    }
  }

  // Get token statistics
  getStats(): {
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
  } {
    const now = Date.now();
    let activeTokens = 0;
    let expiredTokens = 0;

    for (const [, data] of tokenStore.entries()) {
      if (now - data.createdAt > this.config.maxAge) {
        expiredTokens++;
      } else {
        activeTokens++;
      }
    }

    return {
      totalTokens: tokenStore.size,
      activeTokens,
      expiredTokens,
    };
  }
}

// Enhanced CORS configuration for production
export interface CORSConfig {
  origin: string | string[] | RegExp | ((origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void);
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
}

export class CORSService {
  private config: CORSConfig;
  private allowedOrigins: Set<string>;
  private trustedDomains: Set<string>;

  constructor() {
    // Initialize allowed origins from environment
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const additionalOrigins = process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : [];

    this.allowedOrigins = new Set([frontendUrl, ...additionalOrigins]);
    
    // Trusted domains for subdomain matching
    this.trustedDomains = new Set([
      'testbro.ai',
      'app.testbro.ai',
      'api.testbro.ai',
      'localhost',
    ]);

    this.config = {
      origin: this.dynamicOriginChecker.bind(this),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-CSRF-Token',
        'X-API-Key',
        'X-Client-Version',
        'Accept',
        'Origin',
        'DNT',
        'User-Agent',
        'If-Modified-Since',
        'Cache-Control',
        'Range',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Total-Count',
        'X-Page-Count',
        'X-Current-Page',
        'X-Request-ID',
      ],
      credentials: true,
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 204,
    };
  }

  // Dynamic origin checker with security features
  private dynamicOriginChecker(
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void
  ): void {
    try {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check against allowed origins list
      if (this.allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      // Check if origin matches trusted domain pattern
      if (this.isOriginFromTrustedDomain(origin)) {
        return callback(null, true);
      }

      // Development mode - allow localhost with any port
      if (process.env.NODE_ENV === 'development' && this.isLocalhost(origin)) {
        return callback(null, true);
      }

      // Log rejected origin for security monitoring
      console.warn('CORS: Rejected origin', {
        origin,
        timestamp: new Date().toISOString(),
        reason: 'Not in allowed origins list',
      });

      callback(null, false);
    } catch (error) {
      console.error('CORS origin check error:', error);
      callback(error, false);
    }
  }

  // Check if origin is from trusted domain
  private isOriginFromTrustedDomain(origin: string): boolean {
    try {
      const url = new URL(origin);
      const hostname = url.hostname;

      for (const trustedDomain of this.trustedDomains) {
        if (hostname === trustedDomain || hostname.endsWith(`.${trustedDomain}`)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.warn('Invalid origin URL:', origin);
      return false;
    }
  }

  // Check if origin is localhost
  private isLocalhost(origin: string): boolean {
    try {
      const url = new URL(origin);
      return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
    } catch (error) {
      return false;
    }
  }

  // Get CORS configuration
  getConfig(): CORSConfig {
    return this.config;
  }

  // Add allowed origin
  addAllowedOrigin(origin: string): void {
    this.allowedOrigins.add(origin);
    console.log(`Added allowed origin: ${origin}`);
  }

  // Remove allowed origin
  removeAllowedOrigin(origin: string): void {
    this.allowedOrigins.delete(origin);
    console.log(`Removed allowed origin: ${origin}`);
  }

  // Get allowed origins list
  getAllowedOrigins(): string[] {
    return Array.from(this.allowedOrigins);
  }

  // Enhanced CORS middleware with security logging
  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const origin = req.headers.origin;

      // Set security headers
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      });

      // Apply CORS headers
      this.applyCORSHeaders(req, res);

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(this.config.optionsSuccessStatus).end();
        return;
      }

      // Log cross-origin requests for monitoring
      if (origin && origin !== req.headers.host) {
        console.log('Cross-origin request', {
          origin,
          method: req.method,
          path: req.path,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
        });
      }

      next();
    };
  }

  // Apply CORS headers
  private applyCORSHeaders(req: Request, res: Response): void {
    const origin = req.headers.origin;

    // Check origin dynamically
    this.dynamicOriginChecker(origin, (error, allowed) => {
      if (error || !allowed) {
        // Don't set CORS headers for disallowed origins
        return;
      }

      if (origin) {
        res.set('Access-Control-Allow-Origin', origin);
      }

      res.set({
        'Access-Control-Allow-Methods': this.config.methods.join(', '),
        'Access-Control-Allow-Headers': this.config.allowedHeaders.join(', '),
        'Access-Control-Expose-Headers': this.config.exposedHeaders.join(', '),
        'Access-Control-Allow-Credentials': this.config.credentials.toString(),
        'Access-Control-Max-Age': this.config.maxAge.toString(),
      });
    });
  }
}

// Export instances
export const csrfProtection = new CSRFProtection();
export const corsService = new CORSService();

export default {
  CSRFProtection,
  CORSService,
  csrfProtection,
  corsService,
};