import { Request, Response, NextFunction } from 'express';
import { cacheService, CacheTTL } from '../services/cacheService';
import { APIResponseCache } from '../services/cacheHelpers';
import { logger, LogCategory } from '../services/loggingService';
import crypto from 'crypto';

// Cache configuration for different routes
interface CacheConfig {
  ttl: number;
  varyBy?: string[];
  condition?: (req: Request) => boolean;
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request, res: Response) => boolean;
}

// Default cache configurations for different route patterns
const defaultCacheConfigs: Record<string, CacheConfig> = {
  // User routes
  'GET:/api/users/:id': {
    ttl: CacheTTL.MEDIUM,
    varyBy: ['user'],
    condition: (req) => !!req.params.id,
  },
  'GET:/api/users/:id/profile': {
    ttl: CacheTTL.LONG,
    varyBy: ['user'],
  },
  'GET:/api/users/:id/permissions': {
    ttl: CacheTTL.MEDIUM,
    varyBy: ['user'],
  },

  // Project routes
  'GET:/api/projects': {
    ttl: CacheTTL.SHORT,
    varyBy: ['user', 'query'],
  },
  'GET:/api/projects/:id': {
    ttl: CacheTTL.MEDIUM,
    varyBy: ['user'],
  },
  'GET:/api/projects/:id/tests': {
    ttl: CacheTTL.SHORT,
    varyBy: ['user'],
  },

  // Organization routes
  'GET:/api/organizations/:id': {
    ttl: CacheTTL.LONG,
    varyBy: ['user'],
  },
  'GET:/api/organizations/:id/members': {
    ttl: CacheTTL.MEDIUM,
    varyBy: ['user'],
  },

  // Test results routes
  'GET:/api/test-results/:id': {
    ttl: CacheTTL.LONG,
    varyBy: ['user'],
  },
  'GET:/api/projects/:id/test-summary': {
    ttl: CacheTTL.SHORT,
    varyBy: ['user'],
  },

  // Analytics routes
  'GET:/api/analytics/dashboard': {
    ttl: CacheTTL.MEDIUM,
    varyBy: ['user', 'query'],
  },
  'GET:/api/analytics/global': {
    ttl: CacheTTL.LONG,
    varyBy: ['query'],
  },

  // Search routes
  'GET:/api/search': {
    ttl: CacheTTL.SHORT,
    varyBy: ['user', 'query'],
    condition: (req) => !!req.query.q && (req.query.q as string).length > 2,
  },

  // File routes
  'GET:/api/files/:id/metadata': {
    ttl: CacheTTL.VERY_LONG,
    varyBy: ['user'],
  },

  // Notification routes
  'GET:/api/notifications': {
    ttl: CacheTTL.SHORT,
    varyBy: ['user'],
  },
};

// Cache middleware options
export interface CacheMiddlewareOptions extends CacheConfig {
  cacheConfig?: Record<string, CacheConfig>;
  globalTTL?: number;
  enabled?: boolean;
  debug?: boolean;
}

// Generate cache key based on request
function generateCacheKey(req: Request, config: CacheConfig): string {
  const baseKey = `${req.method}:${req.route?.path || req.path}`;
  const varyParts: string[] = [];

  if (config.varyBy) {
    for (const varyItem of config.varyBy) {
      switch (varyItem) {
        case 'user':
          if (req.user?.id) {
            varyParts.push(`user:${req.user.id}`);
          }
          break;
        case 'query':
          if (Object.keys(req.query).length > 0) {
            const queryString = JSON.stringify(req.query);
            const queryHash = crypto.createHash('md5').update(queryString).digest('hex');
            varyParts.push(`query:${queryHash}`);
          }
          break;
        case 'params':
          if (Object.keys(req.params).length > 0) {
            const paramsString = JSON.stringify(req.params);
            varyParts.push(`params:${paramsString}`);
          }
          break;
        case 'headers':
          const relevantHeaders = ['accept', 'accept-language', 'user-agent'];
          const headersPart = relevantHeaders
            .map(h => `${h}:${req.headers[h] || ''}`)
            .join('|');
          const headersHash = crypto.createHash('md5').update(headersPart).digest('hex');
          varyParts.push(`headers:${headersHash}`);
          break;
      }
    }
  }

  const varyString = varyParts.length > 0 ? `:${varyParts.join(':')}` : '';
  const fullKey = `api:${baseKey}${varyString}`;
  
  // If custom key generator is provided, use it
  if (config.keyGenerator) {
    return config.keyGenerator(req);
  }

  return fullKey;
}

// Get cache configuration for a route
function getCacheConfig(req: Request, options: CacheMiddlewareOptions): CacheConfig | null {
  const routeKey = `${req.method}:${req.route?.path || req.path}`;
  
  // Check custom configurations first
  if (options.cacheConfig && options.cacheConfig[routeKey]) {
    return options.cacheConfig[routeKey];
  }

  // Check default configurations
  if (defaultCacheConfigs[routeKey]) {
    return defaultCacheConfigs[routeKey];
  }

  // Fallback to global configuration
  if (options.globalTTL) {
    return {
      ttl: options.globalTTL,
      varyBy: ['user'],
    };
  }

  return null;
}

// Response caching middleware
export function cacheMiddleware(options: CacheMiddlewareOptions = { ttl: CacheTTL.MEDIUM }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching if disabled
    if (options.enabled === false) {
      return next();
    }

    // Skip for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Get cache configuration for this route
    const config = getCacheConfig(req, options);
    if (!config) {
      return next();
    }

    // Check condition if provided
    if (config.condition && !config.condition(req)) {
      return next();
    }

    // Check skip condition if provided
    if (config.skipCache && config.skipCache(req, res)) {
      return next();
    }

    const cacheKey = generateCacheKey(req, config);
    const startTime = Date.now();

    try {
      // Try to get from cache
      const cachedResult = await cacheService.get(cacheKey);

      if (cachedResult.success && cachedResult.cached && cachedResult.data) {
        const responseTime = Date.now() - startTime;
        
        // Set cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'X-Cache-TTL': config.ttl.toString(),
          'X-Response-Time': `${responseTime}ms`,
        });

        if (options.debug) {
          logger.debug('Cache hit for API response', LogCategory.CACHE, {
            metadata: {
              method: req.method,
              path: req.path,
              cacheKey,
              responseTime: `${responseTime}ms`,
            }
          });
        }

        return res.json(cachedResult.data);
      }

      // Cache miss - continue to route handler
      const originalSend = res.json;
      let responseSent = false;

      res.json = function(data: any) {
        if (!responseSent) {
          responseSent = true;
          
          // Cache the response if it's successful
          if (res.statusCode >= 200 && res.statusCode < 300) {
            setImmediate(async () => {
              try {
                await cacheService.set(cacheKey, data, config.ttl);
                
                if (options.debug) {
                  logger.debug('Response cached', LogCategory.CACHE, {
                    metadata: {
                      method: req.method,
                      path: req.path,
                      cacheKey,
                      ttl: config.ttl,
                      statusCode: res.statusCode,
                    }
                  });
                }
              } catch (error) {
                logger.error('Failed to cache response', LogCategory.CACHE, {
                  errorStack: error instanceof Error ? error.stack : undefined,
                  metadata: { cacheKey, path: req.path },
                  errorCode: 'CACHE_RESPONSE_ERROR'
                });
              }
            });
          }

          // Set cache headers
          const responseTime = Date.now() - startTime;
          res.set({
            'X-Cache': 'MISS',
            'X-Cache-Key': cacheKey,
            'X-Cache-TTL': config.ttl.toString(),
            'X-Response-Time': `${responseTime}ms`,
          });
        }

        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { path: req.path, cacheKey },
        errorCode: 'CACHE_MIDDLEWARE_ERROR'
      });

      // Continue without caching on error
      next();
    }
  };
}

// Conditional caching middleware
export function conditionalCache(condition: (req: Request) => boolean, config: CacheConfig) {
  return cacheMiddleware({
    ttl: config.ttl,
    cacheConfig: {
      '*': { ...config, condition }
    }
  });
}

// Cache invalidation middleware
export function cacheInvalidationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.json;
    let responseSent = false;

    res.json = function(data: any) {
      if (!responseSent) {
        responseSent = true;

        // Invalidate cache for mutation operations
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
          setImmediate(async () => {
            try {
              await invalidateCacheForRoute(req);
            } catch (error) {
              logger.error('Cache invalidation failed', LogCategory.CACHE, {
                errorStack: error instanceof Error ? error.stack : undefined,
                metadata: { method: req.method, path: req.path },
                errorCode: 'CACHE_INVALIDATION_ERROR'
              });
            }
          });
        }
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

// Invalidate cache based on route
async function invalidateCacheForRoute(req: Request): Promise<void> {
  const { method, path, params } = req;

  // Define invalidation patterns based on routes
  const invalidationPatterns: Record<string, string[]> = {
    // User operations
    'POST:/api/users': ['api:GET:/api/users*'],
    'PUT:/api/users/:id': [`api:GET:/api/users/${params.id}*`, 'api:GET:/api/users*'],
    'DELETE:/api/users/:id': [`api:GET:/api/users/${params.id}*`, 'api:GET:/api/users*'],

    // Project operations
    'POST:/api/projects': ['api:GET:/api/projects*'],
    'PUT:/api/projects/:id': [`api:GET:/api/projects/${params.id}*`, 'api:GET:/api/projects*'],
    'DELETE:/api/projects/:id': [`api:GET:/api/projects/${params.id}*`, 'api:GET:/api/projects*'],

    // Test operations
    'POST:/api/projects/:id/tests': [`api:GET:/api/projects/${params.id}/tests*`],
    'PUT:/api/test-results/:id': [`api:GET:/api/test-results/${params.id}*`],

    // Organization operations
    'POST:/api/organizations': ['api:GET:/api/organizations*'],
    'PUT:/api/organizations/:id': [`api:GET:/api/organizations/${params.id}*`],
    'POST:/api/organizations/:id/members': [`api:GET:/api/organizations/${params.id}/members*`],
    'DELETE:/api/organizations/:id/members/:memberId': [`api:GET:/api/organizations/${params.id}/members*`],
  };

  const routeKey = `${method}:${req.route?.path || path}`;
  const patterns = invalidationPatterns[routeKey];

  if (patterns) {
    for (const pattern of patterns) {
      try {
        await cacheService.deletePattern(pattern);
        logger.debug('Cache invalidated', LogCategory.CACHE, {
          metadata: { pattern, routeKey }
        });
      } catch (error) {
        logger.error('Failed to invalidate cache pattern', LogCategory.CACHE, {
          errorStack: error instanceof Error ? error.stack : undefined,
          metadata: { pattern, routeKey },
          errorCode: 'CACHE_PATTERN_INVALIDATION_ERROR'
        });
      }
    }
  }
}

// Cache warming middleware
export function cacheWarmingMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Warm up related caches after successful operations
    if (['POST', 'PUT'].includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
      setImmediate(async () => {
        try {
          await warmCacheForRoute(req);
        } catch (error) {
          logger.error('Cache warming failed', LogCategory.CACHE, {
            errorStack: error instanceof Error ? error.stack : undefined,
            metadata: { method: req.method, path: req.path },
            errorCode: 'CACHE_WARMING_ERROR'
          });
        }
      });
    }

    next();
  };
}

// Warm cache for related routes
async function warmCacheForRoute(req: Request): Promise<void> {
  // Implementation would depend on your specific needs
  // This is a placeholder for cache warming logic
  logger.debug('Cache warming triggered', LogCategory.CACHE, {
    metadata: { method: req.method, path: req.path }
  });
}

// Cache statistics middleware
export function cacheStatsMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/cache/stats' && req.method === 'GET') {
      try {
        const stats = await cacheService.getStats();
        const health = await cacheService.healthCheck();
        
        return res.json({
          cache: stats,
          health: health,
          redis: {
            connected: health.healthy,
            responseTime: health.responseTime,
          }
        });
      } catch (error) {
        logger.error('Failed to get cache stats', LogCategory.CACHE, {
          errorStack: error instanceof Error ? error.stack : undefined,
          errorCode: 'CACHE_STATS_ERROR'
        });
        
        return res.status(500).json({ error: 'Failed to get cache statistics' });
      }
    }

    next();
  };
}

// Cache control headers middleware
export function cacheControlMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set appropriate cache control headers based on route
    const { method, path } = req;

    if (method === 'GET') {
      if (path.includes('/api/files/') || path.includes('/assets/')) {
        // Static files - long cache
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (path.includes('/api/analytics/') || path.includes('/api/dashboard/')) {
        // Analytics data - medium cache
        res.set('Cache-Control', 'private, max-age=900'); // 15 minutes
      } else if (path.includes('/api/')) {
        // API responses - short cache
        res.set('Cache-Control', 'private, max-age=300'); // 5 minutes
      }
    } else {
      // Non-GET requests - no cache
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    next();
  };
}

export default cacheMiddleware;