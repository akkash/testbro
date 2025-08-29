# TestBro.ai Supabase Database Setup Guide - Part 1

Complete step-by-step guide to set up the database schema for TestBro application in Supabase.

## 📋 Prerequisites

- Supabase account and project created
- **Authentication enabled** in your Supabase project (required for auth.users references)
- Access to Supabase SQL Editor
- Admin access to your Supabase project

## 🗄️ Database Schema Overview

The TestBro application requires 15 core tables for multi-tenant architecture with organizations, projects, test cases, executions, and browser automation.

## 🚀 Step 1: Enable Required Extensions

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For similarity searches
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes
```

## 🚀 Step 2: Create Core Tables

### 2.1 Organizations and Members
```sql
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
```

### 2.2 Projects and Test Targets
```sql
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

-- Test Targets
CREATE TABLE test_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  platform VARCHAR(20) CHECK (platform IN ('web', 'mobile-web', 'mobile-app')),
  environment VARCHAR(20) CHECK (environment IN ('production', 'staging', 'development')),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  auth_config JSONB,
  app_file JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.3 Test Suites and Cases (Fixed Creation Order)
```sql
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
```

### 2.4 Test Executions and Logs
```sql
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
```

### 2.5 AI and Analytics Tables
```sql
-- AI Insights
CREATE TABLE ai_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  type VARCHAR(30) CHECK (type IN ('ux', 'performance', 'accessibility', 'security', 'functional')),
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
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
```

### 2.6 System Tables
```sql
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
```

## ➡️ Next Steps

After running these commands, continue with **Part 2** which includes:
- Browser automation tables
- Performance indexes
- RLS policies
- Authentication setup
- Storage configuration

**Continue to SUPABASE_DATABASE_SETUP_PART2.md**