import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { supabaseDatabaseService as databaseService } from '../services/supabaseDatabaseService';
import { databasePerformanceMonitor } from '../services/databasePerformanceMonitor';

// Ensure environment variables are loaded
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// OpenRouter Configuration
const openRouterKey = process.env.OPENROUTER_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

if (!openRouterKey) {
  throw new Error('Missing OpenRouter API key. Please set OPENROUTER_KEY in your environment variables.');
}

// Admin client with service role key (for server-side operations)
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Regular client for user operations (will use JWT from auth middleware)
export const createSupabaseClient = (jwt?: string): SupabaseClient => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: jwt ? {
        Authorization: `Bearer ${jwt}`,
      } : {},
    },
  });
};

// Export OpenRouter key for AI service
export { openRouterKey };

// Export optimized database services
export { databaseService, databasePerformanceMonitor };

// Database configuration for optimized connection pooling
export const DATABASE_CONFIG = {
  // Connection pool settings (placeholder values for Supabase)
  POOL_MAX: parseInt(process.env.DB_POOL_MAX || '20'),
  POOL_MIN: parseInt(process.env.DB_POOL_MIN || '2'),
  POOL_IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  POOL_CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT || '60000'),
  
  // Query optimization settings
  QUERY_TIMEOUT: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
  SLOW_QUERY_THRESHOLD: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '1000'),
  
  // Performance monitoring
  MONITORING_ENABLED: process.env.DB_MONITORING_ENABLED !== 'false',
  MONITORING_INTERVAL: parseInt(process.env.DB_MONITORING_INTERVAL || (process.env.NODE_ENV === 'production' ? '60000' : '300000')),
  
  // Cache settings
  CACHE_ENABLED: process.env.CACHE_ENABLED !== 'false',
  CACHE_TTL_DEFAULT: parseInt(process.env.CACHE_DEFAULT_TTL || '900'),
} as const;

// Initialize database services if in production
if (process.env.NODE_ENV === 'production') {
  // Start performance monitoring
  databasePerformanceMonitor.startMonitoring(DATABASE_CONFIG.MONITORING_INTERVAL);
  
  // Log database initialization
  console.log('Optimized database services initialized for production');
}

// Database table names (to avoid typos)
export const TABLES = {
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
} as const;

// Row Level Security (RLS) policies will be applied in Supabase
export const RLS_POLICIES = {
  ORGANIZATIONS: {
    SELECT: 'Users can view organizations they belong to',
    INSERT: 'Users can create organizations',
    UPDATE: 'Only organization owners/admins can update',
    DELETE: 'Only organization owners can delete',
  },
  PROJECTS: {
    SELECT: 'Users can view projects in their organizations',
    INSERT: 'Users can create projects in their organizations',
    UPDATE: 'Project owners and organization admins can update',
    DELETE: 'Project owners and organization admins can delete',
  },
  TEST_CASES: {
    SELECT: 'Users can view test cases in their projects',
    INSERT: 'Users can create test cases in their projects',
    UPDATE: 'Users with editor+ roles can update',
    DELETE: 'Users with editor+ roles can delete',
  },
} as const;