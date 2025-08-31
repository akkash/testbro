// Core Types and Interfaces for TestBro.ai Backend

// Standardized API Response Format
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: number | null;
  previousPage: number | null;
  // Legacy compatibility
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
}

export interface APIResponse<T> {
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    sortField?: string;
    sortOrder?: string;
    search?: string;
    filters?: Record<string, any>;
    executionTime?: number;
    timestamp?: string;
    // Additional flexible fields
    period?: string;
    limit?: number;
    count?: number;
    fallback?: boolean;
    [key: string]: any;
  };
  error?: string;
}

export interface APIError {
  error: string;
  message: string;
  error_code?: string;
  created_at?: string;
  details?: any;
}

export interface User {
  id: string;
  email: string;
  user_metadata: {
    avatar_url?: string;
    full_name?: string;
    name?: string;
  };
  app_metadata: {
    provider?: string;
    providers?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  settings: {
    max_users: number;
    max_projects: number;
    max_tests_per_month: number;
    features: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'viewer';
  invited_by: string;
  invited_at: string;
  joined_at?: string;
  status: 'pending' | 'active' | 'inactive';
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  owner_id: string;
  settings: {
    default_browser: 'chromium' | 'firefox' | 'webkit';
    timeout_seconds: number;
    retries: number;
    parallel_execution: boolean;
    notifications: {
      email: boolean;
      slack: boolean;
      webhook?: string;
    };
  };
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface TestTarget {
  id: string;
  name: string;
  url: string;
  platform: 'web' | 'mobile-web' | 'mobile-app';
  environment: 'production' | 'staging' | 'development';
  project_id: string;
  auth_config?: {
    type: 'basic' | 'oauth' | 'api-key';
    credentials: Record<string, string>;
  };
  app_file?: {
    name: string;
    size: number;
    type: 'apk' | 'ipa';
    url: string;
    uploaded_at: string;
  };
  created_at: string;
  updated_at: string;
}

export interface TestStep {
  id: string;
  order: number;
  action: 'click' | 'type' | 'navigate' | 'wait' | 'verify' | 'upload' | 'select' | 'scroll';
  element?: string;
  value?: string;
  description: string;
  timeout?: number;
  screenshot?: boolean;
  ai_context?: string;
}

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  suite_id?: string;
  target_id: string;
  steps: TestStep[];
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'active' | 'archived';
  ai_generated: boolean;
  ai_metadata?: {
    prompt: string;
    model: string;
    confidence_score: number;
    generated_at: string;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  test_case_ids: string[];
  target_id: string;
  execution_config: {
    parallel: boolean;
    max_concurrent: number;
    fail_fast: boolean;
    retry_failed: boolean;
    retry_count: number;
  };
  schedule?: {
    enabled: boolean;
    cron_expression: string;
    timezone: string;
  };
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TestExecution {
  id: string;
  test_case_id?: string;
  suite_id?: string;
  project_id: string;
  target_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  browser: 'chromium' | 'firefox' | 'webkit';
  device?: string;
  environment: string;
  results?: TestResult[];
  metrics?: ExecutionMetrics;
  error_message?: string;
  initiated_by: string;
  worker_id?: string;
  logs?: ExecutionLog[];
  scheduled_for?: string;
}

export interface TestResult {
  step_id: string;
  step_order: number;
  status: 'passed' | 'failed' | 'skipped';
  duration_seconds: number;
  error_message?: string;
  screenshot_url?: string;
  logs: ExecutionLog[];
  timestamp: string;
}

export interface ExecutionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  step_id?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionMetrics {
  page_load_time: number;
  total_requests: number;
  failed_requests: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
  network_transfer_mb: number;
  screenshot_count: number;
  video_duration_seconds?: number;
}

// Real-time Browser Control Types
export interface BrowserSession {
  id: string;
  project_id: string;
  target_id: string;
  browser_type: 'chromium' | 'firefox' | 'webkit';
  viewport: {
    width: number;
    height: number;
  };
  status: 'active' | 'recording' | 'paused' | 'closed';
  url: string;
  user_id: string;
  created_at: string;
  last_activity: string;
  recording_session_id?: string;
}

// Action Recording Types
export interface RecordedAction {
  id: string;
  session_id: string;
  order: number;
  timestamp: string;
  action_type: 'click' | 'type' | 'scroll' | 'hover' | 'keypress' | 'navigate' | 'wait' | 'select' | 'upload' | 'drag' | 'drop';
  element: {
    selector: string;
    xpath: string;
    text_content?: string;
    tag_name: string;
    attributes: Record<string, string>;
    bounding_box?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  value?: string;
  coordinates?: {
    x: number;
    y: number;
  };
  modifiers?: string[];
  screenshot_before?: string;
  screenshot_after?: string;
  page_url: string;
  viewport_size: {
    width: number;
    height: number;
  };
}

export interface RecordingSession {
  id: string;
  name: string;
  description?: string;
  browser_session_id: string;
  project_id: string;
  target_id: string;
  user_id: string;
  status: 'recording' | 'paused' | 'completed' | 'cancelled';
  actions: RecordedAction[];
  start_url: string;
  total_duration_ms: number;
  created_at: string;
  completed_at?: string;
  tags?: string[];
}

// Playback Types
export interface PlaybackSession {
  id: string;
  recording_session_id: string;
  browser_session_id: string;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  current_step: number;
  total_steps: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  playback_speed: number; // 0.5 = half speed, 1 = normal, 2 = double speed
  step_results: PlaybackStepResult[];
  screenshots: string[];
  user_id: string;
  created_at: string;
}

export interface PlaybackStepResult {
  action_id: string;
  step_order: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  duration_ms: number;
  error_message?: string;
  screenshot_url?: string;
  timestamp: string;
  element_found: boolean;
  actual_coordinates?: {
    x: number;
    y: number;
  };
}

// Live Preview Types
export interface LivePreviewState {
  session_id: string;
  current_url: string;
  page_title: string;
  screenshot_url?: string;
  dom_elements: DOMElement[];
  console_logs: ConsoleLog[];
  network_activity: NetworkRequest[];
  timestamp: string;
}

export interface DOMElement {
  selector: string;
  xpath: string;
  tag_name: string;
  text_content?: string;
  attributes: Record<string, string>;
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  is_visible: boolean;
  is_clickable: boolean;
}

export interface ConsoleLog {
  timestamp: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  args?: any[];
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status?: number;
  response_time_ms?: number;
  request_size?: number;
  response_size?: number;
  timestamp: string;
  headers?: Record<string, string>;
}

// WebSocket Event Types
export interface WebSocketEvent {
  type: 'browser_control' | 'recording' | 'playback' | 'live_preview' | 'screenshot' | 'error' | 'domain_crawl';
  session_id: string;
  timestamp: string;
  data: any;
}

export interface BrowserControlEvent extends WebSocketEvent {
  type: 'browser_control';
  data: {
    action: 'navigate' | 'click' | 'type' | 'scroll' | 'reload' | 'back' | 'forward' | 'pause' | 'resume';
    parameters?: Record<string, any>;
  };
}

export interface RecordingEvent extends WebSocketEvent {
  type: 'recording';
  data: {
    action: 'start' | 'pause' | 'resume' | 'stop' | 'action_recorded';
    recording_session?: RecordingSession;
    recorded_action?: RecordedAction;
  };
}

export interface PlaybackEvent extends WebSocketEvent {
  type: 'playback';
  data: {
    action: 'start' | 'pause' | 'resume' | 'stop' | 'step_completed' | 'step_failed';
    playback_session?: PlaybackSession;
    step_result?: PlaybackStepResult;
  };
}

export interface LivePreviewEvent extends WebSocketEvent {
  type: 'live_preview';
  data: LivePreviewState;
}

export interface ScreenshotEvent extends WebSocketEvent {
  type: 'screenshot';
  data: {
    screenshot_url: string;
    action_id?: string;
    step_order?: number;
  };
}

// Code Generation Types
export interface GeneratedPlaywrightTest {
  id: string;
  recording_session_id: string;
  name: string;
  description?: string;
  test_code: string;
  test_framework: 'playwright' | 'playwright-test';
  language: 'javascript' | 'typescript' | 'python' | 'java' | 'csharp';
  imports: string[];
  setup_code?: string;
  teardown_code?: string;
  generated_at: string;
  user_id: string;
}

// Browser Control Commands
export interface BrowserCommand {
  id: string;
  session_id: string;
  command_type: 'navigate' | 'click' | 'type' | 'scroll' | 'wait' | 'screenshot' | 'evaluate';
  parameters: Record<string, any>;
  timestamp: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
  error_message?: string;
  execution_time_ms?: number;
}

export interface AIInsight {
  id: string;
  execution_id: string;
  type: 'ux' | 'performance' | 'accessibility' | 'security' | 'functional';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  element?: string;
  suggestion: string;
  confidence_score: number;
  created_at: string;
}

export interface UxScore {
  execution_id: string;
  overall_score: number; // 0-100
  dimensions: {
    clarity: number;
    accessibility: number;
    performance: number;
    consistency: number;
    error_handling: number;
  };
  critical_issues: string[];
  recommendations: string[];
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'execution_complete' | 'execution_failed' | 'ai_insight' | 'team_invite';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  read: boolean;
  created_at: string;
}

// API Request/Response Types
export interface CreateProjectRequest {
  name: string;
  description?: string;
  organization_id?: string;
  settings?: Partial<Project['settings']>;
  tags?: string[];
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  settings?: Partial<Project['settings']>;
  tags?: string[];
}

export interface CreateTestCaseRequest {
  name: string;
  description?: string;
  project_id: string;
  suite_id?: string;
  target_id: string;
  steps: Omit<TestStep, 'id'>[];
  tags?: string[];
  priority?: TestCase['priority'];
}

export interface ExecuteTestRequest {
  test_case_id?: string;
  suite_id?: string;
  target_id: string;
  browser?: TestExecution['browser'];
  environment?: string;
  parallel?: boolean;
}

export interface AIGenerateTestRequest {
  prompt: string;
  target_url: string;
  project_id: string;
  target_id: string;
  model?: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3';
}

// Test Execution WebSocket Events
export interface TestExecutionEvent {
  type: 'execution_start' | 'execution_progress' | 'execution_complete' | 'step_start' | 'step_complete' | 'error' | 'log';
  execution_id: string;
  data: any;
  timestamp: string;
}

// Job Queue Types
export interface TestExecutionJob {
  id: string;
  execution_id: string;
  test_case: TestCase;
  target: TestTarget;
  config: ExecuteTestRequest;
  metadata: {
    user_id: string;
    project_id: string;
    started_at: string;
  };
}

// Error Types (removed duplicate)

// Pagination Types (removed duplicate)

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// Filter and Search Types
export interface TestCaseFilters {
  project_id?: string;
  suite_id?: string;
  target_id?: string;
  status?: TestCase['status'];
  priority?: TestCase['priority'];
  ai_generated?: boolean;
  tags?: string[];
  search?: string;
}

export interface ExecutionFilters {
  project_id?: string;
  target_id?: string;
  status?: TestExecution['status'];
  browser?: TestExecution['browser'];
  environment?: string;
  initiated_by?: string;
  date_from?: string;
  date_to?: string;
}

// Analytics Types
export interface DashboardMetrics {
  total_tests: number;
  active_tests: number;
  total_executions: number;
  success_rate: number;
  avg_execution_time: number;
  failure_rate: number;
  ai_insights_count: number;
  team_members: number;
}

export interface TrendData {
  date: string;
  executions: number;
  passed: number;
  failed: number;
  avg_duration: number;
  ai_insights: number;
}

// Domain-Wide Visual Testing Types
export interface DomainCrawlSession {
  id: string;
  project_id: string;
  target_id: string;
  name: string;
  seed_url: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  crawler_config: {
    max_depth?: number;
    max_pages?: number;
    respect_robots_txt?: boolean;
    concurrent_crawlers?: number;
    page_timeout?: number;
    delay_between_requests?: number;
    exclude_patterns?: string[];
    include_patterns?: string[];
    follow_external_links?: boolean;
    crawl_javascript_pages?: boolean;
  };
  visual_ai_config: {
    enabled?: boolean;
    checkpoint_types?: ('full_page' | 'viewport' | 'mobile' | 'tablet')[];
    ai_confidence_threshold?: number;
    comparison_threshold?: number;
    auto_create_baselines?: boolean;
    element_detection?: boolean;
    screenshot_format?: 'png' | 'jpeg' | 'webp';
    screenshot_quality?: number;
  };
  pages_discovered: number;
  pages_crawled: number;
  pages_with_visuals: number;
  total_visual_checkpoints: number;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  error_message?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DomainCrawlPage {
  id: string;
  session_id: string;
  url: string;
  title?: string;
  description?: string;
  page_type?: 'homepage' | 'category' | 'product' | 'article' | 'contact' | 'about' | 'other';
  depth: number;
  parent_url?: string;
  discovered_at: string;
  crawled_at?: string;
  status: 'discovered' | 'crawling' | 'crawled' | 'failed' | 'skipped';
  http_status_code?: number;
  error_message?: string;
  load_time_ms?: number;
  page_size_bytes?: number;
  resource_count?: number;
  meta_tags?: Record<string, string>;
  headings?: {
    h1?: string[];
    h2?: string[];
    h3?: string[];
    h4?: string[];
    h5?: string[];
    h6?: string[];
  };
  images_count?: number;
  links_count?: number;
  created_at: string;
  updated_at: string;
}

export interface VisualCheckpoint {
  id: string;
  session_id: string;
  page_id: string;
  checkpoint_name: string;
  checkpoint_type: 'full_page' | 'element' | 'viewport' | 'mobile' | 'tablet';
  element_selector?: string;
  screenshot_url?: string;
  screenshot_hash?: string;
  baseline_screenshot_url?: string;
  ai_detected_elements?: {
    buttons?: Array<{
      selector: string;
      text: string;
      confidence: number;
    }>;
    forms?: Array<{
      selector: string;
      type: string;
      confidence: number;
    }>;
    navigation?: Array<{
      selector: string;
      text: string;
      confidence: number;
    }>;
    content_areas?: Array<{
      selector: string;
      type: string;
      confidence: number;
    }>;
  };
  ai_confidence_score?: number;
  ai_suggestions?: string[];
  comparison_status: 'baseline' | 'passed' | 'failed' | 'review_needed';
  visual_differences?: {
    changed_pixels?: number;
    total_pixels?: number;
    difference_regions?: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      severity: 'minor' | 'major' | 'critical';
    }>;
  };
  difference_percentage?: number;
  viewport_width: number;
  viewport_height: number;
  device_scale_factor: number;
  captured_at: string;
  compared_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VisualBaseline {
  id: string;
  project_id: string;
  url_pattern: string;
  checkpoint_type: 'full_page' | 'element' | 'viewport' | 'mobile' | 'tablet';
  element_selector?: string;
  baseline_screenshot_url: string;
  screenshot_hash: string;
  viewport_width: number;
  viewport_height: number;
  device_scale_factor: number;
  is_active: boolean;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DomainCrawlQueue {
  id: string;
  session_id: string;
  url: string;
  depth: number;
  priority: number;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'skipped';
  attempts: number;
  max_attempts: number;
  queued_at: string;
  started_at?: string;
  completed_at?: string;
  next_attempt_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// Domain Testing API Request Types
export interface CreateDomainCrawlRequest {
  name: string;
  seed_url: string;
  project_id: string;
  target_id: string;
  crawler_config?: DomainCrawlSession['crawler_config'];
  visual_ai_config?: DomainCrawlSession['visual_ai_config'];
}

export interface DomainCrawlProgress {
  session_id: string;
  status: DomainCrawlSession['status'];
  total_pages: number;
  crawled_pages: number;
  failed_pages: number;
  progress_percentage: number;
  current_url?: string;
  estimated_completion?: string;
  pages_per_minute?: number;
  total_checkpoints: number;
  passed_checkpoints: number;
  failed_checkpoints: number;
  review_needed: number;
  baseline_checkpoints: number;
}

export interface VisualComparisonRequest {
  checkpoint_id: string;
  action: 'approve_baseline' | 'reject_baseline' | 'update_baseline' | 'ignore_differences';
  comments?: string;
}

export interface DomainTestResults {
  session: DomainCrawlSession;
  pages: DomainCrawlPage[];
  checkpoints: VisualCheckpoint[];
  summary: {
    total_pages_crawled: number;
    total_checkpoints: number;
    visual_issues_found: number;
    coverage_percentage: number;
    avg_page_load_time: number;
    most_common_issues: string[];
    page_types_discovered: Record<string, number>;
  };
}

// Domain Testing WebSocket Events
export interface DomainCrawlEvent extends WebSocketEvent {
  type: 'domain_crawl';
  data: {
    action: 'session_started' | 'page_discovered' | 'page_crawled' | 'checkpoint_created' | 'session_completed' | 'session_failed';
    session_id: string;
    progress?: DomainCrawlProgress;
    page?: DomainCrawlPage;
    checkpoint?: VisualCheckpoint;
    error?: string;
  };
}

// Visual AI Analysis Types
export interface VisualAIAnalysis {
  checkpoint_id: string;
  detected_elements: {
    interactive_elements: Array<{
      type: 'button' | 'link' | 'input' | 'select' | 'textarea';
      selector: string;
      text?: string;
      confidence: number;
      suggested_test: string;
    }>;
    layout_sections: Array<{
      type: 'header' | 'footer' | 'navigation' | 'sidebar' | 'main' | 'article';
      selector: string;
      confidence: number;
    }>;
    potential_issues: Array<{
      type: 'accessibility' | 'usability' | 'performance' | 'visual';
      severity: 'low' | 'medium' | 'high';
      description: string;
      element?: string;
      suggestion: string;
    }>;
  };
  visual_metrics: {
    color_contrast_issues: number;
    missing_alt_texts: number;
    broken_images: number;
    layout_shifts: number;
    text_readability_score: number;
  };
  test_suggestions: Array<{
    type: 'functional' | 'visual' | 'performance' | 'accessibility';
    priority: 'high' | 'medium' | 'low';
    description: string;
    automated_test_code?: string;
  }>;
}

// Standardized WebSocket Event Structure
export interface StandardWebSocketEvent {
  type: 'execution_start' | 'execution_progress' | 'execution_complete' | 'execution_failed' | 
        'step_start' | 'step_complete' | 'step_failed' | 'error' | 'log' | 
        'browser_control' | 'recording' | 'playback' | 'live_preview' | 'screenshot' |
        'domain_crawl' | 'visual_checkpoint' | 'no_code_recording' | 'element_identified' | 'step_generated' |
        'system_message' | 'user_event' | 'broadcast_event';
  execution_id?: string;
  session_id?: string;
  step_id?: string;
  user_id?: string;
  data: any;
  timestamp: string;
  metadata?: {
    source?: string;
    version?: string;
    correlation_id?: string;
    retry_count?: number;
    target?: string;
    [key: string]: any;
  };
}

// =====================================================
// No-Code Testing Types
// =====================================================

export interface NoCodeTestStep {
  id: string;
  recording_id?: string;
  test_case_id?: string;
  order_index: number;
  natural_language: string; // "Click the Login button"
  action_type: 'click' | 'type' | 'verify' | 'navigate' | 'wait' | 'select' | 'scroll' | 'hover';
  element_description: string; // "Login button" instead of CSS selector
  element_selector: string; // Auto-generated technical selector
  element_alternatives: string[]; // Alternative selectors
  value?: string;
  confidence_score: number; // AI confidence in element identification (0-1)
  user_verified: boolean;
  screenshot_before?: string; // Base64 encoded screenshot
  screenshot_after?: string;  // Base64 encoded screenshot
  ai_metadata?: {
    element_recognition_confidence: number;
    language_generation_confidence: number;
    suggested_improvements: string[];
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface InteractiveRecording {
  id: string;
  session_id: string;
  project_id: string;
  name: string;
  description?: string;
  status: 'recording' | 'paused' | 'completed' | 'failed' | 'cancelled';
  auto_generate_steps: boolean;
  real_time_preview: boolean;
  steps_count: number;
  duration_seconds: number;
  current_url?: string;
  browser_session_id?: string;
  settings: {
    capture_screenshots?: boolean;
    include_hover_events?: boolean;
    debounce_ms?: number;
    element_highlighting?: boolean;
    auto_validation?: boolean;
    [key: string]: any;
  };
  metadata: {
    browser_info?: Record<string, any>;
    device_info?: Record<string, any>;
    [key: string]: any;
  };
  created_by: string;
  created_at: string;
  completed_at?: string;
  updated_at: string;
}

export interface ElementIdentification {
  id: string;
  recording_id?: string;
  element_type: 'button' | 'input' | 'link' | 'text' | 'image' | 'dropdown' | 'checkbox' | 'radio' | 'textarea' | 'select' | 'form' | 'navigation' | 'header' | 'footer' | 'article' | 'section';
  natural_description: string; // "Login button", "Email input field"
  primary_selector: string;
  alternative_selectors: string[];
  confidence_scores: number[];
  visual_context: {
    nearby_text: string[];
    parent_elements: string[];
    child_elements: string[];
    aria_labels: string[];
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  technical_details: {
    tag_name: string;
    attributes: Record<string, string>;
    text_content: string;
    computed_role: string;
    is_interactive: boolean;
    is_visible: boolean;
    [key: string]: any;
  };
  interaction_hints: {
    suggested_actions: string[];
    expected_outcomes: string[];
    common_test_scenarios: string[];
  };
  confidence_metrics: {
    element_recognition: number;
    selector_reliability: number;
    interaction_prediction: number;
    overall: number;
  };
  coordinates?: {
    x: number;
    y: number;
  };
  screenshot_region?: string; // Base64 encoded element screenshot
  page_url?: string;
  page_context?: {
    title: string;
    url: string;
    viewport: { width: number; height: number };
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface ConversationalTestSession {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  conversation_history: ConversationMessage[];
  generated_steps: NoCodeTestStep[];
  current_context: {
    target_url?: string;
    user_intent?: string;
    workflow_type?: string;
    [key: string]: any;
  };
  status: 'active' | 'completed' | 'paused' | 'archived';
  ai_model: string; // 'gpt-4', 'gpt-3.5-turbo', etc.
  session_settings: {
    auto_generate_steps: boolean;
    validate_steps: boolean;
    suggest_improvements: boolean;
    [key: string]: any;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface ConversationMessage {
  id: string;
  session_id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    intent?: string;
    confidence?: number;
    generated_steps?: string[];
    suggestions?: string[];
    [key: string]: any;
  };
  timestamp: string;
}

export interface TestTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  template_steps: Array<{
    order: number;
    action: string;
    description: string;
    element: string;
    value?: string;
    [key: string]: any;
  }>;
  tags: string[];
  usage_count: number;
  is_public: boolean;
  created_by?: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserOnboardingProgress {
  id: string;
  user_id: string;
  onboarding_type: 'no_code_recorder' | 'visual_builder' | 'conversational_ai' | 'general';
  current_step: number;
  completed_steps: number[];
  skipped_steps: number[];
  total_steps: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  preferences: {
    skip_animations?: boolean;
    show_tooltips?: boolean;
    auto_advance?: boolean;
    [key: string]: any;
  };
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}

export interface AILearningData {
  id: string;
  data_type: 'element_identification' | 'step_generation' | 'natural_language' | 'selector_validation';
  input_data: Record<string, any>;
  expected_output: Record<string, any>;
  actual_output?: Record<string, any>;
  user_feedback?: {
    rating?: number; // 1-5
    comments?: string;
    corrections?: Record<string, any>;
    [key: string]: any;
  };
  confidence_score?: number;
  validation_status: 'pending' | 'validated' | 'rejected' | 'improved';
  model_version?: string;
  created_at: string;
  validated_at?: string;
  validated_by?: string;
}

// No-Code API Request/Response Types
export interface CreateInteractiveRecordingRequest {
  session_id: string;
  project_id: string;
  name: string;
  description?: string;
  auto_generate_steps?: boolean;
  real_time_preview?: boolean;
  settings?: InteractiveRecording['settings'];
}

export interface UpdateNoCodeStepRequest {
  natural_language?: string;
  element_description?: string;
  element_selector?: string;
  value?: string;
  user_verified?: boolean;
}

export interface ElementIdentificationRequest {
  page_url: string;
  click_coordinates: { x: number; y: number };
  page_html?: string;
  context?: {
    user_intent?: string;
    interaction_history?: Array<{
      action: string;
      element: string;
      timestamp: string;
    }>;
  };
}

export interface ConversationalTestRequest {
  project_id: string;
  message: string;
  session_id?: string;
  context?: {
    target_url?: string;
    user_intent?: string;
    [key: string]: any;
  };
}

export interface GenerateTestFromConversationRequest {
  session_id: string;
  test_name: string;
  test_description?: string;
  target_id: string;
}

// No-Code WebSocket Events
export interface NoCodeRecordingEvent extends WebSocketEvent {
  type: 'no_code_recording';
  data: {
    action: 'recording_started' | 'step_generated' | 'step_verified' | 'recording_completed' | 'recording_failed';
    recording_id: string;
    step?: NoCodeTestStep;
    recording?: InteractiveRecording;
    error?: string;
  };
}

export interface ElementIdentifiedEvent extends WebSocketEvent {
  type: 'element_identified';
  data: {
    element: ElementIdentification;
    confidence: number;
    suggestions?: string[];
  };
}

export interface StepGeneratedEvent extends WebSocketEvent {
  type: 'step_generated';
  data: {
    step: NoCodeTestStep;
    recording_id: string;
    auto_generated: boolean;
    requires_verification: boolean;
  };
}

// Analytics and Metrics Types for No-Code
export interface NoCodeUsageMetrics {
  total_recordings: number;
  completed_recordings: number;
  avg_steps_per_recording: number;
  avg_recording_duration: number;
  step_verification_rate: number;
  element_identification_accuracy: number;
  most_used_actions: Array<{
    action_type: string;
    count: number;
    success_rate: number;
  }>;
  template_usage: Array<{
    template_id: string;
    template_name: string;
    usage_count: number;
  }>;
}

export interface StepValidationResult {
  valid: boolean;
  confidence_score: number;
  issues: Array<{
    type: 'warning' | 'error';
    message: string;
    suggestion: string;
  }>;
  suggested_fixes: NoCodeTestStep[];
}

export interface ElementSuggestion {
  element: ElementIdentification;
  relevance_score: number;
  reasoning: string;
  suggested_interaction: string;
}

export interface StepPreview {
  step: NoCodeTestStep;
  execution_preview: {
    can_execute: boolean;
    estimated_success_rate: number;
    potential_issues: string[];
    suggested_improvements: string[];
  };
  visual_preview?: {
    highlighted_element: string;
    screenshot_url: string;
  };
} 
        'step_start' | 'step_complete' | 'step_failed' | 'error' | 'log' | 
        'browser_control' | 'recording' | 'playback' | 'live_preview' | 'screenshot' |
        'domain_crawl' | 'visual_checkpoint' | 'healing_progress' | 'healing_completed' | 'element_changed' |
        'system_message' | 'user_event' | 'broadcast_event';
  execution_id?: string;
  session_id?: string;
  step_id?: string;
  user_id?: string;
  data: any;
  timestamp: string;
  metadata?: {
    source?: string;
    version?: string;
    correlation_id?: string;
    retry_count?: number;
    target?: string;
    [key: string]: any;
  };
}

// =====================================================
// Self-Healing Test Maintenance Types
// =====================================================

export interface HealingSession {
  id: string;
  test_case_id: string;
  execution_id: string;
  trigger_type: 'failure_detection' | 'scheduled_check' | 'manual_trigger';
  status: 'pending' | 'analyzing' | 'healing' | 'validating' | 'completed' | 'failed' | 'requires_review';
  failure_details: {
    failed_step_id: string;
    failure_type: 'element_not_found' | 'timeout' | 'assertion_failed' | 'interaction_failed';
    original_selector: string;
    error_message: string;
    screenshot_url?: string;
    page_url: string;
    failure_timestamp: string;
  };
  healing_attempts: HealingAttempt[];
  final_resolution?: {
    resolution_type: 'auto_healed' | 'manual_review_required' | 'test_deprecated';
    updated_selectors: SelectorUpdate[];
    confidence_score: number;
    validation_results: ValidationResult[];
  };
  metadata: {
    healing_duration_ms: number;
    ai_confidence_scores: Record<string, number>;
    fallback_strategies_used: string[];
    review_priority: 'low' | 'medium' | 'high' | 'critical';
  };
  created_at: string;
  completed_at?: string;
  created_by?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface HealingAttempt {
  id: string;
  session_id: string;
  attempt_number: number;
  strategy_used: 'semantic_matching' | 'visual_recognition' | 'context_analysis' | 'ml_prediction' | 'fallback_search';
  proposed_changes: SelectorUpdate[];
  confidence_score: number;
  validation_result?: {
    success: boolean;
    execution_time_ms: number;
    error_message?: string;
    screenshot_comparison?: {
      similarity_score: number;
      diff_regions: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        significance: 'minor' | 'major' | 'critical';
      }>;
    };
  };
  ai_reasoning: {
    analysis_summary: string;
    confidence_factors: Array<{
      factor: string;
      weight: number;
      reasoning: string;
    }>;
    alternative_strategies: string[];
  };
  created_at: string;
  execution_time_ms: number;
}

export interface SelectorUpdate {
  step_id: string;
  original_selector: string;
  new_selector: string;
  selector_type: 'css' | 'xpath' | 'text' | 'aria' | 'data_attribute' | 'hybrid';
  confidence_score: number;
  change_reasoning: string;
  element_context: {
    tag_name: string;
    attributes: Record<string, string>;
    text_content?: string;
    parent_selectors: string[];
    sibling_context: string[];
  };
  semantic_preservation: {
    intent_maintained: boolean;
    functionality_preserved: boolean;
    accessibility_impact: 'none' | 'minimal' | 'moderate' | 'significant';
  };
  backup_selectors: string[];
}

export interface UIChangeDetection {
  id: string;
  page_url: string;
  detection_timestamp: string;
  change_type: 'element_removed' | 'element_moved' | 'element_modified' | 'layout_change' | 'content_change';
  affected_elements: Array<{
    original_selector: string;
    element_description: string;
    change_severity: 'low' | 'medium' | 'high' | 'breaking';
    impact_analysis: {
      affected_tests: string[];
      business_impact: 'minimal' | 'moderate' | 'significant' | 'critical';
      estimated_healing_complexity: 'simple' | 'moderate' | 'complex' | 'manual_required';
    };
  }>;
  page_diff: {
    dom_changes: number;
    visual_changes: number;
    structural_changes: number;
    semantic_similarity_score: number;
  };
  healing_recommendations: Array<{
    strategy: string;
    confidence: number;
    estimated_success_rate: number;
    complexity_score: number;
  }>;
  auto_healing_eligible: boolean;
  created_at: string;
}

export interface ElementSemanticProfile {
  id: string;
  element_id: string;
  test_step_id: string;
  semantic_markers: {
    purpose: 'navigation' | 'input' | 'action' | 'content' | 'validation';
    business_function: string;
    user_interaction_type: 'click' | 'type' | 'select' | 'hover' | 'verify';
    accessibility_role: string;
    visual_prominence: 'primary' | 'secondary' | 'tertiary';
  };
  stability_metrics: {
    selector_history: Array<{
      selector: string;
      valid_from: string;
      valid_until?: string;
      stability_score: number;
    }>;
    change_frequency: number;
    last_verified: string;
  };
  contextual_relationships: {
    parent_elements: string[];
    sibling_elements: string[];
    dependent_elements: string[];
    related_test_steps: string[];
  };
  ml_features: {
    visual_fingerprint: string;
    content_hash: string;
    position_signature: string;
    interaction_patterns: Record<string, number>;
  };
  created_at: string;
  updated_at: string;
}

export interface HealingStrategy {
  name: string;
  priority: number;
  applicability_conditions: Array<{
    condition_type: 'failure_type' | 'element_type' | 'change_type' | 'confidence_threshold';
    condition_value: string | number;
    operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'matches';
  }>;
  execution_steps: Array<{
    step_type: 'analyze' | 'search' | 'validate' | 'update';
    implementation: string;
    timeout_ms: number;
    retry_count: number;
  }>;
  success_criteria: {
    minimum_confidence: number;
    validation_required: boolean;
    manual_review_threshold: number;
  };
  fallback_strategies: string[];
}

export interface HealingConfiguration {
  id: string;
  organization_id?: string;
  project_id?: string;
  enabled: boolean;
  auto_healing_enabled: boolean;
  confidence_thresholds: {
    auto_apply: number; // 0.9 - Apply changes automatically
    suggest_review: number; // 0.7 - Suggest for manual review
    attempt_healing: number; // 0.5 - Attempt healing
    min_viable: number; // 0.3 - Minimum to consider
  };
  healing_strategies: {
    enabled_strategies: string[];
    strategy_priorities: Record<string, number>;
    max_attempts_per_strategy: number;
    total_max_attempts: number;
  };
  validation_settings: {
    require_screenshot_comparison: boolean;
    similarity_threshold: number;
    execute_full_test_validation: boolean;
    parallel_validation: boolean;
  };
  notification_settings: {
    notify_on_auto_heal: boolean;
    notify_on_manual_review: boolean;
    notify_on_healing_failure: boolean;
    notification_channels: ('email' | 'slack' | 'webhook')[];
  };
  performance_limits: {
    max_healing_time_minutes: number;
    max_concurrent_healing_sessions: number;
    healing_cooldown_minutes: number;
  };
  created_at: string;
  updated_at: string;
}

export interface HealingMetrics {
  organization_id?: string;
  project_id?: string;
  time_period: {
    start_date: string;
    end_date: string;
  };
  healing_statistics: {
    total_healing_sessions: number;
    successful_auto_heals: number;
    manual_reviews_required: number;
    healing_failures: number;
    success_rate: number;
    average_healing_time_minutes: number;
  };
  maintenance_savings: {
    estimated_manual_hours_saved: number;
    tests_automatically_maintained: number;
    developer_productivity_gain: number;
    cost_savings_usd: number;
  };
  failure_patterns: Array<{
    failure_type: string;
    frequency: number;
    auto_heal_success_rate: number;
    common_root_causes: string[];
  }>;
  strategy_effectiveness: Array<{
    strategy_name: string;
    usage_count: number;
    success_rate: number;
    average_confidence: number;
    avg_execution_time_ms: number;
  }>;
  generated_at: string;
}

// Self-Healing API Request/Response Types
export interface TriggerHealingRequest {
  test_case_id: string;
  execution_id?: string;
  failure_details?: {
    failed_step_id: string;
    failure_type: HealingSession['failure_details']['failure_type'];
    error_message: string;
    page_url: string;
  };
  trigger_type: HealingSession['trigger_type'];
  force_healing?: boolean;
}

export interface HealingStatusResponse {
  session: HealingSession;
  current_progress: {
    stage: string;
    progress_percentage: number;
    estimated_completion_minutes?: number;
    current_strategy?: string;
  };
  real_time_updates: {
    websocket_channel: string;
    last_update: string;
  };
}

export interface ReviewHealingRequest {
  session_id: string;
  review_decision: 'approve' | 'reject' | 'modify';
  reviewer_comments?: string;
  modifications?: {
    selector_updates: SelectorUpdate[];
    test_step_changes: Array<{
      step_id: string;
      changes: Record<string, any>;
    }>;
  };
}

// Self-Healing WebSocket Events
export type HealingTrigger = 'failure_detection' | 'scheduled_check' | 'manual_trigger';

export interface HealingProgressEvent extends StandardWebSocketEvent {
  type: 'healing_progress';
  data: {
    session_id: string;
    stage: 'analyzing' | 'searching' | 'validating' | 'updating';
    progress_percentage: number;
    current_strategy?: string;
    estimated_completion?: string;
    intermediate_results?: {
      candidates_found: number;
      confidence_scores: number[];
      validation_status?: string;
    };
  };
}

export interface HealingCompletedEvent extends StandardWebSocketEvent {
  type: 'healing_completed';
  data: {
    session_id: string;
    result: 'success' | 'partial_success' | 'failure' | 'manual_review_required';
    resolution?: HealingSession['final_resolution'];
    next_actions: Array<{
      action_type: 'apply_changes' | 'schedule_review' | 'retry_healing' | 'mark_deprecated';
      action_description: string;
      requires_user_input: boolean;
    }>;
  };
}

export interface ElementChangedEvent extends StandardWebSocketEvent {
  type: 'element_changed';
  data: {
    page_url: string;
    affected_tests: string[];
    change_severity: 'low' | 'medium' | 'high';
    auto_healing_triggered: boolean;
    estimated_impact: {
      tests_affected: number;
      estimated_fix_time_minutes: number;
      business_priority: 'low' | 'medium' | 'high' | 'critical';
    };
  };
}
