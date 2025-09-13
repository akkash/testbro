-- Full Website Test Tables Migration
-- Run this SQL in Supabase SQL editor to create the necessary tables

-- Full Website Test Sessions table
CREATE TABLE IF NOT EXISTS full_website_test_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES test_targets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'discovering_urls', 'taking_screenshots', 
        'analyzing_changes', 'monitoring', 'completed', 'failed', 'cancelled'
    )),
    
    -- Configuration
    config JSONB NOT NULL DEFAULT '{}',
    
    -- Progress tracking
    total_urls INTEGER DEFAULT 0,
    processed_urls INTEGER DEFAULT 0,
    successful_urls INTEGER DEFAULT 0,
    failed_urls INTEGER DEFAULT 0,
    
    -- Results summary
    results_summary JSONB DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    -- User tracking
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    CONSTRAINT check_progress_consistency CHECK (processed_urls <= total_urls)
);

-- Discovered URLs table
CREATE TABLE IF NOT EXISTS discovered_urls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES full_website_test_sessions(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    depth INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'sitemap' CHECK (source IN ('sitemap', 'robots', 'crawl', 'manual')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
    
    -- Metadata
    title TEXT DEFAULT NULL,
    description TEXT DEFAULT NULL,
    content_type TEXT DEFAULT NULL,
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    -- Processing results
    error_message TEXT DEFAULT NULL,
    processing_time_ms INTEGER DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    UNIQUE(session_id, normalized_url)
);

-- Page Screenshots table
CREATE TABLE IF NOT EXISTS page_screenshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES full_website_test_sessions(id) ON DELETE CASCADE,
    url_id UUID NOT NULL REFERENCES discovered_urls(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    
    -- Screenshot metadata
    viewport_type TEXT NOT NULL DEFAULT 'desktop' CHECK (viewport_type IN ('desktop', 'mobile', 'tablet')),
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    format TEXT NOT NULL DEFAULT 'png' CHECK (format IN ('png', 'jpeg')),
    quality INTEGER DEFAULT 90,
    full_page BOOLEAN DEFAULT true,
    
    -- Storage information
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    thumbnail_path TEXT DEFAULT NULL,
    image_hash TEXT DEFAULT NULL,
    
    -- Comparison results (if baseline comparison enabled)
    baseline_screenshot_id UUID DEFAULT NULL REFERENCES page_screenshots(id),
    difference_score DECIMAL(5,4) DEFAULT NULL,
    difference_image_path TEXT DEFAULT NULL,
    has_significant_changes BOOLEAN DEFAULT NULL,
    change_analysis JSONB DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(session_id, url_id, viewport_type)
);

-- Page Health Checks table
CREATE TABLE IF NOT EXISTS page_health_checks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES full_website_test_sessions(id) ON DELETE CASCADE,
    url_id UUID NOT NULL REFERENCES discovered_urls(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    
    -- Health check results
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    content_length INTEGER DEFAULT NULL,
    content_type TEXT DEFAULT NULL,
    
    -- Error information
    is_error BOOLEAN NOT NULL DEFAULT false,
    error_type TEXT DEFAULT NULL, -- '404', '5xx', 'timeout', 'network', etc.
    error_message TEXT DEFAULT NULL,
    
    -- Performance metrics
    dns_lookup_time_ms INTEGER DEFAULT NULL,
    connect_time_ms INTEGER DEFAULT NULL,
    ssl_time_ms INTEGER DEFAULT NULL,
    first_byte_time_ms INTEGER DEFAULT NULL,
    download_time_ms INTEGER DEFAULT NULL,
    
    -- Content analysis
    has_forms BOOLEAN DEFAULT NULL,
    has_images BOOLEAN DEFAULT NULL,
    has_videos BOOLEAN DEFAULT NULL,
    has_external_links BOOLEAN DEFAULT NULL,
    
    -- Previous check comparison
    previous_check_id UUID DEFAULT NULL REFERENCES page_health_checks(id),
    status_changed BOOLEAN DEFAULT NULL,
    response_time_changed BOOLEAN DEFAULT NULL,
    content_changed BOOLEAN DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Page Change Detection table
CREATE TABLE IF NOT EXISTS page_change_detections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES full_website_test_sessions(id) ON DELETE CASCADE,
    url_id UUID NOT NULL REFERENCES discovered_urls(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    
    -- Change detection results
    change_type TEXT NOT NULL CHECK (change_type IN ('content', 'structure', 'style', 'performance', 'status')),
    severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    
    -- Change details
    old_value TEXT DEFAULT NULL,
    new_value TEXT DEFAULT NULL,
    change_details JSONB DEFAULT NULL,
    
    -- Location information
    element_selector TEXT DEFAULT NULL,
    element_text TEXT DEFAULT NULL,
    
    -- Impact assessment
    impact_score DECIMAL(3,2) DEFAULT NULL,
    requires_attention BOOLEAN DEFAULT false,
    
    -- Resolution
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID DEFAULT NULL REFERENCES auth.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    resolution_notes TEXT DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Full Website Test Alerts table
CREATE TABLE IF NOT EXISTS full_website_test_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES full_website_test_sessions(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('error', 'warning', 'info', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Alert context
    url TEXT DEFAULT NULL,
    url_id UUID DEFAULT NULL REFERENCES discovered_urls(id),
    component TEXT DEFAULT NULL, -- 'sitemap_discovery', 'screenshot', 'health_check', etc.
    
    -- Alert metadata
    metadata JSONB DEFAULT '{}',
    stack_trace TEXT DEFAULT NULL,
    
    -- Alert status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
    resolved_by UUID DEFAULT NULL REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    resolution_notes TEXT DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_full_website_test_sessions_project_id ON full_website_test_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_full_website_test_sessions_status ON full_website_test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_full_website_test_sessions_created_by ON full_website_test_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_full_website_test_sessions_created_at ON full_website_test_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_discovered_urls_session_id ON discovered_urls(session_id);
CREATE INDEX IF NOT EXISTS idx_discovered_urls_status ON discovered_urls(status);
CREATE INDEX IF NOT EXISTS idx_discovered_urls_normalized_url ON discovered_urls(normalized_url);

CREATE INDEX IF NOT EXISTS idx_page_screenshots_session_id ON page_screenshots(session_id);
CREATE INDEX IF NOT EXISTS idx_page_screenshots_url_id ON page_screenshots(url_id);
CREATE INDEX IF NOT EXISTS idx_page_screenshots_viewport_type ON page_screenshots(viewport_type);
CREATE INDEX IF NOT EXISTS idx_page_screenshots_has_changes ON page_screenshots(has_significant_changes) WHERE has_significant_changes IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_page_health_checks_session_id ON page_health_checks(session_id);
CREATE INDEX IF NOT EXISTS idx_page_health_checks_url_id ON page_health_checks(url_id);
CREATE INDEX IF NOT EXISTS idx_page_health_checks_is_error ON page_health_checks(is_error);
CREATE INDEX IF NOT EXISTS idx_page_health_checks_status_code ON page_health_checks(status_code);

CREATE INDEX IF NOT EXISTS idx_page_change_detections_session_id ON page_change_detections(session_id);
CREATE INDEX IF NOT EXISTS idx_page_change_detections_severity ON page_change_detections(severity);
CREATE INDEX IF NOT EXISTS idx_page_change_detections_requires_attention ON page_change_detections(requires_attention);
CREATE INDEX IF NOT EXISTS idx_page_change_detections_acknowledged ON page_change_detections(acknowledged);

CREATE INDEX IF NOT EXISTS idx_full_website_test_alerts_session_id ON full_website_test_alerts(session_id);
CREATE INDEX IF NOT EXISTS idx_full_website_test_alerts_alert_type ON full_website_test_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_full_website_test_alerts_status ON full_website_test_alerts(status);

-- Create updated_at triggers for tables that need them
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_full_website_test_sessions_updated_at ON full_website_test_sessions;
CREATE TRIGGER update_full_website_test_sessions_updated_at 
    BEFORE UPDATE ON full_website_test_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_discovered_urls_updated_at ON discovered_urls;
CREATE TRIGGER update_discovered_urls_updated_at 
    BEFORE UPDATE ON discovered_urls 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_page_screenshots_updated_at ON page_screenshots;
CREATE TRIGGER update_page_screenshots_updated_at 
    BEFORE UPDATE ON page_screenshots 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_full_website_test_alerts_updated_at ON full_website_test_alerts;
CREATE TRIGGER update_full_website_test_alerts_updated_at 
    BEFORE UPDATE ON full_website_test_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE full_website_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_change_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE full_website_test_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for full_website_test_sessions
DROP POLICY IF EXISTS "Users can view their organization's test sessions" ON full_website_test_sessions;
CREATE POLICY "Users can view their organization's test sessions" 
ON full_website_test_sessions FOR SELECT 
USING (
    project_id IN (
        SELECT p.id FROM projects p
        JOIN organization_members om ON p.organization_id = om.organization_id
        WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
);

DROP POLICY IF EXISTS "Users can create test sessions in their organization" ON full_website_test_sessions;
CREATE POLICY "Users can create test sessions in their organization" 
ON full_website_test_sessions FOR INSERT 
WITH CHECK (
    project_id IN (
        SELECT p.id FROM projects p
        JOIN organization_members om ON p.organization_id = om.organization_id
        WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
    AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Users can update their organization's test sessions" ON full_website_test_sessions;
CREATE POLICY "Users can update their organization's test sessions" 
ON full_website_test_sessions FOR UPDATE 
USING (
    project_id IN (
        SELECT p.id FROM projects p
        JOIN organization_members om ON p.organization_id = om.organization_id
        WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
);

-- Create RLS policies for related tables (they inherit access through session_id)
DROP POLICY IF EXISTS "Users can view data from their test sessions" ON discovered_urls;
CREATE POLICY "Users can view data from their test sessions" 
ON discovered_urls FOR SELECT 
USING (
    session_id IN (
        SELECT id FROM full_website_test_sessions
        WHERE project_id IN (
            SELECT p.id FROM projects p
            JOIN organization_members om ON p.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    )
);

-- Apply same pattern to other related tables
DROP POLICY IF EXISTS "Users can view screenshots from their test sessions" ON page_screenshots;
CREATE POLICY "Users can view screenshots from their test sessions" 
ON page_screenshots FOR SELECT 
USING (
    session_id IN (
        SELECT id FROM full_website_test_sessions
        WHERE project_id IN (
            SELECT p.id FROM projects p
            JOIN organization_members om ON p.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    )
);

DROP POLICY IF EXISTS "Users can view health checks from their test sessions" ON page_health_checks;
CREATE POLICY "Users can view health checks from their test sessions" 
ON page_health_checks FOR SELECT 
USING (
    session_id IN (
        SELECT id FROM full_website_test_sessions
        WHERE project_id IN (
            SELECT p.id FROM projects p
            JOIN organization_members om ON p.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    )
);

DROP POLICY IF EXISTS "Users can view change detections from their test sessions" ON page_change_detections;
CREATE POLICY "Users can view change detections from their test sessions" 
ON page_change_detections FOR SELECT 
USING (
    session_id IN (
        SELECT id FROM full_website_test_sessions
        WHERE project_id IN (
            SELECT p.id FROM projects p
            JOIN organization_members om ON p.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    )
);

DROP POLICY IF EXISTS "Users can view alerts from their test sessions" ON full_website_test_alerts;
CREATE POLICY "Users can view alerts from their test sessions" 
ON full_website_test_alerts FOR SELECT 
USING (
    session_id IN (
        SELECT id FROM full_website_test_sessions
        WHERE project_id IN (
            SELECT p.id FROM projects p
            JOIN organization_members om ON p.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    )
);

-- Grant access to service role for the backend operations
GRANT ALL ON full_website_test_sessions TO service_role;
GRANT ALL ON discovered_urls TO service_role;
GRANT ALL ON page_screenshots TO service_role;
GRANT ALL ON page_health_checks TO service_role;
GRANT ALL ON page_change_detections TO service_role;
GRANT ALL ON full_website_test_alerts TO service_role;

-- Grant appropriate access to authenticated users
GRANT SELECT, INSERT, UPDATE ON full_website_test_sessions TO authenticated;
GRANT SELECT ON discovered_urls TO authenticated;
GRANT SELECT ON page_screenshots TO authenticated;
GRANT SELECT ON page_health_checks TO authenticated;
GRANT SELECT, UPDATE ON page_change_detections TO authenticated;
GRANT SELECT, UPDATE ON full_website_test_alerts TO authenticated;

-- Create a view for simplified session overview
CREATE OR REPLACE VIEW full_website_test_session_overview AS
SELECT 
    fwts.id,
    fwts.name,
    fwts.base_url,
    fwts.status,
    fwts.total_urls,
    fwts.processed_urls,
    fwts.successful_urls,
    fwts.failed_urls,
    fwts.created_at,
    fwts.started_at,
    fwts.completed_at,
    fwts.project_id,
    fwts.target_id,
    fwts.created_by,
    p.name as project_name,
    tt.name as target_name,
    tt.base_url as target_base_url,
    
    -- Progress percentage
    CASE 
        WHEN fwts.total_urls > 0 THEN 
            ROUND((fwts.processed_urls::decimal / fwts.total_urls::decimal) * 100, 2)
        ELSE 0
    END as progress_percentage,
    
    -- Success rate
    CASE 
        WHEN fwts.processed_urls > 0 THEN 
            ROUND((fwts.successful_urls::decimal / fwts.processed_urls::decimal) * 100, 2)
        ELSE 0
    END as success_rate,
    
    -- Duration
    CASE 
        WHEN fwts.completed_at IS NOT NULL AND fwts.started_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (fwts.completed_at - fwts.started_at))
        WHEN fwts.started_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (NOW() - fwts.started_at))
        ELSE NULL
    END as duration_seconds,
    
    -- Alert counts
    (
        SELECT COUNT(*) 
        FROM full_website_test_alerts fwta 
        WHERE fwta.session_id = fwts.id AND fwta.status = 'active'
    ) as active_alerts_count,
    
    -- Screenshot counts
    (
        SELECT COUNT(*) 
        FROM page_screenshots ps 
        WHERE ps.session_id = fwts.id
    ) as total_screenshots,
    
    -- Change detection counts
    (
        SELECT COUNT(*) 
        FROM page_change_detections pcd 
        WHERE pcd.session_id = fwts.id AND pcd.requires_attention = true
    ) as changes_requiring_attention

FROM full_website_test_sessions fwts
LEFT JOIN projects p ON fwts.project_id = p.id
LEFT JOIN test_targets tt ON fwts.target_id = tt.id;

-- Grant access to the view
GRANT SELECT ON full_website_test_session_overview TO authenticated, service_role;

-- Add comment for documentation
COMMENT ON TABLE full_website_test_sessions IS 'Stores full website test session information including configuration and progress tracking';
COMMENT ON TABLE discovered_urls IS 'Stores URLs discovered during sitemap analysis and crawling for each test session';
COMMENT ON TABLE page_screenshots IS 'Stores screenshot information and comparison results for each page in test sessions';
COMMENT ON TABLE page_health_checks IS 'Stores health check results including status codes, response times, and error detection';
COMMENT ON TABLE page_change_detections IS 'Stores detected changes between test runs for monitoring purposes';
COMMENT ON TABLE full_website_test_alerts IS 'Stores alerts and notifications generated during full website testing';
COMMENT ON VIEW full_website_test_session_overview IS 'Provides a comprehensive overview of test sessions with calculated metrics';
