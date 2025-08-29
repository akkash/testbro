import { Request, Response } from 'express';
import { QueryResult } from 'pg';
import { databaseService } from '../services/databaseService';
import { logger, LogCategory } from '../services/loggingService';

// Pagination configuration interface
export interface PaginationConfig {
  defaultLimit: number;
  maxLimit: number;
  defaultSortField: string;
  defaultSortOrder: 'ASC' | 'DESC';
  allowedSortFields: string[];
}

// Pagination parameters from request
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  sortField: string;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  filters?: Record<string, any>;
}

// Paginated response structure
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextPage: number | null;
    previousPage: number | null;
  };
  meta?: {
    sortField: string;
    sortOrder: string;
    search?: string;
    filters?: Record<string, any>;
    executionTime: number;
  };
}

// Cursor-based pagination for large datasets
export interface CursorPaginationParams {
  limit: number;
  cursor?: string;
  sortField: string;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  filters?: Record<string, any>;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    hasNextPage: boolean;
    nextCursor: string | null;
    limit: number;
  };
  meta?: {
    sortField: string;
    sortOrder: string;
    search?: string;
    filters?: Record<string, any>;
    executionTime: number;
  };
}

export class PaginationService {
  private defaultConfig: PaginationConfig = {
    defaultLimit: 20,
    maxLimit: 100,
    defaultSortField: 'id',
    defaultSortOrder: 'DESC',
    allowedSortFields: ['id', 'created_at', 'updated_at', 'name', 'title'],
  };

  // Parse pagination parameters from request
  parsePaginationParams(
    req: Request,
    config?: Partial<PaginationConfig>
  ): PaginationParams {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      finalConfig.maxLimit,
      Math.max(1, parseInt(req.query.limit as string) || finalConfig.defaultLimit)
    );
    const offset = (page - 1) * limit;
    
    const sortField = this.validateSortField(
      req.query.sort_field as string || finalConfig.defaultSortField,
      finalConfig.allowedSortFields
    );
    
    const sortOrder = (req.query.sort_order as string)?.toUpperCase() === 'ASC' 
      ? 'ASC' 
      : finalConfig.defaultSortOrder;

    const search = req.query.search as string;
    const filters = this.parseFilters(req.query);

    return {
      page,
      limit,
      offset,
      sortField,
      sortOrder,
      search,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };
  }

  // Parse cursor-based pagination parameters
  parseCursorParams(
    req: Request,
    config?: Partial<PaginationConfig>
  ): CursorPaginationParams {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    const limit = Math.min(
      finalConfig.maxLimit,
      Math.max(1, parseInt(req.query.limit as string) || finalConfig.defaultLimit)
    );
    
    const cursor = req.query.cursor as string;
    
    const sortField = this.validateSortField(
      req.query.sort_field as string || finalConfig.defaultSortField,
      finalConfig.allowedSortFields
    );
    
    const sortOrder = (req.query.sort_order as string)?.toUpperCase() === 'ASC' 
      ? 'ASC' 
      : finalConfig.defaultSortOrder;

    const search = req.query.search as string;
    const filters = this.parseFilters(req.query);

    return {
      limit,
      cursor,
      sortField,
      sortOrder,
      search,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };
  }

  // Validate sort field against allowed fields
  private validateSortField(field: string, allowedFields: string[]): string {
    if (!field || !allowedFields.includes(field)) {
      return allowedFields[0] || 'id';
    }
    return field;
  }

  // Parse filters from query parameters
  private parseFilters(query: any): Record<string, any> {
    const filters: Record<string, any> = {};
    
    // Common filter patterns
    const filterPatterns = [
      'status', 'type', 'category', 'user_id', 'project_id',
      'created_by', 'assigned_to', 'priority', 'tags'
    ];

    for (const pattern of filterPatterns) {
      if (query[pattern]) {
        filters[pattern] = query[pattern];
      }
    }

    // Date range filters
    if (query.created_after) {
      filters.created_after = new Date(query.created_after);
    }
    if (query.created_before) {
      filters.created_before = new Date(query.created_before);
    }

    return filters;
  }

  // Execute paginated query with total count
  async executePaginatedQuery<T>(
    baseQuery: string,
    countQuery: string,
    params: PaginationParams,
    queryParams: any[] = []
  ): Promise<PaginatedResponse<T>> {
    const startTime = performance.now();

    try {
      // Build the complete query with sorting and pagination
      const sortClause = `ORDER BY ${params.sortField} ${params.sortOrder}`;
      const paginationClause = `LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      
      const finalQuery = `${baseQuery} ${sortClause} ${paginationClause}`;
      const finalParams = [...queryParams, params.limit, params.offset];

      // Execute data query and count query in parallel
      const [dataResult, countResult] = await Promise.all([
        databaseService.query<T>(finalQuery, finalParams),
        databaseService.query(countQuery, queryParams),
      ]);

      const totalItems = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalItems / params.limit);
      
      const executionTime = performance.now() - startTime;

      const response: PaginatedResponse<T> = {
        data: dataResult.rows,
        pagination: {
          currentPage: params.page,
          totalPages,
          totalItems,
          itemsPerPage: params.limit,
          hasNextPage: params.page < totalPages,
          hasPreviousPage: params.page > 1,
          nextPage: params.page < totalPages ? params.page + 1 : null,
          previousPage: params.page > 1 ? params.page - 1 : null,
        },
        meta: {
          sortField: params.sortField,
          sortOrder: params.sortOrder,
          search: params.search,
          filters: params.filters,
          executionTime: parseFloat(executionTime.toFixed(2)),
        },
      };

      logger.debug('Paginated query executed', LogCategory.DATABASE, {
        metadata: {
          totalItems,
          currentPage: params.page,
          itemsPerPage: params.limit,
          executionTime: `${executionTime.toFixed(2)}ms`,
          queryLength: finalQuery.length,
        }
      });

      return response;
    } catch (error) {
      logger.error('Paginated query failed', LogCategory.DATABASE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: {
          baseQuery: baseQuery.substring(0, 100) + '...',
          params: JSON.stringify(params),
        },
        errorCode: 'PAGINATION_QUERY_ERROR'
      });
      throw error;
    }
  }

  // Execute cursor-based pagination query
  async executeCursorQuery<T>(
    baseQuery: string,
    params: CursorPaginationParams,
    queryParams: any[] = []
  ): Promise<CursorPaginatedResponse<T>> {
    const startTime = performance.now();

    try {
      let finalQuery = baseQuery;
      let finalParams = [...queryParams];

      // Add cursor condition if provided
      if (params.cursor) {
        try {
          const cursorData = JSON.parse(Buffer.from(params.cursor, 'base64').toString());
          const cursorValue = cursorData.value;
          const cursorId = cursorData.id;

          const operator = params.sortOrder === 'ASC' ? '>' : '<';
          const cursorCondition = `AND (${params.sortField} ${operator} $${finalParams.length + 1} OR (${params.sortField} = $${finalParams.length + 1} AND id ${operator} $${finalParams.length + 2}))`;
          
          finalQuery += ` ${cursorCondition}`;
          finalParams.push(cursorValue, cursorId);
        } catch (error) {
          logger.warn('Invalid cursor provided, ignoring', LogCategory.DATABASE, {
            metadata: { cursor: params.cursor }
          });
        }
      }

      // Add sorting and limit
      const sortClause = `ORDER BY ${params.sortField} ${params.sortOrder}, id ${params.sortOrder}`;
      const limitClause = `LIMIT $${finalParams.length + 1}`;
      
      finalQuery = `${finalQuery} ${sortClause} ${limitClause}`;
      finalParams.push(params.limit + 1); // Fetch one extra to check if there's a next page

      const result = await databaseService.query<T>(finalQuery, finalParams);
      
      const hasNextPage = result.rows.length > params.limit;
      const data = hasNextPage ? result.rows.slice(0, -1) : result.rows;
      
      // Generate next cursor
      let nextCursor: string | null = null;
      if (hasNextPage && data.length > 0) {
        const lastItem = data[data.length - 1] as any;
        const cursorData = {
          value: lastItem[params.sortField],
          id: lastItem.id,
        };
        nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
      }

      const executionTime = performance.now() - startTime;

      const response: CursorPaginatedResponse<T> = {
        data,
        pagination: {
          hasNextPage,
          nextCursor,
          limit: params.limit,
        },
        meta: {
          sortField: params.sortField,
          sortOrder: params.sortOrder,
          search: params.search,
          filters: params.filters,
          executionTime: parseFloat(executionTime.toFixed(2)),
        },
      };

      logger.debug('Cursor query executed', LogCategory.DATABASE, {
        metadata: {
          itemsReturned: data.length,
          hasNextPage,
          executionTime: `${executionTime.toFixed(2)}ms`,
        }
      });

      return response;
    } catch (error) {
      logger.error('Cursor query failed', LogCategory.DATABASE, {
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata: {
          baseQuery: baseQuery.substring(0, 100) + '...',
          params: JSON.stringify(params),
        },
        errorCode: 'CURSOR_QUERY_ERROR'
      });
      throw error;
    }
  }

  // Build WHERE clause from search and filters
  buildWhereClause(
    params: PaginationParams | CursorPaginationParams,
    searchFields: string[] = []
  ): { whereClause: string; queryParams: any[] } {
    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Add search condition
    if (params.search && searchFields.length > 0) {
      const searchConditions = searchFields.map(field => 
        `${field} ILIKE $${paramIndex}`
      ).join(' OR ');
      
      conditions.push(`(${searchConditions})`);
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    // Add filter conditions
    if (params.filters) {
      for (const [key, value] of Object.entries(params.filters)) {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
            conditions.push(`${key} IN (${placeholders})`);
            queryParams.push(...value);
          } else if (key.endsWith('_after') || key.endsWith('_before')) {
            const operator = key.endsWith('_after') ? '>=' : '<=';
            const field = key.replace(/_after$|_before$/, '');
            conditions.push(`${field} ${operator} $${paramIndex++}`);
            queryParams.push(value);
          } else {
            conditions.push(`${key} = $${paramIndex++}`);
            queryParams.push(value);
          }
        }
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    return { whereClause, queryParams };
  }

  // Express middleware for automatic pagination
  paginationMiddleware(config?: Partial<PaginationConfig>) {
    return (req: Request, res: Response, next: any) => {
      req.pagination = this.parsePaginationParams(req, config);
      next();
    };
  }

  // Generate pagination links for API responses
  generatePaginationLinks(
    req: Request,
    pagination: PaginatedResponse<any>['pagination']
  ): Record<string, string> {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.path}`;
    const queryParams = new URLSearchParams(req.query as any);
    
    const links: Record<string, string> = {};

    // First page
    queryParams.set('page', '1');
    links.first = `${baseUrl}?${queryParams.toString()}`;

    // Last page
    queryParams.set('page', pagination.totalPages.toString());
    links.last = `${baseUrl}?${queryParams.toString()}`;

    // Previous page
    if (pagination.hasPreviousPage) {
      queryParams.set('page', pagination.previousPage!.toString());
      links.prev = `${baseUrl}?${queryParams.toString()}`;
    }

    // Next page
    if (pagination.hasNextPage) {
      queryParams.set('page', pagination.nextPage!.toString());
      links.next = `${baseUrl}?${queryParams.toString()}`;
    }

    return links;
  }

  // Optimize query for large datasets
  async optimizeForLargeDatasets<T>(
    tableName: string,
    params: PaginationParams,
    selectFields: string[] = ['*'],
    searchFields: string[] = []
  ): Promise<PaginatedResponse<T>> {
    // For very large datasets, use cursor pagination when possible
    if (params.page > 1000) {
      logger.warn('Large page number detected, consider using cursor pagination', LogCategory.DATABASE, {
        metadata: { page: params.page, tableName }
      });
    }

    const { whereClause, queryParams } = this.buildWhereClause(params, searchFields);
    
    const baseQuery = `
      SELECT ${selectFields.join(', ')}
      FROM ${tableName}
      ${whereClause}
    `;

    const countQuery = `
      SELECT COUNT(*) as count
      FROM ${tableName}
      ${whereClause}
    `;

    return this.executePaginatedQuery<T>(baseQuery, countQuery, params, queryParams);
  }

  // Get pagination statistics
  getPaginationStats(): any {
    // This would typically be implemented with actual usage tracking
    return {
      averagePageSize: 'Not implemented',
      mostCommonSortFields: 'Not implemented',
      largestPageRequested: 'Not implemented',
      totalPaginatedRequests: 'Not implemented',
    };
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      pagination?: PaginationParams;
    }
  }
}

// Create singleton pagination service instance
export const paginationService = new PaginationService();

export default paginationService;