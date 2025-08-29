import { databaseService } from './databaseService';
import { logger, LogCategory } from './loggingService';
import { performance } from 'perf_hooks';

// Database performance metrics interface
export interface PerformanceMetrics {
  timestamp: Date;
  connections: {
    active: number;
    idle: number;
    waiting: number;
    max: number;
  };
  queries: {
    total: number;
    perSecond: number;
    averageTime: number;
    slowQueries: number;
  };
  cache: {
    hitRatio: number;
    blocksHit: number;
    blocksRead: number;
  };
  tables: {
    totalSize: string;
    largestTables: Array<{
      name: string;
      size: string;
      rowCount: number;
    }>;
  };
  indexes: {
    totalCount: number;
    unusedCount: number;
    efficiency: number;
  };
  locks: {
    active: number;
    waiting: number;
    deadlocks: number;
  };
  replication: {
    lag: number;
    status: string;
  };
}

// Performance alert interface
export interface PerformanceAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  recommendation?: string;
}

// Query analysis result
export interface QueryAnalysis {
  query: string;
  calls: number;
  totalTime: number;
  meanTime: number;
  rows: number;
  hitPercent: number;
  recommendation: string;
  optimizationLevel: 'low' | 'medium' | 'high';
}

export class DatabasePerformanceMonitor {
  private alerts: PerformanceAlert[] = [];
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsHistory = 1000;
  private monitoringInterval?: NodeJS.Timeout;

  // Performance thresholds
  private readonly thresholds = {
    connectionUsage: 80,      // % of max connections
    queryTime: 1000,          // milliseconds
    cacheHitRatio: 95,        // %
    lockWaitTime: 5000,       // milliseconds
    replicationLag: 100,      // MB
    deadlockCount: 5,         // per hour
    tableSize: 1000,          // MB
    indexEfficiency: 80,      // %
  };

  constructor() {
    this.startMonitoring();
  }

  // Start continuous monitoring
  startMonitoring(intervalMs: number = process.env.NODE_ENV === 'production' ? 60000 : 300000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.analyzePerformance();
      } catch (error) {
        logger.error('Database performance monitoring failed', LogCategory.DATABASE, {
          errorStack: error instanceof Error ? error.stack : undefined,
          errorCode: 'DB_MONITORING_ERROR'
        });
      }
    }, intervalMs);

    logger.info('Database performance monitoring started', LogCategory.DATABASE, {
      metadata: { intervalMs }
    });
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    logger.info('Database performance monitoring stopped', LogCategory.DATABASE);
  }

  // Collect comprehensive performance metrics
  async collectMetrics(): Promise<PerformanceMetrics> {
    const startTime = performance.now();

    try {
      // Collect all metrics in parallel
      const [
        connectionStats,
        queryStats,
        cacheStats,
        tableStats,
        indexStats,
        lockStats,
        replicationStats
      ] = await Promise.all([
        this.getConnectionStats(),
        this.getQueryStats(),
        this.getCacheStats(),
        this.getTableStats(),
        this.getIndexStats(),
        this.getLockStats(),
        this.getReplicationStats(),
      ]);

      const metrics: PerformanceMetrics = {
        timestamp: new Date(),
        connections: connectionStats,
        queries: queryStats,
        cache: cacheStats,
        tables: tableStats,
        indexes: indexStats,
        locks: lockStats,
        replication: replicationStats,
      };

      // Store metrics
      this.metrics.push(metrics);
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory);
      }

      const collectionTime = performance.now() - startTime;
      logger.debug('Performance metrics collected', LogCategory.DATABASE, {
        metadata: { collectionTime: `${collectionTime.toFixed(2)}ms` }
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to collect performance metrics', LogCategory.DATABASE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        errorCode: 'DB_METRICS_COLLECTION_ERROR'
      });
      throw error;
    }
  }

  // Get database connection statistics
  private async getConnectionStats(): Promise<PerformanceMetrics['connections']> {
    const query = `
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE wait_event IS NOT NULL) as waiting_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;

    const result = await databaseService.query(query);
    const row = result.rows[0];

    // Get max connections setting
    const maxConnQuery = 'SHOW max_connections';
    const maxConnResult = await databaseService.query(maxConnQuery);
    const maxConnections = parseInt(maxConnResult.rows[0].max_connections);

    return {
      active: parseInt(row.active_connections),
      idle: parseInt(row.idle_connections),
      waiting: parseInt(row.waiting_connections),
      max: maxConnections,
    };
  }

  // Get query performance statistics
  private async getQueryStats(): Promise<PerformanceMetrics['queries']> {
    try {
      // Try to use pg_stat_statements if available
      const statsQuery = `
        SELECT 
          sum(calls) as total_calls,
          avg(mean_time) as avg_time,
          count(*) FILTER (WHERE mean_time > 1000) as slow_queries
        FROM pg_stat_statements
      `;

      const result = await databaseService.query(statsQuery);
      const row = result.rows[0];

      // Calculate queries per second (approximate)
      const currentStats = await databaseService.getStats();
      const queriesPerSecond = currentStats.queries.total > 0 
        ? currentStats.queries.total / 60  // Assuming 60-second interval
        : 0;

      return {
        total: parseInt(row.total_calls || '0'),
        perSecond: Math.round(queriesPerSecond),
        averageTime: parseFloat(row.avg_time || '0'),
        slowQueries: parseInt(row.slow_queries || '0'),
      };
    } catch (error) {
      // Fallback if pg_stat_statements is not available
      logger.debug('pg_stat_statements not available, using fallback query stats', LogCategory.DATABASE);
      
      const currentStats = await databaseService.getStats();
      return {
        total: currentStats.queries.total,
        perSecond: Math.round(currentStats.queries.total / 60),
        averageTime: currentStats.queries.averageResponseTime,
        slowQueries: 0,
      };
    }
  }

  // Get cache performance statistics
  private async getCacheStats(): Promise<PerformanceMetrics['cache']> {
    const query = `
      SELECT 
        sum(blks_hit) as blocks_hit,
        sum(blks_read) as blocks_read,
        CASE 
          WHEN sum(blks_hit) + sum(blks_read) = 0 THEN 0
          ELSE round((sum(blks_hit)::numeric / (sum(blks_hit) + sum(blks_read))) * 100, 2)
        END as hit_ratio
      FROM pg_stat_database
    `;

    const result = await databaseService.query(query);
    const row = result.rows[0];

    return {
      hitRatio: parseFloat(row.hit_ratio || '0'),
      blocksHit: parseInt(row.blocks_hit || '0'),
      blocksRead: parseInt(row.blocks_read || '0'),
    };
  }

  // Get table size and statistics
  private async getTableStats(): Promise<PerformanceMetrics['tables']> {
    const query = `
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
        n_tup_ins + n_tup_upd + n_tup_del as total_activity,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `;

    const result = await databaseService.query(query);
    
    // Get total database size
    const totalSizeQuery = `SELECT pg_size_pretty(pg_database_size(current_database())) as total_size`;
    const totalSizeResult = await databaseService.query(totalSizeQuery);

    return {
      totalSize: totalSizeResult.rows[0].total_size,
      largestTables: result.rows.map(row => ({
        name: `${row.schemaname}.${row.tablename}`,
        size: row.size,
        rowCount: parseInt(row.row_count || '0'),
      })),
    };
  }

  // Get index usage statistics
  private async getIndexStats(): Promise<PerformanceMetrics['indexes']> {
    const query = `
      SELECT 
        count(*) as total_indexes,
        count(*) FILTER (WHERE idx_scan = 0) as unused_indexes,
        avg(CASE WHEN idx_scan + seq_scan > 0 THEN idx_scan::numeric / (idx_scan + seq_scan) * 100 ELSE 0 END) as avg_index_usage
      FROM pg_stat_user_indexes
      JOIN pg_stat_user_tables USING (relid)
    `;

    const result = await databaseService.query(query);
    const row = result.rows[0];

    return {
      totalCount: parseInt(row.total_indexes || '0'),
      unusedCount: parseInt(row.unused_indexes || '0'),
      efficiency: parseFloat(row.avg_index_usage || '0'),
    };
  }

  // Get lock statistics
  private async getLockStats(): Promise<PerformanceMetrics['locks']> {
    const query = `
      SELECT 
        count(*) as active_locks,
        count(*) FILTER (WHERE NOT granted) as waiting_locks
      FROM pg_locks
      WHERE pid != pg_backend_pid()
    `;

    const deadlockQuery = `
      SELECT deadlocks 
      FROM pg_stat_database 
      WHERE datname = current_database()
    `;

    const [lockResult, deadlockResult] = await Promise.all([
      databaseService.query(query),
      databaseService.query(deadlockQuery),
    ]);

    return {
      active: parseInt(lockResult.rows[0].active_locks || '0'),
      waiting: parseInt(lockResult.rows[0].waiting_locks || '0'),
      deadlocks: parseInt(deadlockResult.rows[0].deadlocks || '0'),
    };
  }

  // Get replication statistics (if applicable)
  private async getReplicationStats(): Promise<PerformanceMetrics['replication']> {
    try {
      const query = `
        SELECT 
          CASE WHEN pg_is_in_recovery() THEN 'standby' ELSE 'primary' END as status,
          COALESCE(
            EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())), 
            0
          ) as lag_seconds
      `;

      const result = await databaseService.query(query);
      const row = result.rows[0];

      return {
        lag: parseFloat(row.lag_seconds || '0'),
        status: row.status || 'unknown',
      };
    } catch (error) {
      // Replication not configured or not accessible
      return {
        lag: 0,
        status: 'not_configured',
      };
    }
  }

  // Analyze performance and generate alerts
  private async analyzePerformance(): Promise<void> {
    const latestMetrics = this.metrics[this.metrics.length - 1];
    if (!latestMetrics) return;

    const newAlerts: PerformanceAlert[] = [];

    // Check connection usage
    const connectionUsage = (latestMetrics.connections.active / latestMetrics.connections.max) * 100;
    if (connectionUsage > this.thresholds.connectionUsage) {
      newAlerts.push({
        id: `conn_usage_${Date.now()}`,
        severity: connectionUsage > 90 ? 'critical' : 'high',
        type: 'connection_usage',
        message: `Connection usage is ${connectionUsage.toFixed(1)}%`,
        metric: 'connection_usage',
        value: connectionUsage,
        threshold: this.thresholds.connectionUsage,
        timestamp: new Date(),
        recommendation: 'Consider increasing max_connections or implementing connection pooling',
      });
    }

    // Check cache hit ratio
    if (latestMetrics.cache.hitRatio < this.thresholds.cacheHitRatio) {
      newAlerts.push({
        id: `cache_hit_${Date.now()}`,
        severity: latestMetrics.cache.hitRatio < 90 ? 'high' : 'medium',
        type: 'cache_efficiency',
        message: `Cache hit ratio is ${latestMetrics.cache.hitRatio}%`,
        metric: 'cache_hit_ratio',
        value: latestMetrics.cache.hitRatio,
        threshold: this.thresholds.cacheHitRatio,
        timestamp: new Date(),
        recommendation: 'Consider increasing shared_buffers or optimizing queries',
      });
    }

    // Check slow queries
    if (latestMetrics.queries.slowQueries > 0) {
      newAlerts.push({
        id: `slow_queries_${Date.now()}`,
        severity: latestMetrics.queries.slowQueries > 10 ? 'high' : 'medium',
        type: 'slow_queries',
        message: `${latestMetrics.queries.slowQueries} slow queries detected`,
        metric: 'slow_queries',
        value: latestMetrics.queries.slowQueries,
        threshold: 0,
        timestamp: new Date(),
        recommendation: 'Review and optimize slow queries, consider adding indexes',
      });
    }

    // Check deadlocks
    if (latestMetrics.locks.deadlocks > this.thresholds.deadlockCount) {
      newAlerts.push({
        id: `deadlocks_${Date.now()}`,
        severity: 'high',
        type: 'deadlocks',
        message: `${latestMetrics.locks.deadlocks} deadlocks detected`,
        metric: 'deadlocks',
        value: latestMetrics.locks.deadlocks,
        threshold: this.thresholds.deadlockCount,
        timestamp: new Date(),
        recommendation: 'Review transaction ordering and consider shorter transaction times',
      });
    }

    // Check index efficiency
    if (latestMetrics.indexes.efficiency < this.thresholds.indexEfficiency) {
      newAlerts.push({
        id: `index_efficiency_${Date.now()}`,
        severity: 'medium',
        type: 'index_efficiency',
        message: `Index usage efficiency is ${latestMetrics.indexes.efficiency.toFixed(1)}%`,
        metric: 'index_efficiency',
        value: latestMetrics.indexes.efficiency,
        threshold: this.thresholds.indexEfficiency,
        timestamp: new Date(),
        recommendation: 'Review query patterns and consider adding missing indexes',
      });
    }

    // Add new alerts
    this.alerts.push(...newAlerts);

    // Keep only recent alerts (last 24 hours)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > dayAgo);

    // Log alerts
    if (newAlerts.length > 0) {
      logger.warn('Database performance alerts generated', LogCategory.DATABASE, {
        metadata: {
          alertCount: newAlerts.length,
          alerts: newAlerts.map(alert => ({
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
          })),
        }
      });
    }
  }

  // Get slow queries with analysis
  async getSlowQueries(limit: number = 10): Promise<QueryAnalysis[]> {
    try {
      const query = `
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements
        WHERE calls > 1
        ORDER BY mean_time DESC
        LIMIT $1
      `;

      const result = await databaseService.query(query, [limit]);
      
      return result.rows.map(row => ({
        query: row.query.substring(0, 200) + (row.query.length > 200 ? '...' : ''),
        calls: parseInt(row.calls),
        totalTime: parseFloat(row.total_time),
        meanTime: parseFloat(row.mean_time),
        rows: parseInt(row.rows || '0'),
        hitPercent: parseFloat(row.hit_percent || '0'),
        recommendation: this.generateQueryRecommendation(row),
        optimizationLevel: this.getOptimizationLevel(parseFloat(row.mean_time)),
      }));
    } catch (error) {
      logger.warn('pg_stat_statements not available for slow query analysis', LogCategory.DATABASE);
      return [];
    }
  }

  // Generate optimization recommendations for queries
  private generateQueryRecommendation(queryRow: any): string {
    const meanTime = parseFloat(queryRow.mean_time);
    const hitPercent = parseFloat(queryRow.hit_percent || '0');
    const query = queryRow.query.toLowerCase();

    const recommendations: string[] = [];

    if (meanTime > 5000) {
      recommendations.push('Query is very slow (>5s), consider major optimization');
    } else if (meanTime > 1000) {
      recommendations.push('Query is slow (>1s), review for optimization opportunities');
    }

    if (hitPercent < 90) {
      recommendations.push('Low cache hit rate, consider adding indexes or optimizing joins');
    }

    if (query.includes('select *')) {
      recommendations.push('Avoid SELECT *, specify only needed columns');
    }

    if (query.includes('order by') && !query.includes('limit')) {
      recommendations.push('ORDER BY without LIMIT can be expensive, consider pagination');
    }

    if (query.includes('like %')) {
      recommendations.push('Leading wildcard LIKE queries cannot use indexes efficiently');
    }

    if (query.includes('or ')) {
      recommendations.push('OR conditions may prevent index usage, consider UNION or restructuring');
    }

    return recommendations.length > 0 
      ? recommendations.join('; ')
      : 'Query appears optimized';
  }

  // Determine optimization priority level
  private getOptimizationLevel(meanTime: number): 'low' | 'medium' | 'high' {
    if (meanTime > 5000) return 'high';
    if (meanTime > 1000) return 'medium';
    return 'low';
  }

  // Get current performance metrics
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  // Get metrics history
  getMetricsHistory(hours: number = 24): PerformanceMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metrics.filter(metric => metric.timestamp > cutoff);
  }

  // Get active alerts
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => {
      // Consider alerts active if they're less than 1 hour old
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return alert.timestamp > hourAgo;
    });
  }

  // Generate performance report
  async generatePerformanceReport(): Promise<{
    summary: any;
    metrics: PerformanceMetrics | null;
    alerts: PerformanceAlert[];
    slowQueries: QueryAnalysis[];
    recommendations: string[];
  }> {
    const [slowQueries] = await Promise.all([
      this.getSlowQueries(5),
    ]);

    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();

    // Generate general recommendations
    const recommendations: string[] = [];
    
    if (currentMetrics) {
      const connUsage = (currentMetrics.connections.active / currentMetrics.connections.max) * 100;
      if (connUsage > 70) {
        recommendations.push('Connection usage is high, consider connection pooling');
      }

      if (currentMetrics.cache.hitRatio < 95) {
        recommendations.push('Cache hit ratio could be improved with more memory or query optimization');
      }

      if (currentMetrics.indexes.unusedCount > 5) {
        recommendations.push('Consider removing unused indexes to improve write performance');
      }

      if (slowQueries.length > 0) {
        recommendations.push('Multiple slow queries detected, review and optimize critical paths');
      }
    }

    // General optimization recommendations
    recommendations.push(
      'Regularly update table statistics with ANALYZE',
      'Monitor and optimize frequent query patterns',
      'Consider partitioning for large tables',
      'Implement proper indexing strategy',
      'Use connection pooling for better resource utilization'
    );

    return {
      summary: {
        timestamp: new Date(),
        overallHealth: activeAlerts.length === 0 ? 'good' : 
                      activeAlerts.some(a => a.severity === 'critical') ? 'critical' :
                      activeAlerts.some(a => a.severity === 'high') ? 'warning' : 'degraded',
        metricsCollected: this.metrics.length,
        alertCount: activeAlerts.length,
        slowQueryCount: slowQueries.length,
      },
      metrics: currentMetrics,
      alerts: activeAlerts,
      slowQueries,
      recommendations: recommendations.slice(0, 10), // Top 10 recommendations
    };
  }

  // Health check for the monitoring service itself
  async healthCheck(): Promise<{ healthy: boolean; lastCollection?: Date; metricsCount: number }> {
    const lastMetric = this.metrics[this.metrics.length - 1];
    const healthy = lastMetric ? (Date.now() - lastMetric.timestamp.getTime()) < 300000 : false; // 5 minutes

    return {
      healthy,
      lastCollection: lastMetric?.timestamp,
      metricsCount: this.metrics.length,
    };
  }
}

// Create singleton instance
export const databasePerformanceMonitor = new DatabasePerformanceMonitor();

export default databasePerformanceMonitor;