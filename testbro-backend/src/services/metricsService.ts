import { Request, Response } from 'express';
import { logger, LogCategory } from './loggingService';
import Redis from 'ioredis';
import { performance } from 'perf_hooks';

// Metric types
export interface Metric {
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface MetricSummary {
  name: string;
  type: string;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  lastUpdated: Date;
}

export interface MetricsSnapshot {
  timestamp: Date;
  summary: Record<string, MetricSummary>;
  counters: Record<string, number>;
  gauges: Record<string, number>;
  system: {
    requests: {
      total: number;
      successful: number;
      failed: number;
      rate: number; // requests per second
    };
    response: {
      avgTime: number;
      p50: number;
      p95: number;
      p99: number;
    };
    errors: {
      total: number;
      rate: number; // errors per second
      byType: Record<string, number>;
    };
    users: {
      active: number;
      authenticated: number;
      apiKeys: number;
    };
  };
}

// Performance tracking
interface PerformanceTracker {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export class MetricsService {
  private redis: Redis;
  private metrics: Map<string, Metric[]> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private timers: Map<string, number[]> = new Map();
  private activeTrackers: Map<string, PerformanceTracker> = new Map();
  
  // Request tracking
  private requestStats = {
    total: 0,
    successful: 0,
    failed: 0,
    responseTimes: [] as number[],
    errors: new Map<string, number>(),
    timestamps: [] as number[],
  };

  // User tracking
  private userStats = {
    activeUsers: new Set<string>(),
    authenticatedUsers: new Set<string>(),
    apiKeyUsers: new Set<string>(),
  };

  constructor(redis: Redis) {
    this.redis = redis;
    this.startPeriodicCleanup();
    this.startMetricsAggregation();
  }

  // Counter methods
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
    
    this.recordMetric({
      name,
      value: current + value,
      type: 'counter',
      timestamp: new Date(),
      tags,
    });
  }

  decrement(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.increment(name, -value, tags);
  }

  // Gauge methods
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.gauges.set(name, value);
    
    this.recordMetric({
      name,
      value,
      type: 'gauge',
      timestamp: new Date(),
      tags,
    });
  }

  // Timer methods
  timer(name: string, value: number, tags?: Record<string, string>): void {
    const timings = this.timers.get(name) || [];
    timings.push(value);
    this.timers.set(name, timings);
    
    this.recordMetric({
      name,
      value,
      type: 'timer',
      timestamp: new Date(),
      tags,
    });

    // Keep only last 1000 timings
    if (timings.length > 1000) {
      timings.shift();
    }
  }

  // Performance tracking
  startTimer(name: string, metadata?: Record<string, any>): string {
    const trackerId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.activeTrackers.set(trackerId, {
      name,
      startTime: performance.now(),
      metadata,
    });
    
    return trackerId;
  }

  endTimer(trackerId: string, tags?: Record<string, string>): number | null {
    const tracker = this.activeTrackers.get(trackerId);
    if (!tracker) {
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - tracker.startTime;
    
    tracker.endTime = endTime;
    tracker.duration = duration;
    
    // Record timer metric
    this.timer(tracker.name, duration, tags);
    
    // Log performance metric
    logger.logPerformance(tracker.name, duration, {
      metadata: {
        trackerId,
        ...tracker.metadata,
      }
    });
    
    this.activeTrackers.delete(trackerId);
    return duration;
  }

  // Express middleware for automatic request tracking
  requestTrackingMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      const startTime = performance.now();
      const trackerId = this.startTimer('http_request', {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      // Track user activity
      if (req.user?.id) {
        this.userStats.activeUsers.add(req.user.id);
        this.userStats.authenticatedUsers.add(req.user.id);
      }

      if (req.apiKey?.id) {
        this.userStats.apiKeyUsers.add(req.apiKey.id);
      }

      // Increment request counter
      this.increment('http_requests_total', 1, {
        method: req.method,
        endpoint: req.route?.path || req.path,
      });

      // Set up response tracking before sending headers
      const originalSend = res.send;
      res.send = function(body) {
        const duration = performance.now() - startTime;
        
        // Set headers before sending response
        if (!res.headersSent) {
          res.set({
            'X-Response-Time': `${duration.toFixed(2)}ms`,
            'X-Request-ID': req.requestId || 'unknown',
          });
        }
        
        return originalSend.call(this, body);
      };
      
      res.on('finish', () => {
        const duration = this.endTimer(trackerId);
        
        // Track request completion
        this.requestStats.total++;
        this.requestStats.timestamps.push(Date.now());
        
        if (duration) {
          this.requestStats.responseTimes.push(duration);
        }

        // Track success/failure
        if (res.statusCode < 400) {
          this.requestStats.successful++;
          this.increment('http_requests_successful', 1, {
            method: req.method,
            status_code: res.statusCode.toString(),
          });
        } else {
          this.requestStats.failed++;
          this.increment('http_requests_failed', 1, {
            method: req.method,
            status_code: res.statusCode.toString(),
          });

          // Track error types
          const errorType = this.getErrorType(res.statusCode);
          const current = this.requestStats.errors.get(errorType) || 0;
          this.requestStats.errors.set(errorType, current + 1);
        }

        // Record response time
        if (duration) {
          this.timer('http_request_duration', duration, {
            method: req.method,
            status_code: res.statusCode.toString(),
          });
        }
      });

      next();
    };
  }

  // Database operation tracking
  trackDatabaseOperation(operation: string, table: string, duration: number, success: boolean): void {
    this.timer('database_operation_duration', duration, {
      operation,
      table,
      success: success.toString(),
    });

    this.increment('database_operations_total', 1, {
      operation,
      table,
    });

    if (success) {
      this.increment('database_operations_successful', 1, {
        operation,
        table,
      });
    } else {
      this.increment('database_operations_failed', 1, {
        operation,
        table,
      });
    }
  }

  // WebSocket connection tracking
  trackWebSocketConnection(action: 'connect' | 'disconnect', userId?: string): void {
    this.increment(`websocket_${action}`, 1);
    
    if (action === 'connect' && userId) {
      this.userStats.activeUsers.add(userId);
    }
  }

  // Queue operation tracking
  trackQueueOperation(jobType: string, operation: 'enqueue' | 'process' | 'complete' | 'failed', duration?: number): void {
    this.increment(`queue_${operation}`, 1, { jobType });
    
    if (duration) {
      this.timer(`queue_${operation}_duration`, duration, { jobType });
    }
  }

  // Cache operation tracking
  trackCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', key?: string): void {
    this.increment(`cache_${operation}`, 1);
    
    if (operation === 'hit') {
      this.increment('cache_hits_total', 1);
    } else if (operation === 'miss') {
      this.increment('cache_misses_total', 1);
    }
  }

  // API key usage tracking
  trackAPIKeyUsage(keyId: string, endpoint: string, responseTime: number, success: boolean): void {
    this.increment('api_key_requests_total', 1, {
      keyId,
      endpoint,
    });

    this.timer('api_key_response_time', responseTime, {
      keyId,
      endpoint,
    });

    if (success) {
      this.increment('api_key_requests_successful', 1, { keyId });
    } else {
      this.increment('api_key_requests_failed', 1, { keyId });
    }
  }

  // Security event tracking
  trackSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', userId?: string): void {
    this.increment('security_events_total', 1, {
      event,
      severity,
    });

    if (userId) {
      this.increment('security_events_by_user', 1, { userId });
    }
  }

  // Get current metrics snapshot
  getMetricsSnapshot(): MetricsSnapshot {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Calculate rates
    const recentRequests = this.requestStats.timestamps.filter(ts => ts > oneMinuteAgo);
    const requestRate = recentRequests.length / 60; // requests per second
    
    const recentErrors = this.requestStats.failed; // Simplified
    const errorRate = this.requestStats.total > 0 ? (this.requestStats.failed / this.requestStats.total) : 0;

    // Calculate response time percentiles
    const sortedResponseTimes = [...this.requestStats.responseTimes].sort((a, b) => a - b);
    const p50 = this.getPercentile(sortedResponseTimes, 50);
    const p95 = this.getPercentile(sortedResponseTimes, 95);
    const p99 = this.getPercentile(sortedResponseTimes, 99);
    const avgTime = sortedResponseTimes.length > 0 
      ? sortedResponseTimes.reduce((sum, time) => sum + time, 0) / sortedResponseTimes.length 
      : 0;

    return {
      timestamp: new Date(),
      summary: this.generateMetricsSummary(),
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      system: {
        requests: {
          total: this.requestStats.total,
          successful: this.requestStats.successful,
          failed: this.requestStats.failed,
          rate: parseFloat(requestRate.toFixed(2)),
        },
        response: {
          avgTime: parseFloat(avgTime.toFixed(2)),
          p50: parseFloat(p50.toFixed(2)),
          p95: parseFloat(p95.toFixed(2)),
          p99: parseFloat(p99.toFixed(2)),
        },
        errors: {
          total: this.requestStats.failed,
          rate: parseFloat(errorRate.toFixed(4)),
          byType: Object.fromEntries(this.requestStats.errors),
        },
        users: {
          active: this.userStats.activeUsers.size,
          authenticated: this.userStats.authenticatedUsers.size,
          apiKeys: this.userStats.apiKeyUsers.size,
        },
      },
    };
  }

  // Export metrics for external monitoring systems (Prometheus format)
  exportPrometheusMetrics(): string {
    const lines: string[] = [];
    
    // Counters
    this.counters.forEach((value, name) => {
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name} ${value}`);
    });

    // Gauges
    this.gauges.forEach((value, name) => {
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${value}`);
    });

    // Timers (as histograms)
    this.timers.forEach((values, name) => {
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const sum = sorted.reduce((acc, val) => acc + val, 0);
        const count = sorted.length;
        
        lines.push(`# TYPE ${name} histogram`);
        lines.push(`${name}_sum ${sum}`);
        lines.push(`${name}_count ${count}`);
        lines.push(`${name}_bucket{le="0.1"} ${sorted.filter(v => v <= 100).length}`);
        lines.push(`${name}_bucket{le="0.5"} ${sorted.filter(v => v <= 500).length}`);
        lines.push(`${name}_bucket{le="1"} ${sorted.filter(v => v <= 1000).length}`);
        lines.push(`${name}_bucket{le="5"} ${sorted.filter(v => v <= 5000).length}`);
        lines.push(`${name}_bucket{le="+Inf"} ${count}`);
      }
    });

    return lines.join('\n');
  }

  // Private helper methods
  private recordMetric(metric: Metric): void {
    const metrics = this.metrics.get(metric.name) || [];
    metrics.push(metric);
    this.metrics.set(metric.name, metrics);

    // Keep only last 1000 metrics per name
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }

  private generateMetricsSummary(): Record<string, MetricSummary> {
    const summary: Record<string, MetricSummary> = {};

    this.metrics.forEach((metrics, name) => {
      if (metrics.length === 0) return;

      const values = metrics.map(m => m.value).sort((a, b) => a - b);
      const sum = values.reduce((acc, val) => acc + val, 0);
      const count = values.length;
      const avg = sum / count;
      const min = values[0];
      const max = values[values.length - 1];
      const p50 = this.getPercentile(values, 50);
      const p95 = this.getPercentile(values, 95);
      const p99 = this.getPercentile(values, 99);
      const lastUpdated = metrics[metrics.length - 1].timestamp;

      summary[name] = {
        name,
        type: metrics[0].type,
        count,
        sum,
        avg,
        min,
        max,
        p50,
        p95,
        p99,
        lastUpdated,
      };
    });

    return summary;
  }

  private getPercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }

  private getErrorType(statusCode: number): string {
    if (statusCode >= 400 && statusCode < 500) {
      return 'client_error';
    } else if (statusCode >= 500) {
      return 'server_error';
    }
    return 'unknown_error';
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      // Clean up old request timestamps
      const oneHourAgo = Date.now() - 3600000;
      this.requestStats.timestamps = this.requestStats.timestamps.filter(ts => ts > oneHourAgo);
      
      // Clean up old response times
      if (this.requestStats.responseTimes.length > 10000) {
        this.requestStats.responseTimes = this.requestStats.responseTimes.slice(-5000);
      }

      // Reset user stats periodically
      this.userStats.activeUsers.clear();
      
      logger.debug('Metrics cleanup performed', LogCategory.SYSTEM, {
        metadata: {
          remainingTimestamps: this.requestStats.timestamps.length,
          remainingResponseTimes: this.requestStats.responseTimes.length,
        }
      });
    }, 300000); // Every 5 minutes
  }

  private startMetricsAggregation(): void {
    setInterval(async () => {
      try {
        const snapshot = this.getMetricsSnapshot();
        
        // Store aggregated metrics in Redis for historical data
        await this.redis.setex(
          `metrics:snapshot:${Date.now()}`,
          3600, // 1 hour TTL
          JSON.stringify(snapshot)
        );

        // Log metrics summary
        logger.debug('Metrics aggregated', LogCategory.SYSTEM, {
          metadata: {
            totalRequests: snapshot.system.requests.total,
            requestRate: snapshot.system.requests.rate,
            errorRate: snapshot.system.errors.rate,
            avgResponseTime: snapshot.system.response.avgTime,
            activeUsers: snapshot.system.users.active,
          }
        });
      } catch (error) {
        logger.error('Metrics aggregation failed', LogCategory.SYSTEM, {
          errorStack: error instanceof Error ? error.stack : undefined,
        });
      }
    }, 60000); // Every minute
  }

  // Reset methods for testing
  reset(): void {
    this.metrics.clear();
    this.counters.clear();
    this.gauges.clear();
    this.timers.clear();
    this.activeTrackers.clear();
    
    this.requestStats = {
      total: 0,
      successful: 0,
      failed: 0,
      responseTimes: [],
      errors: new Map(),
      timestamps: [],
    };

    this.userStats = {
      activeUsers: new Set(),
      authenticatedUsers: new Set(),
      apiKeyUsers: new Set(),
    };
  }
}

export default MetricsService;