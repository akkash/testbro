-- Database Performance Optimization Migration
-- This migration adds indexes, constraints, and optimizations for production performance

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For similarity searches
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes

-- ===============================
-- USERS TABLE OPTIMIZATIONS
-- ===============================

-- Indexes for users table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_btree ON users USING btree(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login_at ON users(last_login_at) WHERE last_login_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users(id) WHERE deleted_at IS NULL;

-- Full-text search index for users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_trgm ON users USING gin(email gin_trgm_ops);

-- Partial index for active users only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_role ON users(role, created_at) WHERE deleted_at IS NULL;

-- ===============================
-- PROJECTS TABLE OPTIMIZATIONS
-- ===============================

-- Indexes for projects table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_id ON projects(user_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_organization_id ON projects(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_technology ON projects(technology) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_visibility ON projects(visibility) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_status ON projects(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_org_status ON projects(organization_id, status) WHERE deleted_at IS NULL AND organization_id IS NOT NULL;

-- Full-text search index for projects
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_name_trgm ON projects USING gin(name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_description_trgm ON projects USING gin(description gin_trgm_ops);

-- Combined full-text search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_search ON projects 
  USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- ===============================
-- TEST CASES TABLE OPTIMIZATIONS
-- ===============================

-- Indexes for test_cases table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_project_id ON test_cases(project_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_test_suite_id ON test_cases(test_suite_id) WHERE test_suite_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_status ON test_cases(status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_priority ON test_cases(priority) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_created_at ON test_cases(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_updated_at ON test_cases(updated_at);

-- Composite indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_project_status ON test_cases(project_id, status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_suite_status ON test_cases(test_suite_id, status) WHERE deleted_at IS NULL AND test_suite_id IS NOT NULL;

-- Full-text search for test cases
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_name_trgm ON test_cases USING gin(name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_search ON test_cases 
  USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- ===============================
-- TEST EXECUTIONS TABLE OPTIMIZATIONS
-- ===============================

-- Indexes for test_executions table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_project_id ON test_executions(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_test_case_id ON test_executions(test_case_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_test_suite_id ON test_executions(test_suite_id) WHERE test_suite_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_status ON test_executions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_executed_at ON test_executions(executed_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_executed_by ON test_executions(executed_by);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_project_status ON test_executions(project_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_project_date ON test_executions(project_id, executed_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_case_date ON test_executions(test_case_id, executed_at);

-- Index for performance queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_duration ON test_executions(duration) WHERE duration IS NOT NULL;

-- Partial index for recent executions (performance optimization)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_recent ON test_executions(project_id, executed_at, status) 
  WHERE executed_at > (NOW() - INTERVAL '30 days');

-- ===============================
-- ORGANIZATIONS TABLE OPTIMIZATIONS
-- ===============================

-- Indexes for organizations table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_name ON organizations(name) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_created_at ON organizations(created_at);

-- Full-text search for organizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_name_trgm ON organizations USING gin(name gin_trgm_ops);

-- ===============================
-- USER_ORGANIZATIONS TABLE OPTIMIZATIONS
-- ===============================

-- Indexes for user_organizations junction table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_organizations_role ON user_organizations(role);

-- Composite index for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_organizations_user_org ON user_organizations(user_id, organization_id);

-- ===============================
-- API KEYS TABLE OPTIMIZATIONS
-- ===============================

-- Indexes for api_keys table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_last_used_at ON api_keys(last_used_at);

-- Partial index for active keys
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_active ON api_keys(key_hash, user_id) 
  WHERE deleted_at IS NULL AND (expires_at IS NULL OR expires_at > NOW());

-- ===============================
-- PROFILES TABLE OPTIMIZATIONS
-- ===============================

-- Indexes for profiles table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at);

-- Full-text search for profiles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_name_trgm ON profiles USING gin(name gin_trgm_ops);

-- ===============================
-- TEST SUITES TABLE OPTIMIZATIONS
-- ===============================

-- Indexes for test_suites table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_suites_project_id ON test_suites(project_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_suites_created_at ON test_suites(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_suites_updated_at ON test_suites(updated_at);

-- Full-text search for test suites
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_suites_name_trgm ON test_suites USING gin(name gin_trgm_ops);

-- ===============================
-- SESSION/CACHE RELATED OPTIMIZATIONS
-- ===============================

-- Create sessions table if it doesn't exist (for session storage)
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(128) PRIMARY KEY,
  session_data TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for session cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ===============================
-- AUDIT LOG TABLE FOR PERFORMANCE
-- ===============================

-- Create audit_logs table for compliance and tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(100),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Composite index for common audit queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action_date ON audit_logs(user_id, action, created_at);

-- ===============================
-- PERFORMANCE MONITORING VIEWS
-- ===============================

-- View for project performance metrics
CREATE OR REPLACE VIEW project_performance_metrics AS
SELECT 
  p.id,
  p.name,
  COUNT(DISTINCT tc.id) as total_test_cases,
  COUNT(DISTINCT te.id) as total_executions,
  COUNT(DISTINCT CASE WHEN te.status = 'passed' THEN te.id END) as passed_executions,
  COUNT(DISTINCT CASE WHEN te.status = 'failed' THEN te.id END) as failed_executions,
  CASE 
    WHEN COUNT(DISTINCT te.id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN te.status = 'passed' THEN te.id END)::numeric / COUNT(DISTINCT te.id)::numeric) * 100, 2)
    ELSE 0 
  END as success_rate,
  AVG(te.duration) as avg_execution_time,
  MAX(te.executed_at) as last_execution,
  COUNT(DISTINCT te.executed_at::date) as execution_days
FROM projects p
LEFT JOIN test_cases tc ON p.id = tc.project_id AND tc.deleted_at IS NULL
LEFT JOIN test_executions te ON p.id = te.project_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name;

-- View for user activity metrics
CREATE OR REPLACE VIEW user_activity_metrics AS
SELECT 
  u.id,
  u.email,
  COUNT(DISTINCT p.id) as projects_count,
  COUNT(DISTINCT tc.id) as test_cases_created,
  COUNT(DISTINCT te.id) as executions_performed,
  MAX(te.executed_at) as last_execution,
  MAX(u.last_login_at) as last_login
FROM users u
LEFT JOIN projects p ON u.id = p.user_id AND p.deleted_at IS NULL
LEFT JOIN test_cases tc ON u.id = tc.created_by AND tc.deleted_at IS NULL
LEFT JOIN test_executions te ON u.id = te.executed_by
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email;

-- ===============================
-- DATABASE CONSTRAINTS FOR DATA INTEGRITY
-- ===============================

-- Add check constraints for enum-like fields
ALTER TABLE users ADD CONSTRAINT chk_users_role 
  CHECK (role IN ('admin', 'user', 'viewer', 'tester', 'manager'));

ALTER TABLE projects ADD CONSTRAINT chk_projects_status 
  CHECK (status IN ('active', 'inactive', 'archived', 'draft'));

ALTER TABLE projects ADD CONSTRAINT chk_projects_visibility 
  CHECK (visibility IN ('public', 'private', 'internal'));

ALTER TABLE test_cases ADD CONSTRAINT chk_test_cases_status 
  CHECK (status IN ('active', 'inactive', 'draft', 'archived'));

ALTER TABLE test_cases ADD CONSTRAINT chk_test_cases_priority 
  CHECK (priority IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE test_executions ADD CONSTRAINT chk_test_executions_status 
  CHECK (status IN ('passed', 'failed', 'skipped', 'pending', 'running', 'cancelled'));

-- Add NOT NULL constraints where appropriate
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE projects ALTER COLUMN name SET NOT NULL;
ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE test_cases ALTER COLUMN name SET NOT NULL;
ALTER TABLE test_cases ALTER COLUMN project_id SET NOT NULL;

-- ===============================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ===============================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON test_cases 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_suites_updated_at BEFORE UPDATE ON test_suites 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- VACUUM AND ANALYZE OPTIMIZATION
-- ===============================

-- Set up automatic vacuum settings for high-traffic tables
ALTER TABLE test_executions SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE audit_logs SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

-- ===============================
-- PARTITIONING FOR LARGE TABLES
-- ===============================

-- Create partitioned table for test_executions if data volume is high
-- This is commented out by default, enable if needed

/*
-- Create new partitioned table
CREATE TABLE test_executions_partitioned (
  LIKE test_executions INCLUDING ALL
) PARTITION BY RANGE (executed_at);

-- Create partitions for current and next few months
CREATE TABLE test_executions_y2024m01 PARTITION OF test_executions_partitioned
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE test_executions_y2024m02 PARTITION OF test_executions_partitioned
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Add more partitions as needed...
*/

-- ===============================
-- SECURITY OPTIMIZATIONS
-- ===============================

-- Create read-only role for reporting
CREATE ROLE IF NOT EXISTS testbro_readonly;
GRANT CONNECT ON DATABASE current_database() TO testbro_readonly;
GRANT USAGE ON SCHEMA public TO testbro_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO testbro_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO testbro_readonly;

-- Ensure future tables are also accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO testbro_readonly;

-- ===============================
-- PERFORMANCE MONITORING FUNCTIONS
-- ===============================

-- Function to get table bloat information
CREATE OR REPLACE FUNCTION get_table_bloat() 
RETURNS TABLE(
  schemaname TEXT, 
  tablename TEXT, 
  size_mb NUMERIC, 
  bloat_mb NUMERIC, 
  bloat_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.nspname::TEXT as schemaname,
    c.relname::TEXT as tablename,
    ROUND((pg_relation_size(c.oid) / 1024 / 1024)::NUMERIC, 2) as size_mb,
    ROUND(((pg_relation_size(c.oid) - pg_relation_size(c.oid, 'main')) / 1024 / 1024)::NUMERIC, 2) as bloat_mb,
    CASE 
      WHEN pg_relation_size(c.oid) > 0 
      THEN ROUND((((pg_relation_size(c.oid) - pg_relation_size(c.oid, 'main'))::NUMERIC / pg_relation_size(c.oid)) * 100), 2)
      ELSE 0 
    END as bloat_percentage
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r' 
    AND n.nspname = 'public'
    AND pg_relation_size(c.oid) > 1024 * 1024  -- Only tables > 1MB
  ORDER BY pg_relation_size(c.oid) DESC;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- FINAL OPTIMIZATIONS
-- ===============================

-- Update table statistics
ANALYZE;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Database performance optimization migration completed successfully';
  RAISE NOTICE 'Total indexes created: %', (
    SELECT count(*) 
    FROM pg_indexes 
    WHERE schemaname = 'public'
  );
END $$;

COMMIT;