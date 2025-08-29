# TestBro.ai Supabase Database Setup Guide - Part 2 (Updated)

Complete the database setup with browser automation tables, performance indexes, RLS policies, and configuration.

## 📋 Prerequisites

- Completed Part 1 (Core tables and auth constraints created)
- Supabase project with authentication enabled
- Admin access to Supabase Dashboard

## 🚀 Step 3: Browser Automation Tables

### 3.1 Screenshots and Media Files
```sql
-- Screenshots
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

-- Video Recordings
CREATE TABLE execution_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  storage_bucket VARCHAR(50) DEFAULT 'videos',
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.2 Network and Performance Monitoring
```sql
-- Network Logs
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

-- Performance Metrics
CREATE TABLE performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  metric_type VARCHAR(30) CHECK (metric_type IN ('lcp', 'fid', 'cls', 'fcp', 'ttfb', 'tti')),
  value DECIMAL(10,3) NOT NULL,
  unit VARCHAR(10) NOT NULL,
  threshold JSONB DEFAULT '{}',
  passed BOOLEAN DEFAULT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Browser Console Logs
CREATE TABLE console_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  level VARCHAR(10) DEFAULT 'log' CHECK (level IN ('log', 'info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  source VARCHAR(200),
  line_number INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 Step 4: Complete Performance Indexes

### 4.1 Core Table Indexes
```sql
-- Organizations and Members
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_status ON organization_members(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_user_org ON organization_members(user_id, organization_id);

-- Projects
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_org_id ON projects(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_tags ON projects USING GIN(tags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Test Targets
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_targets_project_id ON test_targets(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_targets_platform ON test_targets(platform);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_targets_environment ON test_targets(environment);
```

### 4.2 Test Management Indexes
```sql
-- Test Suites
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_suites_project_id ON test_suites(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_suites_created_by ON test_suites(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_suites_target_id ON test_suites(target_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_suites_tags ON test_suites USING GIN(tags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_suites_created_at ON test_suites(created_at);

-- Test Cases
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_project_id ON test_cases(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_suite_id ON test_cases(suite_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_target_id ON test_cases(target_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_status ON test_cases(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_priority ON test_cases(priority);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_created_by ON test_cases(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_tags ON test_cases USING GIN(tags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_ai_generated ON test_cases(ai_generated);
```

### 4.3 Execution and Monitoring Indexes
```sql
-- Test Executions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_project_id ON test_executions(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_test_case_id ON test_executions(test_case_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_suite_id ON test_executions(suite_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_status ON test_executions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_initiated_by ON test_executions(initiated_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_started_at ON test_executions(started_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_completed_at ON test_executions(completed_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_executions_browser ON test_executions(browser);

-- Execution Logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_execution_logs_execution_id ON execution_logs(execution_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_execution_logs_level ON execution_logs(level);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_execution_logs_timestamp ON execution_logs(timestamp);

-- AI and Analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_insights_execution_id ON ai_insights(execution_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_insights_type ON ai_insights(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_insights_severity ON ai_insights(severity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ux_scores_execution_id ON ux_scores(execution_id);
```

### 4.4 Media and Monitoring Indexes
```sql
-- Screenshots and Videos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_execution_screenshots_execution_id ON execution_screenshots(execution_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_execution_screenshots_type ON execution_screenshots(screenshot_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_execution_videos_execution_id ON execution_videos(execution_id);

-- Performance and Network
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_network_logs_execution_id ON network_logs(execution_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_network_logs_status_code ON network_logs(status_code);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_execution_id ON performance_metrics(execution_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_console_logs_execution_id ON console_logs(execution_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_console_logs_level ON console_logs(level);

-- System Tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_logs_request_type ON ai_usage_logs(request_type);
```

## 🚀 Step 5: Create Update Triggers

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for automatic timestamp updates
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

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 🔒 Step 6: Enable Row Level Security

```sql
-- Enable RLS on all tables
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
ALTER TABLE execution_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE console_logs ENABLE ROW LEVEL SECURITY;
```

## 🔒 Step 7: Create Comprehensive RLS Policies

### 7.1 Organizations and Members
```sql
-- Organizations: Users can view organizations they belong to
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Organizations: Users can create organizations
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Organizations: Only owners can update organizations
CREATE POLICY "Organization owners can update" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

-- Organizations: Only owners can delete organizations
CREATE POLICY "Organization owners can delete" ON organizations
  FOR DELETE USING (owner_id = auth.uid());

-- Organization members: Users can view members of their organizations
CREATE POLICY "Users can view organization members" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Organization members: Admins can invite members
CREATE POLICY "Admins can invite members" ON organization_members
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- Organization members: Admins can update member roles
CREATE POLICY "Admins can update member roles" ON organization_members
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );
```

### 7.2 Projects and Test Components
```sql
-- Projects: Users can view projects in their organizations
CREATE POLICY "Users can view projects in their organizations" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Projects: Users can create projects in their organizations
CREATE POLICY "Users can create projects in their organizations" ON projects
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Projects: Project owners and organization admins can update
CREATE POLICY "Project owners and organization admins can update" ON projects
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- Test cases: Users can view test cases in their projects
CREATE POLICY "Users can view test cases in their projects" ON test_cases
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Test cases: Users with editor+ roles can create test cases
CREATE POLICY "Users with editor+ roles can create test cases" ON test_cases
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'editor') AND om.status = 'active'
    )
  );

-- Similar policies for test_suites, test_targets, test_executions
CREATE POLICY "Users can view test suites in their projects" ON test_suites
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Users can view test targets in their projects" ON test_targets
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );
```

### 7.3 Execution and Monitoring
```sql
-- Test executions: Users can view test executions in their projects
CREATE POLICY "Users can view test executions in their projects" ON test_executions
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Execution logs: Users can view execution logs in their projects
CREATE POLICY "Users can view execution logs in their projects" ON execution_logs
  FOR SELECT USING (
    execution_id IN (
      SELECT te.id FROM test_executions te
      JOIN projects p ON te.project_id = p.id
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Screenshots and videos: Users can view media in their projects
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

-- Notifications: Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());
```

## 🚀 Step 8: Configure Authentication

### 8.1 Enable Authentication Providers
1. Go to **Supabase Dashboard → Authentication → Providers**
2. Enable **Google** provider:
   - Add your Google OAuth client ID and secret
   - Set authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
3. Enable **GitHub** provider:
   - Add your GitHub OAuth app ID and secret
   - Set authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`

### 8.2 Configure Site URL and Redirects
1. Go to **Authentication → Settings**
2. Set Site URL: `http://localhost:5173` (development)
3. Add Redirect URLs:
   - `http://localhost:5173/auth/callback`
   - `http://localhost:5173/**` (for development)
   - Your production URLs when deploying

### 8.3 Configure Email Templates (Optional)
1. Go to **Authentication → Email Templates**
2. Customize confirmation and recovery email templates
3. Set your sender email and name

## 🚀 Step 9: Configure Storage

### 9.1 Create Storage Buckets
```sql
-- Create screenshots bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('screenshots', 'screenshots', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('videos', 'videos', true, 104857600, ARRAY['video/mp4', 'video/webm']);
```

### 9.2 Set Storage Policies
```sql
-- Allow authenticated users to upload screenshots
CREATE POLICY "Users can upload screenshots" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'screenshots' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to upload videos
CREATE POLICY "Users can upload videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'videos' AND
    auth.role() = 'authenticated'
  );

-- Allow public read access to screenshots and videos
CREATE POLICY "Public can view screenshots" ON storage.objects
  FOR SELECT USING (bucket_id = 'screenshots');

CREATE POLICY "Public can view videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');
```

## 🚀 Step 10: Verify Setup

Run this query to verify all tables are created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables (18+ total):
- ai_insights
- ai_usage_logs
- audit_logs
- console_logs
- execution_logs
- execution_screenshots
- execution_videos
- network_logs
- notifications
- organization_members
- organizations
- performance_metrics
- projects
- sessions
- test_cases
- test_executions
- test_suites
- test_targets
- ux_scores

## ✅ Setup Complete!

Your TestBro.ai database is now ready with:
- ✅ All 18+ tables created with proper relationships
- ✅ Performance indexes optimized for scale
- ✅ Row Level Security enabled
- ✅ Comprehensive multi-tenant policies configured
- ✅ Authentication providers enabled
- ✅ Storage buckets configured for media files
- ✅ Automatic timestamp triggers
- ✅ Enhanced monitoring and analytics tables

## 📝 Next Steps

1. **Update environment variables** in your backend (.env):
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Update frontend environment variables** (.env):
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_URL=http://localhost:3001
   ```

3. **Test authentication flow** with your frontend
4. **Verify API endpoints** are working with proper RLS
5. **Create sample data** for testing
6. **Deploy to production** with production Supabase URL

## 🛠️ Troubleshooting

**If setup fails:**
1. Check you have Supabase admin access
2. Ensure project billing is enabled (for extensions)
3. Try running SQL commands in smaller batches
4. Check Supabase logs for specific error messages
5. Verify authentication is enabled before creating auth.users constraints

**If authentication fails:**
1. Verify OAuth provider credentials are correct
2. Check redirect URLs match exactly (including protocol)
3. Ensure environment variables are set correctly
4. Test with incognito/private browsing
5. Check browser console for detailed error messages

**If RLS policies block access:**
1. Verify user is properly authenticated
2. Check user has active organization membership
3. Test policies with simple SELECT queries
4. Use Supabase dashboard to debug policy issues

Your database schema is now fully configured and production-ready for the TestBro application!