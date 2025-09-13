-- =============================================================================
-- Database Performance Optimization
-- =============================================================================
-- Advanced indexes and performance optimizations for TestBro database

-- =============================================================================
-- Advanced Composite Indexes for Common Query Patterns
-- =============================================================================

-- AI Generations: Common query patterns
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_project ON ai_generations(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_status_type ON ai_generations(status, request_type);
CREATE INDEX IF NOT EXISTS idx_ai_generations_project_created ON ai_generations(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_status_created ON ai_generations(user_id, status, created_at DESC);

-- Browser Sessions: Performance and monitoring queries
CREATE INDEX IF NOT EXISTS idx_browser_sessions_project_status ON browser_sessions(project_id, session_status);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_user_created ON browser_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_active_sessions ON browser_sessions(session_status, started_at) 
    WHERE session_status = 'active';
CREATE INDEX IF NOT EXISTS idx_browser_sessions_device_type ON browser_sessions(device_type, browser_type);

-- Visual Test Flows: Project management and execution queries
CREATE INDEX IF NOT EXISTS idx_visual_flows_project_status ON visual_test_flows(project_id, status);
CREATE INDEX IF NOT EXISTS idx_visual_flows_created_by_status ON visual_test_flows(created_by, status);
CREATE INDEX IF NOT EXISTS idx_visual_flows_ai_generated ON visual_test_flows(ai_generated, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visual_flows_last_executed ON visual_test_flows(last_executed_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_visual_flows_tags ON visual_test_flows USING GIN(tags);

-- Visual Test Steps: Execution order and debugging
CREATE INDEX IF NOT EXISTS idx_visual_steps_flow_order ON visual_test_steps(flow_id, step_order);
CREATE INDEX IF NOT EXISTS idx_visual_steps_action_ai ON visual_test_steps(action_type, ai_generated);
CREATE INDEX IF NOT EXISTS idx_visual_steps_flow_action ON visual_test_steps(flow_id, action_type);

-- Test Schedules: Scheduling and execution management
CREATE INDEX IF NOT EXISTS idx_schedules_project_status ON test_schedules(project_id, status);
CREATE INDEX IF NOT EXISTS idx_schedules_next_execution_active ON test_schedules(next_execution_at ASC, status) 
    WHERE status = 'active' AND next_execution_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedules_created_by_status ON test_schedules(created_by, status);
CREATE INDEX IF NOT EXISTS idx_schedules_execution_stats ON test_schedules(success_count, failure_count, execution_count);

-- Scheduled Executions: History and monitoring
CREATE INDEX IF NOT EXISTS idx_scheduled_exec_schedule_status ON scheduled_test_executions(schedule_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_exec_status_created ON scheduled_test_executions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_exec_execution_type ON scheduled_test_executions(execution_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_exec_duration ON scheduled_test_executions(duration_seconds DESC NULLS LAST);

-- Job Queue: Queue management and processing
CREATE INDEX IF NOT EXISTS idx_job_queue_processor_active ON job_queue(processor_id, status) 
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_job_queue_type_status ON job_queue(job_type, status);
CREATE INDEX IF NOT EXISTS idx_job_queue_created_by_status ON job_queue(created_by, status);
CREATE INDEX IF NOT EXISTS idx_job_queue_attempts ON job_queue(attempts, max_attempts);
CREATE INDEX IF NOT EXISTS idx_job_queue_failed_jobs ON job_queue(status, attempts, created_at DESC) 
    WHERE status = 'failed';

-- =============================================================================
-- GIN Indexes for JSONB Columns (Full-text search and complex queries)
-- =============================================================================

-- AI Generations: Response content and metadata search
CREATE INDEX IF NOT EXISTS idx_ai_generations_response_gin ON ai_generations USING GIN(response_content);
CREATE INDEX IF NOT EXISTS idx_ai_generations_metadata_gin ON ai_generations USING GIN(metadata);

-- Browser Sessions: Session data search
CREATE INDEX IF NOT EXISTS idx_browser_sessions_data_gin ON browser_sessions USING GIN(session_data);

-- Visual Test Flows: Browser settings search
CREATE INDEX IF NOT EXISTS idx_visual_flows_settings_gin ON visual_test_flows USING GIN(browser_settings);

-- Visual Test Steps: Element position and complex data
CREATE INDEX IF NOT EXISTS idx_visual_steps_position_gin ON visual_test_steps USING GIN(element_position);

-- Test Schedules: Notification settings search
CREATE INDEX IF NOT EXISTS idx_schedules_notifications_gin ON test_schedules USING GIN(notification_settings);

-- Scheduled Executions: Results and logs search
CREATE INDEX IF NOT EXISTS idx_scheduled_exec_results_gin ON scheduled_test_executions USING GIN(execution_results);
CREATE INDEX IF NOT EXISTS idx_scheduled_exec_logs_gin ON scheduled_test_executions USING GIN(execution_logs);

-- Job Queue: Job data and options search
CREATE INDEX IF NOT EXISTS idx_job_queue_data_gin ON job_queue USING GIN(job_data);
CREATE INDEX IF NOT EXISTS idx_job_queue_options_gin ON job_queue USING GIN(job_options);
CREATE INDEX IF NOT EXISTS idx_job_queue_progress_gin ON job_queue USING GIN(progress);
CREATE INDEX IF NOT EXISTS idx_job_queue_result_gin ON job_queue USING GIN(result);

-- =============================================================================
-- Text Search Indexes for Full-Text Search
-- =============================================================================

-- AI Generations: Text search on prompts and error messages
CREATE INDEX IF NOT EXISTS idx_ai_generations_prompt_search ON ai_generations USING GIN(to_tsvector('english', prompt));
CREATE INDEX IF NOT EXISTS idx_ai_generations_error_search ON ai_generations USING GIN(to_tsvector('english', COALESCE(error_message, '')));

-- Visual Test Flows: Name and description search
CREATE INDEX IF NOT EXISTS idx_visual_flows_text_search ON visual_test_flows 
    USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(ai_prompt, '')));

-- Visual Test Steps: Description and selector search
CREATE INDEX IF NOT EXISTS idx_visual_steps_text_search ON visual_test_steps 
    USING GIN(to_tsvector('english', 
        COALESCE(element_description, '') || ' ' || 
        COALESCE(natural_language_description, '') || ' ' || 
        COALESCE(element_selector, '')
    ));

-- Test Schedules: Name and description search
CREATE INDEX IF NOT EXISTS idx_schedules_text_search ON test_schedules 
    USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Job Queue: Job name and error message search
CREATE INDEX IF NOT EXISTS idx_job_queue_text_search ON job_queue 
    USING GIN(to_tsvector('english', job_name || ' ' || COALESCE(error_message, '')));

-- =============================================================================
-- Partial Indexes for Specific Conditions
-- =============================================================================

-- Active browser sessions only
CREATE INDEX IF NOT EXISTS idx_browser_sessions_active_only ON browser_sessions(user_id, created_at DESC) 
    WHERE session_status = 'active';

-- Failed AI generations for debugging
CREATE INDEX IF NOT EXISTS idx_ai_generations_failed ON ai_generations(created_at DESC, processing_time_ms) 
    WHERE status = 'failed';

-- Visual flows that need execution
CREATE INDEX IF NOT EXISTS idx_visual_flows_never_executed ON visual_test_flows(project_id, created_at DESC) 
    WHERE last_executed_at IS NULL AND status = 'active';

-- Overdue scheduled tests
CREATE INDEX IF NOT EXISTS idx_schedules_overdue ON test_schedules(next_execution_at ASC) 
    WHERE status = 'active' AND next_execution_at < NOW();

-- Running executions (for monitoring)
CREATE INDEX IF NOT EXISTS idx_scheduled_exec_running ON scheduled_test_executions(started_at ASC) 
    WHERE status = 'running';

-- High priority pending jobs
CREATE INDEX IF NOT EXISTS idx_job_queue_high_priority ON job_queue(created_at ASC) 
    WHERE status = 'pending' AND priority > 0;

-- Jobs ready for retry
CREATE INDEX IF NOT EXISTS idx_job_queue_retry_ready ON job_queue(delay_until ASC) 
    WHERE status = 'delayed' AND delay_until <= NOW();

-- =============================================================================
-- Performance Monitoring Views
-- =============================================================================

-- Create view for AI generation performance metrics
CREATE OR REPLACE VIEW ai_generation_performance AS
SELECT 
    request_type,
    model_used,
    status,
    COUNT(*) as total_requests,
    AVG(processing_time_ms) as avg_processing_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY processing_time_ms) as median_processing_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY processing_time_ms) as p95_processing_time,
    AVG(tokens_used) as avg_tokens,
    AVG(confidence_score) as avg_confidence,
    DATE_TRUNC('hour', created_at) as hour_bucket
FROM ai_generations
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY request_type, model_used, status, DATE_TRUNC('hour', created_at);

-- Create view for browser session statistics
CREATE OR REPLACE VIEW browser_session_stats AS
SELECT 
    browser_type,
    device_type,
    session_status,
    COUNT(*) as session_count,
    AVG(actions_executed) as avg_actions,
    AVG(screenshots_taken) as avg_screenshots,
    AVG(errors_encountered) as avg_errors,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
    DATE_TRUNC('hour', created_at) as hour_bucket
FROM browser_sessions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY browser_type, device_type, session_status, DATE_TRUNC('hour', created_at);

-- Create view for job queue performance
CREATE OR REPLACE VIEW job_queue_performance AS
SELECT 
    job_type,
    status,
    COUNT(*) as job_count,
    AVG(attempts) as avg_attempts,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_processing_seconds,
    AVG(EXTRACT(EPOCH FROM (started_at - created_at))) as avg_queue_wait_seconds,
    DATE_TRUNC('hour', created_at) as hour_bucket
FROM job_queue
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY job_type, status, DATE_TRUNC('hour', created_at);

-- Create view for test execution trends
CREATE OR REPLACE VIEW test_execution_trends AS
SELECT 
    s.project_id,
    s.schedule_type,
    COUNT(*) as execution_count,
    AVG(e.tests_total) as avg_tests_total,
    AVG(e.tests_passed::float / NULLIF(e.tests_total, 0)) as avg_pass_rate,
    AVG(e.duration_seconds) as avg_duration_seconds,
    DATE_TRUNC('day', e.created_at) as day_bucket
FROM test_schedules s
JOIN scheduled_test_executions e ON s.id = e.schedule_id
WHERE e.created_at >= NOW() - INTERVAL '30 days'
GROUP BY s.project_id, s.schedule_type, DATE_TRUNC('day', e.created_at);

-- =============================================================================
-- Database Maintenance Functions
-- =============================================================================

-- Function to clean up old AI generations (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_ai_generations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_generations 
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND status IN ('completed', 'failed');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old AI generations', deleted_count;
    return deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up completed browser sessions (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_browser_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM browser_sessions 
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND session_status IN ('completed', 'failed', 'cancelled');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old browser sessions', deleted_count;
    return deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old job queue entries (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_job_queue()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM job_queue 
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND status IN ('completed', 'failed', 'cancelled');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old job queue entries', deleted_count;
    return deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old scheduled execution logs (keep last 60 days)
CREATE OR REPLACE FUNCTION cleanup_old_scheduled_executions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM scheduled_test_executions 
    WHERE created_at < NOW() - INTERVAL '60 days'
    AND status IN ('completed', 'failed', 'cancelled');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old scheduled executions', deleted_count;
    return deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Master cleanup function
CREATE OR REPLACE FUNCTION run_database_maintenance()
RETURNS TABLE(cleanup_type TEXT, records_cleaned INTEGER) AS $$
BEGIN
    RETURN QUERY VALUES 
        ('ai_generations', cleanup_old_ai_generations()),
        ('browser_sessions', cleanup_old_browser_sessions()),
        ('job_queue', cleanup_old_job_queue()),
        ('scheduled_executions', cleanup_old_scheduled_executions());
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Performance Monitoring Functions
-- =============================================================================

-- Function to get table sizes and index usage
CREATE OR REPLACE FUNCTION get_table_performance_stats()
RETURNS TABLE(
    table_name TEXT,
    table_size_mb NUMERIC,
    index_size_mb NUMERIC,
    total_size_mb NUMERIC,
    row_count BIGINT,
    sequential_scans BIGINT,
    index_scans BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname || '.' || tablename as table_name,
        ROUND(pg_total_relation_size(schemaname||'.'||tablename)::numeric / 1024 / 1024, 2) as table_size_mb,
        ROUND((pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename))::numeric / 1024 / 1024, 2) as index_size_mb,
        ROUND(pg_total_relation_size(schemaname||'.'||tablename)::numeric / 1024 / 1024, 2) as total_size_mb,
        n_tup_ins + n_tup_upd + n_tup_del as row_count,
        seq_scan as sequential_scans,
        idx_scan as index_scans
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to identify slow queries and suggest indexes
CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS TABLE(
    query_text TEXT,
    calls BIGINT,
    total_exec_time NUMERIC,
    avg_exec_time NUMERIC,
    rows_returned BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUBSTR(query, 1, 100) as query_text,
        calls,
        ROUND(total_exec_time::numeric, 2) as total_exec_time,
        ROUND(mean_exec_time::numeric, 2) as avg_exec_time,
        rows
    FROM pg_stat_statements
    WHERE calls > 10
    ORDER BY mean_exec_time DESC
    LIMIT 20;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'pg_stat_statements extension not available. Install with CREATE EXTENSION pg_stat_statements;';
        RETURN;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Comments for Documentation
-- =============================================================================

COMMENT ON FUNCTION cleanup_old_ai_generations() IS 'Removes AI generations older than 90 days';
COMMENT ON FUNCTION cleanup_old_browser_sessions() IS 'Removes browser sessions older than 30 days';
COMMENT ON FUNCTION cleanup_old_job_queue() IS 'Removes completed job queue entries older than 7 days';
COMMENT ON FUNCTION cleanup_old_scheduled_executions() IS 'Removes scheduled execution records older than 60 days';
COMMENT ON FUNCTION run_database_maintenance() IS 'Runs all cleanup functions and returns summary';
COMMENT ON FUNCTION get_table_performance_stats() IS 'Returns table sizes and usage statistics';
COMMENT ON FUNCTION analyze_query_performance() IS 'Returns slow query analysis (requires pg_stat_statements)';

COMMENT ON VIEW ai_generation_performance IS 'AI generation performance metrics by hour';
COMMENT ON VIEW browser_session_stats IS 'Browser session statistics by hour';
COMMENT ON VIEW job_queue_performance IS 'Job queue performance metrics by hour';
COMMENT ON VIEW test_execution_trends IS 'Test execution trends by day';
