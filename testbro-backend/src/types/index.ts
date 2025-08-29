// Core Types and Interfaces for TestBro.ai Backend

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
  type: 'browser_control' | 'recording' | 'playback' | 'live_preview' | 'screenshot' | 'error';
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

// Error Types
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Pagination Types
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

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
