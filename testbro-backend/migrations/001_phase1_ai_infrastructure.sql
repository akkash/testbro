-- Migration: Phase 1 AI Infrastructure
-- Version: 001
-- Created: 2024-09-06T00:24:00.000Z

-- =============================================================================
-- Phase 1: AI Infrastructure Database Schema
-- =============================================================================

-- AI Generations tracking table
CREATE TABLE IF NOT EXISTS ai_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    target_id UUID REFERENCES test_targets(id) ON DELETE CASCADE,
    
    -- Request details
    prompt TEXT NOT NULL,
    request_type TEXT NOT NULL DEFAULT 'test_generation' CHECK (request_type IN (
        'test_generation', 'execution_analysis', 'selector_optimization', 
        'requirement_analysis', 'step_optimization'
    )),
    
    -- AI response details
    model_used TEXT NOT NULL DEFAULT 'openai/gpt-4',
    response_content JSONB NOT NULL,
    confidence_score DECIMAL(5,2) DEFAULT NULL,
    tokens_used INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT NULL,
    
    -- Generation metadata
    metadata JSONB DEFAULT '{}',
    error_message TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    
    -- Test case association
    generated_test_case_id UUID DEFAULT NULL REFERENCES test_cases(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Browser Sessions table for automation tracking
CREATE TABLE IF NOT EXISTS browser_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
    
    -- Session details
    browser_type TEXT NOT NULL DEFAULT 'chromium' CHECK (browser_type IN ('chromium', 'firefox', 'webkit')),
    session_status TEXT NOT NULL DEFAULT 'active' CHECK (session_status IN (
        'active', 'completed', 'failed', 'cancelled', 'timeout'
    )),
    
    -- Browser configuration
    viewport_width INTEGER DEFAULT 1280,
    viewport_height INTEGER DEFAULT 720,
    device_type TEXT DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    user_agent TEXT DEFAULT NULL,
    
    -- Session data
    current_url TEXT DEFAULT NULL,
    page_title TEXT DEFAULT NULL,
    session_data JSONB DEFAULT '{}',
    
    -- Performance tracking
    actions_executed INTEGER DEFAULT 0,
    screenshots_taken INTEGER DEFAULT 0,
    errors_encountered INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Visual Test Flows (parent container for visual tests)
CREATE TABLE IF NOT EXISTS visual_test_flows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Flow details
    name TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    target_url TEXT NOT NULL,
    
    -- Flow configuration
    browser_settings JSONB DEFAULT '{
        "browser": "chromium",
        "viewport": {"width": 1280, "height": 720},
        "device": "desktop"
    }',
    
    -- Execution settings
    timeout_ms INTEGER DEFAULT 30000,
    retry_count INTEGER DEFAULT 1,
    parallel_execution BOOLEAN DEFAULT false,
    
    -- Status and metadata
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    version INTEGER DEFAULT 1,
    total_steps INTEGER DEFAULT 0,
    
    -- AI metadata
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT DEFAULT NULL,
    
    -- Tags for organization
    tags TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_executed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Visual Test Steps for no-code builder
CREATE TABLE IF NOT EXISTS visual_test_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flow_id UUID NOT NULL REFERENCES visual_test_flows(id) ON DELETE CASCADE,
    
    -- Step details
    step_order INTEGER NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'click', 'type', 'navigate', 'wait', 'verify', 'select', 
        'scroll', 'hover', 'upload', 'screenshot'
    )),
    
    -- Element targeting
    element_selector TEXT DEFAULT NULL,
    element_description TEXT DEFAULT NULL,
    element_position JSONB DEFAULT NULL, -- {x, y, width, height}
    
    -- Action data
    input_value TEXT DEFAULT NULL,
    wait_duration INTEGER DEFAULT NULL,
    verification_type TEXT DEFAULT NULL,
    verification_value TEXT DEFAULT NULL,
    
    -- Visual configuration
    screenshot_before BOOLEAN DEFAULT false,
    screenshot_after BOOLEAN DEFAULT false,
    highlight_element BOOLEAN DEFAULT true,
    
    -- Metadata
    natural_language_description TEXT DEFAULT NULL,
    ai_generated BOOLEAN DEFAULT false,
    ai_confidence_score DECIMAL(5,2) DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Schedules for scheduling infrastructure
CREATE TABLE IF NOT EXISTS test_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Schedule details
    name TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    
    -- Test configuration
    test_case_ids UUID[] DEFAULT '{}',
    test_suite_ids UUID[] DEFAULT '{}',
    visual_test_flow_ids UUID[] DEFAULT '{}',
    
    -- Schedule configuration
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('once', 'recurring', 'cron')),
    cron_expression TEXT DEFAULT NULL,
    timezone TEXT DEFAULT 'UTC',
    
    -- Execution settings
    max_concurrent_tests INTEGER DEFAULT 1,
    retry_failed_tests BOOLEAN DEFAULT true,
    retry_count INTEGER DEFAULT 2,
    notification_settings JSONB DEFAULT '{"email": false, "webhook": false}',
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    next_execution_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    last_execution_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled Test Executions (tracking individual executions)
CREATE TABLE IF NOT EXISTS scheduled_test_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID NOT NULL REFERENCES test_schedules(id) ON DELETE CASCADE,
    
    -- Execution details
    execution_type TEXT NOT NULL CHECK (execution_type IN ('manual', 'scheduled', 'triggered')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'
    )),
    
    -- Test execution tracking
    tests_total INTEGER DEFAULT 0,
    tests_completed INTEGER DEFAULT 0,
    tests_passed INTEGER DEFAULT 0,
    tests_failed INTEGER DEFAULT 0,
    
    -- Results and metadata
    execution_results JSONB DEFAULT '{}',
    error_message TEXT DEFAULT NULL,
    execution_logs JSONB DEFAULT '[]',
    
    -- Performance metrics
    duration_seconds INTEGER DEFAULT NULL,
    queue_wait_time_seconds INTEGER DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Job Queue for background processing
CREATE TABLE IF NOT EXISTS job_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Job identification
    job_type TEXT NOT NULL CHECK (job_type IN (
        'test_execution', 'ai_generation', 'screenshot_capture', 
        'scheduled_test', 'bulk_operation', 'browser_automation'
    )),
    job_name TEXT NOT NULL,
    
    -- Job data
    job_data JSONB NOT NULL DEFAULT '{}',
    job_options JSONB DEFAULT '{"attempts": 3, "delay": 0}',
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'active', 'completed', 'failed', 'delayed', 'cancelled'
    )),
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Progress tracking
    progress JSONB DEFAULT '{"percent": 0, "message": "Queued"}',
    
    -- Results
    result JSONB DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    stack_trace TEXT DEFAULT NULL,
    
    -- Scheduling
    delay_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    processor_id TEXT DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_project_id ON ai_generations(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_request_type ON ai_generations(request_type);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_browser_sessions_user_id ON browser_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_status ON browser_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_created_at ON browser_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_visual_test_steps_flow_id ON visual_test_steps(flow_id);
CREATE INDEX IF NOT EXISTS idx_visual_test_steps_order ON visual_test_steps(flow_id, step_order);
CREATE INDEX IF NOT EXISTS idx_visual_test_steps_action_type ON visual_test_steps(action_type);

CREATE INDEX IF NOT EXISTS idx_visual_test_flows_project_id ON visual_test_flows(project_id);
CREATE INDEX IF NOT EXISTS idx_visual_test_flows_status ON visual_test_flows(status);
CREATE INDEX IF NOT EXISTS idx_visual_test_flows_created_by ON visual_test_flows(created_by);

CREATE INDEX IF NOT EXISTS idx_test_schedules_project_id ON test_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_test_schedules_status ON test_schedules(status);
CREATE INDEX IF NOT EXISTS idx_test_schedules_next_execution ON test_schedules(next_execution_at) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_scheduled_executions_schedule_id ON scheduled_test_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_executions_status ON scheduled_test_executions(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_executions_created_at ON scheduled_test_executions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_queue_job_type ON job_queue(job_type);
CREATE INDEX IF NOT EXISTS idx_job_queue_priority ON job_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_job_queue_delay_until ON job_queue(delay_until) WHERE status = 'delayed';

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_browser_sessions_updated_at ON browser_sessions;
CREATE TRIGGER update_browser_sessions_updated_at 
    BEFORE UPDATE ON browser_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_visual_test_steps_updated_at ON visual_test_steps;
CREATE TRIGGER update_visual_test_steps_updated_at 
    BEFORE UPDATE ON visual_test_steps 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_visual_test_flows_updated_at ON visual_test_flows;
CREATE TRIGGER update_visual_test_flows_updated_at 
    BEFORE UPDATE ON visual_test_flows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_schedules_updated_at ON test_schedules;
CREATE TRIGGER update_test_schedules_updated_at 
    BEFORE UPDATE ON test_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_queue_updated_at ON job_queue;
CREATE TRIGGER update_job_queue_updated_at 
    BEFORE UPDATE ON job_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_test_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_test_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_test_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- Grant access to service role
GRANT ALL ON ai_generations TO service_role;
GRANT ALL ON browser_sessions TO service_role;
GRANT ALL ON visual_test_steps TO service_role;
GRANT ALL ON visual_test_flows TO service_role;
GRANT ALL ON test_schedules TO service_role;
GRANT ALL ON scheduled_test_executions TO service_role;
GRANT ALL ON job_queue TO service_role;

-- Grant appropriate access to authenticated users
GRANT SELECT, INSERT ON ai_generations TO authenticated;
GRANT ALL ON browser_sessions TO authenticated;
GRANT ALL ON visual_test_steps TO authenticated;
GRANT ALL ON visual_test_flows TO authenticated;
GRANT ALL ON test_schedules TO authenticated;
GRANT SELECT ON scheduled_test_executions TO authenticated;
GRANT SELECT ON job_queue TO authenticated;

-- Comments for documentation
COMMENT ON TABLE ai_generations IS 'Tracks AI-powered test generation requests and responses';
COMMENT ON TABLE browser_sessions IS 'Manages browser automation sessions for testing';
COMMENT ON TABLE visual_test_steps IS 'Individual steps in visual/no-code test flows';
COMMENT ON TABLE visual_test_flows IS 'Visual test flow definitions and configurations';
COMMENT ON TABLE test_schedules IS 'Test scheduling configurations and metadata';
COMMENT ON TABLE scheduled_test_executions IS 'Individual executions of scheduled tests';
COMMENT ON TABLE job_queue IS 'Background job queue for asynchronous processing';

-- ROLLBACK --

-- Drop tables in reverse order to handle foreign key dependencies
DROP TABLE IF EXISTS job_queue CASCADE;
DROP TABLE IF EXISTS scheduled_test_executions CASCADE;
DROP TABLE IF EXISTS test_schedules CASCADE;
DROP TABLE IF EXISTS visual_test_steps CASCADE;
DROP TABLE IF EXISTS visual_test_flows CASCADE;
DROP TABLE IF EXISTS browser_sessions CASCADE;
DROP TABLE IF EXISTS ai_generations CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
