import { Request, Response, NextFunction } from 'express';
import { logger, LogCategory } from './loggingService';
import { MetricsService } from './metricsService';
import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';

// Trace and span interfaces for distributed tracing
export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error';
  tags: Record<string, any>;
  logs: LogEntry[];
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  fields?: Record<string, any>;
}

export interface Trace {
  traceId: string;
  spans: Span[];
  rootSpan: Span;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error';
  serviceName: string;
  metadata?: Record<string, any>;
}

// Transaction tracking for APM
export interface Transaction {
  id: string;
  name: string;
  type: 'request' | 'background' | 'database' | 'external';
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error';
  context: {
    request?: {
      method: string;
      url: string;
      headers: Record<string, string>;
      query: Record<string, any>;
    };
    response?: {
      statusCode: number;
      headers: Record<string, string>;
    };
    user?: {
      id: string;
      email?: string;
    };
    custom?: Record<string, any>;
  };
  spans: Span[];
  errors: APMError[];
  metadata?: Record<string, any>;
}

// Error tracking for APM
export interface APMError {
  id: string;
  message: string;
  type: string;
  stackTrace?: string;
  timestamp: number;
  context: {
    transaction?: string;
    span?: string;
    user?: string;
    tags?: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

// Performance metrics
export interface PerformanceMetrics {
  throughput: {
    requestsPerSecond: number;
    transactionsPerSecond: number;
  };
  responseTime: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  errorRate: {
    percentage: number;
    total: number;
    byType: Record<string, number>;
  };
  availability: {
    uptime: number;
    downtime: number;
    percentage: number;
  };
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIO: {
      bytesIn: number;
      bytesOut: number;
    };
  };
}

// APM configuration
interface APMConfig {
  enabled: boolean;
  serviceName: string;
  environment: string;
  sampleRate: number; // 0.0 to 1.0
  maxSpansPerTrace: number;
  maxTraceRetention: number; // milliseconds
  providers: {
    newRelic?: {
      enabled: boolean;
      licenseKey?: string;
      appName?: string;
    };
    datadog?: {
      enabled: boolean;
      apiKey?: string;
      service?: string;
    };
    elastic?: {
      enabled: boolean;
      serverUrl?: string;
      secretToken?: string;
    };
    openTelemetry?: {
      enabled: boolean;
      endpoint?: string;
    };
  };
}

export class APMService {
  private redis: Redis;
  private metricsService: MetricsService;
  private config: APMConfig;
  private activeTransactions: Map<string, Transaction> = new Map();
  private activeSpans: Map<string, Span> = new Map();
  private traces: Map<string, Trace> = new Map();
  private errors: APMError[] = [];
  private performanceBuffer: {
    responseTimes: number[];
    errorCounts: Map<string, number>;
    requestCounts: number[];
    timestamps: number[];
  };

  constructor(redis: Redis, metricsService: MetricsService, config?: Partial<APMConfig>) {
    this.redis = redis;
    this.metricsService = metricsService;
    this.config = {
      enabled: true,
      serviceName: 'testbro-backend',
      environment: process.env.NODE_ENV || 'development',
      sampleRate: parseFloat(process.env.APM_SAMPLE_RATE || '1.0'),
      maxSpansPerTrace: 100,
      maxTraceRetention: 3600000, // 1 hour
      providers: {
        newRelic: {
          enabled: !!process.env.NEW_RELIC_LICENSE_KEY,
          licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
          appName: process.env.NEW_RELIC_APP_NAME || 'TestBro Backend',
        },
        datadog: {
          enabled: !!process.env.DD_API_KEY,
          apiKey: process.env.DD_API_KEY,
          service: process.env.DD_SERVICE || 'testbro-backend',
        },
        elastic: {
          enabled: !!process.env.ELASTIC_APM_SERVER_URL,
          serverUrl: process.env.ELASTIC_APM_SERVER_URL,
          secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
        },
        openTelemetry: {
          enabled: !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
          endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        },
      },
      ...config,
    };

    this.performanceBuffer = {
      responseTimes: [],
      errorCounts: new Map(),
      requestCounts: [],
      timestamps: [],
    };

    this.startPeriodicCleanup();
    this.startMetricsAggregation();
    this.initializeProviders();
  }

  // Transaction management
  startTransaction(
    name: string,
    type: Transaction['type'] = 'request',
    context?: Transaction['context']
  ): string {
    if (!this.config.enabled || !this.shouldSample()) {
      return '';
    }

    const transactionId = uuidv4();
    const transaction: Transaction = {
      id: transactionId,
      name,
      type,
      startTime: performance.now(),
      status: 'pending',
      context: context || {},
      spans: [],
      errors: [],
    };

    this.activeTransactions.set(transactionId, transaction);

    logger.debug('APM transaction started', LogCategory.PERFORMANCE, {
      metadata: {
        transactionId,
        name,
        type,
      }
    });

    return transactionId;
  }

  endTransaction(transactionId: string, status: 'success' | 'error' = 'success'): Transaction | null {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      return null;
    }

    const endTime = performance.now();
    transaction.endTime = endTime;
    transaction.duration = endTime - transaction.startTime;
    transaction.status = status;

    // Record metrics
    this.metricsService.timer('transaction_duration', transaction.duration, {
      name: transaction.name,
      type: transaction.type,
      status,
    });

    this.performanceBuffer.responseTimes.push(transaction.duration);
    this.performanceBuffer.timestamps.push(Date.now());

    // Store completed transaction
    this.storeTransaction(transaction);
    this.activeTransactions.delete(transactionId);

    logger.debug('APM transaction ended', LogCategory.PERFORMANCE, {
      metadata: {
        transactionId,
        duration: transaction.duration,
        status,
        spansCount: transaction.spans.length,
      }
    });

    return transaction;
  }

  // Span management for distributed tracing
  startSpan(
    operationName: string,
    parentSpanId?: string,
    traceId?: string,
    tags?: Record<string, any>
  ): string {
    if (!this.config.enabled) {
      return '';
    }

    const spanId = uuidv4();
    const finalTraceId = traceId || uuidv4();

    const span: Span = {
      traceId: finalTraceId,
      spanId,
      parentSpanId,
      operationName,
      startTime: performance.now(),
      status: 'pending',
      tags: tags || {},
      logs: [],
    };

    this.activeSpans.set(spanId, span);

    // Update or create trace
    if (!this.traces.has(finalTraceId)) {
      const trace: Trace = {
        traceId: finalTraceId,
        spans: [span],
        rootSpan: span,
        startTime: span.startTime,
        status: 'pending',
        serviceName: this.config.serviceName,
      };
      this.traces.set(finalTraceId, trace);
    } else {
      const trace = this.traces.get(finalTraceId)!;
      trace.spans.push(span);
    }

    return spanId;
  }

  endSpan(spanId: string, status: 'success' | 'error' = 'success', tags?: Record<string, any>): Span | null {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      return null;
    }

    const endTime = performance.now();
    span.endTime = endTime;
    span.duration = endTime - span.startTime;
    span.status = status;

    if (tags) {
      span.tags = { ...span.tags, ...tags };
    }

    // Update trace
    const trace = this.traces.get(span.traceId);
    if (trace) {
      // Check if all spans in trace are completed
      const allSpansCompleted = trace.spans.every(s => s.endTime !== undefined);
      if (allSpansCompleted) {
        trace.endTime = Math.max(...trace.spans.map(s => s.endTime!));
        trace.duration = trace.endTime - trace.startTime;
        trace.status = trace.spans.some(s => s.status === 'error') ? 'error' : 'success';
      }
    }

    this.activeSpans.delete(spanId);
    return span;
  }

  // Add logs to span
  addSpanLog(spanId: string, level: LogEntry['level'], message: string, fields?: Record<string, any>): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: performance.now(),
        level,
        message,
        fields,
      });
    }
  }

  // Error tracking
  recordError(
    error: Error,
    context?: {
      transactionId?: string;
      spanId?: string;
      userId?: string;
      tags?: Record<string, any>;
    }
  ): string {
    const errorId = uuidv4();
    const apmError: APMError = {
      id: errorId,
      message: error.message,
      type: error.name,
      stackTrace: error.stack,
      timestamp: Date.now(),
      context: {
        transaction: context?.transactionId,
        span: context?.spanId,
        user: context?.userId,
        tags: context?.tags,
      },
    };

    this.errors.push(apmError);

    // Update error counts
    const errorType = error.name;
    const currentCount = this.performanceBuffer.errorCounts.get(errorType) || 0;
    this.performanceBuffer.errorCounts.set(errorType, currentCount + 1);

    // Add error to transaction if specified
    if (context?.transactionId) {
      const transaction = this.activeTransactions.get(context.transactionId);
      if (transaction) {
        transaction.errors.push(apmError);
      }
    }

    // Track with metrics service
    this.metricsService.increment('errors_total', 1, {
      type: errorType,
      transaction: context?.transactionId || 'unknown',
    });

    logger.error('APM error recorded', LogCategory.SYSTEM, {
      errorStack: error.stack,
      errorCode: 'APM_ERROR_RECORDED',
      metadata: {
        errorId,
        transactionId: context?.transactionId,
        spanId: context?.spanId,
      }
    });

    // Keep only last 1000 errors
    if (this.errors.length > 1000) {
      this.errors.shift();
    }

    return errorId;
  }

  // Express middleware for automatic transaction tracking
  transactionMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const transactionName = `${req.method} ${req.route?.path || req.path}`;
      const transactionId = this.startTransaction(transactionName, 'request', {
        request: {
          method: req.method,
          url: req.originalUrl,
          headers: req.headers as Record<string, string>,
          query: req.query as Record<string, any>,
        },
        user: req.user ? {
          id: req.user.id,
          email: req.user.email,
        } : undefined,
      });

      // Store transaction ID in request for other middleware
      req.apmTransactionId = transactionId;

      res.on('finish', () => {
        const transaction = this.activeTransactions.get(transactionId);
        if (transaction) {
          transaction.context.response = {
            statusCode: res.statusCode,
            headers: res.getHeaders() as Record<string, string>,
          };

          const status = res.statusCode >= 400 ? 'error' : 'success';
          this.endTransaction(transactionId, status);
        }
      });

      next();
    };
  }

  // Database operation tracing
  traceDatabaseOperation<T>(
    operation: string,
    table: string,
    callback: () => Promise<T>
  ): Promise<T> {
    const spanId = this.startSpan(`db.${operation}`, undefined, undefined, {
      'db.type': 'postgresql',
      'db.table': table,
      'db.operation': operation,
    });

    const startTime = performance.now();

    return callback()
      .then((result) => {
        const duration = performance.now() - startTime;
        this.endSpan(spanId, 'success', {
          'db.duration': duration,
          'db.success': true,
        });
        
        this.metricsService.trackDatabaseOperation(operation, table, duration, true);
        return result;
      })
      .catch((error) => {
        const duration = performance.now() - startTime;
        this.endSpan(spanId, 'error', {
          'db.duration': duration,
          'db.error': error.message,
        });
        
        this.metricsService.trackDatabaseOperation(operation, table, duration, false);
        this.recordError(error, { spanId });
        throw error;
      });
  }

  // External API call tracing
  traceExternalCall<T>(
    serviceName: string,
    endpoint: string,
    callback: () => Promise<T>
  ): Promise<T> {
    const spanId = this.startSpan(`http.${serviceName}`, undefined, undefined, {
      'http.service': serviceName,
      'http.endpoint': endpoint,
      'span.kind': 'client',
    });

    const startTime = performance.now();

    return callback()
      .then((result) => {
        const duration = performance.now() - startTime;
        this.endSpan(spanId, 'success', {
          'http.duration': duration,
          'http.success': true,
        });
        return result;
      })
      .catch((error) => {
        const duration = performance.now() - startTime;
        this.endSpan(spanId, 'error', {
          'http.duration': duration,
          'http.error': error.message,
        });
        
        this.recordError(error, { spanId });
        throw error;
      });
  }

  // Get performance metrics
  getPerformanceMetrics(): PerformanceMetrics {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    // Filter recent data
    const recentResponseTimes = this.performanceBuffer.responseTimes.slice(-1000);
    const recentTimestamps = this.performanceBuffer.timestamps.filter(ts => ts > oneMinuteAgo);
    
    // Calculate throughput
    const requestsPerSecond = recentTimestamps.length / 60;
    const transactionsPerSecond = requestsPerSecond; // Simplified

    // Calculate response time percentiles
    const sortedTimes = [...recentResponseTimes].sort((a, b) => a - b);
    const responseTime = {
      average: sortedTimes.length > 0 ? sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length : 0,
      p50: this.getPercentile(sortedTimes, 50),
      p95: this.getPercentile(sortedTimes, 95),
      p99: this.getPercentile(sortedTimes, 99),
      max: sortedTimes.length > 0 ? sortedTimes[sortedTimes.length - 1] : 0,
    };

    // Calculate error rate
    const totalErrors = Array.from(this.performanceBuffer.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const totalRequests = this.performanceBuffer.responseTimes.length;
    const errorRate = {
      percentage: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      total: totalErrors,
      byType: Object.fromEntries(this.performanceBuffer.errorCounts),
    };

    return {
      throughput: {
        requestsPerSecond: parseFloat(requestsPerSecond.toFixed(2)),
        transactionsPerSecond: parseFloat(transactionsPerSecond.toFixed(2)),
      },
      responseTime: {
        average: parseFloat(responseTime.average.toFixed(2)),
        p50: parseFloat(responseTime.p50.toFixed(2)),
        p95: parseFloat(responseTime.p95.toFixed(2)),
        p99: parseFloat(responseTime.p99.toFixed(2)),
        max: parseFloat(responseTime.max.toFixed(2)),
      },
      errorRate,
      availability: {
        uptime: process.uptime() * 1000,
        downtime: 0, // Would need to track actual downtime
        percentage: 99.99, // Simplified - would calculate based on actual uptime/downtime
      },
      resources: {
        cpuUsage: 0, // Would integrate with system metrics
        memoryUsage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
        diskUsage: 0, // Would integrate with system metrics
        networkIO: {
          bytesIn: 0, // Would track actual network I/O
          bytesOut: 0,
        },
      },
    };
  }

  // Get trace by ID
  getTrace(traceId: string): Trace | null {
    return this.traces.get(traceId) || null;
  }

  // Get recent errors
  getRecentErrors(limit: number = 100): APMError[] {
    return this.errors.slice(-limit);
  }

  // Get active transactions
  getActiveTransactions(): Transaction[] {
    return Array.from(this.activeTransactions.values());
  }

  // Private helper methods
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  private getPercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }

  private async storeTransaction(transaction: Transaction): Promise<void> {
    try {
      // Store in Redis with TTL
      await this.redis.setex(
        `apm:transaction:${transaction.id}`,
        3600, // 1 hour TTL
        JSON.stringify(transaction)
      );
    } catch (error) {
      logger.error('Failed to store APM transaction', LogCategory.SYSTEM, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { transactionId: transaction.id },
      });
    }
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const cutoff = now - this.config.maxTraceRetention;

      // Clean up old traces
      for (const [traceId, trace] of this.traces.entries()) {
        if (trace.startTime < cutoff) {
          this.traces.delete(traceId);
        }
      }

      // Clean up performance buffer
      if (this.performanceBuffer.responseTimes.length > 10000) {
        this.performanceBuffer.responseTimes = this.performanceBuffer.responseTimes.slice(-5000);
      }

      // Clean up old errors
      if (this.errors.length > 1000) {
        this.errors = this.errors.slice(-500);
      }

      logger.debug('APM cleanup performed', LogCategory.SYSTEM, {
        metadata: {
          tracesCount: this.traces.size,
          errorsCount: this.errors.length,
          responseTimesCount: this.performanceBuffer.responseTimes.length,
        }
      });
    }, 300000); // Every 5 minutes
  }

  private startMetricsAggregation(): void {
    setInterval(() => {
      const metrics = this.getPerformanceMetrics();
      
      // Store aggregated metrics
      this.metricsService.gauge('apm_requests_per_second', metrics.throughput.requestsPerSecond);
      this.metricsService.gauge('apm_response_time_avg', metrics.responseTime.average);
      this.metricsService.gauge('apm_response_time_p95', metrics.responseTime.p95);
      this.metricsService.gauge('apm_error_rate', metrics.errorRate.percentage);
      
      logger.debug('APM metrics aggregated', LogCategory.PERFORMANCE, {
        metadata: {
          requestsPerSecond: metrics.throughput.requestsPerSecond,
          avgResponseTime: metrics.responseTime.average,
          errorRate: metrics.errorRate.percentage,
        }
      });
    }, 60000); // Every minute
  }

  private initializeProviders(): void {
    // Initialize APM providers based on configuration
    if (this.config.providers.newRelic?.enabled) {
      logger.info('New Relic APM integration detected', LogCategory.SYSTEM);
    }
    
    if (this.config.providers.datadog?.enabled) {
      logger.info('Datadog APM integration detected', LogCategory.SYSTEM);
    }
    
    if (this.config.providers.elastic?.enabled) {
      logger.info('Elastic APM integration detected', LogCategory.SYSTEM);
    }
    
    if (this.config.providers.openTelemetry?.enabled) {
      logger.info('OpenTelemetry integration detected', LogCategory.SYSTEM);
    }

    logger.info('APM service initialized', LogCategory.SYSTEM, {
      metadata: {
        serviceName: this.config.serviceName,
        environment: this.config.environment,
        sampleRate: this.config.sampleRate,
        enabledProviders: Object.entries(this.config.providers)
          .filter(([, config]) => config.enabled)
          .map(([name]) => name),
      }
    });
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      apmTransactionId?: string;
    }
  }
}

export default APMService;