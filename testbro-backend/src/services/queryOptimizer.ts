import { QueryResult } from 'pg';
import { databaseService } from './databaseService';
import { logger, LogCategory } from './loggingService';
import { ProjectCache, UserCache, TestResultsCache } from './cacheHelpers';

// Common query patterns and optimizations
export class QueryOptimizer {
  // Paginated query with optimized performance
  static async paginatedQuery<T = any>(
    baseQuery: string,
    params: any[] = [],
    page: number = 1,
    limit: number = 20,
    orderBy: string = 'created_at DESC'
  ): Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const offset = (page - 1) * limit;
    
    // Count query for total records
    const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as count_query`;
    const countResult = await databaseService.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);
    
    // Data query with pagination
    const dataQuery = `
      ${baseQuery}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const dataResult = await databaseService.query<T>(dataQuery, [...params, limit, offset]);
    
    const totalPages = Math.ceil(total / limit);
    
    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // Cursor-based pagination for better performance on large datasets
  static async cursorPaginatedQuery<T = any>(
    baseQuery: string,
    params: any[] = [],
    cursor?: string,
    limit: number = 20,
    cursorColumn: string = 'id',
    direction: 'ASC' | 'DESC' = 'DESC'
  ): Promise<{
    data: T[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    let whereClause = '';
    let queryParams = [...params];
    
    if (cursor) {
      const operator = direction === 'DESC' ? '<' : '>';
      whereClause = `AND ${cursorColumn} ${operator} $${params.length + 1}`;
      queryParams.push(cursor);
    }
    
    // Query one extra record to check if there are more
    const query = `
      ${baseQuery}
      ${whereClause}
      ORDER BY ${cursorColumn} ${direction}
      LIMIT ${limit + 1}
    `;
    
    const result = await databaseService.query<T>(query, queryParams);
    const rows = result.rows;
    
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && data.length > 0 
      ? (data[data.length - 1] as any)[cursorColumn]
      : undefined;
    
    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  // Bulk upsert with conflict resolution
  static async bulkUpsert(
    table: string,
    data: Record<string, any>[],
    conflictColumns: string[],
    updateColumns: string[]
  ): Promise<void> {
    if (data.length === 0) return;

    const columns = Object.keys(data[0]);
    const values = data.map(row => columns.map(col => row[col]));
    
    // Build values placeholder
    const valuePlaceholders = data.map((_, rowIndex) => {
      const rowPlaceholders = columns.map((_, colIndex) => {
        return `$${rowIndex * columns.length + colIndex + 1}`;
      });
      return `(${rowPlaceholders.join(', ')})`;
    }).join(', ');
    
    // Build UPDATE clause for conflict resolution
    const updateClause = updateColumns
      .map(col => `${col} = EXCLUDED.${col}`)
      .join(', ');
    
    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${valuePlaceholders}
      ON CONFLICT (${conflictColumns.join(', ')})
      DO UPDATE SET ${updateClause}
    `;
    
    await databaseService.query(query, values.flat());
  }

  // Optimized search with full-text search and ranking
  static async fullTextSearch<T = any>(
    table: string,
    searchColumns: string[],
    searchTerm: string,
    filters: Record<string, any> = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<{ data: T[]; total: number }> {
    const searchVector = searchColumns.map(col => `coalesce(${col}, '')`).join(" || ' ' || ");
    const tsQuery = searchTerm.trim().split(/\s+/).join(' & ');
    
    // Build filter conditions
    const filterConditions = Object.keys(filters)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(' AND ');
    const whereClause = filterConditions ? `AND ${filterConditions}` : '';
    
    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${table}
      WHERE to_tsvector('english', ${searchVector}) @@ to_tsquery('english', $1)
      ${whereClause}
    `;
    
    // Data query with ranking
    const dataQuery = `
      SELECT *,
        ts_rank(to_tsvector('english', ${searchVector}), to_tsquery('english', $1)) as search_rank
      FROM ${table}
      WHERE to_tsvector('english', ${searchVector}) @@ to_tsquery('english', $1)
      ${whereClause}
      ORDER BY search_rank DESC, created_at DESC
      LIMIT $${Object.keys(filters).length + 2} OFFSET $${Object.keys(filters).length + 3}
    `;
    
    const params = [tsQuery, ...Object.values(filters)];
    
    const [countResult, dataResult] = await Promise.all([
      databaseService.query(countQuery, params.slice(0, -2)),
      databaseService.query<T>(dataQuery, [...params, limit, offset]),
    ]);
    
    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].total),
    };
  }

  // Batch processing with optimal chunk size
  static async batchProcess<T>(
    items: T[],
    processor: (batch: T[]) => Promise<void>,
    batchSize: number = 100
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await processor(batch);
      
      // Log progress for large batches
      if (items.length > 1000) {
        logger.debug('Batch processing progress', LogCategory.DATABASE, {
          metadata: {
            processed: Math.min(i + batchSize, items.length),
            total: items.length,
            progress: `${Math.round((Math.min(i + batchSize, items.length) / items.length) * 100)}%`,
          }
        });
      }
    }
  }
}

// Optimized user queries
export class UserQueries {
  // Get user with caching
  static async getUserById(userId: string): Promise<any> {
    const cacheResult = await UserCache.getUserProfile(userId);
    if (cacheResult.cached && cacheResult.data) {
      return cacheResult.data;
    }

    const query = `
      SELECT 
        u.*,
        p.name as profile_name,
        p.avatar_url,
        p.preferences
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `;
    
    const result = await databaseService.query(query, [userId]);
    const user = result.rows[0];
    
    if (user) {
      await UserCache.setUserProfile(userId, user);
    }
    
    return user;
  }

  // Get users with pagination and search
  static async getUsers(
    search?: string,
    filters: { role?: string; organizationId?: string } = {},
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    let baseQuery = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.created_at,
        u.last_login_at,
        p.name,
        p.avatar_url,
        o.name as organization_name
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN user_organizations uo ON u.id = uo.user_id
      LEFT JOIN organizations o ON uo.organization_id = o.id
      WHERE u.deleted_at IS NULL
    `;
    
    const params: any[] = [];
    let paramCount = 0;

    // Add search condition
    if (search) {
      paramCount++;
      baseQuery += ` AND (
        u.email ILIKE $${paramCount} OR 
        p.name ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    // Add filters
    if (filters.role) {
      paramCount++;
      baseQuery += ` AND u.role = $${paramCount}`;
      params.push(filters.role);
    }

    if (filters.organizationId) {
      paramCount++;
      baseQuery += ` AND uo.organization_id = $${paramCount}`;
      params.push(filters.organizationId);
    }

    return QueryOptimizer.paginatedQuery(
      baseQuery,
      params,
      page,
      limit,
      'u.created_at DESC'
    );
  }

  // Bulk update user last login
  static async updateLastLogin(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;

    const query = `
      UPDATE users 
      SET last_login_at = NOW() 
      WHERE id = ANY($1)
    `;
    
    await databaseService.query(query, [userIds]);
    
    // Invalidate user caches
    for (const userId of userIds) {
      await UserCache.invalidateUserProfile(userId);
    }
  }
}

// Optimized project queries
export class ProjectQueries {
  // Get project with related data
  static async getProjectById(projectId: string, userId?: string): Promise<any> {
    const cacheResult = await ProjectCache.getProject(projectId);
    if (cacheResult.cached && cacheResult.data) {
      return cacheResult.data;
    }

    const query = `
      SELECT 
        p.*,
        u.email as owner_email,
        COUNT(DISTINCT tc.id) as test_case_count,
        COUNT(DISTINCT ts.id) as test_suite_count,
        COUNT(DISTINCT te.id) as execution_count,
        MAX(te.executed_at) as last_execution_at
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN test_cases tc ON p.id = tc.project_id AND tc.deleted_at IS NULL
      LEFT JOIN test_suites ts ON p.id = ts.project_id AND ts.deleted_at IS NULL
      LEFT JOIN test_executions te ON p.id = te.project_id
      WHERE p.id = $1 AND p.deleted_at IS NULL
      ${userId ? 'AND (p.user_id = $2 OR p.visibility = \'public\')' : ''}
      GROUP BY p.id, u.email
    `;
    
    const params = userId ? [projectId, userId] : [projectId];
    const result = await databaseService.query(query, params);
    const project = result.rows[0];
    
    if (project) {
      await ProjectCache.setProject(projectId, project);
    }
    
    return project;
  }

  // Get projects with advanced filtering
  static async getProjects(
    userId?: string,
    filters: {
      search?: string;
      status?: string;
      technology?: string;
      organizationId?: string;
    } = {},
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    let baseQuery = `
      SELECT 
        p.*,
        u.email as owner_email,
        COUNT(DISTINCT tc.id) as test_case_count,
        COUNT(DISTINCT te.id) as execution_count,
        MAX(te.executed_at) as last_execution_at,
        AVG(CASE WHEN te.status = 'passed' THEN 1.0 ELSE 0.0 END) as success_rate
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN test_cases tc ON p.id = tc.project_id AND tc.deleted_at IS NULL
      LEFT JOIN test_executions te ON p.id = te.project_id
      WHERE p.deleted_at IS NULL
    `;
    
    const params: any[] = [];
    let paramCount = 0;

    // User access control
    if (userId) {
      paramCount++;
      baseQuery += ` AND (p.user_id = $${paramCount} OR p.visibility = 'public')`;
      params.push(userId);
    }

    // Search
    if (filters.search) {
      paramCount++;
      baseQuery += ` AND (
        p.name ILIKE $${paramCount} OR 
        p.description ILIKE $${paramCount}
      )`;
      params.push(`%${filters.search}%`);
    }

    // Status filter
    if (filters.status) {
      paramCount++;
      baseQuery += ` AND p.status = $${paramCount}`;
      params.push(filters.status);
    }

    // Technology filter
    if (filters.technology) {
      paramCount++;
      baseQuery += ` AND p.technology = $${paramCount}`;
      params.push(filters.technology);
    }

    // Organization filter
    if (filters.organizationId) {
      paramCount++;
      baseQuery += ` AND p.organization_id = $${paramCount}`;
      params.push(filters.organizationId);
    }

    baseQuery += ' GROUP BY p.id, u.email';

    return QueryOptimizer.paginatedQuery(
      baseQuery,
      params,
      page,
      limit,
      'p.updated_at DESC'
    );
  }

  // Get project statistics
  static async getProjectStats(projectId: string): Promise<any> {
    const query = `
      SELECT 
        COUNT(DISTINCT tc.id) as total_test_cases,
        COUNT(DISTINCT ts.id) as total_test_suites,
        COUNT(DISTINCT te.id) as total_executions,
        COUNT(DISTINCT CASE WHEN te.status = 'passed' THEN te.id END) as passed_executions,
        COUNT(DISTINCT CASE WHEN te.status = 'failed' THEN te.id END) as failed_executions,
        AVG(te.duration) as avg_execution_time,
        MAX(te.executed_at) as last_execution
      FROM projects p
      LEFT JOIN test_cases tc ON p.id = tc.project_id AND tc.deleted_at IS NULL
      LEFT JOIN test_suites ts ON p.id = ts.project_id AND ts.deleted_at IS NULL
      LEFT JOIN test_executions te ON p.id = te.project_id
      WHERE p.id = $1
      GROUP BY p.id
    `;
    
    const result = await databaseService.query(query, [projectId]);
    return result.rows[0];
  }
}

// Optimized test execution queries
export class TestExecutionQueries {
  // Get test results with caching
  static async getTestResults(
    projectId: string,
    filters: {
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    let baseQuery = `
      SELECT 
        te.*,
        tc.name as test_case_name,
        tc.description as test_case_description,
        u.email as executed_by_email
      FROM test_executions te
      LEFT JOIN test_cases tc ON te.test_case_id = tc.id
      LEFT JOIN users u ON te.executed_by = u.id
      WHERE te.project_id = $1
    `;
    
    const params: any[] = [projectId];
    let paramCount = 1;

    // Status filter
    if (filters.status) {
      paramCount++;
      baseQuery += ` AND te.status = $${paramCount}`;
      params.push(filters.status);
    }

    // Date range filter
    if (filters.dateFrom) {
      paramCount++;
      baseQuery += ` AND te.executed_at >= $${paramCount}`;
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      paramCount++;
      baseQuery += ` AND te.executed_at <= $${paramCount}`;
      params.push(filters.dateTo);
    }

    return QueryOptimizer.paginatedQuery(
      baseQuery,
      params,
      page,
      limit,
      'te.executed_at DESC'
    );
  }

  // Get execution trends
  static async getExecutionTrends(
    projectId: string,
    days: number = 30
  ): Promise<any[]> {
    const query = `
      SELECT 
        DATE(executed_at) as date,
        COUNT(*) as total_executions,
        COUNT(CASE WHEN status = 'passed' THEN 1 END) as passed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        AVG(duration) as avg_duration
      FROM test_executions
      WHERE project_id = $1 
        AND executed_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(executed_at)
      ORDER BY date DESC
    `;
    
    const result = await databaseService.query(query, [projectId]);
    return result.rows;
  }

  // Bulk insert test results
  static async bulkInsertResults(results: any[]): Promise<void> {
    if (results.length === 0) return;

    const columns = [
      'project_id', 'test_case_id', 'test_suite_id', 'status',
      'duration', 'error_message', 'logs', 'executed_by', 'executed_at'
    ];
    
    const values = results.map(result => [
      result.projectId,
      result.testCaseId,
      result.testSuiteId,
      result.status,
      result.duration,
      result.errorMessage,
      JSON.stringify(result.logs),
      result.executedBy,
      result.executedAt || new Date(),
    ]);

    await databaseService.batchInsert('test_executions', columns, values);
    
    // Invalidate related caches
    const uniqueProjectIds = [...new Set(results.map(r => r.projectId))];
    for (const projectId of uniqueProjectIds) {
      await ProjectCache.invalidateProjectCache(projectId);
    }
  }
}

// Database analytics and reporting
export class DatabaseAnalytics {
  // Get table sizes and statistics
  static async getTableStats(): Promise<any[]> {
    const query = `
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation,
        most_common_vals,
        most_common_freqs
      FROM pg_stats 
      WHERE schemaname = 'public'
      ORDER BY tablename, attname
    `;
    
    const result = await databaseService.query(query);
    return result.rows;
  }

  // Get slow queries
  static async getSlowQueries(limit: number = 10): Promise<any[]> {
    const query = `
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows,
        100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
      FROM pg_stat_statements
      WHERE calls > 5
      ORDER BY mean_time DESC
      LIMIT $1
    `;
    
    try {
      const result = await databaseService.query(query, [limit]);
      return result.rows;
    } catch (error) {
      // pg_stat_statements might not be available
      logger.warn('pg_stat_statements not available for slow query analysis', LogCategory.DATABASE);
      return [];
    }
  }

  // Get index usage statistics
  static async getIndexStats(): Promise<any[]> {
    const query = `
      SELECT 
        t.tablename,
        indexname,
        c.reltuples AS num_rows,
        pg_size_pretty(pg_relation_size(quote_ident(t.tablename)::text)) AS table_size,
        pg_size_pretty(pg_relation_size(quote_ident(indexrelname)::text)) AS index_size,
        CASE WHEN indisunique THEN 'Y' ELSE 'N' END AS unique,
        idx_scan as number_of_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_tables t
      LEFT OUTER JOIN pg_class c ON c.relname = t.tablename
      LEFT OUTER JOIN (
        SELECT 
          c.relname AS ctablename,
          ipg.relname AS indexname,
          x.indnatts AS number_of_columns,
          idx_scan, idx_tup_read, idx_tup_fetch,
          indexrelname, indisunique
        FROM pg_index x
        JOIN pg_class c ON c.oid = x.indrelid
        JOIN pg_class ipg ON ipg.oid = x.indexrelid
        JOIN pg_stat_user_indexes psui ON x.indexrelid = psui.indexrelid
      ) AS foo ON t.tablename = foo.ctablename
      WHERE t.schemaname = 'public'
      ORDER BY 1, 2
    `;
    
    const result = await databaseService.query(query);
    return result.rows;
  }

  // Database size and growth analysis
  static async getDatabaseSizeInfo(): Promise<any> {
    const query = `
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public') as column_count
    `;
    
    const result = await databaseService.query(query);
    return result.rows[0];
  }
}

