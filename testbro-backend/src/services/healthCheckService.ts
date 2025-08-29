import { supabaseAdmin } from '../config/database';
import { logger, LogCategory } from './loggingService';
import Redis from 'ioredis';
import { performance } from 'perf_hooks';
import os from 'os';
import fs from 'fs';
import path from 'path';

// Health check status types
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// Individual service health check result
export interface ServiceHealth {
  status: HealthStatus;
  message: string;
  responseTime: number;
  timestamp: Date;
  details?: Record<string, any>;
}

// Overall system health
export interface SystemHealth {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  version: string;
  services: Record<string, ServiceHealth>;
  metrics: SystemMetrics;
  alerts: HealthAlert[];
}

// System metrics
export interface SystemMetrics {
  memory: {
    used: number;
    free: number;
    total: number;
    usage: number; // percentage
  };
  cpu: {
    usage: number; // percentage
    loadAverage: number[];
  };
  disk: {
    used: number;
    free: number;
    total: number;
    usage: number; // percentage
  };
  process: {
    pid: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
  network: {
    connections: number;
    bytesReceived: number;
    bytesSent: number;
  };
  application: {
    activeConnections: number;
    requestsPerMinute: number;
    errorRate: number;
    averageResponseTime: number;
  };
}

// Health alerts
export interface HealthAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  service: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  details?: Record<string, any>;
}

// Health check configuration
interface HealthCheckConfig {
  interval: number; // milliseconds
  timeout: number; // milliseconds
  retries: number;
  thresholds: {
    memory: number; // percentage
    cpu: number; // percentage
    disk: number; // percentage
    responseTime: number; // milliseconds
    errorRate: number; // percentage
  };
}

export class HealthCheckService {
  private redis: Redis;
  private config: HealthCheckConfig;
  private alerts: HealthAlert[] = [];
  private metrics: SystemMetrics | null = null;
  private requestMetrics = {
    total: 0,
    errors: 0,
    responseTimes: [] as number[],
    lastMinuteRequests: [] as number[],
  };

  constructor(redis: Redis, config?: Partial<HealthCheckConfig>) {
    this.redis = redis;
    this.config = {
      interval: 30000, // 30 seconds
      timeout: 5000,   // 5 seconds
      retries: 3,
      thresholds: {
        memory: 85,      // 85%
        cpu: 80,         // 80%
        disk: 90,        // 90%
        responseTime: 2000, // 2 seconds
        errorRate: 5,    // 5%
      },
      ...config,
    };

    this.startPeriodicHealthChecks();
    this.startMetricsCollection();
  }

  // Individual service health checks
  async checkDatabase(): Promise<ServiceHealth> {
    const startTime = performance.now();
    
    try {
      // Test database connectivity with a simple query
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('count')
        .limit(1);

      const responseTime = performance.now() - startTime;

      if (error) {
        return {
          status: 'unhealthy',
          message: `Database connection failed: ${error.message}`,
          responseTime,
          timestamp: new Date(),
          details: { error: error.message }
        };
      }

      // Check response time threshold
      const status: HealthStatus = responseTime > this.config.thresholds.responseTime ? 'degraded' : 'healthy';

      return {
        status,
        message: status === 'healthy' ? 'Database connection successful' : 'Database response time high',
        responseTime,
        timestamp: new Date(),
        details: { queryResult: data?.length || 0 }
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        status: 'unhealthy',
        message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime,
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.stack : error }
      };
    }
  }

  async checkRedis(): Promise<ServiceHealth> {
    const startTime = performance.now();
    
    try {
      // Test Redis connectivity
      const testKey = `health_check_${Date.now()}`;
      const testValue = 'health_check_value';
      
      await this.redis.set(testKey, testValue, 'EX', 10); // Expire in 10 seconds
      const result = await this.redis.get(testKey);
      await this.redis.del(testKey); // Cleanup

      const responseTime = performance.now() - startTime;

      if (result !== testValue) {
        return {
          status: 'unhealthy',
          message: 'Redis read/write test failed',
          responseTime,
          timestamp: new Date(),
        };
      }

      const status: HealthStatus = responseTime > this.config.thresholds.responseTime ? 'degraded' : 'healthy';

      return {
        status,
        message: status === 'healthy' ? 'Redis connection successful' : 'Redis response time high',
        responseTime,
        timestamp: new Date(),
        details: { 
          connectionStatus: this.redis.status,
          // Redis memory usage check would require MEMORY USAGE command if available
        }
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        status: 'unhealthy',
        message: `Redis check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime,
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.stack : error }
      };
    }
  }

  async checkDiskSpace(): Promise<ServiceHealth> {
    const startTime = performance.now();
    
    try {
      const stats = fs.statSync(process.cwd());
      const { size: totalBytes } = stats;
      
      // Get disk usage for the current directory
      const diskUsage = await this.getDiskUsage(process.cwd());
      const responseTime = performance.now() - startTime;

      const usagePercentage = (diskUsage.used / diskUsage.total) * 100;
      
      let status: HealthStatus;
      let message: string;

      if (usagePercentage >= this.config.thresholds.disk) {
        status = 'unhealthy';
        message = `Disk usage critical: ${usagePercentage.toFixed(2)}%`;
      } else if (usagePercentage >= this.config.thresholds.disk - 10) {
        status = 'degraded';
        message = `Disk usage high: ${usagePercentage.toFixed(2)}%`;
      } else {
        status = 'healthy';
        message = `Disk usage normal: ${usagePercentage.toFixed(2)}%`;
      }

      return {
        status,
        message,
        responseTime,
        timestamp: new Date(),
        details: {
          usagePercentage: parseFloat(usagePercentage.toFixed(2)),
          totalGB: parseFloat((diskUsage.total / (1024 ** 3)).toFixed(2)),
          usedGB: parseFloat((diskUsage.used / (1024 ** 3)).toFixed(2)),
          freeGB: parseFloat((diskUsage.free / (1024 ** 3)).toFixed(2)),
        }
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        status: 'unknown',
        message: `Disk check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime,
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.stack : error }
      };
    }
  }

  checkMemory(): ServiceHealth {
    const startTime = performance.now();
    
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const usagePercentage = (usedMemory / totalMemory) * 100;
      
      const processMemory = process.memoryUsage();
      const responseTime = performance.now() - startTime;

      let status: HealthStatus;
      let message: string;

      if (usagePercentage >= this.config.thresholds.memory) {
        status = 'unhealthy';
        message = `Memory usage critical: ${usagePercentage.toFixed(2)}%`;
      } else if (usagePercentage >= this.config.thresholds.memory - 10) {
        status = 'degraded';
        message = `Memory usage high: ${usagePercentage.toFixed(2)}%`;
      } else {
        status = 'healthy';
        message = `Memory usage normal: ${usagePercentage.toFixed(2)}%`;
      }

      return {
        status,
        message,
        responseTime,
        timestamp: new Date(),
        details: {
          system: {
            totalGB: parseFloat((totalMemory / (1024 ** 3)).toFixed(2)),
            usedGB: parseFloat((usedMemory / (1024 ** 3)).toFixed(2)),
            freeGB: parseFloat((freeMemory / (1024 ** 3)).toFixed(2)),
            usagePercentage: parseFloat(usagePercentage.toFixed(2)),
          },
          process: {
            rssGB: parseFloat((processMemory.rss / (1024 ** 3)).toFixed(2)),
            heapUsedGB: parseFloat((processMemory.heapUsed / (1024 ** 3)).toFixed(2)),
            heapTotalGB: parseFloat((processMemory.heapTotal / (1024 ** 3)).toFixed(2)),
            externalGB: parseFloat((processMemory.external / (1024 ** 3)).toFixed(2)),
          }
        }
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        status: 'unknown',
        message: `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime,
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.stack : error }
      };
    }
  }

  checkCPU(): ServiceHealth {
    const startTime = performance.now();
    
    try {
      const cpus = os.cpus();
      const loadAverage = os.loadavg();
      const responseTime = performance.now() - startTime;

      // Calculate average CPU usage (simplified)
      const avgUsage = loadAverage[0] / cpus.length * 100;

      let status: HealthStatus;
      let message: string;

      if (avgUsage >= this.config.thresholds.cpu) {
        status = 'unhealthy';
        message = `CPU usage critical: ${avgUsage.toFixed(2)}%`;
      } else if (avgUsage >= this.config.thresholds.cpu - 20) {
        status = 'degraded';
        message = `CPU usage high: ${avgUsage.toFixed(2)}%`;
      } else {
        status = 'healthy';
        message = `CPU usage normal: ${avgUsage.toFixed(2)}%`;
      }

      return {
        status,
        message,
        responseTime,
        timestamp: new Date(),
        details: {
          cores: cpus.length,
          loadAverage: loadAverage.map(avg => parseFloat(avg.toFixed(2))),
          avgUsage: parseFloat(avgUsage.toFixed(2)),
          cpuModel: cpus[0]?.model || 'Unknown',
        }
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        status: 'unknown',
        message: `CPU check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime,
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.stack : error }
      };
    }
  }

  // Comprehensive system health check
  async getSystemHealth(): Promise<SystemHealth> {
    const startTime = performance.now();
    
    try {
      // Run all health checks in parallel
      const [database, redis, disk, memory, cpu] = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkDiskSpace(),
        Promise.resolve(this.checkMemory()),
        Promise.resolve(this.checkCPU()),
      ]);

      const services = {
        database,
        redis,
        disk,
        memory,
        cpu,
      };

      // Determine overall system status
      const statuses = Object.values(services).map(service => service.status);
      let overallStatus: HealthStatus;

      if (statuses.includes('unhealthy')) {
        overallStatus = 'unhealthy';
      } else if (statuses.includes('degraded')) {
        overallStatus = 'degraded';
      } else if (statuses.includes('unknown')) {
        overallStatus = 'unknown';
      } else {
        overallStatus = 'healthy';
      }

      // Update metrics
      await this.updateMetrics();

      // Check for new alerts
      this.generateAlerts(services);

      const systemHealth: SystemHealth = {
        status: overallStatus,
        timestamp: new Date(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        services,
        metrics: this.metrics!,
        alerts: this.getActiveAlerts(),
      };

      // Log health check
      logger.debug('System health check completed', LogCategory.SYSTEM, {
        metadata: {
          status: overallStatus,
          checkDuration: performance.now() - startTime,
          servicesCount: Object.keys(services).length,
          alertsCount: this.getActiveAlerts().length,
        }
      });

      return systemHealth;
    } catch (error) {
      logger.error('System health check failed', LogCategory.SYSTEM, {
        errorStack: error instanceof Error ? error.stack : undefined,
        errorCode: 'HEALTH_CHECK_FAILED'
      });

      throw error;
    }
  }

  // Track request metrics
  recordRequest(responseTime: number, isError: boolean): void {
    this.requestMetrics.total++;
    this.requestMetrics.responseTimes.push(responseTime);
    
    if (isError) {
      this.requestMetrics.errors++;
    }

    // Keep only last 1000 response times
    if (this.requestMetrics.responseTimes.length > 1000) {
      this.requestMetrics.responseTimes.shift();
    }

    // Track requests per minute
    const now = Date.now();
    this.requestMetrics.lastMinuteRequests.push(now);
    
    // Remove requests older than 1 minute
    this.requestMetrics.lastMinuteRequests = this.requestMetrics.lastMinuteRequests
      .filter(timestamp => now - timestamp < 60000);
  }

  // Get current metrics
  private async updateMetrics(): Promise<void> {
    const memInfo = this.checkMemory();
    const cpuInfo = this.checkCPU();
    const diskInfo = await this.checkDiskSpace();

    // Calculate application metrics
    const errorRate = this.requestMetrics.total > 0 
      ? (this.requestMetrics.errors / this.requestMetrics.total) * 100 
      : 0;

    const avgResponseTime = this.requestMetrics.responseTimes.length > 0
      ? this.requestMetrics.responseTimes.reduce((sum, time) => sum + time, 0) / this.requestMetrics.responseTimes.length
      : 0;

    this.metrics = {
      memory: {
        used: memInfo.details?.system?.usedGB || 0,
        free: memInfo.details?.system?.freeGB || 0,
        total: memInfo.details?.system?.totalGB || 0,
        usage: memInfo.details?.system?.usagePercentage || 0,
      },
      cpu: {
        usage: cpuInfo.details?.avgUsage || 0,
        loadAverage: cpuInfo.details?.loadAverage || [0, 0, 0],
      },
      disk: {
        used: diskInfo.details?.usedGB || 0,
        free: diskInfo.details?.freeGB || 0,
        total: diskInfo.details?.totalGB || 0,
        usage: diskInfo.details?.usagePercentage || 0,
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
      network: {
        connections: 0, // Would need more implementation
        bytesReceived: 0,
        bytesSent: 0,
      },
      application: {
        activeConnections: 0, // Would track WebSocket connections
        requestsPerMinute: this.requestMetrics.lastMinuteRequests.length,
        errorRate: parseFloat(errorRate.toFixed(2)),
        averageResponseTime: parseFloat(avgResponseTime.toFixed(2)),
      },
    };
  }

  // Alert management
  private generateAlerts(services: Record<string, ServiceHealth>): void {
    Object.entries(services).forEach(([serviceName, health]) => {
      if (health.status === 'unhealthy' || health.status === 'degraded') {
        const alertId = `${serviceName}_${Date.now()}`;
        const severity = health.status === 'unhealthy' ? 'critical' : 'medium';
        
        const alert: HealthAlert = {
          id: alertId,
          severity,
          service: serviceName,
          message: health.message,
          timestamp: new Date(),
          resolved: false,
          details: health.details,
        };

        this.alerts.push(alert);
        
        // Log alert
        logger.logSecurity('HEALTH_ALERT_GENERATED', {
          metadata: {
            alertId,
            service: serviceName,
            severity,
            message: health.message,
          }
        });

        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
          this.alerts.shift();
        }
      }
    });
  }

  getActiveAlerts(): HealthAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  // Periodic health checks
  private startPeriodicHealthChecks(): void {
    setInterval(async () => {
      try {
        await this.getSystemHealth();
      } catch (error) {
        logger.error('Periodic health check failed', LogCategory.SYSTEM, {
          errorStack: error instanceof Error ? error.stack : undefined,
        });
      }
    }, this.config.interval);
  }

  private startMetricsCollection(): void {
    setInterval(async () => {
      await this.updateMetrics();
    }, 10000); // Update metrics every 10 seconds
  }

  // Utility methods
  private async getDiskUsage(directory: string): Promise<{ used: number; free: number; total: number }> {
    // Simplified disk usage check
    // In production, you might want to use a library like 'node-disk-info'
    const stats = fs.statSync(directory);
    
    // Mock values for now - in production, implement proper disk usage detection
    return {
      total: 100 * 1024 ** 3, // 100GB
      used: 50 * 1024 ** 3,   // 50GB  
      free: 50 * 1024 ** 3,   // 50GB
    };
  }

  // Health check configuration
  updateConfig(newConfig: Partial<HealthCheckConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): HealthCheckConfig {
    return { ...this.config };
  }
}

export default HealthCheckService;