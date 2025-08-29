import { Pool, PoolClient, QueryResult } from 'pg';
import { logger, LogCategory } from './loggingService';
import { performance } from 'perf_hooks';

// Database connection configuration
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | object;
  // Connection pool settings
  max: number;           // Maximum number of connections
  min: number;           // Minimum number of connections
  idleTimeoutMillis: number;  // Time before closing idle connections
  connectionTimeoutMillis: number;  // Time to wait for connection
  acquireTimeoutMillis: number;     // Time to wait for acquiring connection
  createTimeoutMillis: number;      // Time to wait for creating connection
  reapIntervalMillis: number;       // Cleanup interval
  createRetryIntervalMillis: number; // Retry interval for failed connections
}

// Query performance metrics
interface QueryMetrics {
  query: string;
  duration: number;
  rowCount: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

// Database statistics
export interface DatabaseStats {
  pool: {
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
  };
  queries: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
    slowestQuery: QueryMetrics | null;
    fastestQuery: QueryMetrics | null;
  };
  performance: {
    cacheHitRatio: number;
    indexUsage: number;
    deadlocks: number;
    longRunningQueries: number;
  };
}

export class DatabaseService {
  private pool: Pool;
  private config: DatabaseConfig;
  private queryMetrics: QueryMetrics[] = [];
  private readonly maxMetricsHistory = 1000;

  constructor(config?: Partial<DatabaseConfig>) {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'testbro',
      user: process.env.DB_USER || 'testbro',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // Optimized connection pool settings
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '60000'),
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
      createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '30000'),
      reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL || '1000'),
      createRetryIntervalMillis: parseInt(process.env.DB_RETRY_INTERVAL || '200'),
      ...config,
    };

    this.initializePool();
  }

  private initializePool(): void {
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl,
      max: this.config.max,
      min: this.config.min,
      idleTimeoutMillis: this.config.idleTimeoutMillis,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis,
    });

    this.setupEventHandlers();
    this.initializeDatabase();
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client: PoolClient) => {
      logger.debug('Database client connected', LogCategory.DATABASE, {
        metadata: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount,
        }
      });
    });

    this.pool.on('acquire', (client: PoolClient) => {
      logger.debug('Database client acquired', LogCategory.DATABASE, {
        metadata: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
        }
      });
    });

    this.pool.on('remove', (client: PoolClient) => {
      logger.debug('Database client removed', LogCategory.DATABASE, {
        metadata: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
        }
      });
    });

    this.pool.on('error', (error: Error, client: PoolClient) => {
      logger.error('Database pool error', LogCategory.DATABASE, {
        errorStack: error.stack,
        errorCode: 'DB_POOL_ERROR',
        metadata: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
        }
      });
    });
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Set up database optimizations
      await this.optimizeDatabase();
      
      logger.info('Database initialized successfully', LogCategory.DATABASE, {
        metadata: {
          host: this.config.host,
          database: this.config.database,
          poolMax: this.config.max,
          poolMin: this.config.min,
        }
      });
    } catch (error) {
      logger.error('Database initialization failed', LogCategory.DATABASE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        errorCode: 'DB_INIT_ERROR'
      });
    }
  }

  // Execute query with performance tracking
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const startTime = performance.now();
    const client = await this.pool.connect();

    try {
      const result = await client.query<T>(text, params);
      const duration = performance.now() - startTime;

      // Track query metrics
      this.trackQueryMetrics({
        query: text,
        duration,
        rowCount: result.rowCount || 0,
        timestamp: new Date(),
        success: true,
      });

      // Log slow queries
      if (duration > 1000) { // 1 second threshold
        logger.warn('Slow query detected', LogCategory.DATABASE, {
          metadata: {
            query: text.substring(0, 100) + '...',
            duration: `${duration.toFixed(2)}ms`,
            rowCount: result.rowCount,
            params: params?.length || 0,
          }
        });
      }

      logger.debug('Database query executed', LogCategory.DATABASE, {
        metadata: {
          duration: `${duration.toFixed(2)}ms`,
          rowCount: result.rowCount,
          command: result.command,
        }
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Track failed query metrics
      this.trackQueryMetrics({
        query: text,
        duration,
        rowCount: 0,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      logger.error('Database query failed', LogCategory.DATABASE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: {
          query: text.substring(0, 100) + '...',
          duration: `${duration.toFixed(2)}ms`,
          params: params?.length || 0,
        },
        errorCode: 'DB_QUERY_ERROR'
      });

      throw error;
    } finally {
      client.release();
    }
  }

  // Execute transaction with automatic rollback on error
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    const startTime = performance.now();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      
      const duration = performance.now() - startTime;
      logger.debug('Database transaction completed', LogCategory.DATABASE, {
        metadata: { duration: `${duration.toFixed(2)}ms` }
      });

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      
      const duration = performance.now() - startTime;
      logger.error('Database transaction rolled back', LogCategory.DATABASE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { duration: `${duration.toFixed(2)}ms` },
        errorCode: 'DB_TRANSACTION_ERROR'
      });

      throw error;
    } finally {
      client.release();
    }
  }

  // Optimized batch insert
  async batchInsert(
    table: string,
    columns: string[],
    values: any[][],
    batchSize: number = 1000
  ): Promise<void> {
    if (values.length === 0) return;

    const startTime = performance.now();
    let totalInserted = 0;

    try {
      // Process in batches to avoid memory issues
      for (let i = 0; i < values.length; i += batchSize) {
        const batch = values.slice(i, i + batchSize);
        
        // Build parameterized query
        const placeholders = batch.map((_, rowIndex) => {
          const rowPlaceholders = columns.map((_, colIndex) => {
            return `$${rowIndex * columns.length + colIndex + 1}`;
          });
          return `(${rowPlaceholders.join(', ')})`;
        }).join(', ');

        const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
        const params = batch.flat();

        await this.query(query, params);
        totalInserted += batch.length;
      }

      const duration = performance.now() - startTime;
      logger.info('Batch insert completed', LogCategory.DATABASE, {
        metadata: {
          table,
          totalRows: totalInserted,
          duration: `${duration.toFixed(2)}ms`,
          throughput: `${(totalInserted / (duration / 1000)).toFixed(2)} rows/sec`,
        }
      });
    } catch (error) {
      logger.error('Batch insert failed', LogCategory.DATABASE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { table, totalRows: values.length, inserted: totalInserted },
        errorCode: 'DB_BATCH_INSERT_ERROR'
      });
      throw error;
    }
  }

  // Optimized bulk update
  async bulkUpdate(
    table: string,
    updates: { where: Record<string, any>, set: Record<string, any> }[]
  ): Promise<void> {
    if (updates.length === 0) return;

    const startTime = performance.now();

    try {
      await this.transaction(async (client) => {
        for (const update of updates) {
          const setClause = Object.keys(update.set)
            .map((key, index) => `${key} = $${index + 1}`)
            .join(', ');
          
          const whereClause = Object.keys(update.where)
            .map((key, index) => `${key} = $${Object.keys(update.set).length + index + 1}`)
            .join(' AND ');

          const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
          const params = [...Object.values(update.set), ...Object.values(update.where)];

          await client.query(query, params);
        }
      });

      const duration = performance.now() - startTime;
      logger.info('Bulk update completed', LogCategory.DATABASE, {
        metadata: {
          table,
          totalUpdates: updates.length,
          duration: `${duration.toFixed(2)}ms`,
        }
      });
    } catch (error) {
      logger.error('Bulk update failed', LogCategory.DATABASE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: { table, totalUpdates: updates.length },
        errorCode: 'DB_BULK_UPDATE_ERROR'
      });
      throw error;
    }
  }

  // Execute prepared statement
  async preparedStatement<T = any>(
    name: string,
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const client = await this.pool.connect();

    try {
      // Prepare statement if not already prepared
      await client.query(`PREPARE ${name} AS ${text}`);
      
      // Execute prepared statement
      const placeholders = params?.map((_, index) => `$${index + 1}`).join(', ') || '';
      const result = await client.query<T>(`EXECUTE ${name}${placeholders ? `(${placeholders})` : ''}`, params);

      return result;
    } catch (error) {
      // If statement already exists, just execute it
      if (error instanceof Error && error.message.includes('already exists')) {
        const placeholders = params?.map((_, index) => `$${index + 1}`).join(', ') || '';
        return await client.query<T>(`EXECUTE ${name}${placeholders ? `(${placeholders})` : ''}`, params);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  // Track query performance metrics
  private trackQueryMetrics(metrics: QueryMetrics): void {
    this.queryMetrics.push(metrics);
    
    // Keep only recent metrics to prevent memory leaks
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory);
    }
  }

  // Get database statistics
  async getStats(): Promise<DatabaseStats> {
    try {
      // Get pool statistics
      const poolStats = {
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount,
      };

      // Calculate query statistics
      const successfulQueries = this.queryMetrics.filter(q => q.success);
      const failedQueries = this.queryMetrics.filter(q => !q.success);
      
      const averageResponseTime = successfulQueries.length > 0
        ? successfulQueries.reduce((sum, q) => sum + q.duration, 0) / successfulQueries.length
        : 0;

      const slowestQuery = successfulQueries.length > 0
        ? successfulQueries.reduce((prev, current) => 
            prev.duration > current.duration ? prev : current
          )
        : null;

      const fastestQuery = successfulQueries.length > 0
        ? successfulQueries.reduce((prev, current) =>
            prev.duration < current.duration ? prev : current
          )
        : null;

      // Get database performance metrics
      const performanceMetrics = await this.getPerformanceMetrics();

      return {
        pool: poolStats,
        queries: {
          total: this.queryMetrics.length,
          successful: successfulQueries.length,
          failed: failedQueries.length,
          averageResponseTime: parseFloat(averageResponseTime.toFixed(2)),
          slowestQuery,
          fastestQuery,
        },
        performance: performanceMetrics,
      };
    } catch (error) {
      logger.error('Failed to get database statistics', LogCategory.DATABASE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        errorCode: 'DB_STATS_ERROR'
      });

      throw error;
    }
  }

  // Get database performance metrics
  private async getPerformanceMetrics(): Promise<DatabaseStats['performance']> {
    try {
      // Cache hit ratio
      const cacheHitQuery = `
        SELECT 
          CASE WHEN (blks_hit + blks_read) = 0 THEN 0
          ELSE (blks_hit::float / (blks_hit + blks_read)) * 100
          END as cache_hit_ratio
        FROM pg_stat_database 
        WHERE datname = current_database()
      `;
      const cacheResult = await this.query(cacheHitQuery);
      const cacheHitRatio = parseFloat(cacheResult.rows[0]?.cache_hit_ratio || '0');

      // Index usage
      const indexUsageQuery = `
        SELECT 
          CASE WHEN (idx_scan + seq_scan) = 0 THEN 0
          ELSE (idx_scan::float / (idx_scan + seq_scan)) * 100
          END as index_usage
        FROM pg_stat_user_tables
      `;
      const indexResult = await this.query(indexUsageQuery);
      const avgIndexUsage = indexResult.rows.length > 0
        ? indexResult.rows.reduce((sum, row) => sum + parseFloat(row.index_usage || '0'), 0) / indexResult.rows.length
        : 0;

      // Deadlocks
      const deadlockQuery = `
        SELECT deadlocks 
        FROM pg_stat_database 
        WHERE datname = current_database()
      `;
      const deadlockResult = await this.query(deadlockQuery);
      const deadlocks = parseInt(deadlockResult.rows[0]?.deadlocks || '0');

      // Long running queries (> 5 minutes)
      const longRunningQuery = `
        SELECT COUNT(*) as long_running_count
        FROM pg_stat_activity 
        WHERE state = 'active' 
        AND now() - query_start > interval '5 minutes'
        AND query NOT LIKE '%pg_stat_activity%'
      `;
      const longRunningResult = await this.query(longRunningQuery);
      const longRunningQueries = parseInt(longRunningResult.rows[0]?.long_running_count || '0');

      return {
        cacheHitRatio: parseFloat(cacheHitRatio.toFixed(2)),
        indexUsage: parseFloat(avgIndexUsage.toFixed(2)),
        deadlocks,
        longRunningQueries,
      };
    } catch (error) {
      logger.error('Failed to get database performance metrics', LogCategory.DATABASE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        errorCode: 'DB_PERFORMANCE_METRICS_ERROR'
      });

      return {
        cacheHitRatio: 0,
        indexUsage: 0,
        deadlocks: 0,
        longRunningQueries: 0,
      };
    }
  }

  // Optimize database settings
  private async optimizeDatabase(): Promise<void> {
    try {
      const optimizations = [
        // Enable pg_stat_statements for query analysis
        "CREATE EXTENSION IF NOT EXISTS pg_stat_statements",
        
        // Set optimized work_mem for sorting and hashing
        "SET work_mem = '16MB'",
        
        // Optimize shared_buffers if we have control
        // "SET shared_buffers = '256MB'", // Commented out as it requires restart
        
        // Enable query plan optimization
        "SET enable_seqscan = on",
        "SET enable_indexscan = on",
        "SET enable_bitmapscan = on",
        
        // Set connection limits
        "SET max_connections = 200",
        
        // Optimize checkpoint settings
        "SET checkpoint_completion_target = 0.9",
        
        // Set random page cost for SSD
        "SET random_page_cost = 1.1",
        
        // Enable parallel query execution
        "SET max_parallel_workers_per_gather = 2",
        "SET max_parallel_workers = 8",
      ];

      for (const optimization of optimizations) {
        try {
          await this.query(optimization);
        } catch (error) {
          // Some settings might not be changeable at runtime
          logger.debug('Database optimization skipped', LogCategory.DATABASE, {
            metadata: { optimization, error: error instanceof Error ? error.message : 'Unknown error' }
          });
        }
      }

      logger.info('Database optimizations applied', LogCategory.DATABASE);
    } catch (error) {
      logger.error('Database optimization failed', LogCategory.DATABASE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        errorCode: 'DB_OPTIMIZATION_ERROR'
      });
    }
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; responseTime: number; error?: string }> {
    const startTime = performance.now();

    try {
      await this.query('SELECT 1');
      const responseTime = performance.now() - startTime;
      
      return {
        healthy: true,
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

  // Graceful shutdown
  async close(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('Database pool closed', LogCategory.DATABASE);
    } catch (error) {
      logger.error('Database pool close failed', LogCategory.DATABASE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        errorCode: 'DB_CLOSE_ERROR'
      });
    }
  }

  // Get pool instance for advanced operations
  getPool(): Pool {
    return this.pool;
  }
}

// Create singleton database service instance
export const databaseService = new DatabaseService();

export default databaseService;