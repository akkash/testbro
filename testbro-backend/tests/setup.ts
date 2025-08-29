// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment variables if not already set
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
process.env.OPENROUTER_KEY = process.env.OPENROUTER_KEY || 'test-openrouter-key';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console.error and console.warn during tests
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Add custom matchers if needed
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDate(): R;
      toBeValidUUID(): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },

  toBeValidUUID(received: any) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
});

// Helper functions for tests
export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: {
    name: 'Test User',
    avatar_url: null,
  },
  app_metadata: {
    provider: 'email',
    providers: ['email'],
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockProject = (overrides: Partial<any> = {}) => ({
  id: 'project-123',
  name: 'Test Project',
  description: 'A test project',
  organization_id: 'org-123',
  owner_id: 'user-123',
  settings: {
    default_browser: 'chromium',
    timeout_seconds: 30,
    retries: 0,
    parallel_execution: false,
    notifications: {
      email: true,
      slack: false,
    },
  },
  tags: ['test', 'automation'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockTestCase = (overrides: Partial<any> = {}) => ({
  id: 'test-case-123',
  name: 'Login Test',
  description: 'Test user login functionality',
  project_id: 'project-123',
  suite_id: null,
  target_id: 'target-123',
  steps: [
    {
      id: 'step-1',
      order: 1,
      action: 'navigate',
      element: 'https://example.com/login',
      description: 'Navigate to login page',
      timeout: 30000,
      screenshot: false,
    },
    {
      id: 'step-2',
      order: 2,
      action: 'type',
      element: '#email',
      value: 'test@example.com',
      description: 'Enter email',
      timeout: 5000,
      screenshot: false,
    },
  ],
  tags: ['login', 'smoke'],
  priority: 'high',
  status: 'active',
  ai_generated: false,
  ai_metadata: null,
  created_by: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockExecution = (overrides: Partial<any> = {}) => ({
  id: 'execution-123',
  test_case_id: 'test-case-123',
  suite_id: null,
  project_id: 'project-123',
  target_id: 'target-123',
  status: 'completed',
  started_at: '2024-01-01T10:00:00Z',
  completed_at: '2024-01-01T10:00:30Z',
  duration_seconds: 30,
  browser: 'chromium',
  device: 'desktop',
  environment: 'staging',
  results: [
    {
      step_id: 'step-1',
      step_order: 1,
      status: 'passed',
      duration_seconds: 2.5,
      logs: [],
      timestamp: '2024-01-01T10:00:02Z',
    },
  ],
  metrics: {
    page_load_time: 1500,
    total_requests: 5,
    failed_requests: 0,
    memory_usage_mb: 50,
    cpu_usage_percent: 10,
    network_transfer_mb: 2.5,
    screenshot_count: 2,
  },
  error_message: null,
  initiated_by: 'user-123',
  worker_id: 'worker-123',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:30Z',
  ...overrides,
});

// Test database helpers
export const mockSupabaseResponse = (data: any, error: any = null) => ({
  data,
  error,
});

export const mockSupabaseQuery = (result: any) => ({
  select: jest.fn(() => ({
    eq: jest.fn(() => ({
      single: jest.fn().mockResolvedValue(result),
    })),
  })),
  insert: jest.fn(() => ({
    select: jest.fn(() => ({
      single: jest.fn().mockResolvedValue(result),
    })),
  })),
  update: jest.fn(() => ({
    eq: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue(result),
      })),
    })),
  })),
  delete: jest.fn(() => ({
    eq: jest.fn().mockResolvedValue(result),
  })),
});
