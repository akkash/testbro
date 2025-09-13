import { chromium, Browser, Page } from 'playwright';
import { logger, LogCategory } from './loggingService';
import { supabaseAdmin } from '../config/database';
import { SitemapUrl } from './sitemapDiscoveryService';

export interface PageHealthCheck {
  url: string;
  http_status: number;
  response_time_ms: number;
  content_length: number;
  page_title: string;
  meta_description?: string;
  is_accessible: boolean;
  error_type?: 'timeout' | 'connection_error' | 'dns_error' | 'ssl_error' | 'http_error';
  error_message?: string;
  headers: Record<string, string>;
  redirects: string[];
  checked_at: string;
}

export interface PageChange {
  url: string;
  change_type: 'added' | 'removed' | 'modified' | 'error_status_changed';
  previous_state?: PageHealthCheck;
  current_state: PageHealthCheck;
  detected_at: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface MonitoringSession {
  id: string;
  project_id: string;
  target_id: string;
  name: string;
  base_url: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  monitoring_config: {
    check_interval_minutes: number;
    timeout_seconds: number;
    retry_attempts: number;
    monitor_404_pages: boolean;
    monitor_load_times: boolean;
    monitor_content_changes: boolean;
    alert_on_errors: boolean;
    alert_on_slowness: boolean;
    load_time_threshold_ms: number;
  };
  pages_monitored: number;
  pages_with_changes: number;
  pages_with_errors: number;
  last_check_at?: string;
  next_check_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MonitoringAlert {
  id: string;
  session_id: string;
  url: string;
  alert_type: 'error' | 'performance' | 'content_change' | 'accessibility';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  current_value?: string;
  threshold_value?: string;
  first_detected_at: string;
  last_detected_at: string;
  status: 'active' | 'resolved' | 'suppressed';
  resolution_notes?: string;
}

export class PageMonitoringService {
  private activeMonitoringSessions = new Map<string, MonitoringSession>();
  private monitoringIntervals = new Map<string, NodeJS.Timeout>();

  /**
   * Start monitoring pages for changes and errors
   */
  async startMonitoring(
    sessionConfig: Omit<MonitoringSession, 'id' | 'created_at' | 'updated_at' | 'pages_monitored' | 'pages_with_changes' | 'pages_with_errors'>
  ): Promise<MonitoringSession> {
    const sessionId = this.generateSessionId();
    
    const session: MonitoringSession = {
      ...sessionConfig,
      id: sessionId,
      pages_monitored: 0,
      pages_with_changes: 0,
      pages_with_errors: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Store session in database
    await this.storeMonitoringSession(session);
    
    // Add to active sessions
    this.activeMonitoringSessions.set(sessionId, session);

    // Schedule monitoring
    await this.scheduleMonitoring(sessionId);

    logger.info('Started page monitoring session', LogCategory.SYSTEM, {
      sessionId,
      baseUrl: session.base_url,
      config: session.monitoring_config
    });

    return session;
  }

  /**
   * Stop monitoring session
   */
  async stopMonitoring(sessionId: string): Promise<void> {
    // Clear interval
    const interval = this.monitoringIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(sessionId);
    }

    // Update session status
    const session = this.activeMonitoringSessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      session.updated_at = new Date().toISOString();
      await this.updateMonitoringSession(session);
    }

    // Remove from active sessions
    this.activeMonitoringSessions.delete(sessionId);

    logger.info('Stopped page monitoring session', LogCategory.SYSTEM, { sessionId });
  }

  /**
   * Perform health check on multiple URLs
   */
  async checkPageHealth(urls: SitemapUrl[], sessionId: string): Promise<PageHealthCheck[]> {
    const results: PageHealthCheck[] = [];
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
      });

      logger.info('Starting page health check', LogCategory.SYSTEM, {
        sessionId,
        urlCount: urls.length
      });

      // Process URLs in batches to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        const batchResults = await this.checkBatchHealth(browser, batch, sessionId);
        results.push(...batchResults);

        // Brief delay between batches
        await this.delay(1000);
      }

    } catch (error) {
      logger.error('Page health check failed', LogCategory.SYSTEM, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return results;
  }

  /**
   * Compare current health checks with previous ones to detect changes
   */
  async detectChanges(
    sessionId: string,
    currentChecks: PageHealthCheck[]
  ): Promise<PageChange[]> {
    const changes: PageChange[] = [];

    try {
      // Get previous health checks for comparison
      const { data: previousChecks } = await supabaseAdmin
        .from('website_page_health_checks')
        .select('*')
        .eq('session_id', sessionId)
        .order('checked_at', { ascending: false })
        .limit(currentChecks.length * 2); // Get more to account for multiple checks per URL

      if (!previousChecks || previousChecks.length === 0) {
        logger.info('No previous health checks found for comparison', LogCategory.SYSTEM, { sessionId });
        return changes;
      }

      // Group previous checks by URL
      const previousByUrl = new Map<string, PageHealthCheck>();
      for (const check of previousChecks) {
        if (!previousByUrl.has(check.url)) {
          previousByUrl.set(check.url, this.mapDbToHealthCheck(check));
        }
      }

      // Compare current checks with previous
      for (const current of currentChecks) {
        const previous = previousByUrl.get(current.url);

        if (!previous) {
          // New page detected
          changes.push({
            url: current.url,
            change_type: 'added',
            current_state: current,
            detected_at: new Date().toISOString(),
            severity: 'medium',
            description: 'New page discovered'
          });
          continue;
        }

        // Check for status changes
        if (previous.http_status !== current.http_status) {
          const severity = this.calculateChangeSeverity(previous.http_status, current.http_status);
          changes.push({
            url: current.url,
            change_type: 'error_status_changed',
            previous_state: previous,
            current_state: current,
            detected_at: new Date().toISOString(),
            severity,
            description: `HTTP status changed from ${previous.http_status} to ${current.http_status}`
          });
        }

        // Check for accessibility changes
        if (previous.is_accessible !== current.is_accessible) {
          changes.push({
            url: current.url,
            change_type: 'modified',
            previous_state: previous,
            current_state: current,
            detected_at: new Date().toISOString(),
            severity: current.is_accessible ? 'medium' : 'high',
            description: current.is_accessible ? 'Page became accessible' : 'Page became inaccessible'
          });
        }

        // Check for significant performance changes
        const performanceChange = this.calculatePerformanceChange(
          previous.response_time_ms,
          current.response_time_ms
        );

        if (performanceChange.isSignificant) {
          changes.push({
            url: current.url,
            change_type: 'modified',
            previous_state: previous,
            current_state: current,
            detected_at: new Date().toISOString(),
            severity: performanceChange.severity,
            description: `Response time changed by ${performanceChange.percentage}%`
          });
        }

        // Check for content changes (title)
        if (previous.page_title !== current.page_title) {
          changes.push({
            url: current.url,
            change_type: 'modified',
            previous_state: previous,
            current_state: current,
            detected_at: new Date().toISOString(),
            severity: 'low',
            description: 'Page title changed'
          });
        }
      }

      // Check for removed pages
      for (const [url, previous] of previousByUrl) {
        if (!currentChecks.find(c => c.url === url)) {
          changes.push({
            url,
            change_type: 'removed',
            previous_state: previous,
            current_state: {
              ...previous,
              http_status: 0,
              is_accessible: false,
              error_type: 'connection_error',
              error_message: 'Page no longer found',
              checked_at: new Date().toISOString()
            },
            detected_at: new Date().toISOString(),
            severity: 'high',
            description: 'Page removed or no longer accessible'
          });
        }
      }

      // Store changes in database
      for (const change of changes) {
        await this.storePageChange(sessionId, change);
      }

      // Create alerts for critical changes
      await this.createAlertsForChanges(sessionId, changes);

      logger.info('Change detection completed', LogCategory.SYSTEM, {
        sessionId,
        changesDetected: changes.length,
        criticalChanges: changes.filter(c => c.severity === 'critical').length
      });

    } catch (error) {
      logger.error('Change detection failed', LogCategory.SYSTEM, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return changes;
  }

  /**
   * Check health of a batch of URLs
   */
  private async checkBatchHealth(
    browser: Browser,
    urls: SitemapUrl[],
    sessionId: string
  ): Promise<PageHealthCheck[]> {
    const results: PageHealthCheck[] = [];
    const context = await browser.newContext({
      userAgent: 'TestBro-PageMonitor/1.0'
    });

    for (const urlObj of urls) {
      const page = await context.newPage();
      
      try {
        const healthCheck = await this.checkSinglePageHealth(page, urlObj.url);
        results.push(healthCheck);

        // Store health check in database
        await this.storeHealthCheck(sessionId, healthCheck);

      } catch (error) {
        logger.error('Failed to check page health', LogCategory.SYSTEM, {
          url: urlObj.url,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Add error result
        results.push({
          url: urlObj.url,
          http_status: 0,
          response_time_ms: 0,
          content_length: 0,
          page_title: '',
          is_accessible: false,
          error_type: 'connection_error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          headers: {},
          redirects: [],
          checked_at: new Date().toISOString()
        });
      } finally {
        await page.close();
      }
    }

    await context.close();
    return results;
  }

  /**
   * Check health of a single page
   */
  private async checkSinglePageHealth(page: Page, url: string): Promise<PageHealthCheck> {
    const startTime = Date.now();
    const redirects: string[] = [];

    try {
      // Listen for redirects
      page.on('response', (response) => {
        const status = response.status();
        if (status >= 300 && status < 400) {
          const location = response.headers()['location'];
          if (location) {
            redirects.push(location);
          }
        }
      });

      // Navigate to page
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      if (!response) {
        throw new Error('No response received');
      }

      const responseTime = Date.now() - startTime;
      const httpStatus = response.status();
      const headers = response.headers();

      // Get page content info
      const pageTitle = await page.title().catch(() => '');
      const metaDescription = await page
        .getAttribute('meta[name="description"]', 'content')
        .catch(() => undefined);

      // Get content length
      const bodyContent = await page.content().catch(() => '');
      const contentLength = Buffer.byteLength(bodyContent, 'utf8');

      const healthCheck: PageHealthCheck = {
        url,
        http_status: httpStatus,
        response_time_ms: responseTime,
        content_length: contentLength,
        page_title: pageTitle,
        meta_description: metaDescription,
        is_accessible: httpStatus >= 200 && httpStatus < 400,
        headers,
        redirects,
        checked_at: new Date().toISOString()
      };

      // Determine error type if status indicates an error
      if (httpStatus >= 400) {
        healthCheck.error_type = 'http_error';
        healthCheck.error_message = `HTTP ${httpStatus} error`;
      }

      return healthCheck;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      let errorType: PageHealthCheck['error_type'] = 'connection_error';
      
      if (errorMessage.includes('timeout')) {
        errorType = 'timeout';
      } else if (errorMessage.includes('DNS')) {
        errorType = 'dns_error';
      } else if (errorMessage.includes('SSL') || errorMessage.includes('certificate')) {
        errorType = 'ssl_error';
      }

      return {
        url,
        http_status: 0,
        response_time_ms: responseTime,
        content_length: 0,
        page_title: '',
        is_accessible: false,
        error_type: errorType,
        error_message: errorMessage,
        headers: {},
        redirects,
        checked_at: new Date().toISOString()
      };
    }
  }

  /**
   * Schedule monitoring for a session
   */
  private async scheduleMonitoring(sessionId: string): Promise<void> {
    const session = this.activeMonitoringSessions.get(sessionId);
    if (!session) return;

    const intervalMs = session.monitoring_config.check_interval_minutes * 60 * 1000;

    const interval = setInterval(async () => {
      try {
        await this.performMonitoringCheck(sessionId);
      } catch (error) {
        logger.error('Scheduled monitoring check failed', LogCategory.SYSTEM, {
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, intervalMs);

    this.monitoringIntervals.set(sessionId, interval);

    // Update next check time
    session.next_check_at = new Date(Date.now() + intervalMs).toISOString();
    await this.updateMonitoringSession(session);
  }

  /**
   * Perform a monitoring check
   */
  private async performMonitoringCheck(sessionId: string): Promise<void> {
    const session = this.activeMonitoringSessions.get(sessionId);
    if (!session) return;

    logger.info('Performing scheduled monitoring check', LogCategory.SYSTEM, { sessionId });

    try {
      // Get URLs from the last sitemap discovery for this session
      const { data: urls } = await supabaseAdmin
        .from('website_discovered_urls')
        .select('*')
        .eq('session_id', sessionId)
        .order('discovered_at', { ascending: false });

      if (!urls || urls.length === 0) {
        logger.warn('No URLs found for monitoring', LogCategory.SYSTEM, { sessionId });
        return;
      }

      // Convert database URLs to SitemapUrl format
      const sitemapUrls: SitemapUrl[] = urls.map(url => ({
        url: url.url,
        discovered_from: 'sitemap',
        depth: 0
      }));

      // Check page health
      const healthChecks = await this.checkPageHealth(sitemapUrls, sessionId);

      // Detect changes
      const changes = await this.detectChanges(sessionId, healthChecks);

      // Update session stats
      session.pages_monitored = healthChecks.length;
      session.pages_with_errors = healthChecks.filter(h => !h.is_accessible).length;
      session.pages_with_changes = changes.length;
      session.last_check_at = new Date().toISOString();
      session.next_check_at = new Date(
        Date.now() + (session.monitoring_config.check_interval_minutes * 60 * 1000)
      ).toISOString();
      session.updated_at = new Date().toISOString();

      await this.updateMonitoringSession(session);

    } catch (error) {
      logger.error('Monitoring check failed', LogCategory.SYSTEM, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Calculate change severity based on HTTP status change
   */
  private calculateChangeSeverity(
    previousStatus: number,
    currentStatus: number
  ): PageChange['severity'] {
    // From working to not working
    if (previousStatus >= 200 && previousStatus < 400 && currentStatus >= 400) {
      return currentStatus >= 500 ? 'critical' : 'high';
    }

    // From not working to working
    if (previousStatus >= 400 && currentStatus >= 200 && currentStatus < 400) {
      return 'medium';
    }

    // Between error statuses
    if (previousStatus >= 400 && currentStatus >= 400) {
      return 'low';
    }

    return 'low';
  }

  /**
   * Calculate if performance change is significant
   */
  private calculatePerformanceChange(
    previousTime: number,
    currentTime: number
  ): { isSignificant: boolean; percentage: number; severity: PageChange['severity'] } {
    const percentageChange = Math.abs((currentTime - previousTime) / previousTime * 100);
    const isSignificant = percentageChange > 50; // More than 50% change

    let severity: PageChange['severity'] = 'low';
    if (percentageChange > 200) {
      severity = 'high';
    } else if (percentageChange > 100) {
      severity = 'medium';
    }

    return {
      isSignificant,
      percentage: Math.round(percentageChange),
      severity
    };
  }

  /**
   * Create alerts for critical changes
   */
  private async createAlertsForChanges(
    sessionId: string,
    changes: PageChange[]
  ): Promise<void> {
    const criticalChanges = changes.filter(c => c.severity === 'critical' || c.severity === 'high');

    for (const change of criticalChanges) {
      const alert: Omit<MonitoringAlert, 'id'> = {
        session_id: sessionId,
        url: change.url,
        alert_type: this.getAlertType(change),
        severity: change.severity,
        title: this.generateAlertTitle(change),
        description: change.description,
        first_detected_at: change.detected_at,
        last_detected_at: change.detected_at,
        status: 'active'
      };

      await this.storeAlert(alert);
    }
  }

  /**
   * Helper methods for database operations
   */
  private async storeMonitoringSession(session: MonitoringSession): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('website_monitoring_sessions')
        .insert(session);

      if (error) {
        logger.error('Failed to store monitoring session', LogCategory.DATABASE, { error });
      }
    } catch (error) {
      logger.error('Failed to store monitoring session', LogCategory.DATABASE, { error });
    }
  }

  private async updateMonitoringSession(session: MonitoringSession): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('website_monitoring_sessions')
        .update(session)
        .eq('id', session.id);

      if (error) {
        logger.error('Failed to update monitoring session', LogCategory.DATABASE, { error });
      }
    } catch (error) {
      logger.error('Failed to update monitoring session', LogCategory.DATABASE, { error });
    }
  }

  private async storeHealthCheck(sessionId: string, healthCheck: PageHealthCheck): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('website_page_health_checks')
        .insert({
          session_id: sessionId,
          ...healthCheck
        });

      if (error) {
        logger.error('Failed to store health check', LogCategory.DATABASE, { error });
      }
    } catch (error) {
      logger.error('Failed to store health check', LogCategory.DATABASE, { error });
    }
  }

  private async storePageChange(sessionId: string, change: PageChange): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('website_page_changes')
        .insert({
          session_id: sessionId,
          url: change.url,
          change_type: change.change_type,
          previous_state: change.previous_state,
          current_state: change.current_state,
          detected_at: change.detected_at,
          severity: change.severity,
          description: change.description
        });

      if (error) {
        logger.error('Failed to store page change', LogCategory.DATABASE, { error });
      }
    } catch (error) {
      logger.error('Failed to store page change', LogCategory.DATABASE, { error });
    }
  }

  private async storeAlert(alert: Omit<MonitoringAlert, 'id'>): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('website_monitoring_alerts')
        .insert(alert);

      if (error) {
        logger.error('Failed to store monitoring alert', LogCategory.DATABASE, { error });
      }
    } catch (error) {
      logger.error('Failed to store monitoring alert', LogCategory.DATABASE, { error });
    }
  }

  private mapDbToHealthCheck(dbRecord: any): PageHealthCheck {
    return {
      url: dbRecord.url,
      http_status: dbRecord.http_status,
      response_time_ms: dbRecord.response_time_ms,
      content_length: dbRecord.content_length,
      page_title: dbRecord.page_title,
      meta_description: dbRecord.meta_description,
      is_accessible: dbRecord.is_accessible,
      error_type: dbRecord.error_type,
      error_message: dbRecord.error_message,
      headers: dbRecord.headers || {},
      redirects: dbRecord.redirects || [],
      checked_at: dbRecord.checked_at
    };
  }

  private getAlertType(change: PageChange): MonitoringAlert['alert_type'] {
    switch (change.change_type) {
      case 'error_status_changed':
        return 'error';
      case 'modified':
        if (change.description.includes('Response time')) {
          return 'performance';
        }
        if (change.description.includes('accessible')) {
          return 'accessibility';
        }
        return 'content_change';
      default:
        return 'error';
    }
  }

  private generateAlertTitle(change: PageChange): string {
    switch (change.change_type) {
      case 'added':
        return 'New page discovered';
      case 'removed':
        return 'Page removed';
      case 'error_status_changed':
        return 'HTTP status changed';
      case 'modified':
        return 'Page modified';
      default:
        return 'Page change detected';
    }
  }

  private generateSessionId(): string {
    return `monitoring_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
