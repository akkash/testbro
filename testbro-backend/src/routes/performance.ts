import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { logger, LogCategory } from '../services/loggingService';
import MetricsService from '../services/metricsService';
import APMService from '../services/apmService';
import { DatabasePerformanceMonitor } from '../services/databasePerformanceMonitor';
import { cacheService } from '../services/cacheService';

const router = express.Router();

// Apply authentication to all performance routes (supports both JWT and API key)
router.use(authenticate);

/**
 * GET /api/performance/metrics
 * Get system performance metrics
 */
router.get('/metrics', asyncHandler(async (_req: Request, res: Response) => {
  try {
    // For now, return basic metrics structure
    // This would require access to the MetricsService instance from the server
    const basicMetrics = {
      timestamp: new Date().toISOString(),
      system: {
        requests: {
          total: 0,
          successful: 0,
          failed: 0,
          rate: 0,
        },
        response: {
          avgTime: 0,
          p50: 0,
          p95: 0,
          p99: 0,
        },
        errors: {
          total: 0,
          rate: 0,
          byType: {},
        },
        users: {
          active: 0,
          authenticated: 0,
          apiKeys: 0,
        },
      },
    };
    
    res.json({
      data: basicMetrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Performance metrics fetch failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch performance metrics',
    });
  }
}));

/**
 * GET /api/performance/apm
 * Get APM (Application Performance Monitoring) data
 */
router.get('/apm', asyncHandler(async (_req: Request, res: Response) => {
  try {
    // This would require an APMService instance
    // For now, return mock data or implement with actual service
    const apmData = {
      responseTime: {
        avg: 150,
        p50: 120,
        p95: 300,
        p99: 500,
      },
      throughput: {
        requestsPerSecond: 45,
        transactionsPerSecond: 42,
      },
      errorRate: {
        percentage: 0.8,
        total: 12,
      },
      timestamp: new Date().toISOString(),
    };
    
    res.json({
      data: apmData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('APM data fetch failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch APM data',
    });
  }
}));

/**
 * GET /api/performance/database
 * Get database performance metrics
 */
router.get('/database', asyncHandler(async (_req: Request, res: Response) => {
  try {
    // This would require DatabasePerformanceMonitor instance
    const dbMetrics = {
      queryTime: {
        avg: 25,
        slow: 2,
      },
      connections: {
        active: 8,
        idle: 12,
        total: 20,
      },
      cache: {
        hitRate: 85.5,
        missRate: 14.5,
      },
      timestamp: new Date().toISOString(),
    };
    
    res.json({
      data: dbMetrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Database metrics fetch failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch database metrics',
    });
  }
}));

/**
 * GET /api/performance/cache
 * Get cache performance metrics
 */
router.get('/cache', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const cacheStats = await cacheService.getStats();
    
    res.json({
      data: cacheStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cache metrics fetch failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch cache metrics',
    });
  }
}));

/**
 * POST /api/performance/clear-cache
 * Clear application cache
 */
router.post('/clear-cache', asyncHandler(async (_req: Request, res: Response) => {
  try {
    await cacheService.flush();
    
    logger.info('Cache cleared via API', LogCategory.SYSTEM, {
      metadata: { timestamp: new Date().toISOString() }
    });
    
    res.json({
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cache clear failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to clear cache',
    });
  }
}));

export default router;