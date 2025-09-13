// Import the existing API client - adjust path as needed
// import { api } from './api';

// For now, we'll create a simple API client inline
class SimpleApiClient {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }
  
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: await this.getAuthHeaders()
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
  
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
  
  private async getAuthHeaders(): Promise<HeadersInit> {
    // TODO: Integrate with your existing auth system
    return {
      'Content-Type': 'application/json',
      // Add authorization header here
    };
  }
}

const api = new SimpleApiClient();
import type {
  FullWebsiteTestSession,
  FullWebsiteTestConfig,
  FullWebsiteTestResults,
  FullWebsiteTestTemplate,
  SessionListParams,
  PaginatedResponse,
  ApiResponse,
  TestProgress,
  WebSocketTestUpdate,
  TestMetricsData
} from '../types/full-website-test';

class FullWebsiteTestApi {
  private wsConnections = new Map<string, WebSocket>();
  private progressCallbacks = new Map<string, (progress: TestProgress) => void>();

  /**
   * Start a new full website test
   */
  async startTest(config: FullWebsiteTestConfig): Promise<FullWebsiteTestSession> {
    const response = await api.post<ApiResponse<FullWebsiteTestSession>>(
      '/api/full-website-test/start',
      config
    );
    return response.data;
  }

  /**
   * Get test session details
   */
  async getSession(sessionId: string): Promise<FullWebsiteTestSession> {
    const response = await api.get<ApiResponse<FullWebsiteTestSession>>(
      `/api/full-website-test/sessions/${sessionId}`
    );
    return response.data;
  }

  /**
   * Get comprehensive test results
   */
  async getTestResults(sessionId: string): Promise<FullWebsiteTestResults> {
    const response = await api.get<ApiResponse<FullWebsiteTestResults>>(
      `/api/full-website-test/sessions/${sessionId}/results`
    );
    return response.data;
  }

  /**
   * Cancel a running test
   */
  async cancelTest(sessionId: string): Promise<{ message: string; session_id: string }> {
    const response = await api.post<{ message: string; session_id: string }>(
      `/api/full-website-test/sessions/${sessionId}/cancel`
    );
    return response;
  }

  /**
   * Get paginated list of test sessions
   */
  async getSessions(params: SessionListParams = {}): Promise<PaginatedResponse<FullWebsiteTestSession>> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/api/full-website-test/sessions${queryString ? `?${queryString}` : ''}`;
    
    return await api.get<PaginatedResponse<FullWebsiteTestSession>>(endpoint);
  }

  /**
   * Get predefined test configuration templates
   */
  async getTemplates(): Promise<FullWebsiteTestTemplate[]> {
    const response = await api.get<ApiResponse<FullWebsiteTestTemplate[]>>(
      '/api/full-website-test/templates'
    );
    return response.data;
  }

  /**
   * Subscribe to real-time test progress updates
   */
  subscribeToProgress(
    sessionId: string, 
    onProgress: (progress: TestProgress) => void,
    onUpdate?: (update: WebSocketTestUpdate) => void
  ): () => void {
    const wsUrl = this.getWebSocketUrl();
    const ws = new WebSocket(`${wsUrl}/full-website-test/${sessionId}`);
    
    ws.onopen = () => {
      console.log(`WebSocket connected for session ${sessionId}`);
    };

    ws.onmessage = (event) => {
      try {
        const update: WebSocketTestUpdate = JSON.parse(event.data);
        
        // Handle progress updates
        if (update.type === 'progress_update') {
          const progress: TestProgress = update.data;
          onProgress(progress);
          this.progressCallbacks.set(sessionId, onProgress);
        }
        
        // Handle general updates
        if (onUpdate) {
          onUpdate(update);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for session ${sessionId}:`, error);
    };

    ws.onclose = (event) => {
      console.log(`WebSocket closed for session ${sessionId}:`, event.code, event.reason);
      this.wsConnections.delete(sessionId);
      this.progressCallbacks.delete(sessionId);
      
      // Attempt to reconnect if the connection was closed unexpectedly
      if (event.code !== 1000 && event.code !== 1001) {
        console.log(`Attempting to reconnect WebSocket for session ${sessionId}...`);
        setTimeout(() => {
          if (!this.wsConnections.has(sessionId)) {
            this.subscribeToProgress(sessionId, onProgress, onUpdate);
          }
        }, 5000);
      }
    };

    this.wsConnections.set(sessionId, ws);

    // Return cleanup function
    return () => {
      const connection = this.wsConnections.get(sessionId);
      if (connection && connection.readyState === WebSocket.OPEN) {
        connection.close(1000, 'Component unmounted');
      }
      this.wsConnections.delete(sessionId);
      this.progressCallbacks.delete(sessionId);
    };
  }

  /**
   * Unsubscribe from progress updates
   */
  unsubscribeFromProgress(sessionId: string): void {
    const connection = this.wsConnections.get(sessionId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.close(1000, 'Unsubscribed');
    }
    this.wsConnections.delete(sessionId);
    this.progressCallbacks.delete(sessionId);
  }

  /**
   * Get WebSocket URL based on current environment
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_URL || 
                 import.meta.env.VITE_API_URL?.replace(/^https?:/, protocol) ||
                 `${protocol}//${window.location.host.replace(':5173', ':3001')}`;
    return host;
  }

  /**
   * Get test metrics data for visualization
   */
  async getTestMetrics(sessionId: string): Promise<TestMetricsData> {
    // This would typically fetch from a separate metrics endpoint
    // For now, we'll derive it from the test results
    const results = await this.getTestResults(sessionId);
    
    const metricsData: TestMetricsData = {
      response_times: {
        labels: results.discovered_urls.slice(0, 20).map(url => {
          const urlObj = new URL(url.url);
          return urlObj.pathname.length > 20 
            ? urlObj.pathname.substring(0, 20) + '...' 
            : urlObj.pathname;
        }),
        data: results.health_checks.slice(0, 20).map(check => check.response_time_ms)
      },
      status_codes: {
        labels: ['200', '404', '500', '503', 'Other'],
        data: this.aggregateStatusCodes(results.health_checks)
      },
      error_trends: {
        labels: this.generateTimeLabels(results.health_checks),
        data: this.generateErrorTrends(results.health_checks)
      },
      change_trends: {
        labels: this.generateTimeLabels(results.change_detections, 'detected_at'),
        data: this.generateChangeTrends(results.change_detections)
      }
    };

    return metricsData;
  }

  /**
   * Export test results to various formats
   */
  async exportResults(sessionId: string, format: 'json' | 'csv' | 'pdf' = 'json'): Promise<Blob> {
    const response = await fetch(
      `/api/full-website-test/sessions/${sessionId}/export?format=${format}`,
      {
        headers: await this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Compare two test sessions
   */
  async compareSessions(baselineSessionId: string, comparisonSessionId: string) {
    const [baseline, comparison] = await Promise.all([
      this.getTestResults(baselineSessionId),
      this.getTestResults(comparisonSessionId)
    ]);

    return this.generateComparison(baseline, comparison);
  }

  /**
   * Get screenshot URL for a specific page and viewport
   */
  getScreenshotUrl(screenshotPath: string): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${baseUrl}/api/storage/screenshots/${screenshotPath}`;
  }

  /**
   * Get thumbnail URL for a screenshot
   */
  getThumbnailUrl(thumbnailPath: string): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${baseUrl}/api/storage/thumbnails/${thumbnailPath}`;
  }

  /**
   * Get difference image URL for comparison
   */
  getDifferenceImageUrl(differenceImagePath: string): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${baseUrl}/api/storage/differences/${differenceImagePath}`;
  }

  // Helper methods for data processing

  private async getAuthHeaders(): Promise<HeadersInit> {
    // This should integrate with your existing auth system
    // For now, we'll use the same approach as the main API client
    return {
      'Content-Type': 'application/json',
      // Add authorization header here
    };
  }

  private aggregateStatusCodes(healthChecks: any[]): number[] {
    const statusCounts = { '200': 0, '404': 0, '500': 0, '503': 0, 'Other': 0 };
    
    healthChecks.forEach(check => {
      const code = check.status_code.toString();
      if (statusCounts.hasOwnProperty(code)) {
        statusCounts[code as keyof typeof statusCounts]++;
      } else {
        statusCounts.Other++;
      }
    });

    return Object.values(statusCounts);
  }

  private generateTimeLabels(items: any[], timeField: string = 'created_at'): string[] {
    if (items.length === 0) return [];
    
    // Group items by hour and return labels
    const hours = new Set<string>();
    items.forEach(item => {
      const date = new Date(item[timeField]);
      hours.add(date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    });
    
    return Array.from(hours).sort().slice(0, 12);
  }

  private generateErrorTrends(healthChecks: any[]): number[] {
    // Group by time and count errors
    const hourlyErrors = new Map<string, number>();
    
    healthChecks.forEach(check => {
      if (check.is_error) {
        const hour = new Date(check.created_at).getHours();
        const key = `${hour}:00`;
        hourlyErrors.set(key, (hourlyErrors.get(key) || 0) + 1);
      }
    });

    return Array.from(hourlyErrors.values()).slice(0, 12);
  }

  private generateChangeTrends(changeDetections: any[]): number[] {
    // Group by time and count changes
    const hourlyChanges = new Map<string, number>();
    
    changeDetections.forEach(change => {
      const hour = new Date(change.detected_at).getHours();
      const key = `${hour}:00`;
      hourlyChanges.set(key, (hourlyChanges.get(key) || 0) + 1);
    });

    return Array.from(hourlyChanges.values()).slice(0, 12);
  }

  private generateComparison(baseline: FullWebsiteTestResults, comparison: FullWebsiteTestResults) {
    const baselineUrls = new Set(baseline.discovered_urls.map(u => u.normalized_url));
    const comparisonUrls = new Set(comparison.discovered_urls.map(u => u.normalized_url));
    
    const addedUrls = [...comparisonUrls].filter(url => !baselineUrls.has(url));
    const removedUrls = [...baselineUrls].filter(url => !comparisonUrls.has(url));
    const commonUrls = [...baselineUrls].filter(url => comparisonUrls.has(url));

    const baselineErrors = baseline.health_checks.filter(h => h.is_error).length;
    const comparisonErrors = comparison.health_checks.filter(h => h.is_error).length;

    return {
      baseline_session: baseline.session,
      current_session: comparison.session,
      comparison_metrics: {
        url_changes: {
          added: addedUrls.length,
          removed: removedUrls.length,
          modified: commonUrls.length
        },
        performance_changes: {
          improved: 0, // Would need detailed comparison logic
          degraded: 0,
          unchanged: commonUrls.length
        },
        error_changes: {
          new_errors: Math.max(0, comparisonErrors - baselineErrors),
          fixed_errors: Math.max(0, baselineErrors - comparisonErrors),
          persistent_errors: Math.min(baselineErrors, comparisonErrors)
        }
      }
    };
  }

  /**
   * Check if a test session is currently running
   */
  isSessionRunning(session: FullWebsiteTestSession): boolean {
    return ['pending', 'discovering_urls', 'taking_screenshots', 'analyzing_changes', 'monitoring'].includes(session.status);
  }

  /**
   * Get human-readable status text
   */
  getStatusText(status: FullWebsiteTestSession['status']): string {
    const statusMap = {
      'pending': 'Pending',
      'discovering_urls': 'Discovering URLs',
      'taking_screenshots': 'Taking Screenshots',
      'analyzing_changes': 'Analyzing Changes',
      'monitoring': 'Monitoring',
      'completed': 'Completed',
      'failed': 'Failed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  }

  /**
   * Calculate progress percentage for a session
   */
  calculateProgressPercentage(session: FullWebsiteTestSession): number {
    if (session.total_urls === 0) return 0;
    return Math.round((session.processed_urls / session.total_urls) * 100);
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: FullWebsiteTestSession['status']): string {
    const colorMap = {
      'pending': 'orange',
      'discovering_urls': 'blue',
      'taking_screenshots': 'blue',
      'analyzing_changes': 'blue',
      'monitoring': 'purple',
      'completed': 'green',
      'failed': 'red',
      'cancelled': 'gray'
    };
    return colorMap[status] || 'gray';
  }
}

export const fullWebsiteTestApi = new FullWebsiteTestApi();
export default fullWebsiteTestApi;
