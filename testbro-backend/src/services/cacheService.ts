import Redis from 'ioredis';
import { logger, LogCategory } from './loggingService';
import { performance } from 'perf_hooks';

// Cache configuration interface
export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  lazyConnect: boolean;
  keyPrefix: string;
  defaultTTL: number;
  maxMemoryPolicy: string;
}

// Cache key patterns
export enum CacheKeys {
  USER_PROFILE = 'user:profile:',
  USER_PERMISSIONS = 'user:permissions:',
  PROJECT_DATA = 'project:data:',
  PROJECT_TESTS = 'project:tests:',
  TEST_RESULTS = 'test:results:',
  ORGANIZATION_DATA = 'org:data:',
  ORGANIZATION_MEMBERS = 'org:members:',
  API_RESPONSES = 'api:response:',
  SESSION_DATA = 'session:',
  RATE_LIMIT = 'ratelimit:',
  ANALYTICS = 'analytics:',
  NOTIFICATIONS = 'notifications:',
  FILE_METADATA = 'file:meta:',
  SEARCH_RESULTS = 'search:',
  DASHBOARD_STATS = 'dashboard:stats:',
}

// Cache TTL (Time To Live) configurations in seconds
export const CacheTTL = {
  VERY_SHORT: 60,           // 1 minute
  SHORT: 300,               // 5 minutes
  MEDIUM: 900,              // 15 minutes
  LONG: 3600,               // 1 hour
  VERY_LONG: 86400,         // 24 hours
  PERSISTENT: 604800,       // 7 days
} as const;

// Cache statistics interface
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalOperations: number;
  averageResponseTime: number;
  memoryUsage: {
    used: number;
    peak: number;
    total: number;
  };
  keyCount: number;
  evictedKeys: number;
}

// Cache operation result
export interface CacheResult<T = any> {
  success: boolean;
  data?: T;
  cached: boolean;
  responseTime: number;
  error?: string;
}

export class CacheService {
  private redis: Redis;
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    operations: 0,
    totalResponseTime: 0,
  };

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      lazyConnect: true,
      keyPrefix: 'testbro:',
      defaultTTL: CacheTTL.MEDIUM,
      maxMemoryPolicy: 'allkeys-lru',
      ...config,
    };

    this.redis = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      maxRetriesPerRequest: null,
      lazyConnect: this.config.lazyConnect,
      keyPrefix: this.config.keyPrefix,
    });

    this.setupEventHandlers();
    this.initializeCache();
  }

  // Setup Redis event handlers
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Redis cache connected successfully', LogCategory.CACHE);
    });

    this.redis.on('error', (error) => {
      logger.error('Redis cache connection error', LogCategory.CACHE, {
        errorStack: error.stack,
        errorCode: 'REDIS_CONNECTION_ERROR'
      });
    });

    this.redis.on('close', () => {
      logger.warn('Redis cache connection closed', LogCategory.CACHE);
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis cache reconnecting...', LogCategory.CACHE);
    });
  }

  // Initialize cache configuration
  private async initializeCache(): Promise<void> {
    try {
      // Set memory policy
      await this.redis.config('SET', 'maxmemory-policy', this.config.maxMemoryPolicy);
      
      // Set up key expiration notifications (optional)
      await this.redis.config('SET', 'notify-keyspace-events', 'Ex');
      
      logger.info('Redis cache initialized successfully', LogCategory.CACHE, {
        metadata: {
          host: this.config.host,
          port: this.config.port,
          db: this.config.db,
          keyPrefix: this.config.keyPrefix,
        }
      });
    } catch (error) {
      logger.error('Failed to initialize Redis cache', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        errorCode: 'CACHE_INIT_ERROR'
      });
    }
  }

  // Generic get method with automatic JSON parsing
  async get<T = any>(key: string): Promise<CacheResult<T>> {
    const startTime = performance.now();
    this.stats.operations++;

    try {
      const result = await this.redis.get(key);
      const responseTime = performance.now() - startTime;
      this.stats.totalResponseTime += responseTime;

      if (result !== null) {
        this.stats.hits++;
        const data = JSON.parse(result);
        
        logger.debug('Cache hit', LogCategory.CACHE, {
          metadata: { key, responseTime: `${responseTime.toFixed(2)}ms` }
        });

        return {
          success: true,
          data,
          cached: true,
          responseTime,
        };
      } else {
        this.stats.misses++;
        
        logger.debug('Cache miss', LogCategory.CACHE, {
          metadata: { key, responseTime: `${responseTime.toFixed(2)}ms` }
        });

        return {
          success: true,
          cached: false,
          responseTime,
        };
      }
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.stats.totalResponseTime += responseTime;

      logger.error('Cache get operation failed', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { key, responseTime: `${responseTime.toFixed(2)}ms` },
        errorCode: 'CACHE_GET_ERROR'
      });

      return {
        success: false,
        cached: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Generic set method with automatic JSON serialization
  async set(key: string, value: any, ttl: number = this.config.defaultTTL): Promise<CacheResult<boolean>> {
    const startTime = performance.now();
    this.stats.operations++;

    try {
      const serializedValue = JSON.stringify(value);
      const result = await this.redis.setex(key, ttl, serializedValue);
      const responseTime = performance.now() - startTime;
      this.stats.totalResponseTime += responseTime;

      logger.debug('Cache set', LogCategory.CACHE, {
        metadata: { 
          key, 
          ttl, 
          responseTime: `${responseTime.toFixed(2)}ms`,
          dataSize: `${serializedValue.length} bytes`
        }
      });

      return {
        success: result === 'OK',
        data: result === 'OK',
        cached: true,
        responseTime,
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.stats.totalResponseTime += responseTime;

      logger.error('Cache set operation failed', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { key, ttl, responseTime: `${responseTime.toFixed(2)}ms` },
        errorCode: 'CACHE_SET_ERROR'
      });

      return {
        success: false,
        cached: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Delete cache key
  async delete(key: string): Promise<CacheResult<boolean>> {
    const startTime = performance.now();

    try {
      const result = await this.redis.del(key);
      const responseTime = performance.now() - startTime;

      logger.debug('Cache delete', LogCategory.CACHE, {
        metadata: { key, responseTime: `${responseTime.toFixed(2)}ms`, deleted: result > 0 }
      });

      return {
        success: true,
        data: result > 0,
        cached: false,
        responseTime,
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;

      logger.error('Cache delete operation failed', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { key, responseTime: `${responseTime.toFixed(2)}ms` },
        errorCode: 'CACHE_DELETE_ERROR'
      });

      return {
        success: false,
        cached: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Delete multiple keys matching a pattern
  async deletePattern(pattern: string): Promise<CacheResult<number>> {
    const startTime = performance.now();

    try {
      const keys = await this.redis.keys(pattern);
      let deletedCount = 0;

      if (keys.length > 0) {
        deletedCount = await this.redis.del(...keys);
      }

      const responseTime = performance.now() - startTime;

      logger.info('Cache pattern delete', LogCategory.CACHE, {
        metadata: { 
          pattern, 
          keysFound: keys.length,
          deletedCount,
          responseTime: `${responseTime.toFixed(2)}ms`
        }
      });

      return {
        success: true,
        data: deletedCount,
        cached: false,
        responseTime,
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;

      logger.error('Cache pattern delete failed', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { pattern, responseTime: `${responseTime.toFixed(2)}ms` },
        errorCode: 'CACHE_PATTERN_DELETE_ERROR'
      });

      return {
        success: false,
        cached: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists check failed', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { key },
        errorCode: 'CACHE_EXISTS_ERROR'
      });
      return false;
    }
  }

  // Get TTL for a key
  async getTTL(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error('Cache TTL check failed', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { key },
        errorCode: 'CACHE_TTL_ERROR'
      });
      return -1;
    }
  }

  // Extend TTL for a key
  async extendTTL(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Cache TTL extension failed', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { key, ttl },
        errorCode: 'CACHE_EXTEND_TTL_ERROR'
      });
      return false;
    }
  }

  // Increment a numeric value in cache
  async increment(key: string, value: number = 1, ttl?: number): Promise<CacheResult<number>> {
    const startTime = performance.now();

    try {
      const result = await this.redis.incrby(key, value);
      
      if (ttl) {
        await this.redis.expire(key, ttl);
      }

      const responseTime = performance.now() - startTime;

      return {
        success: true,
        data: result,
        cached: true,
        responseTime,
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;

      logger.error('Cache increment failed', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { key, value, ttl, responseTime: `${responseTime.toFixed(2)}ms` },
        errorCode: 'CACHE_INCREMENT_ERROR'
      });

      return {
        success: false,
        cached: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Hash operations for complex data structures
  async hset(key: string, field: string, value: any, ttl?: number): Promise<CacheResult<boolean>> {
    const startTime = performance.now();

    try {
      const serializedValue = JSON.stringify(value);
      const result = await this.redis.hset(key, field, serializedValue);
      
      if (ttl) {
        await this.redis.expire(key, ttl);
      }

      const responseTime = performance.now() - startTime;

      return {
        success: true,
        data: result === 1,
        cached: true,
        responseTime,
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;

      logger.error('Cache hset failed', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { key, field, responseTime: `${responseTime.toFixed(2)}ms` },
        errorCode: 'CACHE_HSET_ERROR'
      });

      return {
        success: false,
        cached: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async hget<T = any>(key: string, field: string): Promise<CacheResult<T>> {
    const startTime = performance.now();

    try {
      const result = await this.redis.hget(key, field);
      const responseTime = performance.now() - startTime;

      if (result !== null) {
        const data = JSON.parse(result);
        return {
          success: true,
          data,
          cached: true,
          responseTime,
        };
      }

      return {
        success: true,
        cached: false,
        responseTime,
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;

      logger.error('Cache hget failed', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { key, field, responseTime: `${responseTime.toFixed(2)}ms` },
        errorCode: 'CACHE_HGET_ERROR'
      });

      return {
        success: false,
        cached: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get all hash fields
  async hgetall<T = any>(key: string): Promise<CacheResult<Record<string, T>>> {
    const startTime = performance.now();

    try {
      const result = await this.redis.hgetall(key);
      const responseTime = performance.now() - startTime;

      if (Object.keys(result).length > 0) {
        const data: Record<string, T> = {};
        for (const [field, value] of Object.entries(result)) {
          data[field] = JSON.parse(value);
        }

        return {
          success: true,
          data,
          cached: true,
          responseTime,
        };
      }

      return {
        success: true,
        cached: false,
        responseTime,
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;

      logger.error('Cache hgetall failed', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { key, responseTime: `${responseTime.toFixed(2)}ms` },
        errorCode: 'CACHE_HGETALL_ERROR'
      });

      return {
        success: false,
        cached: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Cache with fallback function
  async getOrSet<T>(
    key: string,
    fallbackFn: () => Promise<T>,
    ttl: number = this.config.defaultTTL
  ): Promise<CacheResult<T>> {
    // Try to get from cache first
    const cacheResult = await this.get<T>(key);
    
    if (cacheResult.success && cacheResult.cached && cacheResult.data !== undefined) {
      return cacheResult;
    }

    // If not in cache, execute fallback function
    try {
      const startTime = performance.now();
      const data = await fallbackFn();
      const fallbackTime = performance.now() - startTime;

      // Store result in cache
      const setResult = await this.set(key, data, ttl);
      
      logger.debug('Cache fallback executed', LogCategory.CACHE, {
        metadata: { 
          key, 
          fallbackTime: `${fallbackTime.toFixed(2)}ms`,
          cached: setResult.success
        }
      });

      return {
        success: true,
        data,
        cached: false,
        responseTime: fallbackTime + (setResult.responseTime || 0),
      };
    } catch (error) {
      logger.error('Cache fallback function failed', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { key },
        errorCode: 'CACHE_FALLBACK_ERROR'
      });

      return {
        success: false,
        cached: false,
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Warm up cache with frequently accessed data
  async warmupCache(): Promise<void> {
    logger.info('Starting cache warmup', LogCategory.CACHE);

    try {
      // Warm up common data that's frequently accessed
      // This would be customized based on your application's needs
      
      const warmupTasks = [
        // Example warmup tasks
        this.set(`${CacheKeys.ANALYTICS}daily_stats`, { placeholder: true }, CacheTTL.LONG),
        this.set(`${CacheKeys.DASHBOARD_STATS}global`, { placeholder: true }, CacheTTL.MEDIUM),
      ];

      await Promise.all(warmupTasks);
      
      logger.info('Cache warmup completed', LogCategory.CACHE);
    } catch (error) {
      logger.error('Cache warmup failed', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        errorCode: 'CACHE_WARMUP_ERROR'
      });
    }
  }

  // Get cache statistics
  async getStats(): Promise<CacheStats> {
    try {
      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();
      
      const memoryLines = info.split('\r\n');
      const usedMemory = parseInt(memoryLines.find(line => line.startsWith('used_memory:'))?.split(':')[1] || '0');
      const usedMemoryPeak = parseInt(memoryLines.find(line => line.startsWith('used_memory_peak:'))?.split(':')[1] || '0');
      
      const hitRate = this.stats.operations > 0 ? (this.stats.hits / this.stats.operations) * 100 : 0;
      const averageResponseTime = this.stats.operations > 0 ? this.stats.totalResponseTime / this.stats.operations : 0;

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: parseFloat(hitRate.toFixed(2)),
        totalOperations: this.stats.operations,
        averageResponseTime: parseFloat(averageResponseTime.toFixed(2)),
        memoryUsage: {
          used: usedMemory,
          peak: usedMemoryPeak,
          total: usedMemoryPeak, // Approximation
        },
        keyCount,
        evictedKeys: 0, // Would need additional Redis command to get this
      };
    } catch (error) {
      logger.error('Failed to get cache statistics', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        errorCode: 'CACHE_STATS_ERROR'
      });

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: 0,
        totalOperations: this.stats.operations,
        averageResponseTime: 0,
        memoryUsage: { used: 0, peak: 0, total: 0 },
        keyCount: 0,
        evictedKeys: 0,
      };
    }
  }

  // Flush all cache data
  async flush(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      logger.warn('Cache flushed', LogCategory.CACHE);
      return true;
    } catch (error) {
      logger.error('Cache flush failed', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        errorCode: 'CACHE_FLUSH_ERROR'
      });
      return false;
    }
  }

  // Disconnect from Redis
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      logger.info('Redis cache disconnected', LogCategory.CACHE);
    } catch (error) {
      logger.error('Redis cache disconnect failed', LogCategory.CACHE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        errorCode: 'CACHE_DISCONNECT_ERROR'
      });
    }
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; responseTime: number; error?: string }> {
    const startTime = performance.now();

    try {
      const result = await this.redis.ping();
      const responseTime = performance.now() - startTime;
      
      return {
        healthy: result === 'PONG',
        responseTime,
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      return {
        healthy: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Create singleton cache service instance
export const cacheService = new CacheService();

export default cacheService;