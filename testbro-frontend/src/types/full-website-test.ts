// Full Website Test Types

export interface FullWebsiteTestSession {
  id: string;
  project_id: string;
  target_id: string;
  name: string;
  base_url: string;
  status: 'pending' | 'discovering_urls' | 'taking_screenshots' | 
         'analyzing_changes' | 'monitoring' | 'completed' | 'failed' | 'cancelled';
  config: FullWebsiteTestConfig;
  total_urls: number;
  processed_urls: number;
  successful_urls: number;
  failed_urls: number;
  results_summary?: FullWebsiteTestResultsSummary;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  created_by: string;
}

export interface FullWebsiteTestConfig {
  name: string;
  project_id: string;
  target_id: string;
  base_url: string;
  sitemap_discovery: SitemapDiscoveryConfig;
  screenshot_options: ScreenshotConfig;
  pre_flow: PreFlowConfig;
  monitoring: MonitoringConfig;
  batch_size?: number;
  delay_between_requests?: number;
  max_concurrent_sessions?: number;
  enable_real_time_updates?: boolean;
}

export interface SitemapDiscoveryConfig {
  max_depth: number;
  max_urls: number;
  follow_external_links: boolean;
  respect_robots_txt: boolean;
  include_patterns: string[];
  exclude_patterns: string[];
  discover_sitemaps: boolean;
  crawl_internal_links: boolean;
  timeout_ms: number;
}

export interface ScreenshotConfig {
  enabled: boolean;
  fullPage: boolean;
  width: number;
  height: number;
  quality: number;
  format: 'png' | 'jpeg';
  capture_mobile: boolean;
  capture_tablet: boolean;
  compare_with_baseline: boolean;
  baseline_session_id?: string;
}

export interface PreFlowConfig {
  enabled: boolean;
  steps: PreFlowStep[];
}

export interface PreFlowStep {
  action: 'navigate' | 'click' | 'type' | 'wait' | 'accept_cookies' | 'login' | 'custom';
  url?: string;
  selector?: string;
  value?: string;
  timeout?: number;
  credentials?: {
    email?: string;
    password?: string;
    username?: string;
  };
  description?: string;
}

export interface MonitoringConfig {
  enabled: boolean;
  check_interval_minutes: number;
  timeout_seconds: number;
  monitor_404_pages: boolean;
  monitor_load_times: boolean;
  monitor_content_changes: boolean;
  alert_on_errors: boolean;
  load_time_threshold_ms: number;
}

export interface DiscoveredUrl {
  id: string;
  session_id: string;
  url: string;
  normalized_url: string;
  depth: number;
  source: 'sitemap' | 'robots' | 'crawl' | 'manual';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  title?: string;
  description?: string;
  content_type?: string;
  last_modified?: string;
  error_message?: string;
  processing_time_ms?: number;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

export interface PageScreenshot {
  id: string;
  session_id: string;
  url_id: string;
  url: string;
  viewport_type: 'desktop' | 'mobile' | 'tablet';
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  quality: number;
  full_page: boolean;
  file_path: string;
  file_size: number;
  thumbnail_path?: string;
  image_hash?: string;
  baseline_screenshot_id?: string;
  difference_score?: number;
  difference_image_path?: string;
  has_significant_changes?: boolean;
  change_analysis?: ChangeAnalysis;
  created_at: string;
  updated_at: string;
}

export interface ChangeAnalysis {
  pixel_difference_percentage: number;
  structural_changes: StructuralChange[];
  content_changes: ContentChange[];
  style_changes: StyleChange[];
  layout_shifts: LayoutShift[];
  overall_impact_score: number;
}

export interface StructuralChange {
  type: 'added' | 'removed' | 'moved';
  element_type: string;
  selector: string;
  description: string;
  impact_score: number;
}

export interface ContentChange {
  type: 'text_added' | 'text_removed' | 'text_modified' | 'image_changed';
  old_content?: string;
  new_content?: string;
  selector: string;
  description: string;
  impact_score: number;
}

export interface StyleChange {
  property: string;
  old_value?: string;
  new_value?: string;
  selector: string;
  description: string;
  impact_score: number;
}

export interface LayoutShift {
  element_selector: string;
  old_position: { x: number; y: number };
  new_position: { x: number; y: number };
  shift_distance: number;
  impact_score: number;
}

export interface PageHealthCheck {
  id: string;
  session_id: string;
  url_id: string;
  url: string;
  status_code: number;
  response_time_ms: number;
  content_length?: number;
  content_type?: string;
  is_error: boolean;
  error_type?: string;
  error_message?: string;
  dns_lookup_time_ms?: number;
  connect_time_ms?: number;
  ssl_time_ms?: number;
  first_byte_time_ms?: number;
  download_time_ms?: number;
  has_forms?: boolean;
  has_images?: boolean;
  has_videos?: boolean;
  has_external_links?: boolean;
  previous_check_id?: string;
  status_changed?: boolean;
  response_time_changed?: boolean;
  content_changed?: boolean;
  created_at: string;
  checked_at: string;
}

export interface PageChangeDetection {
  id: string;
  session_id: string;
  url_id: string;
  url: string;
  change_type: 'content' | 'structure' | 'style' | 'performance' | 'status';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  old_value?: string;
  new_value?: string;
  change_details?: Record<string, any>;
  element_selector?: string;
  element_text?: string;
  impact_score?: number;
  requires_attention: boolean;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolution_notes?: string;
  created_at: string;
  detected_at: string;
}

export interface FullWebsiteTestAlert {
  id: string;
  session_id: string;
  alert_type: 'error' | 'warning' | 'info' | 'critical';
  title: string;
  message: string;
  url?: string;
  url_id?: string;
  component?: string;
  metadata: Record<string, any>;
  stack_trace?: string;
  status: 'active' | 'resolved' | 'ignored';
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FullWebsiteTestResults {
  session: FullWebsiteTestSession;
  discovered_urls: DiscoveredUrl[];
  screenshots: PageScreenshot[];
  health_checks: PageHealthCheck[];
  change_detections: PageChangeDetection[];
  alerts: FullWebsiteTestAlert[];
  summary: FullWebsiteTestResultsSummary;
}

export interface FullWebsiteTestResultsSummary {
  total_pages_discovered: number;
  total_pages_processed: number;
  total_screenshots_captured: number;
  total_health_checks_performed: number;
  total_changes_detected: number;
  total_alerts_generated: number;
  error_rate_percentage: number;
  average_response_time_ms: number;
  pages_with_errors: number;
  pages_with_changes: number;
  critical_issues_count: number;
  performance_issues_count: number;
  accessibility_issues_count?: number;
  seo_issues_count?: number;
  test_duration_seconds: number;
  overall_health_score: number;
}

export interface FullWebsiteTestTemplate {
  id: string;
  name: string;
  description: string;
  config: Partial<FullWebsiteTestConfig>;
}

// Progress tracking interfaces
export interface TestProgress {
  phase: string;
  current_step: string;
  progress_percentage: number;
  estimated_time_remaining?: number;
  current_url?: string;
  urls_processed: number;
  urls_total: number;
  errors_encountered: number;
  last_update: string;
}

// Real-time update interfaces
export interface WebSocketTestUpdate {
  type: 'progress_update' | 'url_discovered' | 'screenshot_captured' | 
        'change_detected' | 'error_occurred' | 'alert_generated' | 'test_completed';
  session_id: string;
  data: any;
  timestamp: string;
}

// API Response interfaces
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      nextPage?: number;
      previousPage?: number;
    };
    timestamp: string;
  };
}

export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
  };
}

// Filter and search interfaces
export interface SessionFilters {
  project_id?: string;
  status?: FullWebsiteTestSession['status'];
  created_by?: string;
  date_from?: string;
  date_to?: string;
  search_query?: string;
}

export interface SessionListParams extends SessionFilters {
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'status';
  sort_order?: 'asc' | 'desc';
}

// Chart and visualization data interfaces
export interface TestMetricsData {
  response_times: {
    labels: string[];
    data: number[];
  };
  status_codes: {
    labels: string[];
    data: number[];
  };
  error_trends: {
    labels: string[];
    data: number[];
  };
  change_trends: {
    labels: string[];
    data: number[];
  };
}

export interface TestComparisonData {
  baseline_session: FullWebsiteTestSession;
  current_session: FullWebsiteTestSession;
  comparison_metrics: {
    url_changes: {
      added: number;
      removed: number;
      modified: number;
    };
    performance_changes: {
      improved: number;
      degraded: number;
      unchanged: number;
    };
    error_changes: {
      new_errors: number;
      fixed_errors: number;
      persistent_errors: number;
    };
  };
}
