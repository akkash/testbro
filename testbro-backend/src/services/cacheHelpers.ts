import { cacheService, CacheKeys, CacheTTL, CacheResult } from './cacheService';
import { logger, LogCategory } from './loggingService';

// User-related caching
export class UserCache {
  // Cache user profile data
  static async getUserProfile(userId: string): Promise<any> {
    const key = `${CacheKeys.USER_PROFILE}${userId}`;
    return cacheService.get(key);
  }

  static async setUserProfile(userId: string, profile: any): Promise<boolean> {
    const key = `${CacheKeys.USER_PROFILE}${userId}`;
    const result = await cacheService.set(key, profile, CacheTTL.LONG);
    return result.success;
  }

  static async invalidateUserProfile(userId: string): Promise<boolean> {
    const key = `${CacheKeys.USER_PROFILE}${userId}`;
    const result = await cacheService.delete(key);
    return result.success;
  }

  // Cache user permissions
  static async getUserPermissions(userId: string): Promise<CacheResult<string[]>> {
    const key = `${CacheKeys.USER_PERMISSIONS}${userId}`;
    return cacheService.get<string[]>(key);
  }

  static async setUserPermissions(userId: string, permissions: string[]): Promise<boolean> {
    const key = `${CacheKeys.USER_PERMISSIONS}${userId}`;
    const result = await cacheService.set(key, permissions, CacheTTL.MEDIUM);
    return result.success;
  }

  static async invalidateUserPermissions(userId: string): Promise<boolean> {
    const key = `${CacheKeys.USER_PERMISSIONS}${userId}`;
    const result = await cacheService.delete(key);
    return result.success;
  }

  // Cache user session data
  static async getUserSession(sessionId: string): Promise<CacheResult<any>> {
    const key = `${CacheKeys.SESSION_DATA}${sessionId}`;
    return cacheService.get(key);
  }

  static async setUserSession(sessionId: string, sessionData: any, ttl: number = CacheTTL.LONG): Promise<boolean> {
    const key = `${CacheKeys.SESSION_DATA}${sessionId}`;
    const result = await cacheService.set(key, sessionData, ttl);
    return result.success;
  }

  static async invalidateUserSession(sessionId: string): Promise<boolean> {
    const key = `${CacheKeys.SESSION_DATA}${sessionId}`;
    const result = await cacheService.delete(key);
    return result.success;
  }

  // Invalidate all user-related cache
  static async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `${CacheKeys.USER_PROFILE}${userId}`,
      `${CacheKeys.USER_PERMISSIONS}${userId}`,
      `${CacheKeys.SESSION_DATA}*${userId}*`,
    ];

    for (const pattern of patterns) {
      try {
        await cacheService.deletePattern(pattern);
      } catch (error) {
        logger.error('Failed to invalidate user cache pattern', LogCategory.CACHE, {
          metadata: { userId, pattern },
          errorStack: error instanceof Error ? error.stack : undefined,
        });
      }
    }
  }
}

// Project-related caching
export class ProjectCache {
  // Cache project data
  static async getProject(projectId: string): Promise<CacheResult<any>> {
    const key = `${CacheKeys.PROJECT_DATA}${projectId}`;
    return cacheService.get(key);
  }

  static async setProject(projectId: string, projectData: any): Promise<boolean> {
    const key = `${CacheKeys.PROJECT_DATA}${projectId}`;
    const result = await cacheService.set(key, projectData, CacheTTL.MEDIUM);
    return result.success;
  }

  static async invalidateProject(projectId: string): Promise<boolean> {
    const key = `${CacheKeys.PROJECT_DATA}${projectId}`;
    const result = await cacheService.delete(key);
    return result.success;
  }

  // Cache project tests
  static async getProjectTests(projectId: string): Promise<CacheResult<any[]>> {
    const key = `${CacheKeys.PROJECT_TESTS}${projectId}`;
    return cacheService.get<any[]>(key);
  }

  static async setProjectTests(projectId: string, tests: any[]): Promise<boolean> {
    const key = `${CacheKeys.PROJECT_TESTS}${projectId}`;
    const result = await cacheService.set(key, tests, CacheTTL.SHORT);
    return result.success;
  }

  static async invalidateProjectTests(projectId: string): Promise<boolean> {
    const key = `${CacheKeys.PROJECT_TESTS}${projectId}`;
    const result = await cacheService.delete(key);
    return result.success;
  }

  // Cache project with fallback to database
  static async getProjectWithFallback(
    projectId: string,
    dbFallback: () => Promise<any>
  ): Promise<any> {
    const key = `${CacheKeys.PROJECT_DATA}${projectId}`;
    const result = await cacheService.getOrSet(key, dbFallback, CacheTTL.MEDIUM);
    return result.data;
  }

  // Invalidate all project-related cache
  static async invalidateProjectCache(projectId: string): Promise<void> {
    const patterns = [
      `${CacheKeys.PROJECT_DATA}${projectId}`,
      `${CacheKeys.PROJECT_TESTS}${projectId}`,
      `${CacheKeys.TEST_RESULTS}*${projectId}*`,
    ];

    for (const pattern of patterns) {
      try {
        await cacheService.deletePattern(pattern);
      } catch (error) {
        logger.error('Failed to invalidate project cache pattern', LogCategory.CACHE, {
          metadata: { projectId, pattern },
          errorStack: error instanceof Error ? error.stack : undefined,
        });
      }
    }
  }
}

// Test results caching
export class TestResultsCache {
  // Cache test results
  static async getTestResults(testId: string): Promise<CacheResult<any>> {
    const key = `${CacheKeys.TEST_RESULTS}${testId}`;
    return cacheService.get(key);
  }

  static async setTestResults(testId: string, results: any): Promise<boolean> {
    const key = `${CacheKeys.TEST_RESULTS}${testId}`;
    const result = await cacheService.set(key, results, CacheTTL.LONG);
    return result.success;
  }

  static async invalidateTestResults(testId: string): Promise<boolean> {
    const key = `${CacheKeys.TEST_RESULTS}${testId}`;
    const result = await cacheService.delete(key);
    return result.success;
  }

  // Cache aggregated test results for a project
  static async getProjectTestSummary(projectId: string): Promise<CacheResult<any>> {
    const key = `${CacheKeys.TEST_RESULTS}summary:${projectId}`;
    return cacheService.get(key);
  }

  static async setProjectTestSummary(projectId: string, summary: any): Promise<boolean> {
    const key = `${CacheKeys.TEST_RESULTS}summary:${projectId}`;
    const result = await cacheService.set(key, summary, CacheTTL.SHORT);
    return result.success;
  }

  // Get test results with fallback
  static async getTestResultsWithFallback(
    testId: string,
    dbFallback: () => Promise<any>
  ): Promise<any> {
    const key = `${CacheKeys.TEST_RESULTS}${testId}`;
    const result = await cacheService.getOrSet(key, dbFallback, CacheTTL.LONG);
    return result.data;
  }
}

// Organization-related caching
export class OrganizationCache {
  // Cache organization data
  static async getOrganization(orgId: string): Promise<CacheResult<any>> {
    const key = `${CacheKeys.ORGANIZATION_DATA}${orgId}`;
    return cacheService.get(key);
  }

  static async setOrganization(orgId: string, orgData: any): Promise<boolean> {
    const key = `${CacheKeys.ORGANIZATION_DATA}${orgId}`;
    const result = await cacheService.set(key, orgData, CacheTTL.LONG);
    return result.success;
  }

  static async invalidateOrganization(orgId: string): Promise<boolean> {
    const key = `${CacheKeys.ORGANIZATION_DATA}${orgId}`;
    const result = await cacheService.delete(key);
    return result.success;
  }

  // Cache organization members
  static async getOrganizationMembers(orgId: string): Promise<CacheResult<any[]>> {
    const key = `${CacheKeys.ORGANIZATION_MEMBERS}${orgId}`;
    return cacheService.get<any[]>(key);
  }

  static async setOrganizationMembers(orgId: string, members: any[]): Promise<boolean> {
    const key = `${CacheKeys.ORGANIZATION_MEMBERS}${orgId}`;
    const result = await cacheService.set(key, members, CacheTTL.MEDIUM);
    return result.success;
  }

  static async invalidateOrganizationMembers(orgId: string): Promise<boolean> {
    const key = `${CacheKeys.ORGANIZATION_MEMBERS}${orgId}`;
    const result = await cacheService.delete(key);
    return result.success;
  }

  // Invalidate all organization-related cache
  static async invalidateOrganizationCache(orgId: string): Promise<void> {
    const patterns = [
      `${CacheKeys.ORGANIZATION_DATA}${orgId}`,
      `${CacheKeys.ORGANIZATION_MEMBERS}${orgId}`,
    ];

    for (const pattern of patterns) {
      try {
        await cacheService.deletePattern(pattern);
      } catch (error) {
        logger.error('Failed to invalidate organization cache pattern', LogCategory.CACHE, {
          metadata: { orgId, pattern },
          errorStack: error instanceof Error ? error.stack : undefined,
        });
      }
    }
  }
}

// API response caching
export class APIResponseCache {
  // Cache API responses
  static async getAPIResponse(endpoint: string, params?: any): Promise<CacheResult<any>> {
    const cacheKey = this.generateAPIKey(endpoint, params);
    return cacheService.get(cacheKey);
  }

  static async setAPIResponse(endpoint: string, response: any, params?: any, ttl: number = CacheTTL.SHORT): Promise<boolean> {
    const cacheKey = this.generateAPIKey(endpoint, params);
    const result = await cacheService.set(cacheKey, response, ttl);
    return result.success;
  }

  static async invalidateAPIResponse(endpoint: string, params?: any): Promise<boolean> {
    const cacheKey = this.generateAPIKey(endpoint, params);
    const result = await cacheService.delete(cacheKey);
    return result.success;
  }

  // Get API response with fallback
  static async getAPIResponseWithFallback(
    endpoint: string,
    apiFallback: () => Promise<any>,
    params?: any,
    ttl: number = CacheTTL.SHORT
  ): Promise<any> {
    const cacheKey = this.generateAPIKey(endpoint, params);
    const result = await cacheService.getOrSet(cacheKey, apiFallback, ttl);
    return result.data;
  }

  private static generateAPIKey(endpoint: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    const hash = require('crypto').createHash('md5').update(endpoint + paramString).digest('hex');
    return `${CacheKeys.API_RESPONSES}${hash}`;
  }
}

// Analytics and dashboard caching
export class AnalyticsCache {
  // Cache dashboard statistics
  static async getDashboardStats(userId: string, period: string = 'today'): Promise<CacheResult<any>> {
    const key = `${CacheKeys.DASHBOARD_STATS}${userId}:${period}`;
    return cacheService.get(key);
  }

  static async setDashboardStats(userId: string, stats: any, period: string = 'today'): Promise<boolean> {
    const key = `${CacheKeys.DASHBOARD_STATS}${userId}:${period}`;
    const result = await cacheService.set(key, stats, CacheTTL.MEDIUM);
    return result.success;
  }

  static async invalidateDashboardStats(userId: string): Promise<void> {
    const pattern = `${CacheKeys.DASHBOARD_STATS}${userId}:*`;
    await cacheService.deletePattern(pattern);
  }

  // Cache global analytics
  static async getGlobalAnalytics(period: string = 'today'): Promise<CacheResult<any>> {
    const key = `${CacheKeys.ANALYTICS}global:${period}`;
    return cacheService.get(key);
  }

  static async setGlobalAnalytics(analytics: any, period: string = 'today'): Promise<boolean> {
    const key = `${CacheKeys.ANALYTICS}global:${period}`;
    const result = await cacheService.set(key, analytics, CacheTTL.LONG);
    return result.success;
  }

  // Cache analytics with fallback
  static async getAnalyticsWithFallback(
    type: string,
    period: string,
    analyticsFunction: () => Promise<any>
  ): Promise<any> {
    const key = `${CacheKeys.ANALYTICS}${type}:${period}`;
    const result = await cacheService.getOrSet(key, analyticsFunction, CacheTTL.MEDIUM);
    return result.data;
  }
}

// Search results caching
export class SearchCache {
  // Cache search results
  static async getSearchResults(query: string, filters?: any): Promise<CacheResult<any>> {
    const cacheKey = this.generateSearchKey(query, filters);
    return cacheService.get(cacheKey);
  }

  static async setSearchResults(query: string, results: any, filters?: any): Promise<boolean> {
    const cacheKey = this.generateSearchKey(query, filters);
    const result = await cacheService.set(cacheKey, results, CacheTTL.SHORT);
    return result.success;
  }

  static async invalidateSearchResults(pattern?: string): Promise<void> {
    const searchPattern = pattern || `${CacheKeys.SEARCH_RESULTS}*`;
    await cacheService.deletePattern(searchPattern);
  }

  // Get search results with fallback
  static async getSearchResultsWithFallback(
    query: string,
    searchFunction: () => Promise<any>,
    filters?: any
  ): Promise<any> {
    const cacheKey = this.generateSearchKey(query, filters);
    const result = await cacheService.getOrSet(cacheKey, searchFunction, CacheTTL.SHORT);
    return result.data;
  }

  private static generateSearchKey(query: string, filters?: any): string {
    const filterString = filters ? JSON.stringify(filters) : '';
    const hash = require('crypto').createHash('md5').update(query + filterString).digest('hex');
    return `${CacheKeys.SEARCH_RESULTS}${hash}`;
  }
}

// File metadata caching
export class FileCache {
  // Cache file metadata
  static async getFileMetadata(fileId: string): Promise<CacheResult<any>> {
    const key = `${CacheKeys.FILE_METADATA}${fileId}`;
    return cacheService.get(key);
  }

  static async setFileMetadata(fileId: string, metadata: any): Promise<boolean> {
    const key = `${CacheKeys.FILE_METADATA}${fileId}`;
    const result = await cacheService.set(key, metadata, CacheTTL.VERY_LONG);
    return result.success;
  }

  static async invalidateFileMetadata(fileId: string): Promise<boolean> {
    const key = `${CacheKeys.FILE_METADATA}${fileId}`;
    const result = await cacheService.delete(key);
    return result.success;
  }

  // Get file metadata with fallback
  static async getFileMetadataWithFallback(
    fileId: string,
    dbFallback: () => Promise<any>
  ): Promise<any> {
    const key = `${CacheKeys.FILE_METADATA}${fileId}`;
    const result = await cacheService.getOrSet(key, dbFallback, CacheTTL.VERY_LONG);
    return result.data;
  }
}

// Notification caching
export class NotificationCache {
  // Cache user notifications
  static async getUserNotifications(userId: string): Promise<CacheResult<any[]>> {
    const key = `${CacheKeys.NOTIFICATIONS}${userId}`;
    return cacheService.get<any[]>(key);
  }

  static async setUserNotifications(userId: string, notifications: any[]): Promise<boolean> {
    const key = `${CacheKeys.NOTIFICATIONS}${userId}`;
    const result = await cacheService.set(key, notifications, CacheTTL.SHORT);
    return result.success;
  }

  static async invalidateUserNotifications(userId: string): Promise<boolean> {
    const key = `${CacheKeys.NOTIFICATIONS}${userId}`;
    const result = await cacheService.delete(key);
    return result.success;
  }

  // Add notification to cache
  static async addNotificationToCache(userId: string, notification: any): Promise<void> {
    const result = await this.getUserNotifications(userId);
    if (result.success && result.cached && result.data) {
      const notifications = [notification, ...result.data].slice(0, 50); // Keep only latest 50
      await this.setUserNotifications(userId, notifications);
    }
  }

  // Remove notification from cache
  static async removeNotificationFromCache(userId: string, notificationId: string): Promise<void> {
    const result = await this.getUserNotifications(userId);
    if (result.success && result.cached && result.data) {
      const notifications = result.data.filter((n: any) => n.id !== notificationId);
      await this.setUserNotifications(userId, notifications);
    }
  }
}

// Cache invalidation utilities
export class CacheInvalidation {
  // Invalidate all user-related caches
  static async invalidateUser(userId: string): Promise<void> {
    await UserCache.invalidateUserCache(userId);
    await AnalyticsCache.invalidateDashboardStats(userId);
    await NotificationCache.invalidateUserNotifications(userId);
    
    logger.info('User cache invalidated', LogCategory.CACHE, {
      metadata: { userId }
    });
  }

  // Invalidate all project-related caches
  static async invalidateProject(projectId: string): Promise<void> {
    await ProjectCache.invalidateProjectCache(projectId);
    
    logger.info('Project cache invalidated', LogCategory.CACHE, {
      metadata: { projectId }
    });
  }

  // Invalidate all organization-related caches
  static async invalidateOrganization(orgId: string): Promise<void> {
    await OrganizationCache.invalidateOrganizationCache(orgId);
    
    logger.info('Organization cache invalidated', LogCategory.CACHE, {
      metadata: { orgId }
    });
  }

  // Invalidate all caches for a data type
  static async invalidateByPattern(pattern: string): Promise<void> {
    await cacheService.deletePattern(pattern);
    
    logger.info('Cache pattern invalidated', LogCategory.CACHE, {
      metadata: { pattern }
    });
  }

  // Smart invalidation based on entity type and relations
  static async smartInvalidate(entityType: string, entityId: string, relations?: string[]): Promise<void> {
    switch (entityType) {
      case 'user':
        await this.invalidateUser(entityId);
        break;
      case 'project':
        await this.invalidateProject(entityId);
        break;
      case 'organization':
        await this.invalidateOrganization(entityId);
        break;
      default:
        logger.warn('Unknown entity type for cache invalidation', LogCategory.CACHE, {
          metadata: { entityType, entityId }
        });
    }

    // Invalidate related entities if specified
    if (relations) {
      for (const relation of relations) {
        const [relationType, relationId] = relation.split(':');
        if (relationType && relationId) {
          await this.smartInvalidate(relationType, relationId);
        }
      }
    }
  }
}

