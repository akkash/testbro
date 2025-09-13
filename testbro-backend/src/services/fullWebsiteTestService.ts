import { v4 as uuidv4 } from 'uuid';
import { logger, LogCategory } from './loggingService';
import { supabaseAdmin } from '../config/database';
import { WebSocketService } from './websocketService';
import { QueueService } from './queueService';
import { 
  SitemapDiscoveryService, 
  SitemapDiscoveryConfig, 
  SitemapDiscoveryResult 
} from './sitemapDiscoveryService';
import { 
  PageScreenshotService, 
  ScreenshotOptions, 
  PageScreenshotResult,
  ScreenshotComparison 
} from './pageScreenshotService';
import { 
  PageMonitoringService, 
  PageHealthCheck, 
  PageChange,
  MonitoringSession 
} from './pageMonitoringService';

export interface FullWebsiteTestConfig {
  name: string;
  project_id: string;
  target_id: string;
  base_url: string;
  
  // URL Discovery Configuration
  sitemap_discovery: SitemapDiscoveryConfig;
  
  // Screenshot Configuration
  screenshot_options: ScreenshotOptions & {
    enabled: boolean;
    compare_with_baseline: boolean;
    baseline_session_id?: string;
  };
  
  // Pre-flow Configuration
  pre_flow: {
    enabled: boolean;
    steps: PreFlowStep[];
  };
  
  // Monitoring Configuration
  monitoring: {
    enabled: boolean;
    check_interval_minutes: number;
    timeout_seconds: number;
    monitor_404_pages: boolean;
    monitor_load_times: boolean;
    monitor_content_changes: boolean;
    alert_on_errors: boolean;
    load_time_threshold_ms: number;
  };
  
  // General Configuration
  batch_size: number;
  delay_between_requests: number;
  max_concurrent_sessions: number;
  enable_real_time_updates: boolean;
}

export interface PreFlowStep {
  action: 'navigate' | 'click' | 'type' | 'wait' | 'wait_for_selector' | 'accept_cookies' | 'login';
  url?: string;
  selector?: string;
  value?: string;
  duration?: number;
  email_selector?: string;
  password_selector?: string;
  submit_selector?: string;
  credentials?: {
    email: string;
    password: string;
  };
  wait_after?: number;
}

export interface FullWebsiteTestSession {
  id: string;
  project_id: string;
  target_id: string;
  name: string;
  base_url: string;
  status: 'pending' | 'discovering_urls' | 'taking_screenshots' | 'analyzing_changes' | 'monitoring' | 'completed' | 'failed' | 'cancelled';
  config: FullWebsiteTestConfig;
  
  // Progress Tracking
  progress: {
    current_phase: string;
    total_phases: number;
    current_phase_progress: number;
    overall_progress: number;
    estimated_completion?: string;
  };
  
  // Results Summary
  results: {
    urls_discovered: number;
    urls_tested: number;
    screenshots_taken: number;
    changes_detected: number;
    errors_found: number;
    performance_issues: number;
    accessibility_issues: number;
  };
  
  // Metadata
  created_by: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
  
  // Sub-session IDs for tracking
  discovery_session_id?: string;
  screenshot_session_id?: string;
  monitoring_session_id?: string;
}

export interface FullWebsiteTestResults {
  session: FullWebsiteTestSession;
  discovery_results: SitemapDiscoveryResult;
  screenshot_results: PageScreenshotResult[];
  screenshot_comparisons: ScreenshotComparison[];
  health_checks: PageHealthCheck[];
  detected_changes: PageChange[];
  monitoring_session?: MonitoringSession;
  summary: {
    total_pages: number;
    healthy_pages: number;
    error_pages: number;
    new_pages: number;
    removed_pages: number;
    changed_pages: number;
    performance_issues: number;
    critical_issues: number;
    recommendations: string[];
  };
}

export class FullWebsiteTestService {
  private activeTestSessions = new Map<string, FullWebsiteTestSession>();
  
  private sitemapDiscoveryService: SitemapDiscoveryService;
  private screenshotService: PageScreenshotService;
  private monitoringService: PageMonitoringService;
  private wsService: WebSocketService;
  private queueService: QueueService;

  constructor(
    wsService: WebSocketService,
    queueService: QueueService
  ) {
    this.wsService = wsService;
    this.queueService = queueService;
    this.sitemapDiscoveryService = new SitemapDiscoveryService();
    this.screenshotService = new PageScreenshotService();
    this.monitoringService = new PageMonitoringService();
  }

  /**
   * Start a comprehensive full website test
   */
  async startFullWebsiteTest(
    config: FullWebsiteTestConfig,
    userId: string
  ): Promise<FullWebsiteTestSession> {
    const sessionId = uuidv4();
    
    const session: FullWebsiteTestSession = {
      id: sessionId,
      project_id: config.project_id,
      target_id: config.target_id,
      name: config.name,
      base_url: config.base_url,
      status: 'pending',
      config,
      progress: {
        current_phase: 'Initializing',
        total_phases: this.calculateTotalPhases(config),
        current_phase_progress: 0,
        overall_progress: 0
      },
      results: {
        urls_discovered: 0,
        urls_tested: 0,
        screenshots_taken: 0,
        changes_detected: 0,
        errors_found: 0,
        performance_issues: 0,
        accessibility_issues: 0
      },
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Store session in database
    await this.storeTestSession(session);
    
    // Add to active sessions
    this.activeTestSessions.set(sessionId, session);

    // Start the test process asynchronously
    this.executeFullWebsiteTest(sessionId);

    logger.info('Started full website test', LogCategory.SYSTEM, {
      sessionId,
      baseUrl: config.base_url,
      userId
    });

    return session;
  }

  /**
   * Get test session details
   */
  async getTestSession(sessionId: string): Promise<FullWebsiteTestSession | null> {
    // Check active sessions first
    const activeSession = this.activeTestSessions.get(sessionId);
    if (activeSession) {
      return activeSession;
    }

    // Query database
    try {
      const { data, error } = await supabaseAdmin
        .from('full_website_test_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapDbToTestSession(data);
    } catch (error) {
      logger.error('Failed to get test session', LogCategory.DATABASE, { error, sessionId });
      return null;
    }
  }

  /**
   * Get comprehensive test results
   */
  async getTestResults(sessionId: string): Promise<FullWebsiteTestResults | null> {
    const session = await this.getTestSession(sessionId);
    if (!session) {
      return null;
    }

    try {
      // Fetch all related data
      const [
        discoveryResults,
        screenshotResults,
        comparisionResults,
        healthChecks,
        detectedChanges,
        monitoringSession
      ] = await Promise.allSettled([
        this.getDiscoveryResults(sessionId),
        this.getScreenshotResults(sessionId),
        this.getComparisonResults(sessionId),
        this.getHealthCheckResults(sessionId),
        this.getDetectedChanges(sessionId),
        this.getMonitoringSession(session.monitoring_session_id)
      ]);

      const results: FullWebsiteTestResults = {
        session,
        discovery_results: discoveryResults.status === 'fulfilled' ? discoveryResults.value : {
          urls: [],
          sitemaps_found: [],
          errors: [],
          discovery_stats: {
            total_urls: 0,
            sitemap_urls: 0,
            crawled_urls: 0,
            filtered_urls: 0,
            error_urls: 0
          }
        },
        screenshot_results: screenshotResults.status === 'fulfilled' ? screenshotResults.value : [],
        screenshot_comparisons: comparisionResults.status === 'fulfilled' ? comparisionResults.value : [],
        health_checks: healthChecks.status === 'fulfilled' ? healthChecks.value : [],
        detected_changes: detectedChanges.status === 'fulfilled' ? detectedChanges.value : [],
        monitoring_session: monitoringSession.status === 'fulfilled' ? monitoringSession.value : undefined,
        summary: {
          total_pages: 0,
          healthy_pages: 0,
          error_pages: 0,
          new_pages: 0,
          removed_pages: 0,
          changed_pages: 0,
          performance_issues: 0,
          critical_issues: 0,
          recommendations: []
        }
      };

      // Calculate summary
      results.summary = this.calculateSummary(results);

      return results;

    } catch (error) {
      logger.error('Failed to get test results', LogCategory.DATABASE, { error, sessionId });
      return null;
    }
  }

  /**
   * Cancel a running test
   */
  async cancelTest(sessionId: string): Promise<boolean> {
    const session = this.activeTestSessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      // Update status
      session.status = 'cancelled';
      session.updated_at = new Date().toISOString();
      session.completed_at = new Date().toISOString();

      // Update database
      await this.updateTestSession(session);

      // Stop monitoring if active
      if (session.monitoring_session_id) {
        await this.monitoringService.stopMonitoring(session.monitoring_session_id);
      }

      // Remove from active sessions
      this.activeTestSessions.delete(sessionId);

      // Notify via WebSocket
      this.notifyProgress(sessionId, {
        status: 'cancelled',
        message: 'Test cancelled by user'
      });

      logger.info('Full website test cancelled', LogCategory.SYSTEM, { sessionId });
      return true;

    } catch (error) {
      logger.error('Failed to cancel test', LogCategory.SYSTEM, { error, sessionId });
      return false;
    }
  }

  /**
   * Execute the full website test process
   */
  private async executeFullWebsiteTest(sessionId: string): Promise<void> {
    const session = this.activeTestSessions.get(sessionId);
    if (!session) return;

    try {
      session.started_at = new Date().toISOString();
      session.status = 'discovering_urls';
      await this.updateTestSession(session);

      // Phase 1: URL Discovery
      logger.info('Starting URL discovery phase', LogCategory.SYSTEM, { sessionId });
      await this.updatePhase(sessionId, 'Discovering URLs', 1);
      
      const discoveryResults = await this.sitemapDiscoveryService.discoverUrls(
        session.base_url,
        session.config.sitemap_discovery
      );

      session.results.urls_discovered = discoveryResults.urls.length;
      session.discovery_session_id = sessionId; // Use same ID for tracking
      
      // Store discovered URLs
      await this.storeDiscoveredUrls(sessionId, discoveryResults.urls);

      // Phase 2: Screenshots (if enabled)
      if (session.config.screenshot_options.enabled && discoveryResults.urls.length > 0) {
        logger.info('Starting screenshot phase', LogCategory.SYSTEM, { sessionId });
        session.status = 'taking_screenshots';
        await this.updatePhase(sessionId, 'Taking Screenshots', 2);

        const screenshotResults = await this.screenshotService.capturePages({
          urls: discoveryResults.urls.map(u => u.url),
          session_id: sessionId,
          options: session.config.screenshot_options,
          pre_flow_steps: session.config.pre_flow.enabled ? session.config.pre_flow.steps : [],
          batch_size: session.config.batch_size,
          delay_between_screenshots: session.config.delay_between_requests,
          timeout_per_page: session.config.monitoring.timeout_seconds * 1000,
          retry_on_error: true,
          max_retries: 2
        });

        session.results.screenshots_taken = screenshotResults.length;
        session.results.errors_found += screenshotResults.filter(r => r.error).length;

        // Phase 3: Screenshot Comparison (if enabled)
        if (session.config.screenshot_options.compare_with_baseline) {
          logger.info('Starting screenshot comparison phase', LogCategory.SYSTEM, { sessionId });
          await this.updatePhase(sessionId, 'Analyzing Changes', 3);

          const comparisons = await this.screenshotService.compareWithBaselines(
            sessionId,
            screenshotResults.filter(r => !r.error),
            session.config.screenshot_options.baseline_session_id
          );

          session.results.changes_detected = comparisons.filter(c => !c.is_match).length;
        }
      }

      // Phase 4: Health Checks
      logger.info('Starting health check phase', LogCategory.SYSTEM, { sessionId });
      await this.updatePhase(sessionId, 'Checking Page Health', 4);

      const healthChecks = await this.monitoringService.checkPageHealth(
        discoveryResults.urls,
        sessionId
      );

      session.results.urls_tested = healthChecks.length;
      session.results.errors_found += healthChecks.filter(h => !h.is_accessible).length;
      session.results.performance_issues = healthChecks.filter(
        h => h.response_time_ms > session.config.monitoring.load_time_threshold_ms
      ).length;

      // Phase 5: Change Detection
      if (session.config.monitoring.monitor_content_changes) {
        logger.info('Starting change detection phase', LogCategory.SYSTEM, { sessionId });
        await this.updatePhase(sessionId, 'Detecting Changes', 5);

        const changes = await this.monitoringService.detectChanges(sessionId, healthChecks);
        session.results.changes_detected += changes.length;
      }

      // Phase 6: Start Monitoring (if enabled)
      if (session.config.monitoring.enabled) {
        logger.info('Starting monitoring phase', LogCategory.SYSTEM, { sessionId });
        session.status = 'monitoring';
        await this.updatePhase(sessionId, 'Starting Monitoring', 6);

        const monitoringSession = await this.monitoringService.startMonitoring({
          project_id: session.project_id,
          target_id: session.target_id,
          name: `Monitoring: ${session.name}`,
          base_url: session.base_url,
          status: 'running',
          monitoring_config: {
            check_interval_minutes: session.config.monitoring.check_interval_minutes,
            timeout_seconds: session.config.monitoring.timeout_seconds,
            retry_attempts: 3,
            monitor_404_pages: session.config.monitoring.monitor_404_pages,
            monitor_load_times: session.config.monitoring.monitor_load_times,
            monitor_content_changes: session.config.monitoring.monitor_content_changes,
            alert_on_errors: session.config.monitoring.alert_on_errors,
            alert_on_slowness: true,
            load_time_threshold_ms: session.config.monitoring.load_time_threshold_ms
          },
          created_by: session.created_by
        });

        session.monitoring_session_id = monitoringSession.id;
      }

      // Complete the test
      session.status = 'completed';
      session.completed_at = new Date().toISOString();
      session.progress.overall_progress = 100;
      session.progress.current_phase = 'Completed';

      await this.updateTestSession(session);

      // Remove from active sessions if not monitoring
      if (!session.config.monitoring.enabled) {
        this.activeTestSessions.delete(sessionId);
      }

      // Final notification
      this.notifyProgress(sessionId, {
        status: 'completed',
        progress: session.progress,
        results: session.results,
        message: 'Full website test completed successfully'
      });

      logger.info('Full website test completed', LogCategory.SYSTEM, {
        sessionId,
        results: session.results
      });

    } catch (error) {
      logger.error('Full website test failed', LogCategory.SYSTEM, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Update session status
      if (session) {
        session.status = 'failed';
        session.completed_at = new Date().toISOString();
        session.updated_at = new Date().toISOString();
        await this.updateTestSession(session);

        // Notify failure
        this.notifyProgress(sessionId, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Remove from active sessions
        this.activeTestSessions.delete(sessionId);
      }
    }
  }

  /**
   * Update test progress and notify clients
   */
  private async updatePhase(
    sessionId: string,
    phaseName: string,
    phaseNumber: number
  ): Promise<void> {
    const session = this.activeTestSessions.get(sessionId);
    if (!session) return;

    session.progress.current_phase = phaseName;
    session.progress.current_phase_progress = 0;
    session.progress.overall_progress = Math.floor((phaseNumber - 1) / session.progress.total_phases * 100);
    session.updated_at = new Date().toISOString();

    await this.updateTestSession(session);

    // Notify via WebSocket
    this.notifyProgress(sessionId, {
      phase: phaseName,
      progress: session.progress,
      status: session.status
    });
  }

  /**
   * Calculate total number of phases based on configuration
   */
  private calculateTotalPhases(config: FullWebsiteTestConfig): number {
    let phases = 2; // URL Discovery + Health Checks are always included

    if (config.screenshot_options.enabled) {
      phases += 1; // Screenshots
      if (config.screenshot_options.compare_with_baseline) {
        phases += 1; // Comparison
      }
    }

    if (config.monitoring.monitor_content_changes) {
      phases += 1; // Change Detection
    }

    if (config.monitoring.enabled) {
      phases += 1; // Start Monitoring
    }

    return phases;
  }

  /**
   * Calculate comprehensive summary
   */
  private calculateSummary(results: FullWebsiteTestResults): FullWebsiteTestResults['summary'] {
    const totalPages = results.discovery_results.urls.length;
    const healthyPages = results.health_checks.filter(h => h.is_accessible).length;
    const errorPages = results.health_checks.filter(h => !h.is_accessible).length;
    
    const newPages = results.detected_changes.filter(c => c.change_type === 'added').length;
    const removedPages = results.detected_changes.filter(c => c.change_type === 'removed').length;
    const changedPages = results.detected_changes.filter(
      c => c.change_type === 'modified' || c.change_type === 'error_status_changed'
    ).length;
    
    const performanceIssues = results.health_checks.filter(
      h => h.response_time_ms > 3000 // 3 second threshold
    ).length;
    
    const criticalIssues = results.detected_changes.filter(
      c => c.severity === 'critical' || c.severity === 'high'
    ).length;

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (errorPages > 0) {
      recommendations.push(`Fix ${errorPages} pages with HTTP errors`);
    }
    
    if (performanceIssues > 0) {
      recommendations.push(`Optimize ${performanceIssues} slow-loading pages`);
    }
    
    if (criticalIssues > 0) {
      recommendations.push(`Address ${criticalIssues} critical issues immediately`);
    }
    
    if (results.screenshot_comparisons.length > 0) {
      const significantChanges = results.screenshot_comparisons.filter(c => !c.is_match).length;
      if (significantChanges > 0) {
        recommendations.push(`Review ${significantChanges} visual changes detected`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Website is healthy - no critical issues detected');
    }

    return {
      total_pages: totalPages,
      healthy_pages: healthyPages,
      error_pages: errorPages,
      new_pages: newPages,
      removed_pages: removedPages,
      changed_pages: changedPages,
      performance_issues: performanceIssues,
      critical_issues: criticalIssues,
      recommendations
    };
  }

  /**
   * Notify progress via WebSocket
   */
  private notifyProgress(sessionId: string, data: any): void {
    if (this.wsService) {
      this.wsService.broadcast(`session:${sessionId}`, {
        type: 'full_website_test_progress',
        session_id: sessionId,
        data,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Database operations
   */
  private async storeTestSession(session: FullWebsiteTestSession): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('full_website_test_sessions')
        .insert(session);

      if (error) {
        logger.error('Failed to store test session', LogCategory.DATABASE, { error });
      }
    } catch (error) {
      logger.error('Failed to store test session', LogCategory.DATABASE, { error });
    }
  }

  private async updateTestSession(session: FullWebsiteTestSession): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('full_website_test_sessions')
        .update(session)
        .eq('id', session.id);

      if (error) {
        logger.error('Failed to update test session', LogCategory.DATABASE, { error });
      }
    } catch (error) {
      logger.error('Failed to update test session', LogCategory.DATABASE, { error });
    }
  }

  private async storeDiscoveredUrls(sessionId: string, urls: any[]): Promise<void> {
    try {
      const urlRecords = urls.map(url => ({
        session_id: sessionId,
        url: url.url,
        discovered_from: url.discovered_from,
        depth: url.depth,
        lastmod: url.lastmod,
        changefreq: url.changefreq,
        priority: url.priority,
        discovered_at: new Date().toISOString()
      }));

      const { error } = await supabaseAdmin
        .from('website_discovered_urls')
        .insert(urlRecords);

      if (error) {
        logger.error('Failed to store discovered URLs', LogCategory.DATABASE, { error });
      }
    } catch (error) {
      logger.error('Failed to store discovered URLs', LogCategory.DATABASE, { error });
    }
  }

  // Helper methods for fetching results
  private async getDiscoveryResults(sessionId: string): Promise<any> {
    const { data } = await supabaseAdmin
      .from('website_discovered_urls')
      .select('*')
      .eq('session_id', sessionId);
    
    return {
      urls: data || [],
      sitemaps_found: [],
      errors: [],
      discovery_stats: {
        total_urls: data?.length || 0,
        sitemap_urls: data?.filter(u => u.discovered_from === 'sitemap').length || 0,
        crawled_urls: data?.filter(u => u.discovered_from === 'crawling').length || 0,
        filtered_urls: 0,
        error_urls: 0
      }
    };
  }

  private async getScreenshotResults(sessionId: string): Promise<PageScreenshotResult[]> {
    const { data } = await supabaseAdmin
      .from('website_test_screenshots')
      .select('*')
      .eq('session_id', sessionId);
    
    return data?.map(this.mapDbToScreenshotResult) || [];
  }

  private async getComparisonResults(sessionId: string): Promise<ScreenshotComparison[]> {
    const { data } = await supabaseAdmin
      .from('website_test_comparisons')
      .select('*')
      .eq('session_id', sessionId);
    
    return data || [];
  }

  private async getHealthCheckResults(sessionId: string): Promise<PageHealthCheck[]> {
    const { data } = await supabaseAdmin
      .from('website_page_health_checks')
      .select('*')
      .eq('session_id', sessionId);
    
    return data || [];
  }

  private async getDetectedChanges(sessionId: string): Promise<PageChange[]> {
    const { data } = await supabaseAdmin
      .from('website_page_changes')
      .select('*')
      .eq('session_id', sessionId);
    
    return data || [];
  }

  private async getMonitoringSession(sessionId?: string): Promise<MonitoringSession | undefined> {
    if (!sessionId) return undefined;
    
    const { data } = await supabaseAdmin
      .from('website_monitoring_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    return data || undefined;
  }

  private mapDbToTestSession(data: any): FullWebsiteTestSession {
    return {
      id: data.id,
      project_id: data.project_id,
      target_id: data.target_id,
      name: data.name,
      base_url: data.base_url,
      status: data.status,
      config: data.config,
      progress: data.progress,
      results: data.results,
      created_by: data.created_by,
      created_at: data.created_at,
      started_at: data.started_at,
      completed_at: data.completed_at,
      updated_at: data.updated_at,
      discovery_session_id: data.discovery_session_id,
      screenshot_session_id: data.screenshot_session_id,
      monitoring_session_id: data.monitoring_session_id
    };
  }

  private mapDbToScreenshotResult(data: any): PageScreenshotResult {
    return {
      url: data.url,
      screenshot_path: data.screenshot_path,
      thumbnail_path: data.thumbnail_path,
      hash: data.hash,
      file_size: data.file_size,
      dimensions: {
        width: data.width,
        height: data.height
      },
      device_type: data.device_type,
      captured_at: data.captured_at,
      load_time_ms: data.load_time_ms,
      http_status: data.http_status,
      page_title: data.page_title,
      error: data.error_message
    };
  }
}
