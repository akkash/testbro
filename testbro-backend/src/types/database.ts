// =============================================================================
// TestBro Database Types
// =============================================================================
// Comprehensive TypeScript interfaces for all database tables and related types

// =============================================================================
// Base Types
// =============================================================================

export type UUID = string;
export type Timestamp = string; // ISO 8601 timestamp
export type Json = Record<string, any> | any[] | string | number | boolean | null;

// =============================================================================
// Enum Types
// =============================================================================

export enum OrganizationRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export enum MemberStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended'
}

export enum ProjectStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  SUSPENDED = 'suspended'
}

export enum TestCaseStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  DEPRECATED = 'deprecated'
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

export enum TestResultStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  ERROR = 'error'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed'
}

export enum ApiKeyStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired'
}

// Phase 1 AI Infrastructure Enums
export enum AIRequestType {
  TEST_GENERATION = 'test_generation',
  EXECUTION_ANALYSIS = 'execution_analysis',
  SELECTOR_OPTIMIZATION = 'selector_optimization',
  REQUIREMENT_ANALYSIS = 'requirement_analysis',
  STEP_OPTIMIZATION = 'step_optimization'
}

export enum AIGenerationStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum BrowserType {
  CHROMIUM = 'chromium',
  FIREFOX = 'firefox',
  WEBKIT = 'webkit'
}

export enum BrowserSessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet'
}

export enum VisualTestActionType {
  CLICK = 'click',
  TYPE = 'type',
  NAVIGATE = 'navigate',
  WAIT = 'wait',
  VERIFY = 'verify',
  SELECT = 'select',
  SCROLL = 'scroll',
  HOVER = 'hover',
  UPLOAD = 'upload',
  SCREENSHOT = 'screenshot'
}

export enum VisualTestFlowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived'
}

export enum ScheduleType {
  ONCE = 'once',
  RECURRING = 'recurring',
  CRON = 'cron'
}

export enum ScheduleStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum JobType {
  TEST_EXECUTION = 'test_execution',
  AI_GENERATION = 'ai_generation',
  SCREENSHOT_CAPTURE = 'screenshot_capture',
  SCHEDULED_TEST = 'scheduled_test',
  BULK_OPERATION = 'bulk_operation',
  BROWSER_AUTOMATION = 'browser_automation'
}

export enum JobStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  CANCELLED = 'cancelled'
}

// =============================================================================
// Core Database Tables
// =============================================================================

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website?: string;
  billing_email?: string;
  subscription_plan: string;
  subscription_status: string;
  trial_ends_at?: Timestamp;
  settings: Json;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface OrganizationMember {
  id: UUID;
  organization_id: UUID;
  user_id: UUID;
  role: OrganizationRole;
  status: MemberStatus;
  invited_by?: UUID;
  invited_at?: Timestamp;
  joined_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Project {
  id: UUID;
  organization_id: UUID;
  name: string;
  description?: string;
  status: ProjectStatus;
  created_by: UUID;
  settings: Json;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TestTarget {
  id: UUID;
  project_id: UUID;
  name: string;
  url: string;
  description?: string;
  environment: string;
  auth_config?: Json;
  headers?: Json;
  cookies?: Json;
  viewport_config?: Json;
  performance_thresholds?: Json;
  accessibility_config?: Json;
  created_by: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TestCase {
  id: UUID;
  project_id: UUID;
  target_id: UUID;
  name: string;
  description?: string;
  status: TestCaseStatus;
  test_steps: Json;
  expected_results?: Json;
  tags?: string[];
  priority: number;
  timeout_ms: number;
  retry_count: number;
  created_by: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_executed_at?: Timestamp;
}

export interface TestSuite {
  id: UUID;
  project_id: UUID;
  name: string;
  description?: string;
  test_case_ids: UUID[];
  parallel_execution: boolean;
  timeout_ms: number;
  retry_count: number;
  created_by: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TestExecution {
  id: UUID;
  project_id: UUID;
  test_case_id?: UUID;
  test_suite_id?: UUID;
  target_id: UUID;
  status: ExecutionStatus;
  environment: string;
  browser_config?: Json;
  started_by: UUID;
  execution_metadata?: Json;
  duration_ms?: number;
  resource_usage?: Json;
  created_at: Timestamp;
  started_at?: Timestamp;
  completed_at?: Timestamp;
}

export interface TestResult {
  id: UUID;
  execution_id: UUID;
  test_case_id: UUID;
  status: TestResultStatus;
  error_message?: string;
  stack_trace?: string;
  screenshot_urls?: string[];
  performance_metrics?: Json;
  accessibility_results?: Json;
  step_results?: Json;
  duration_ms?: number;
  created_at: Timestamp;
}

export interface ExecutionLog {
  id: UUID;
  execution_id: UUID;
  level: string;
  message: string;
  timestamp: Timestamp;
  context?: Json;
}

export interface AIInsight {
  id: UUID;
  execution_id: UUID;
  insight_type: string;
  title: string;
  description: string;
  severity: string;
  confidence_score: number;
  suggested_actions?: Json;
  metadata?: Json;
  created_at: Timestamp;
}

export interface UXScore {
  id: UUID;
  execution_id: UUID;
  overall_score: number;
  performance_score: number;
  accessibility_score: number;
  usability_score: number;
  best_practice_score: number;
  detailed_metrics: Json;
  recommendations: Json;
  created_at: Timestamp;
}

export interface Notification {
  id: UUID;
  user_id: UUID;
  type: string;
  title: string;
  message: string;
  status: NotificationStatus;
  metadata?: Json;
  read_at?: Timestamp;
  created_at: Timestamp;
}

export interface Webhook {
  id: UUID;
  project_id: UUID;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: Json;
  active: boolean;
  last_triggered_at?: Timestamp;
  failure_count: number;
  created_by: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface APIKey {
  id: UUID;
  user_id: UUID;
  project_id?: UUID;
  name: string;
  key_hash: string;
  permissions: string[];
  status: ApiKeyStatus;
  last_used_at?: Timestamp;
  expires_at?: Timestamp;
  created_at: Timestamp;
}

export interface AuditLog {
  id: UUID;
  user_id?: UUID;
  organization_id?: UUID;
  project_id?: UUID;
  action: string;
  resource_type: string;
  resource_id?: UUID;
  details: Json;
  ip_address?: string;
  user_agent?: string;
  created_at: Timestamp;
}

export interface ProjectSecret {
  id: UUID;
  project_id: UUID;
  name: string;
  encrypted_value: string;
  description?: string;
  created_by: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ProjectSecretAudit {
  id: UUID;
  project_secret_id: UUID;
  action: string;
  performed_by: UUID;
  ip_address?: string;
  created_at: Timestamp;
}

// =============================================================================
// Phase 1 AI Infrastructure Tables
// =============================================================================

export interface AIGeneration {
  id: UUID;
  user_id: UUID;
  project_id?: UUID;
  target_id?: UUID;
  prompt: string;
  request_type: AIRequestType;
  model_used: string;
  response_content: Json;
  confidence_score?: number;
  tokens_used: number;
  processing_time_ms?: number;
  metadata: Json;
  error_message?: string;
  status: AIGenerationStatus;
  generated_test_case_id?: UUID;
  created_at: Timestamp;
  completed_at: Timestamp;
}

export interface BrowserSession {
  id: UUID;
  user_id: UUID;
  project_id?: UUID;
  test_case_id?: UUID;
  browser_type: BrowserType;
  session_status: BrowserSessionStatus;
  viewport_width: number;
  viewport_height: number;
  device_type: DeviceType;
  user_agent?: string;
  current_url?: string;
  page_title?: string;
  session_data: Json;
  actions_executed: number;
  screenshots_taken: number;
  errors_encountered: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  started_at?: Timestamp;
  completed_at?: Timestamp;
}

export interface VisualTestFlow {
  id: UUID;
  project_id: UUID;
  created_by: UUID;
  name: string;
  description?: string;
  target_url: string;
  browser_settings: Json;
  timeout_ms: number;
  retry_count: number;
  parallel_execution: boolean;
  status: VisualTestFlowStatus;
  version: number;
  total_steps: number;
  ai_generated: boolean;
  ai_prompt?: string;
  tags: string[];
  created_at: Timestamp;
  updated_at: Timestamp;
  last_executed_at?: Timestamp;
}

export interface VisualTestStep {
  id: UUID;
  flow_id: UUID;
  step_order: number;
  action_type: VisualTestActionType;
  element_selector?: string;
  element_description?: string;
  element_position?: Json;
  input_value?: string;
  wait_duration?: number;
  verification_type?: string;
  verification_value?: string;
  screenshot_before: boolean;
  screenshot_after: boolean;
  highlight_element: boolean;
  natural_language_description?: string;
  ai_generated: boolean;
  ai_confidence_score?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TestSchedule {
  id: UUID;
  project_id: UUID;
  created_by: UUID;
  name: string;
  description?: string;
  test_case_ids: UUID[];
  test_suite_ids: UUID[];
  visual_test_flow_ids: UUID[];
  schedule_type: ScheduleType;
  cron_expression?: string;
  timezone: string;
  max_concurrent_tests: number;
  retry_failed_tests: boolean;
  retry_count: number;
  notification_settings: Json;
  status: ScheduleStatus;
  next_execution_at?: Timestamp;
  last_execution_at?: Timestamp;
  execution_count: number;
  success_count: number;
  failure_count: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ScheduledTestExecution {
  id: UUID;
  schedule_id: UUID;
  execution_type: 'manual' | 'scheduled' | 'triggered';
  status: ExecutionStatus;
  tests_total: number;
  tests_completed: number;
  tests_passed: number;
  tests_failed: number;
  execution_results: Json;
  error_message?: string;
  execution_logs: Json[];
  duration_seconds?: number;
  queue_wait_time_seconds?: number;
  created_at: Timestamp;
  started_at?: Timestamp;
  completed_at?: Timestamp;
}

export interface JobQueue {
  id: UUID;
  job_type: JobType;
  job_name: string;
  job_data: Json;
  job_options: Json;
  status: JobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  progress: Json;
  result?: Json;
  error_message?: string;
  stack_trace?: string;
  delay_until?: Timestamp;
  created_by?: UUID;
  processor_id?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  started_at?: Timestamp;
  completed_at?: Timestamp;
}

// =============================================================================
// Composite Types and Relations
// =============================================================================

export interface OrganizationWithMembers extends Organization {
  members: OrganizationMember[];
  member_count: number;
  project_count: number;
}

export interface ProjectWithDetails extends Project {
  organization: Organization;
  created_by_user: {
    id: UUID;
    email: string;
    full_name?: string;
  };
  target_count: number;
  test_case_count: number;
  recent_executions: TestExecution[];
}

export interface TestCaseWithExecution extends TestCase {
  target: TestTarget;
  last_execution?: TestExecution & {
    results: TestResult[];
  };
  execution_history_count: number;
}

export interface TestExecutionWithResults extends TestExecution {
  test_case?: TestCase;
  test_suite?: TestSuite;
  target: TestTarget;
  results: TestResult[];
  logs: ExecutionLog[];
  ai_insights: AIInsight[];
  ux_scores: UXScore[];
}

export interface VisualTestFlowWithSteps extends VisualTestFlow {
  steps: VisualTestStep[];
  project: Pick<Project, 'id' | 'name'>;
  created_by_user: {
    id: UUID;
    email: string;
    full_name?: string;
  };
}

export interface TestScheduleWithDetails extends TestSchedule {
  project: Pick<Project, 'id' | 'name'>;
  created_by_user: {
    id: UUID;
    email: string;
    full_name?: string;
  };
  test_cases: Pick<TestCase, 'id' | 'name'>[];
  test_suites: Pick<TestSuite, 'id' | 'name'>[];
  visual_test_flows: Pick<VisualTestFlow, 'id' | 'name'>[];
  recent_executions: ScheduledTestExecution[];
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface CreateProjectRequest {
  name: string;
  description?: string;
  organization_id: UUID;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  settings?: Json;
}

export interface CreateTestCaseRequest {
  project_id: UUID;
  target_id: UUID;
  name: string;
  description?: string;
  test_steps: Json;
  expected_results?: Json;
  tags?: string[];
  priority?: number;
  timeout_ms?: number;
  retry_count?: number;
}

export interface ExecuteTestRequest {
  test_case_id?: UUID;
  test_suite_id?: UUID;
  target_id: UUID;
  environment?: string;
  browser_config?: Json;
  execution_metadata?: Json;
}

export interface AIGenerationRequest {
  prompt: string;
  request_type: AIRequestType;
  target_url?: string;
  project_id?: UUID;
  target_id?: UUID;
  model?: string;
  additional_context?: Json;
}

export interface CreateVisualTestFlowRequest {
  project_id: UUID;
  name: string;
  description?: string;
  target_url: string;
  browser_settings?: Json;
  steps?: Omit<VisualTestStep, 'id' | 'flow_id' | 'created_at' | 'updated_at'>[];
}

export interface CreateTestScheduleRequest {
  project_id: UUID;
  name: string;
  description?: string;
  test_case_ids?: UUID[];
  test_suite_ids?: UUID[];
  visual_test_flow_ids?: UUID[];
  schedule_type: ScheduleType;
  cron_expression?: string;
  timezone?: string;
  notification_settings?: Json;
}

// =============================================================================
// Database Query Filters
// =============================================================================

export interface DatabaseFilters {
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
}

export interface ProjectFilters extends DatabaseFilters {
  organization_id?: UUID;
  status?: ProjectStatus;
  created_by?: UUID;
}

export interface TestCaseFilters extends DatabaseFilters {
  project_id?: UUID;
  target_id?: UUID;
  status?: TestCaseStatus;
  tags?: string[];
  created_by?: UUID;
}

export interface ExecutionFilters extends DatabaseFilters {
  project_id?: UUID;
  status?: ExecutionStatus;
  started_by?: UUID;
  date_from?: string;
  date_to?: string;
}

export interface AIGenerationFilters extends DatabaseFilters {
  user_id?: UUID;
  project_id?: UUID;
  request_type?: AIRequestType;
  status?: AIGenerationStatus;
  date_from?: string;
  date_to?: string;
}

// =============================================================================
// Database Response Types
// =============================================================================

export interface DatabaseResponse<T> {
  data: T;
  error: null;
}

export interface DatabaseError {
  data: null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  };
}

export type DatabaseResult<T> = DatabaseResponse<T> | DatabaseError;

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  total_count: number;
  has_more: boolean;
  next_cursor?: string;
}

// =============================================================================
// Utility Types
// =============================================================================

export type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>;
export type InsertInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'> & {
  id?: UUID;
};

// =============================================================================
// Database Table Names (for consistency)
// =============================================================================

export const DATABASE_TABLES = {
  // Core tables
  ORGANIZATIONS: 'organizations',
  ORGANIZATION_MEMBERS: 'organization_members',
  PROJECTS: 'projects',
  TEST_TARGETS: 'test_targets',
  TEST_CASES: 'test_cases',
  TEST_SUITES: 'test_suites',
  TEST_EXECUTIONS: 'test_executions',
  TEST_RESULTS: 'test_results',
  EXECUTION_LOGS: 'execution_logs',
  AI_INSIGHTS: 'ai_insights',
  UX_SCORES: 'ux_scores',
  NOTIFICATIONS: 'notifications',
  WEBHOOKS: 'webhooks',
  API_KEYS: 'api_keys',
  AUDIT_LOGS: 'audit_logs',
  PROJECT_SECRETS: 'project_secrets',
  PROJECT_SECRETS_AUDIT: 'project_secrets_audit',
  
  // Phase 1 AI Infrastructure
  AI_GENERATIONS: 'ai_generations',
  BROWSER_SESSIONS: 'browser_sessions',
  VISUAL_TEST_FLOWS: 'visual_test_flows',
  VISUAL_TEST_STEPS: 'visual_test_steps',
  TEST_SCHEDULES: 'test_schedules',
  SCHEDULED_TEST_EXECUTIONS: 'scheduled_test_executions',
  JOB_QUEUE: 'job_queue',
} as const;
