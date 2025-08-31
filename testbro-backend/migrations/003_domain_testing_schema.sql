-- =============================================
-- Domain-Wide Visual Testing Feature Schema
-- Migration: 003_domain_testing_schema.sql
-- =============================================

BEGIN;

-- =============================================
-- DOMAIN CRAWL SESSIONS TABLE
-- =============================================

CREATE TABLE domain_crawl_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  target_id UUID REFERENCES test_targets(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  seed_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  crawler_config JSONB DEFAULT '{}', -- Contains max_depth, max_pages, respect_robots_txt, etc.
  visual_ai_config JSONB DEFAULT '{}', -- Contains AI service settings, threshold, etc.
  
  -- Progress tracking
  pages_discovered INTEGER DEFAULT 0,
  pages_crawled INTEGER DEFAULT 0,
  pages_with_visuals INTEGER DEFAULT 0,
  total_visual_checkpoints INTEGER DEFAULT 0,
  
  -- Statistics
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  error_message TEXT,
  
  -- User tracking
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_domain_crawl_sessions_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =============================================
-- DOMAIN CRAWL PAGES TABLE
-- =============================================

CREATE TABLE domain_crawl_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES domain_crawl_sessions(id) ON DELETE CASCADE,
  
  -- Page information
  url TEXT NOT NULL,
  title VARCHAR(500),
  description TEXT,
  page_type VARCHAR(50), -- 'homepage', 'product', 'category', 'article', etc.
  
  -- Crawl metadata
  depth INTEGER DEFAULT 0,
  parent_url TEXT,
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  crawled_at TIMESTAMP WITH TIME ZONE,
  
  -- Page status
  status VARCHAR(20) DEFAULT 'discovered' CHECK (status IN ('discovered', 'crawling', 'crawled', 'failed', 'skipped')),
  http_status_code INTEGER,
  error_message TEXT,
  
  -- Performance metrics
  load_time_ms INTEGER,
  page_size_bytes BIGINT,
  resource_count INTEGER,
  
  -- SEO and accessibility data
  meta_tags JSONB DEFAULT '{}',
  headings JSONB DEFAULT '{}', -- h1, h2, h3, etc.
  images_count INTEGER DEFAULT 0,
  links_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- VISUAL CHECKPOINTS TABLE
-- =============================================

CREATE TABLE visual_checkpoints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES domain_crawl_sessions(id) ON DELETE CASCADE,
  page_id UUID REFERENCES domain_crawl_pages(id) ON DELETE CASCADE,
  
  -- Checkpoint information
  checkpoint_name VARCHAR(200) NOT NULL,
  checkpoint_type VARCHAR(50) DEFAULT 'full_page' CHECK (checkpoint_type IN ('full_page', 'element', 'viewport', 'mobile', 'tablet')),
  element_selector VARCHAR(500), -- For element-specific checkpoints
  
  -- Screenshot information
  screenshot_url TEXT, -- URL to the screenshot in storage
  screenshot_hash VARCHAR(128), -- Hash for duplicate detection
  baseline_screenshot_url TEXT, -- Baseline image for comparison
  
  -- AI Analysis
  ai_detected_elements JSONB DEFAULT '{}', -- Elements detected by AI
  ai_confidence_score DECIMAL(3,2) CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1),
  ai_suggestions TEXT[], -- AI suggestions for testing
  
  -- Visual comparison results
  comparison_status VARCHAR(20) DEFAULT 'baseline' CHECK (comparison_status IN ('baseline', 'passed', 'failed', 'review_needed')),
  visual_differences JSONB DEFAULT '{}', -- Detected differences
  difference_percentage DECIMAL(5,2), -- Percentage of difference
  
  -- Viewport information
  viewport_width INTEGER DEFAULT 1280,
  viewport_height INTEGER DEFAULT 720,
  device_scale_factor DECIMAL(3,2) DEFAULT 1.0,
  
  -- Timing
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  compared_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique checkpoints per page and type
  UNIQUE(page_id, checkpoint_type, element_selector)
);

-- =============================================
-- VISUAL BASELINE MANAGEMENT TABLE
-- =============================================

CREATE TABLE visual_baselines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Baseline identification
  url_pattern TEXT NOT NULL, -- Pattern for URLs this baseline applies to
  checkpoint_type VARCHAR(50) NOT NULL,
  element_selector VARCHAR(500),
  
  -- Baseline data
  baseline_screenshot_url TEXT NOT NULL,
  screenshot_hash VARCHAR(128) NOT NULL,
  
  -- Baseline metadata
  viewport_width INTEGER DEFAULT 1280,
  viewport_height INTEGER DEFAULT 720,
  device_scale_factor DECIMAL(3,2) DEFAULT 1.0,
  
  -- Management
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL,
  approved_by UUID, -- User who approved this baseline
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_visual_baselines_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_visual_baselines_approved_by 
    FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =============================================
-- CRAWL QUEUE TABLE (for queue management)
-- =============================================

CREATE TABLE domain_crawl_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES domain_crawl_sessions(id) ON DELETE CASCADE,
  
  -- URL information
  url TEXT NOT NULL,
  depth INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0, -- Higher number = higher priority
  
  -- Queue status
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'skipped')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  -- Timing
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  next_attempt_at TIMESTAMP WITH TIME ZONE,
  
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Domain crawl sessions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_crawl_sessions_project_id ON domain_crawl_sessions(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_crawl_sessions_target_id ON domain_crawl_sessions(target_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_crawl_sessions_status ON domain_crawl_sessions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_crawl_sessions_created_by ON domain_crawl_sessions(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_crawl_sessions_created_at ON domain_crawl_sessions(created_at);

-- Domain crawl pages indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_crawl_pages_session_id ON domain_crawl_pages(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_crawl_pages_url ON domain_crawl_pages(url);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_crawl_pages_status ON domain_crawl_pages(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_crawl_pages_page_type ON domain_crawl_pages(page_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_crawl_pages_discovered_at ON domain_crawl_pages(discovered_at);

-- Visual checkpoints indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visual_checkpoints_session_id ON visual_checkpoints(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visual_checkpoints_page_id ON visual_checkpoints(page_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visual_checkpoints_type ON visual_checkpoints(checkpoint_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visual_checkpoints_status ON visual_checkpoints(comparison_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visual_checkpoints_hash ON visual_checkpoints(screenshot_hash);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visual_checkpoints_captured_at ON visual_checkpoints(captured_at);

-- Visual baselines indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visual_baselines_project_id ON visual_baselines(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visual_baselines_url_pattern ON visual_baselines(url_pattern);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visual_baselines_type ON visual_baselines(checkpoint_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visual_baselines_active ON visual_baselines(is_active) WHERE is_active = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visual_baselines_hash ON visual_baselines(screenshot_hash);

-- Crawl queue indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_crawl_queue_session_id ON domain_crawl_queue(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_crawl_queue_status ON domain_crawl_queue(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_crawl_queue_priority ON domain_crawl_queue(priority DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_crawl_queue_next_attempt ON domain_crawl_queue(next_attempt_at) WHERE status = 'failed';

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_crawl_queue_processing ON domain_crawl_queue(session_id, status, priority DESC) WHERE status = 'queued';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visual_checkpoints_comparison ON visual_checkpoints(session_id, comparison_status) WHERE comparison_status IN ('failed', 'review_needed');

-- =============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Function to update updated_at timestamp (reuse existing function)
CREATE TRIGGER update_domain_crawl_sessions_updated_at 
  BEFORE UPDATE ON domain_crawl_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domain_crawl_pages_updated_at 
  BEFORE UPDATE ON domain_crawl_pages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visual_checkpoints_updated_at 
  BEFORE UPDATE ON visual_checkpoints 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visual_baselines_updated_at 
  BEFORE UPDATE ON visual_baselines 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domain_crawl_queue_updated_at 
  BEFORE UPDATE ON domain_crawl_queue 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE domain_crawl_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_crawl_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_crawl_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for domain_crawl_sessions
CREATE POLICY "Users can view domain crawl sessions in their organization projects" ON domain_crawl_sessions
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Users can create domain crawl sessions in their organization projects" ON domain_crawl_sessions
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active' AND om.role IN ('admin', 'editor')
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update domain crawl sessions they created" ON domain_crawl_sessions
  FOR UPDATE USING (created_by = auth.uid());

-- Similar RLS policies for other tables (simplified for space)
CREATE POLICY "Domain crawl pages inherit session permissions" ON domain_crawl_pages
  FOR ALL USING (
    session_id IN (
      SELECT id FROM domain_crawl_sessions WHERE
        project_id IN (
          SELECT p.id FROM projects p
          JOIN organization_members om ON p.organization_id = om.organization_id
          WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    )
  );

CREATE POLICY "Visual checkpoints inherit session permissions" ON visual_checkpoints
  FOR ALL USING (
    session_id IN (
      SELECT id FROM domain_crawl_sessions WHERE
        project_id IN (
          SELECT p.id FROM projects p
          JOIN organization_members om ON p.organization_id = om.organization_id
          WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    )
  );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to calculate crawl progress
CREATE OR REPLACE FUNCTION get_crawl_progress(session_uuid UUID)
RETURNS TABLE (
  total_pages INTEGER,
  crawled_pages INTEGER,
  failed_pages INTEGER,
  progress_percentage DECIMAL
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_pages,
    COUNT(*) FILTER (WHERE status = 'crawled')::INTEGER as crawled_pages,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_pages,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE status = 'crawled')::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
      ELSE 0
    END as progress_percentage
  FROM domain_crawl_pages
  WHERE session_id = session_uuid;
END;
$$;

-- Function to get visual checkpoint summary
CREATE OR REPLACE FUNCTION get_visual_checkpoint_summary(session_uuid UUID)
RETURNS TABLE (
  total_checkpoints INTEGER,
  passed_checkpoints INTEGER,
  failed_checkpoints INTEGER,
  review_needed INTEGER,
  baseline_checkpoints INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_checkpoints,
    COUNT(*) FILTER (WHERE comparison_status = 'passed')::INTEGER as passed_checkpoints,
    COUNT(*) FILTER (WHERE comparison_status = 'failed')::INTEGER as failed_checkpoints,
    COUNT(*) FILTER (WHERE comparison_status = 'review_needed')::INTEGER as review_needed,
    COUNT(*) FILTER (WHERE comparison_status = 'baseline')::INTEGER as baseline_checkpoints
  FROM visual_checkpoints
  WHERE session_id = session_uuid;
END;
$$;

COMMIT;