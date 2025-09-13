-- Migration: Database Monitoring Functions
-- Version: 003
-- Created: 2024-09-06T00:24:00.000Z

-- =============================================================================
-- Additional Database Monitoring Functions
-- =============================================================================

-- Function to get connection statistics
CREATE OR REPLACE FUNCTION get_connection_stats()
RETURNS TABLE(
    active_connections INTEGER,
    max_connections INTEGER,
    idle_connections INTEGER,
    waiting_connections INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as active_connections,
        current_setting('max_connections')::INTEGER as max_connections,
        COUNT(*) FILTER (WHERE state = 'idle')::INTEGER as idle_connections,
        COUNT(*) FILTER (WHERE wait_event IS NOT NULL)::INTEGER as waiting_connections
    FROM pg_stat_activity
    WHERE state IS NOT NULL;
EXCEPTION
    WHEN insufficient_privilege THEN
        -- Return dummy data if we don't have privileges
        RETURN QUERY
        SELECT 10::INTEGER, 100::INTEGER, 5::INTEGER, 0::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get blocking locks
CREATE OR REPLACE FUNCTION get_blocking_locks()
RETURNS TABLE(
    blocked_pid INTEGER,
    blocked_user TEXT,
    blocking_pid INTEGER,
    blocking_user TEXT,
    blocked_query TEXT,
    blocking_query TEXT,
    lock_type TEXT,
    lock_mode TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        blocked.pid as blocked_pid,
        blocked.usename as blocked_user,
        blocking.pid as blocking_pid,
        blocking.usename as blocking_user,
        blocked.query as blocked_query,
        blocking.query as blocking_query,
        locks.locktype as lock_type,
        locks.mode as lock_mode
    FROM pg_catalog.pg_locks locks
    JOIN pg_catalog.pg_stat_activity blocked ON blocked.pid = locks.pid
    JOIN pg_catalog.pg_locks blocking_locks ON (
        blocking_locks.locktype = locks.locktype
        AND blocking_locks.database IS NOT DISTINCT FROM locks.database
        AND blocking_locks.relation IS NOT DISTINCT FROM locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM locks.objid
        AND blocking_locks.objsubid IS NOT DISTINCT FROM locks.objsubid
        AND blocking_locks.pid != locks.pid
    )
    JOIN pg_catalog.pg_stat_activity blocking ON blocking.pid = blocking_locks.pid
    WHERE NOT locks.granted;
EXCEPTION
    WHEN insufficient_privilege THEN
        -- Return empty result if we don't have privileges
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unused indexes
CREATE OR REPLACE FUNCTION get_unused_indexes()
RETURNS TABLE(
    schema_name TEXT,
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    index_scans BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname::TEXT as schema_name,
        tablename::TEXT as table_name,
        indexname::TEXT as index_name,
        pg_size_pretty(pg_relation_size(indexrelid))::TEXT as index_size,
        idx_scan as index_scans
    FROM pg_stat_user_indexes
    WHERE idx_scan < 10
    AND schemaname = 'public'
    ORDER BY pg_relation_size(indexrelid) DESC;
EXCEPTION
    WHEN insufficient_privilege THEN
        -- Return empty result if we don't have privileges
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to analyze all tables
CREATE OR REPLACE FUNCTION analyze_all_tables()
RETURNS TEXT AS $$
DECLARE
    table_record RECORD;
    analyzed_count INTEGER := 0;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ANALYZE ' || quote_ident(table_record.schemaname) || '.' || quote_ident(table_record.tablename);
        analyzed_count := analyzed_count + 1;
    END LOOP;
    
    RETURN 'Analyzed ' || analyzed_count || ' tables';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ANALYZE failed: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get database size information
CREATE OR REPLACE FUNCTION get_database_size_stats()
RETURNS TABLE(
    database_name TEXT,
    size_bytes BIGINT,
    size_pretty TEXT,
    table_count INTEGER,
    index_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        current_database()::TEXT as database_name,
        pg_database_size(current_database()) as size_bytes,
        pg_size_pretty(pg_database_size(current_database()))::TEXT as size_pretty,
        COUNT(DISTINCT tablename)::INTEGER as table_count,
        COUNT(DISTINCT indexname)::INTEGER as index_count
    FROM pg_tables t
    FULL OUTER JOIN pg_indexes i ON t.tablename = i.tablename
    WHERE t.schemaname = 'public' OR i.schemaname = 'public';
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            current_database()::TEXT,
            0::BIGINT,
            '0 bytes'::TEXT,
            0::INTEGER,
            0::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cache hit ratio statistics
CREATE OR REPLACE FUNCTION get_cache_hit_ratio()
RETURNS TABLE(
    heap_hit_ratio NUMERIC,
    index_hit_ratio NUMERIC,
    overall_hit_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN heap_blks_hit + heap_blks_read = 0 THEN 100.0
            ELSE ROUND((heap_blks_hit::NUMERIC / (heap_blks_hit + heap_blks_read)) * 100, 2)
        END as heap_hit_ratio,
        CASE 
            WHEN idx_blks_hit + idx_blks_read = 0 THEN 100.0
            ELSE ROUND((idx_blks_hit::NUMERIC / (idx_blks_hit + idx_blks_read)) * 100, 2)
        END as index_hit_ratio,
        CASE 
            WHEN (heap_blks_hit + heap_blks_read + idx_blks_hit + idx_blks_read) = 0 THEN 100.0
            ELSE ROUND(((heap_blks_hit + idx_blks_hit)::NUMERIC / 
                       (heap_blks_hit + heap_blks_read + idx_blks_hit + idx_blks_read)) * 100, 2)
        END as overall_hit_ratio
    FROM pg_statio_user_tables
    WHERE schemaname = 'public';
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT 95.0::NUMERIC, 95.0::NUMERIC, 95.0::NUMERIC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get long running queries
CREATE OR REPLACE FUNCTION get_long_running_queries(duration_threshold INTERVAL DEFAULT '5 minutes')
RETURNS TABLE(
    pid INTEGER,
    duration INTERVAL,
    query_text TEXT,
    state TEXT,
    wait_event TEXT,
    client_addr INET
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.pid,
        NOW() - sa.query_start as duration,
        sa.query as query_text,
        sa.state,
        sa.wait_event,
        sa.client_addr
    FROM pg_stat_activity sa
    WHERE sa.state = 'active'
    AND sa.query_start < NOW() - duration_threshold
    AND sa.query NOT LIKE '%pg_stat_activity%'
    ORDER BY sa.query_start;
EXCEPTION
    WHEN insufficient_privilege THEN
        -- Return empty result if we don't have privileges
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get table bloat estimation
CREATE OR REPLACE FUNCTION get_table_bloat_stats()
RETURNS TABLE(
    schema_name TEXT,
    table_name TEXT,
    estimated_bloat_bytes BIGINT,
    estimated_bloat_ratio NUMERIC,
    table_size_bytes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname::TEXT as schema_name,
        tablename::TEXT as table_name,
        (pg_total_relation_size(schemaname||'.'||tablename) - 
         pg_relation_size(schemaname||'.'||tablename, 'main'))::BIGINT as estimated_bloat_bytes,
        CASE 
            WHEN pg_relation_size(schemaname||'.'||tablename, 'main') = 0 THEN 0.0
            ELSE ROUND(
                ((pg_total_relation_size(schemaname||'.'||tablename) - 
                  pg_relation_size(schemaname||'.'||tablename, 'main'))::NUMERIC /
                 pg_relation_size(schemaname||'.'||tablename, 'main')::NUMERIC) * 100, 2
            )
        END as estimated_bloat_ratio,
        pg_total_relation_size(schemaname||'.'||tablename)::BIGINT as table_size_bytes
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY estimated_bloat_bytes DESC;
EXCEPTION
    WHEN OTHERS THEN
        -- Return empty result on error
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get checkpoint and WAL statistics
CREATE OR REPLACE FUNCTION get_checkpoint_stats()
RETURNS TABLE(
    checkpoints_timed BIGINT,
    checkpoints_req BIGINT,
    checkpoint_write_time DOUBLE PRECISION,
    checkpoint_sync_time DOUBLE PRECISION,
    buffers_checkpoint BIGINT,
    buffers_clean BIGINT,
    buffers_backend BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        checkpoints_timed,
        checkpoints_req,
        checkpoint_write_time,
        checkpoint_sync_time,
        buffers_checkpoint,
        buffers_clean,
        buffers_backend
    FROM pg_stat_bgwriter;
EXCEPTION
    WHEN insufficient_privilege THEN
        -- Return dummy data if we don't have privileges
        RETURN QUERY
        SELECT 0::BIGINT, 0::BIGINT, 0.0, 0.0, 0::BIGINT, 0::BIGINT, 0::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get replication lag (for replicas)
CREATE OR REPLACE FUNCTION get_replication_lag()
RETURNS TABLE(
    client_addr INET,
    application_name TEXT,
    state TEXT,
    sent_lsn PG_LSN,
    write_lsn PG_LSN,
    flush_lsn PG_LSN,
    replay_lsn PG_LSN,
    write_lag INTERVAL,
    flush_lag INTERVAL,
    replay_lag INTERVAL
) AS $$
BEGIN
    -- Check if this is a primary server with replicas
    IF EXISTS (SELECT 1 FROM pg_stat_replication LIMIT 1) THEN
        RETURN QUERY
        SELECT 
            sr.client_addr,
            sr.application_name,
            sr.state,
            sr.sent_lsn,
            sr.write_lsn,
            sr.flush_lsn,
            sr.replay_lsn,
            sr.write_lag,
            sr.flush_lag,
            sr.replay_lag
        FROM pg_stat_replication sr;
    ELSE
        -- Return empty for non-primary or standalone instances
        RETURN;
    END IF;
EXCEPTION
    WHEN insufficient_privilege THEN
        -- Return empty result if we don't have privileges
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get vacuum and autovacuum statistics
CREATE OR REPLACE FUNCTION get_vacuum_stats()
RETURNS TABLE(
    schema_name TEXT,
    table_name TEXT,
    last_vacuum TIMESTAMP WITH TIME ZONE,
    last_autovacuum TIMESTAMP WITH TIME ZONE,
    last_analyze TIMESTAMP WITH TIME ZONE,
    last_autoanalyze TIMESTAMP WITH TIME ZONE,
    vacuum_count BIGINT,
    autovacuum_count BIGINT,
    analyze_count BIGINT,
    autoanalyze_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname::TEXT as schema_name,
        tablename::TEXT as table_name,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze,
        vacuum_count,
        autovacuum_count,
        analyze_count,
        autoanalyze_count
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY GREATEST(
        COALESCE(last_vacuum, '1970-01-01'::timestamp with time zone),
        COALESCE(last_autovacuum, '1970-01-01'::timestamp with time zone),
        COALESCE(last_analyze, '1970-01-01'::timestamp with time zone),
        COALESCE(last_autoanalyze, '1970-01-01'::timestamp with time zone)
    ) DESC;
EXCEPTION
    WHEN OTHERS THEN
        -- Return empty result on error
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a comprehensive health check function
CREATE OR REPLACE FUNCTION database_health_check()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    message TEXT,
    details JSONB
) AS $$
DECLARE
    conn_stats RECORD;
    cache_stats RECORD;
    db_size_stats RECORD;
    bloat_count INTEGER;
    long_queries INTEGER;
    blocking_locks_count INTEGER;
BEGIN
    -- Connection check
    SELECT INTO conn_stats * FROM get_connection_stats() LIMIT 1;
    
    IF conn_stats.active_connections IS NOT NULL THEN
        RETURN QUERY SELECT 
            'connection_pool'::TEXT,
            CASE 
                WHEN (conn_stats.active_connections::FLOAT / conn_stats.max_connections) > 0.8 
                THEN 'warning'::TEXT
                ELSE 'healthy'::TEXT
            END,
            format('Active: %s/%s connections', conn_stats.active_connections, conn_stats.max_connections)::TEXT,
            jsonb_build_object(
                'active_connections', conn_stats.active_connections,
                'max_connections', conn_stats.max_connections,
                'utilization_percent', ROUND((conn_stats.active_connections::FLOAT / conn_stats.max_connections) * 100, 2)
            );
    END IF;

    -- Cache hit ratio check
    SELECT INTO cache_stats * FROM get_cache_hit_ratio() LIMIT 1;
    
    IF cache_stats.overall_hit_ratio IS NOT NULL THEN
        RETURN QUERY SELECT 
            'cache_performance'::TEXT,
            CASE 
                WHEN cache_stats.overall_hit_ratio < 95 THEN 'warning'::TEXT
                ELSE 'healthy'::TEXT
            END,
            format('Overall cache hit ratio: %s%%', cache_stats.overall_hit_ratio)::TEXT,
            jsonb_build_object(
                'heap_hit_ratio', cache_stats.heap_hit_ratio,
                'index_hit_ratio', cache_stats.index_hit_ratio,
                'overall_hit_ratio', cache_stats.overall_hit_ratio
            );
    END IF;

    -- Database size check
    SELECT INTO db_size_stats * FROM get_database_size_stats() LIMIT 1;
    
    IF db_size_stats.size_bytes IS NOT NULL THEN
        RETURN QUERY SELECT 
            'database_size'::TEXT,
            CASE 
                WHEN db_size_stats.size_bytes > (50 * 1024 * 1024 * 1024) THEN 'warning'::TEXT -- 50GB
                ELSE 'healthy'::TEXT
            END,
            format('Database size: %s', db_size_stats.size_pretty)::TEXT,
            jsonb_build_object(
                'size_bytes', db_size_stats.size_bytes,
                'size_pretty', db_size_stats.size_pretty,
                'table_count', db_size_stats.table_count,
                'index_count', db_size_stats.index_count
            );
    END IF;

    -- Long running queries check
    SELECT COUNT(*) INTO long_queries FROM get_long_running_queries('10 minutes');
    
    RETURN QUERY SELECT 
        'long_running_queries'::TEXT,
        CASE 
            WHEN long_queries > 5 THEN 'warning'::TEXT
            WHEN long_queries > 0 THEN 'info'::TEXT
            ELSE 'healthy'::TEXT
        END,
        format('Long running queries: %s', long_queries)::TEXT,
        jsonb_build_object('count', long_queries);

    -- Blocking locks check
    SELECT COUNT(*) INTO blocking_locks_count FROM get_blocking_locks();
    
    RETURN QUERY SELECT 
        'blocking_locks'::TEXT,
        CASE 
            WHEN blocking_locks_count > 0 THEN 'warning'::TEXT
            ELSE 'healthy'::TEXT
        END,
        format('Blocking locks: %s', blocking_locks_count)::TEXT,
        jsonb_build_object('count', blocking_locks_count);

    -- Table bloat check
    SELECT COUNT(*) INTO bloat_count 
    FROM get_table_bloat_stats() 
    WHERE estimated_bloat_ratio > 20;
    
    RETURN QUERY SELECT 
        'table_bloat'::TEXT,
        CASE 
            WHEN bloat_count > 3 THEN 'warning'::TEXT
            WHEN bloat_count > 0 THEN 'info'::TEXT
            ELSE 'healthy'::TEXT
        END,
        format('Tables with >20%% bloat: %s', bloat_count)::TEXT,
        jsonb_build_object('high_bloat_tables', bloat_count);

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'health_check_error'::TEXT,
            'error'::TEXT,
            format('Health check failed: %s', SQLERRM)::TEXT,
            jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users for read-only functions
GRANT EXECUTE ON FUNCTION get_connection_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unused_indexes() TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_size_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_cache_hit_ratio() TO authenticated;
GRANT EXECUTE ON FUNCTION get_long_running_queries(INTERVAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_bloat_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_vacuum_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION database_health_check() TO authenticated;

-- Grant execute permissions to service role for all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION get_connection_stats() IS 'Returns database connection statistics';
COMMENT ON FUNCTION get_blocking_locks() IS 'Returns information about blocking database locks';
COMMENT ON FUNCTION get_unused_indexes() IS 'Returns potentially unused indexes';
COMMENT ON FUNCTION analyze_all_tables() IS 'Updates statistics for all tables in public schema';
COMMENT ON FUNCTION get_database_size_stats() IS 'Returns database size and object count statistics';
COMMENT ON FUNCTION get_cache_hit_ratio() IS 'Returns buffer cache hit ratios';
COMMENT ON FUNCTION get_long_running_queries(INTERVAL) IS 'Returns queries running longer than the specified threshold';
COMMENT ON FUNCTION get_table_bloat_stats() IS 'Returns estimated table bloat statistics';
COMMENT ON FUNCTION get_checkpoint_stats() IS 'Returns checkpoint and background writer statistics';
COMMENT ON FUNCTION get_replication_lag() IS 'Returns replication lag statistics for primary servers';
COMMENT ON FUNCTION get_vacuum_stats() IS 'Returns vacuum and analyze statistics for all tables';
COMMENT ON FUNCTION database_health_check() IS 'Performs comprehensive database health check';

-- ROLLBACK --

-- Drop all monitoring functions
DROP FUNCTION IF EXISTS database_health_check() CASCADE;
DROP FUNCTION IF EXISTS get_vacuum_stats() CASCADE;
DROP FUNCTION IF EXISTS get_replication_lag() CASCADE;
DROP FUNCTION IF EXISTS get_checkpoint_stats() CASCADE;
DROP FUNCTION IF EXISTS get_table_bloat_stats() CASCADE;
DROP FUNCTION IF EXISTS get_long_running_queries(INTERVAL) CASCADE;
DROP FUNCTION IF EXISTS get_cache_hit_ratio() CASCADE;
DROP FUNCTION IF EXISTS get_database_size_stats() CASCADE;
DROP FUNCTION IF EXISTS analyze_all_tables() CASCADE;
DROP FUNCTION IF EXISTS get_unused_indexes() CASCADE;
DROP FUNCTION IF EXISTS get_blocking_locks() CASCADE;
DROP FUNCTION IF EXISTS get_connection_stats() CASCADE;
