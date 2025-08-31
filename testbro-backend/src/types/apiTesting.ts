// API Testing Type Definitions

export interface APIRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  authentication?: {
    type: 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth2';
    credentials?: {
      username?: string;
      password?: string;
      token?: string;
      apiKey?: string;
      keyLocation?: 'header' | 'query';
      keyName?: string;
    };
  };
  timeout?: number;
}

export interface APIValidationRule {
  id: string;
  type: 'status_code' | 'response_time' | 'header_exists' | 'header_value' | 'body_contains' | 'json_schema' | 'json_path';
  expectedValue?: any;
  maxTime?: number;
  headerName?: string;
  schema?: any;
  path?: string;
  operator?: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  description: string;
}

export interface APIDataExtraction {
  name: string;
  source: 'body' | 'header' | 'status';
  path?: string; // JSONPath for body, header name for headers
  description?: string;
}

export interface APITestStep {
  id: string;
  name: string;
  description?: string;
  order: number;
  request: APIRequestConfig;
  validations: APIValidationRule[];
  dataExtractions: APIDataExtraction[];
  continueOnFailure: boolean;
  retryCount: number;
  retryDelay: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface APITestResult {
  stepId: string;
  success: boolean;
  executionTime: number;
  request: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
  };
  response?: {
    status: number;
    headers: Record<string, string>;
    body: any;
    size: number;
  };
  error?: string;
  validations: Array<{
    rule: string;
    passed: boolean;
    message: string;
  }>;
  extractedData: Record<string, any>;
  timestamp: string;
}

export interface APITestSuite {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  steps: APITestStep[];
  environment_id?: string;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface APIEnvironment {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  variables: Record<string, string>;
  base_url?: string;
  headers?: Record<string, string>;
  authentication?: APIRequestConfig['authentication'];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface APITestExecution {
  id: string;
  suite_id: string;
  environment_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  results: APITestResult[];
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
  total_execution_time: number;
  started_at: string;
  completed_at?: string;
  triggered_by: string;
  trigger_type: 'manual' | 'scheduled' | 'webhook' | 'pipeline';
}

// Integration with existing UI test types
export interface HybridTestStep {
  id: string;
  type: 'ui' | 'api';
  order: number;
  
  // UI step properties (from existing NoCodeTestStep)
  ui_step?: {
    natural_language: string;
    action_type: 'click' | 'type' | 'verify' | 'navigate' | 'wait' | 'select' | 'scroll' | 'hover';
    element_description: string;
    element_selector: string;
    value?: string;
    confidence_score: number;
  };
  
  // API step properties
  api_step?: APITestStep;
  
  // Shared properties
  name: string;
  description?: string;
  continueOnFailure: boolean;
  created_at: string;
  updated_at: string;
}

export interface APITestMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  min_response_time: number;
  max_response_time: number;
  total_data_transferred: number;
  error_rate: number;
  throughput: number; // requests per second
}

// Visual Builder Configuration Types
export interface APIBuilderConfig {
  step: APITestStep;
  environment?: APIEnvironment;
  dataContext: Record<string, any>;
  validationMode: 'strict' | 'lenient';
  mockMode: boolean;
}

export interface APIBuilderAction {
  type: 'add_header' | 'remove_header' | 'add_validation' | 'remove_validation' | 'add_extraction' | 'remove_extraction' | 'update_method' | 'update_url' | 'update_body';
  payload: any;
}

// WebSocket Events for Real-time API Testing
export interface APITestWebSocketEvent {
  type: 'api_test_started' | 'api_test_progress' | 'api_test_completed' | 'api_test_failed' | 'api_validation_result';
  execution_id: string;
  data: {
    step_id?: string;
    step_name?: string;
    progress?: number;
    result?: APITestResult;
    metrics?: APITestMetrics;
  };
  timestamp: string;
  metadata?: {
    source?: string;
    version?: string;
    correlation_id?: string;
  };
}