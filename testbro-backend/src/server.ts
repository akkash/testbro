import path from 'path';
import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Debug environment variables
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
console.log('OPENROUTER_KEY:', process.env.OPENROUTER_KEY ? 'Set' : 'Not set');

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';

import { initWebSocketService } from './services/websocketService';
import { queueService } from './services/queueService';
import { RateLimitService } from './services/rateLimitService';
import { csrfProtection, corsService } from './middleware/csrf';
import { performSecurityCleanup } from './middleware/auth';
import { logger, LogCategory } from './services/loggingService';
import HealthCheckService from './services/healthCheckService';
import MetricsService from './services/metricsService';
import APMService from './services/apmService';
import ErrorTrackingService from './services/errorTrackingService';
import { cacheService } from './services/cacheService';
import cacheMiddleware, { cacheInvalidationMiddleware, cacheStatsMiddleware, cacheControlMiddleware } from './middleware/cacheMiddleware';
import compressionMiddleware, { compressionMiddleware as compressionService } from './middleware/compressionMiddleware';
import { paginationService } from './services/paginationService';
import Redis from 'ioredis';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Routes will be imported after WebSocket service initialization

// Initialize Express app
const app = express();
const server = createServer(app);

// Initialize Redis client for rate limiting and BullMQ
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // BullMQ requires this to be null
  lazyConnect: true,
  connectTimeout: 10000,
});

// Initialize services
const rateLimitService = new RateLimitService(redis);
const wsService = initWebSocketService(server);
const healthCheckService = new HealthCheckService(redis);
const metricsService = new MetricsService(redis);
const apmService = new APMService(redis, metricsService);
const errorTrackingService = new ErrorTrackingService(redis, apmService);

// Enhanced security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

// Enhanced CORS with security features
app.use(corsService.middleware());

// Cache control headers
app.use(cacheControlMiddleware());

// Response compression for better performance
app.use(compressionMiddleware);

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Request parsing with security limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req: any, res, buf) => {
    // Store raw body for webhook verification
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
app.use(rateLimitService.createAPILimiter());

// CSRF protection for state-changing operations
app.use('/api/csrf/token', csrfProtection.generateTokenEndpoint());
app.use(csrfProtection.protect());

// Structured request logging, metrics, APM, and error tracking middleware
app.use(logger.createRequestMiddleware());
app.use(metricsService.requestTrackingMiddleware());
app.use(apmService.transactionMiddleware());

// Cache middleware for API responses
app.use('/api', cacheMiddleware({
  enabled: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
  ttl: 300, // 5 minutes default
  globalTTL: 300, // 5 minutes default
}));

// Cache invalidation middleware for mutations
app.use(cacheInvalidationMiddleware());

// Cache statistics endpoint
app.use(cacheStatsMiddleware());

// Enhanced health check endpoint with comprehensive monitoring
app.get('/health', async (_req, res) => {
  try {
    const systemHealth = await healthCheckService.getSystemHealth();
    
    // Log health check access
    logger.debug('Health check accessed', LogCategory.SYSTEM, {
      metadata: {
        status: systemHealth.status,
        servicesCount: Object.keys(systemHealth.services).length,
        alertsCount: systemHealth.alerts.length,
      }
    });
    
    res.json(systemHealth);
  } catch (error) {
    logger.error('Health check failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
      errorCode: 'HEALTH_CHECK_ERROR'
    });
    
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Security monitoring endpoints
app.get('/api/security/stats', async (_req, res) => {
  try {
    const rateLimitStats = await rateLimitService.getRateLimitStats();
    const csrfStats = csrfProtection.getStats();
    const corsOrigins = corsService.getAllowedOrigins();

    const securityStats = {
      rateLimit: rateLimitStats,
      csrf: csrfStats,
      cors: {
        allowedOrigins: corsOrigins,
        totalOrigins: corsOrigins.length,
      },
      timestamp: new Date().toISOString(),
    };
    
    // Log security stats access
    logger.logSecurity('SECURITY_STATS_ACCESSED', {
      endpoint: '/api/security/stats',
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
    
    res.json(securityStats);
  } catch (error) {
    logger.error('Failed to get security stats', LogCategory.SECURITY, {
      errorStack: error instanceof Error ? error.stack : undefined,
      errorCode: 'SECURITY_STATS_ERROR'
    });
    
    res.status(500).json({
      error: 'Failed to get security stats',
      timestamp: new Date().toISOString(),
    });
  }
});

// API routes - Load dynamically after WebSocket service initialization
async function setupRoutes() {
  const routeConfigs = [
    { name: 'auth', path: '/api/auth', module: './routes/auth' },
    { name: 'projects', path: '/api/projects', module: './routes/projects' },
    { name: 'testCases', path: '/api/test-cases', module: './routes/testCases' },
    { name: 'testSuites', path: '/api/test-suites', module: './routes/testSuites' },
    { name: 'testTargets', path: '/api/test-targets', module: './routes/testTargets' },
    { name: 'executions', path: '/api/executions', module: './routes/executions' },
    { name: 'ai', path: '/api/ai', module: './routes/ai' },
    { name: 'dashboard', path: '/api/dashboard', module: './routes/dashboard' },
    { name: 'organizations', path: '/api/organizations', module: './routes/organizations' },
    { name: 'webhooks', path: '/api/webhooks', module: './routes/webhooks' },
    { name: 'apiKeys', path: '/api/api-keys', module: './routes/apiKeys' },
    { name: 'performance', path: '/api/performance', module: './routes/performance' },
    { name: 'browserControl', path: '/api/browser-control', module: './routes/browserControl' },
    { name: 'browserAutomation', path: '/api/browser', module: './routes/browserAutomation' },
    { name: 'visualTest', path: '/api/visual-tests', module: './routes/visualTest' },
    { name: 'scheduler', path: '/api/scheduler', module: './routes/scheduler' },
    { name: 'storage', path: '/api/storage', module: './routes/storage' },
    { name: 'domainTesting', path: '/api/domain-testing', module: './routes/domainTesting' },
    { name: 'noCodeRecording', path: '/api/no-code', module: './routes/noCodeRecording' },
    { name: 'fullWebsiteTest', path: '/api/full-website-test', module: './routes/fullWebsiteTest' },
  ];

  const loadedRoutes: string[] = [];
  const failedRoutes: string[] = [];

  for (const config of routeConfigs) {
    try {
      const routeModule = await import(config.module);
      app.use(config.path, routeModule.default);
      loadedRoutes.push(config.name);
    } catch (error) {
      logger.error(`Failed to load route ${config.name}`, LogCategory.SYSTEM, {
        errorStack: error instanceof Error ? error.stack : undefined,
        module: config.module,
        path: config.path
      });
      failedRoutes.push(config.name);
    }
  }

  logger.info('Route loading completed', LogCategory.SYSTEM, {
    metadata: {
      loaded: loadedRoutes,
      failed: failedRoutes,
      totalLoaded: loadedRoutes.length,
      totalFailed: failedRoutes.length
    }
  });

  // Only throw error if critical routes failed to load
  const criticalRoutes = ['auth', 'dashboard', 'projects'];
  const failedCriticalRoutes = failedRoutes.filter(route => criticalRoutes.includes(route));
  
  if (failedCriticalRoutes.length > 0) {
    throw new Error(`Critical routes failed to load: ${failedCriticalRoutes.join(', ')}`);
  }
}

// We'll call setupRoutes() after the WebSocket service is initialized

// WebSocket status endpoint
app.get('/api/websocket/status', (_req, res) => {
  res.json({
    connected_clients: wsService.getConnectedClientsCount(),
    timestamp: new Date().toISOString(),
  });
});

// Queue status endpoint
app.get('/api/queue/status', async (_req, res) => {
  try {
    const stats = await queueService.getQueueStats();
    res.json({
      ...stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get queue status',
      timestamp: new Date().toISOString(),
    });
  }
});

// Metrics endpoint
app.get('/api/metrics', async (_req, res) => {
  try {
    const snapshot = metricsService.getMetricsSnapshot();
    
    logger.debug('Metrics snapshot accessed', LogCategory.SYSTEM, {
      metadata: {
        totalRequests: snapshot.system.requests.total,
        requestRate: snapshot.system.requests.rate,
        errorRate: snapshot.system.errors.rate,
      }
    });
    
    res.json(snapshot);
  } catch (error) {
    logger.error('Metrics snapshot failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).json({
      error: 'Failed to get metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', (_req, res) => {
  try {
    const prometheusMetrics = metricsService.exportPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(prometheusMetrics);
  } catch (error) {
    logger.error('Prometheus metrics export failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).send('# Metrics export failed\n');
  }
});

// Health alerts endpoint
app.get('/api/health/alerts', async (_req, res) => {
  try {
    const activeAlerts = healthCheckService.getActiveAlerts();
    
    res.json({
      alerts: activeAlerts,
      count: activeAlerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health alerts fetch failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).json({
      error: 'Failed to get health alerts',
      timestamp: new Date().toISOString(),
    });
  }
});

// Resolve health alert endpoint
app.post('/api/health/alerts/:alertId/resolve', (req, res) => {
  try {
    const { alertId } = req.params;
    const resolved = healthCheckService.resolveAlert(alertId);
    
    if (resolved) {
      logger.info('Health alert resolved', LogCategory.SYSTEM, {
        metadata: { alertId }
      });
      
      res.json({
        success: true,
        message: 'Alert resolved successfully',
        alertId,
      });
    } else {
      res.status(404).json({
        error: 'Alert not found',
        alertId,
      });
    }
  } catch (error) {
    logger.error('Alert resolution failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
      metadata: { alertId: req.params.alertId }
    });
    
    res.status(500).json({
      error: 'Failed to resolve alert',
      timestamp: new Date().toISOString(),
    });
  }
});

// APM performance metrics endpoint
app.get('/api/apm/performance', (_req, res) => {
  try {
    const performanceMetrics = apmService.getPerformanceMetrics();
    
    logger.debug('APM performance metrics accessed', LogCategory.PERFORMANCE, {
      metadata: {
        requestsPerSecond: performanceMetrics.throughput.requestsPerSecond,
        errorRate: performanceMetrics.errorRate.percentage,
      }
    });
    
    res.json({
      metrics: performanceMetrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('APM performance metrics failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).json({
      error: 'Failed to get APM performance metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

// APM traces endpoint
app.get('/api/apm/traces/:traceId', (req, res) => {
  try {
    const { traceId } = req.params;
    const trace = apmService.getTrace(traceId);
    
    if (!trace) {
      return res.status(404).json({
        error: 'Trace not found',
        traceId,
      });
    }
    
    res.json({
      trace,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('APM trace fetch failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
      metadata: { traceId: req.params.traceId },
    });
    
    res.status(500).json({
      error: 'Failed to get trace',
      timestamp: new Date().toISOString(),
    });
  }
});

// APM errors endpoint
app.get('/api/apm/errors', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const errors = apmService.getRecentErrors(limit);
    
    res.json({
      errors,
      count: errors.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('APM errors fetch failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).json({
      error: 'Failed to get APM errors',
      timestamp: new Date().toISOString(),
    });
  }
});

// APM active transactions endpoint
app.get('/api/apm/transactions', (_req, res) => {
  try {
    const activeTransactions = apmService.getActiveTransactions();
    
    res.json({
      transactions: activeTransactions,
      count: activeTransactions.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('APM transactions fetch failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).json({
      error: 'Failed to get active transactions',
      timestamp: new Date().toISOString(),
    });
  }
});

// Error tracking endpoints
app.get('/api/errors', (req, res) => {
  try {
    const filters = {
      status: req.query.status as any,
      severity: req.query.severity as any,
      limit: parseInt(req.query.limit as string) || 100,
    };
    
    const errors = errorTrackingService.getErrors(filters);
    
    res.json({
      errors,
      count: errors.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error tracking fetch failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).json({
      error: 'Failed to get tracked errors',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/api/errors/stats', (_req, res) => {
  try {
    const stats = errorTrackingService.getErrorStats();
    
    res.json({
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error stats fetch failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).json({
      error: 'Failed to get error statistics',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/api/errors/alerts', (_req, res) => {
  try {
    const alerts = errorTrackingService.getActiveAlerts();
    
    res.json({
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error alerts fetch failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).json({
      error: 'Failed to get error alerts',
      timestamp: new Date().toISOString(),
    });
  }
});

app.post('/api/errors/alert-rules', (req, res) => {
  try {
    const ruleId = errorTrackingService.addAlertRule(req.body);
    
    res.status(201).json({
      success: true,
      ruleId,
      message: 'Alert rule created successfully',
    });
  } catch (error) {
    logger.error('Alert rule creation failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).json({
      error: 'Failed to create alert rule',
      timestamp: new Date().toISOString(),
    });
  }
});

// 404 handler
app.use(notFoundHandler);

// Error logging and tracking middleware
app.use(logger.createErrorMiddleware());
app.use(errorTrackingService.errorTrackingMiddleware());

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;

server.listen(PORT, async () => {
  try {
    // Initialize Redis connection
    await redis.connect();
    logger.info('Redis connected successfully', LogCategory.SYSTEM, {
      metadata: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || '6379'
      }
    });
  } catch (error) {
    logger.error('Redis connection failed', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
      errorCode: 'REDIS_CONNECTION_FAILED'
    });
    logger.warn('Continuing without Redis (rate limiting will use memory)', LogCategory.SYSTEM);
  }

  // Setup routes after WebSocket service is initialized
  try {
    await setupRoutes();
    logger.info('API routes loaded successfully', LogCategory.SYSTEM);
  } catch (error) {
    logger.error('Failed to setup routes', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
      errorCode: 'ROUTES_SETUP_ERROR'
    });
    throw error; // This will prevent the server from starting
  }

  logger.info(`TestBro.ai Backend Server running on port ${PORT}`, LogCategory.SYSTEM, {
    metadata: {
      port: PORT,
      nodeEnv: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    }
  });
  
  logger.info('Server endpoints initialized', LogCategory.SYSTEM, {
    metadata: {
      healthCheck: `http://localhost:${PORT}/health`,
      metrics: `http://localhost:${PORT}/api/metrics`,
      prometheus: `http://localhost:${PORT}/metrics`,
      apmPerformance: `http://localhost:${PORT}/api/apm/performance`,
      securityMonitoring: `http://localhost:${PORT}/api/security/stats`,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
    }
  });
  
  logger.info('Services initialized', LogCategory.SYSTEM, {
    metadata: {
      websocket: true,
      queue: true,
      csrf: true,
      cors: true,
      rateLimit: true,
      healthCheck: true,
      metrics: true,
      apm: true,
      errorTracking: true,
      allowedOrigins: corsService.getAllowedOrigins()
    }
  });
  
  // Start periodic security cleanup
  setInterval(() => {
    performSecurityCleanup();
    logger.debug('Periodic security cleanup performed', LogCategory.SECURITY);
  }, 15 * 60 * 1000); // Every 15 minutes
  
  // Log successful startup
  logger.logAudit('SERVER_STARTED', 'system', {
    port: PORT,
    timestamp: new Date().toISOString(),
    services: ['redis', 'websocket', 'queue', 'csrf', 'cors', 'rateLimit', 'healthCheck', 'metrics', 'apm', 'errorTracking']
  });
});

// Enhanced graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully', LogCategory.SYSTEM);
  logger.logAudit('SERVER_SHUTDOWN_INITIATED', 'system', { signal: 'SIGTERM' });

  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed', LogCategory.SYSTEM);
  });

  try {
    // Shutdown services
    await queueService.shutdown();
    logger.info('Queue service shutdown completed', LogCategory.SYSTEM);
    
    // Close Redis connection
    await redis.quit();
    logger.info('Redis connection closed', LogCategory.SYSTEM);
    
    // Final security cleanup
    performSecurityCleanup();
    logger.info('Security cleanup completed', LogCategory.SECURITY);
    
    logger.logAudit('SERVER_SHUTDOWN_COMPLETED', 'system', {
      signal: 'SIGTERM',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error during shutdown', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
      errorCode: 'SHUTDOWN_ERROR'
    });
  }

  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully', LogCategory.SYSTEM);
  logger.logAudit('SERVER_SHUTDOWN_INITIATED', 'system', { signal: 'SIGINT' });

  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed', LogCategory.SYSTEM);
  });

  try {
    // Shutdown services
    await queueService.shutdown();
    logger.info('Queue service shutdown completed', LogCategory.SYSTEM);
    
    // Close Redis connection
    await redis.quit();
    logger.info('Redis connection closed', LogCategory.SYSTEM);
    
    // Final security cleanup
    performSecurityCleanup();
    logger.info('Security cleanup completed', LogCategory.SECURITY);
    
    logger.logAudit('SERVER_SHUTDOWN_COMPLETED', 'system', {
      signal: 'SIGINT',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error during shutdown', LogCategory.SYSTEM, {
      errorStack: error instanceof Error ? error.stack : undefined,
      errorCode: 'SHUTDOWN_ERROR'
    });
  }

  process.exit(0);
});

export default app;
