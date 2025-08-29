import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import crypto from 'crypto';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;          // Time window in milliseconds
  maxRequests: number;       // Maximum requests per window
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  statusCode?: number;
  headers?: boolean;
  whitelist?: string[];      // IPs to whitelist
  onLimitReached?: (req: Request) => void;
}

interface RateLimitInfo {
  totalHits: number;
  totalRemainingRequests: number;
  resetTime: Date;
  windowStartTime: Date;
}

// Redis-based rate limiting store
class RedisRateLimitStore {
  private redis: Redis;
  private keyPrefix: string;

  constructor(redisClient: Redis, keyPrefix = 'rate_limit:') {
    this.redis = redisClient;
    this.keyPrefix = keyPrefix;
  }

  async increment(key: string, windowMs: number): Promise<RateLimitInfo> {
    const redisKey = this.keyPrefix + key;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    
    // Remove expired entries
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    
    // Add current request
    const requestId = `${now}-${crypto.randomBytes(4).toString('hex')}`;
    pipeline.zadd(redisKey, now, requestId);
    
    // Get count of requests in current window
    pipeline.zcard(redisKey);
    
    // Set expiration for cleanup
    pipeline.expire(redisKey, Math.ceil(windowMs / 1000) + 1);

    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    const totalHits = results[2][1] as number;
    const resetTime = new Date(now + windowMs);
    const windowStartTime = new Date(windowStart);

    return {
      totalHits,
      totalRemainingRequests: Math.max(0, totalHits),
      resetTime,
      windowStartTime,
    };
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(this.keyPrefix + key);
  }

  async getAllKeys(): Promise<string[]> {
    const keys = await this.redis.keys(this.keyPrefix + '*');
    return keys.map(key => key.replace(this.keyPrefix, ''));
  }

  async getInfo(key: string): Promise<RateLimitInfo | null> {
    const redisKey = this.keyPrefix + key;
    const now = Date.now();
    
    const count = await this.redis.zcard(redisKey);
    if (count === 0) {
      return null;
    }

    return {
      totalHits: count,
      totalRemainingRequests: count,
      resetTime: new Date(now + 60000), // Default 1 minute
      windowStartTime: new Date(now - 60000),
    };
  }
}

// Enhanced rate limiting service
export class RateLimitService {
  private store: RedisRateLimitStore;
  private redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
    this.store = new RedisRateLimitStore(redisClient);
  }

  // Create rate limiting middleware
  createLimiter(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Generate key for rate limiting
        const key = config.keyGenerator ? config.keyGenerator(req) : this.defaultKeyGenerator(req);
        
        // Check whitelist
        if (config.whitelist && this.isWhitelisted(req, config.whitelist)) {
          return next();
        }

        // Get current rate limit info
        const info = await this.store.increment(key, config.windowMs);
        
        // Set headers if enabled
        if (config.headers !== false) {
          this.setHeaders(res, info, config);
        }

        // Check if limit exceeded
        if (info.totalHits > config.maxRequests) {
          // Call limit reached callback
          if (config.onLimitReached) {
            config.onLimitReached(req);
          }

          // Log rate limit violation
          console.warn(`Rate limit exceeded for key: ${key}`, {
            key,
            requests: info.totalHits,
            limit: config.maxRequests,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            path: req.path,
          });

          res.status(config.statusCode || 429).json({
            error: 'RATE_LIMIT_EXCEEDED',
            message: config.message || 'Too many requests, please try again later.',
            retryAfter: Math.ceil((info.resetTime.getTime() - Date.now()) / 1000),
            limit: config.maxRequests,
            remaining: Math.max(0, config.maxRequests - info.totalHits),
            resetTime: info.resetTime.toISOString(),
          });
          return;
        }

        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        // On error, allow request to proceed (fail open)
        next();
      }
    };
  }

  // Adaptive rate limiting based on user behavior
  createAdaptiveLimiter(baseConfig: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const userId = req.user?.id;
        const ip = req.ip || 'unknown';
        
        // Adjust limits based on user reputation
        const adjustedConfig = await this.adjustLimitsForUser(baseConfig, userId, ip);
        
        const limiter = this.createLimiter(adjustedConfig);
        await limiter(req, res, next);
      } catch (error) {
        console.error('Adaptive rate limiting error:', error);
        next();
      }
    };
  }

  // Brute force protection with progressive delays
  createBruteForceProtection(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const key = `brute_force:${req.ip}`;
        const info = await this.store.increment(key, windowMs);

        if (info.totalHits > maxAttempts) {
          // Progressive delay based on attempts
          const delayMultiplier = Math.min(info.totalHits - maxAttempts, 10);
          const delay = delayMultiplier * 1000; // 1 second per extra attempt

          res.status(429).json({
            error: 'BRUTE_FORCE_DETECTED',
            message: 'Too many failed attempts. Account temporarily locked.',
            retryAfter: Math.ceil((info.resetTime.getTime() - Date.now()) / 1000) + delay,
            attemptsRemaining: 0,
            lockoutTime: info.resetTime.toISOString(),
          });
          return;
        }

        // Add metadata for downstream middleware
        req.rateLimitInfo = {
          attempts: info.totalHits,
          remaining: maxAttempts - info.totalHits,
          resetTime: info.resetTime,
        };

        next();
      } catch (error) {
        console.error('Brute force protection error:', error);
        next();
      }
    };
  }

  // API endpoint specific rate limiting
  createAPILimiter() {
    const endpointLimits = new Map([
      // Authentication endpoints (strict)
      ['/api/auth/login', { windowMs: 15 * 60 * 1000, maxRequests: 5 }],
      ['/api/auth/signup', { windowMs: 60 * 60 * 1000, maxRequests: 3 }],
      ['/api/auth/reset-password', { windowMs: 60 * 60 * 1000, maxRequests: 3 }],
      
      // AI endpoints (moderate)
      ['/api/ai/generate-test', { windowMs: 60 * 60 * 1000, maxRequests: 10 }],
      ['/api/ai/analyze-execution', { windowMs: 60 * 60 * 1000, maxRequests: 20 }],
      
      // Test execution (moderate)
      ['/api/executions', { windowMs: 60 * 60 * 1000, maxRequests: 50 }],
      
      // General API (lenient)
      ['*', { windowMs: 15 * 60 * 1000, maxRequests: 100 }],
    ]);

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const endpoint = req.path;
      let config = endpointLimits.get(endpoint) || endpointLimits.get('*')!;

      // Enhance config with user-specific adjustments
      const enhancedConfig: RateLimitConfig = {
        ...config,
        keyGenerator: (req: Request) => this.generateUserAwareKey(req, endpoint),
        headers: true,
        onLimitReached: (req: Request) => this.logSecurityEvent('API_RATE_LIMIT', req),
      };

      const limiter = this.createLimiter(enhancedConfig);
      await limiter(req, res, next);
    };
  }

  // User reputation system
  async updateUserReputation(userId: string, action: 'good' | 'bad'): Promise<void> {
    const key = `reputation:${userId}`;
    const now = Date.now();
    const score = action === 'good' ? 1 : -2;
    
    await this.redis.zadd(key, now, `${now}:${score}`);
    await this.redis.expire(key, 30 * 24 * 60 * 60); // 30 days
  }

  async getUserReputation(userId: string): Promise<number> {
    const key = `reputation:${userId}`;
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, thirtyDaysAgo);
    
    // Get all scores
    const entries = await this.redis.zrange(key, 0, -1);
    let totalScore = 0;
    
    for (const entry of entries) {
      const [, score] = entry.split(':');
      totalScore += parseInt(score, 10);
    }
    
    return Math.max(-10, Math.min(10, totalScore)); // Clamp between -10 and 10
  }

  // Analytics and monitoring
  async getRateLimitStats(): Promise<{
    totalKeys: number;
    topLimitedIPs: Array<{ ip: string; hits: number }>;
    topLimitedUsers: Array<{ userId: string; hits: number }>;
    recentViolations: Array<{ key: string; timestamp: Date; violations: number }>;
  }> {
    try {
      const keys = await this.store.getAllKeys();
      
      // Analyze IP-based limits
      const ipKeys = keys.filter(key => key.startsWith('ip:'));
      const userKeys = keys.filter(key => key.startsWith('user:'));
      
      const topLimitedIPs = await Promise.all(
        ipKeys.slice(0, 10).map(async key => {
          const info = await this.store.getInfo(key);
          return {
            ip: key.replace('ip:', ''),
            hits: info?.totalHits || 0,
          };
        })
      );

      const topLimitedUsers = await Promise.all(
        userKeys.slice(0, 10).map(async key => {
          const info = await this.store.getInfo(key);
          return {
            userId: key.replace('user:', ''),
            hits: info?.totalHits || 0,
          };
        })
      );

      return {
        totalKeys: keys.length,
        topLimitedIPs: topLimitedIPs.sort((a, b) => b.hits - a.hits),
        topLimitedUsers: topLimitedUsers.sort((a, b) => b.hits - a.hits),
        recentViolations: [], // Implement violation tracking if needed
      };
    } catch (error) {
      console.error('Error getting rate limit stats:', error);
      return {
        totalKeys: 0,
        topLimitedIPs: [],
        topLimitedUsers: [],
        recentViolations: [],
      };
    }
  }

  // Private helper methods
  private defaultKeyGenerator(req: Request): string {
    const userId = req.user?.id;
    const ip = req.ip || 'unknown';
    
    if (userId) {
      return `user:${userId}`;
    }
    return `ip:${ip}`;
  }

  private generateUserAwareKey(req: Request, endpoint: string): string {
    const userId = req.user?.id;
    const ip = req.ip || 'unknown';
    const normalizedEndpoint = endpoint.replace(/\/\d+/g, '/:id'); // Normalize IDs
    
    if (userId) {
      return `user:${userId}:${normalizedEndpoint}`;
    }
    return `ip:${ip}:${normalizedEndpoint}`;
  }

  private isWhitelisted(req: Request, whitelist: string[]): boolean {
    const ip = req.ip || '';
    return whitelist.includes(ip) || whitelist.includes('*');
  }

  private setHeaders(res: Response, info: RateLimitInfo, config: RateLimitConfig): void {
    res.set({
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, config.maxRequests - info.totalHits).toString(),
      'X-RateLimit-Reset': info.resetTime.toISOString(),
      'X-RateLimit-Window': config.windowMs.toString(),
    });
  }

  private async adjustLimitsForUser(
    baseConfig: RateLimitConfig, 
    userId?: string, 
    ip?: string
  ): Promise<RateLimitConfig> {
    if (!userId) {
      return baseConfig;
    }

    try {
      const reputation = await this.getUserReputation(userId);
      
      // Adjust limits based on reputation
      let multiplier = 1;
      if (reputation > 5) {
        multiplier = 2; // Good users get double limits
      } else if (reputation < -3) {
        multiplier = 0.5; // Bad users get halved limits
      }

      return {
        ...baseConfig,
        maxRequests: Math.floor(baseConfig.maxRequests * multiplier),
      };
    } catch (error) {
      console.error('Error adjusting limits for user:', error);
      return baseConfig;
    }
  }

  private logSecurityEvent(type: string, req: Request): void {
    console.warn(`Security event: ${type}`, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      rateLimitInfo?: {
        attempts: number;
        remaining: number;
        resetTime: Date;
      };
    }
  }
}

export default RateLimitService;