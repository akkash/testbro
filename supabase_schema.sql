-- =============================================
-- TestBro.ai Complete Database Schema
-- Run this entire file in Supabase SQL Editor
-- =============================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =============================================
-- CORE TABLES
-- =============================================

-- Organizations
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add auth.users foreign key constraint
  CONSTRAINT fk_organizations_owner 
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Organization Members
CREATE TABLE organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_by UUID NOT NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  UNIQUE(organization_id, user_id),
  -- Add auth.users foreign key constraints
  CONSTRAINT fk_org_members_user 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_org_members_invited_by 
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Projects
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  settings JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add auth.users foreign key constraint
  CONSTRAINT fk_projects_owner 
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Test Targets (Enhanced with proper defaults)
CREATE TABLE test_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  platform VARCHAR(20) DEFAULT 'web' CHECK (platform IN ('web', 'mobile-web', 'mobile-app')),
  environment VARCHAR(20) DEFAULT 'staging' CHECK (environment IN ('production', 'staging', 'development')),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  auth_config JSONB DEFAULT '{}',
  app_file JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Suites (created first to avoid forward reference issues)
CREATE TABLE test_suites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  test_case_ids UUID[] DEFAULT '{}',
  target_id UUID REFERENCES test_targets(id) ON DELETE CASCADE,
  execution_config JSONB DEFAULT '{}',
  schedule JSONB,
  tags TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add auth.users foreign key constraint
  CONSTRAINT fk_test_suites_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Test Cases (created after test_suites)
CREATE TABLE test_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  suite_id UUID REFERENCES test_suites(id) ON DELETE SET NULL,
  target_id UUID REFERENCES test_targets(id) ON DELETE CASCADE,
  steps JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add auth.users foreign key constraint
  CONSTRAINT fk_test_cases_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Test Executions
CREATE TABLE test_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
  suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  target_id UUID REFERENCES test_targets(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  browser VARCHAR(20) DEFAULT 'chromium' CHECK (browser IN ('chromium', 'firefox', 'webkit')),
  device VARCHAR(50) DEFAULT 'desktop',
  environment VARCHAR(50) DEFAULT 'staging',
  results JSONB DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  error_message TEXT,
  initiated_by UUID NOT NULL,
  worker_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add auth.users foreign key constraint
  CONSTRAINT fk_test_executions_initiated_by 
    FOREIGN KEY (initiated_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Execution Logs
CREATE TABLE execution_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  level VARCHAR(20) CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  step_id VARCHAR(50),
  metadata JSONB DEFAULT '{}'
);

-- AI Insights (Enhanced with proper defaults)
CREATE TABLE ai_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  type VARCHAR(30) DEFAULT 'functional' CHECK (type IN ('ux', 'performance', 'accessibility', 'security', 'functional')),
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  element VARCHAR(500),
  suggestion TEXT,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- UX Scores
CREATE TABLE ux_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  overall_score DECIMAL(5,2) CHECK (overall_score >= 0 AND overall_score <= 100),
  dimensions JSONB DEFAULT '{}',
  critical_issues TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add auth.users foreign key constraint
  CONSTRAINT fk_notifications_user 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- AI Usage Logs
CREATE TABLE ai_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_type VARCHAR(50) NOT NULL,
  request_data JSONB DEFAULT '{}',
  model VARCHAR(50) NOT NULL,
  prompt TEXT,
  confidence_score DECIMAL(3,2),
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add auth.users foreign key constraint
  CONSTRAINT fk_ai_usage_user 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Screenshots and Media Files
CREATE TABLE execution_screenshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  step_id VARCHAR(50),
  screenshot_type VARCHAR(20) DEFAULT 'step' CHECK (screenshot_type IN ('step', 'error', 'comparison', 'final')),
  file_path TEXT NOT NULL,
  storage_bucket VARCHAR(50) DEFAULT 'screenshots',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE execution_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  storage_bucket VARCHAR(50) DEFAULT 'videos',
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Network and Performance Monitoring
CREATE TABLE network_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  request_url TEXT NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  request_headers JSONB DEFAULT '{}',
  response_headers JSONB DEFAULT '{}',
  request_body TEXT,
  response_body TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  metric_type VARCHAR(30) CHECK (metric_type IN ('lcp', 'fid', 'cls', 'fcp', 'ttfb', 'tti')),
  value DECIMAL(10,3) NOT NULL,
  unit VARCHAR(10) DEFAULT 'ms' NOT NULL,
  threshold JSONB DEFAULT '{}',
  passed BOOLEAN DEFAULT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE console_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  level VARCHAR(10) DEFAULT 'log' CHECK (level IN ('log', 'info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  source VARCHAR(200),
  line_number INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Browser Automation Tables (Essential for recording functionality)
CREATE TABLE browser_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  target_id UUID REFERENCES test_targets(id) ON DELETE CASCADE,
  browser_type TEXT DEFAULT 'chromium' NOT NULL,
  viewport JSONB DEFAULT '{"width": 1280, "height": 720}' NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  url TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recording_session_id UUID,
  -- Add auth.users foreign key constraint
  CONSTRAINT fk_browser_sessions_user 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE recording_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  browser_session_id UUID REFERENCES browser_sessions(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  target_id UUID REFERENCES test_targets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'recording' NOT NULL,
  start_url TEXT NOT NULL,
  total_duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}',
  -- Add auth.users foreign key constraint
  CONSTRAINT fk_recording_sessions_user 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE recorded_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES recording_sessions(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  action_type TEXT NOT NULL,
  element JSONB NOT NULL,
  value TEXT,
  coordinates JSONB,
  modifiers TEXT[] DEFAULT '{}',
  screenshot_before TEXT,
  screenshot_after TEXT,
  page_url TEXT NOT NULL,
  viewport_size JSONB DEFAULT '{"width": 1280, "height": 720}' NOT NULL
);

-- Sessions
CREATE TABLE sessions (
  id VARCHAR(128) PRIMARY KEY,
  session_data TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(100),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add auth.users foreign key constraint (nullable)
  CONSTRAINT fk_audit_logs_user 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Organizations indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_created_at ON organizations(created_at);

-- Organization members indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_members_user_org ON organization_members(user_id, organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_members_role ON organization_members(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_members_status ON organization_members(status);

-- Projects indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_tags ON projects USING GIN(tags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);

-- Test targets indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_targets_project_id ON test_targets(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_targets_platform ON test_targets(platform);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_targets_environment ON test_targets(environment);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_targets_created_at ON test_targets(created_at);

-- Test suites indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_suites_project_id ON test_suites(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_suites_created_by ON test_suites(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_suites_target_id ON test_suites(target_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_suites_tags ON test_suites USING GIN(tags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_suites_created_at ON test_suites(created_at);

-- Test cases indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_project_id ON test_cases(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_suite_id ON test_cases(suite_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_target_id ON test_cases(target_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_status ON test_cases(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_priority ON test_cases(priority);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_created_by ON test_cases(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_tags ON test_cases USING GIN(tags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_ai_generated ON test_cases(ai_generated);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_created_at ON test_cases(created_at);

-- Test executions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_project_id ON test_executions(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_test_case_id ON test_executions(test_case_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_suite_id ON test_executions(suite_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_target_id ON test_executions(target_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_status ON test_executions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_initiated_by ON test_executions(initiated_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_started_at ON test_executions(started_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_completed_at ON test_executions(completed_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_browser ON test_executions(browser);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_environment ON test_executions(environment);

-- Execution logs indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_execution_logs_execution_id ON execution_logs(execution_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_execution_logs_level ON execution_logs(level);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_execution_logs_timestamp ON execution_logs(timestamp);

-- AI and analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_insights_execution_id ON ai_insights(execution_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_insights_type ON ai_insights(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_insights_severity ON ai_insights(severity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ux_scores_execution_id ON ux_scores(execution_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ux_scores_overall_score ON ux_scores(overall_score);

-- System tables indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_logs_request_type ON ai_usage_logs(request_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);

-- Browser automation indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_execution_screenshots_execution_id ON execution_screenshots(execution_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_execution_screenshots_type ON execution_screenshots(screenshot_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_execution_videos_execution_id ON execution_videos(execution_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_network_logs_execution_id ON network_logs(execution_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_network_logs_status_code ON network_logs(status_code);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_network_logs_timestamp ON network_logs(timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_execution_id ON performance_metrics(execution_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_console_logs_execution_id ON console_logs(execution_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_console_logs_level ON console_logs(level);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_console_logs_timestamp ON console_logs(timestamp);

-- Browser sessions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_browser_sessions_project_id ON browser_sessions(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_browser_sessions_user_id ON browser_sessions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_browser_sessions_status ON browser_sessions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_browser_sessions_last_activity ON browser_sessions(last_activity);

-- Recording sessions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recording_sessions_browser_session_id ON recording_sessions(browser_session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recording_sessions_project_id ON recording_sessions(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recording_sessions_user_id ON recording_sessions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recording_sessions_status ON recording_sessions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recording_sessions_tags ON recording_sessions USING GIN(tags);

-- Recorded actions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recorded_actions_session_id ON recorded_actions(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recorded_actions_order_number ON recorded_actions(session_id, order_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recorded_actions_action_type ON recorded_actions(action_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recorded_actions_timestamp ON recorded_actions(timestamp);

-- =============================================
-- UPDATE TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_targets_updated_at BEFORE UPDATE ON test_targets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON test_cases 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_suites_updated_at BEFORE UPDATE ON test_suites 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_executions_updated_at BEFORE UPDATE ON test_executions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ux_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE console_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recorded_actions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Organization owners can update" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Organization owners can delete" ON organizations
  FOR DELETE USING (owner_id = auth.uid());

-- Organization members policies
CREATE POLICY "Users can view organization members" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins can invite members" ON organization_members
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

CREATE POLICY "Admins can update member roles" ON organization_members
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- Projects policies
CREATE POLICY "Users can view projects in their organizations" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can create projects in their organizations" ON projects
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Project owners and organization admins can update" ON projects
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- Test cases policies
CREATE POLICY "Users can view test cases in their projects" ON test_cases
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Users with editor+ roles can create test cases" ON test_cases
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'editor') AND om.status = 'active'
    )
  );

-- Test executions policies
CREATE POLICY "Users can view test executions in their projects" ON test_executions
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Add missing policies for organization UPDATE and DELETE
CREATE POLICY "Organization admins can update" ON organizations
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

CREATE POLICY "Organization owners can delete" ON organizations
  FOR DELETE USING (owner_id = auth.uid());

-- Add missing policies for organization members DELETE
CREATE POLICY "Admins can remove members" ON organization_members
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- Add missing policies for projects DELETE
CREATE POLICY "Project owners and organization admins can delete" ON projects
  FOR DELETE USING (
    owner_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- Test targets policies
CREATE POLICY "Users can view test targets in their projects" ON test_targets
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Users with editor+ roles can create test targets" ON test_targets
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'editor') AND om.status = 'active'
    )
  );

CREATE POLICY "Users with editor+ roles can update test targets" ON test_targets
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'editor') AND om.status = 'active'
    )
  );

CREATE POLICY "Users with editor+ roles can delete test targets" ON test_targets
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'editor') AND om.status = 'active'
    )
  );

-- Test suites policies
CREATE POLICY "Users can view test suites in their projects" ON test_suites
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Users with editor+ roles can create test suites" ON test_suites
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'editor') AND om.status = 'active'
    )
  );

CREATE POLICY "Users with editor+ roles can update test suites" ON test_suites
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'editor') AND om.status = 'active'
    )
  );

CREATE POLICY "Users with editor+ roles can delete test suites" ON test_suites
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'editor') AND om.status = 'active'
    )
  );

-- Test cases UPDATE and DELETE policies
CREATE POLICY "Users with editor+ roles can update test cases" ON test_cases
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'editor') AND om.status = 'active'
    )
  );

CREATE POLICY "Users with editor+ roles can delete test cases" ON test_cases
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'editor') AND om.status = 'active'
    )
  );

-- Test executions INSERT, UPDATE, DELETE policies
CREATE POLICY "Users can create test executions in their projects" ON test_executions
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Users can update their own executions" ON test_executions
  FOR UPDATE USING (initiated_by = auth.uid());

-- Execution logs policies
CREATE POLICY "Users can view execution logs in their projects" ON execution_logs
  FOR SELECT USING (
    execution_id IN (
      SELECT te.id FROM test_executions te
      JOIN projects p ON te.project_id = p.id
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "System can insert execution logs" ON execution_logs
  FOR INSERT WITH CHECK (
    execution_id IN (
      SELECT te.id FROM test_executions te
      JOIN projects p ON te.project_id = p.id
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- AI insights policies
CREATE POLICY "Users can view AI insights in their projects" ON ai_insights
  FOR SELECT USING (
    execution_id IN (
      SELECT te.id FROM test_executions te
      JOIN projects p ON te.project_id = p.id
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "System can insert AI insights" ON ai_insights
  FOR INSERT WITH CHECK (
    execution_id IN (
      SELECT te.id FROM test_executions te
      JOIN projects p ON te.project_id = p.id
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- UX scores policies
CREATE POLICY "Users can view UX scores in their projects" ON ux_scores
  FOR SELECT USING (
    execution_id IN (
      SELECT te.id FROM test_executions te
      JOIN projects p ON te.project_id = p.id
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "System can insert UX scores" ON ux_scores
  FOR INSERT WITH CHECK (
    execution_id IN (
      SELECT te.id FROM test_executions te
      JOIN projects p ON te.project_id = p.id
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- AI usage logs policies
CREATE POLICY "Users can view their own AI usage logs" ON ai_usage_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create AI usage logs" ON ai_usage_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Media files policies
CREATE POLICY "Users can view screenshots in their projects" ON execution_screenshots
  FOR SELECT USING (
    execution_id IN (
      SELECT te.id FROM test_executions te
      JOIN projects p ON te.project_id = p.id
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Users can view videos in their projects" ON execution_videos
  FOR SELECT USING (
    execution_id IN (
      SELECT te.id FROM test_executions te
      JOIN projects p ON te.project_id = p.id
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Monitoring data policies
CREATE POLICY "Users can view network logs in their projects" ON network_logs
  FOR SELECT USING (
    execution_id IN (
      SELECT te.id FROM test_executions te
      JOIN projects p ON te.project_id = p.id
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Users can view performance metrics in their projects" ON performance_metrics
  FOR SELECT USING (
    execution_id IN (
      SELECT te.id FROM test_executions te
      JOIN projects p ON te.project_id = p.id
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Users can view console logs in their projects" ON console_logs
  FOR SELECT USING (
    execution_id IN (
      SELECT te.id FROM test_executions te
      JOIN projects p ON te.project_id = p.id
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Browser sessions policies
CREATE POLICY "Users can view browser sessions in their projects" ON browser_sessions
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Users can create browser sessions in their projects" ON browser_sessions
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Users can update their own browser sessions" ON browser_sessions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own browser sessions" ON browser_sessions
  FOR DELETE USING (user_id = auth.uid());

-- Recording sessions policies
CREATE POLICY "Users can view recording sessions in their projects" ON recording_sessions
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Users can create recording sessions in their projects" ON recording_sessions
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Users can update their own recording sessions" ON recording_sessions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own recording sessions" ON recording_sessions
  FOR DELETE USING (user_id = auth.uid());

-- Recorded actions policies
CREATE POLICY "Users can view recorded actions in their sessions" ON recorded_actions
  FOR SELECT USING (
    session_id IN (
      SELECT rs.id FROM recording_sessions rs
      JOIN projects p ON rs.project_id = p.id
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Users can create recorded actions in their sessions" ON recorded_actions
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT rs.id FROM recording_sessions rs
      JOIN projects p ON rs.project_id = p.id
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- =============================================
-- STORAGE BUCKET CONFIGURATION
-- =============================================

-- Create storage buckets for media files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('screenshots', 'screenshots', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('videos', 'videos', true, 104857600, ARRAY['video/mp4', 'video/webm'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for screenshots
CREATE POLICY "Users can upload screenshots" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'screenshots' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view screenshots" ON storage.objects
  FOR SELECT USING (bucket_id = 'screenshots');

CREATE POLICY "Users can update their screenshots" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'screenshots' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their screenshots" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'screenshots' AND
    auth.role() = 'authenticated'
  );

-- Storage policies for videos
CREATE POLICY "Users can upload videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'videos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

CREATE POLICY "Users can update their videos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'videos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'videos' AND
    auth.role() = 'authenticated'
  );

-- =============================================
-- COMPLETE SETUP VERIFICATION
-- =============================================

-- Verify tables created
SELECT 'Setup Complete! Tables created:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected tables (21+ total):
-- ai_insights, ai_usage_logs, audit_logs, browser_sessions, console_logs
-- execution_logs, execution_screenshots, execution_videos, network_logs
-- notifications, organization_members, organizations, performance_metrics
-- projects, recorded_actions, recording_sessions, sessions, test_cases
-- test_executions, test_suites, test_targets, ux_scores

-- =============================================
-- AUTHENTICATION AND SETUP INSTRUCTIONS
-- =============================================

/*
MANUAL SETUP REQUIRED IN SUPABASE DASHBOARD:

1. AUTHENTICATION PROVIDERS:
   - Go to Authentication → Providers
   - Enable Google OAuth (add client ID and secret)
   - Enable GitHub OAuth (add app ID and secret)
   - Set Site URL: http://localhost:5173 (development)
   - Add Redirect URLs: http://localhost:5173/auth/callback

2. ENVIRONMENT VARIABLES:
   Backend (.env):
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   Frontend (.env):
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_URL=http://localhost:3001

3. VERIFY SETUP:
   - All tables should be created with proper relationships
   - RLS policies should be active on all tables
   - Storage buckets should be accessible
   - Authentication should work with OAuth providers
*/