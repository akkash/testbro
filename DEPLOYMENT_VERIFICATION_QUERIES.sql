-- TestBro.ai Database Deployment Verification Queries
-- Run these queries in Supabase SQL Editor to verify deployment status

-- ==========================================
-- 1. TABLE VERIFICATION
-- ==========================================

-- Check all tables are created
SELECT 
  COUNT(*) as total_tables,
  string_agg(table_name, ', ' ORDER BY table_name) as table_list
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Expected: 21 tables
-- Should include: organizations, organization_members, projects, test_targets, test_suites, test_cases, test_executions, 
-- execution_logs, execution_screenshots, execution_videos, network_logs, performance_metrics, console_logs,
-- ai_insights, ux_scores, browser_sessions, recording_sessions, recorded_actions, notifications, ai_usage_logs, 
-- audit_logs, sessions

-- ==========================================
-- 2. FOREIGN KEY VERIFICATION
-- ==========================================

-- Check all foreign keys are properly established
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Expected: 20+ foreign key constraints including auth.users references

-- ==========================================
-- 3. RLS VERIFICATION
-- ==========================================

-- Check if RLS is enabled on all tables
SELECT 
  schemaname, 
  tablename, 
  rowsecurity,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Count total RLS policies
SELECT 
  COUNT(*) as total_policies,
  COUNT(DISTINCT tablename) as tables_with_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- Expected: 60+ policies across 21 tables

-- List all RLS policies by table
SELECT 
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ') as policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ==========================================
-- 4. INDEX VERIFICATION
-- ==========================================

-- Count all custom indexes (excluding primary keys)
SELECT 
  COUNT(*) as total_custom_indexes
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname NOT LIKE '%_pkey'
  AND indexname NOT LIKE '%_unique_key';

-- Expected: 70+ performance indexes

-- List indexes by table
SELECT 
  tablename,
  COUNT(*) as index_count,
  string_agg(indexname, ', ') as indexes
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
GROUP BY tablename
ORDER BY tablename;

-- Check for GIN indexes (for arrays and JSONB)
SELECT tablename, indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexdef LIKE '%gin%'
ORDER BY tablename;

-- ==========================================
-- 5. STORAGE VERIFICATION
-- ==========================================

-- Check storage buckets
SELECT 
  id, 
  name, 
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
ORDER BY name;

-- Expected: screenshots, videos buckets

-- Check storage policies
SELECT 
  bucket_id,
  name,
  definition
FROM storage.policies
ORDER BY bucket_id, name;

-- Expected: Upload and select policies for both buckets

-- ==========================================
-- 6. DATA TYPE VERIFICATION
-- ==========================================

-- Check JSONB columns
SELECT 
  table_name, 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND data_type = 'jsonb'
ORDER BY table_name, column_name;

-- Check array columns
SELECT 
  table_name, 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND data_type = 'ARRAY'
ORDER BY table_name, column_name;

-- Check UUID columns with proper defaults
SELECT 
  table_name, 
  column_name,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND data_type = 'uuid'
  AND column_default LIKE '%gen_random_uuid%'
ORDER BY table_name, column_name;

-- ==========================================
-- 7. CONSTRAINT VERIFICATION
-- ==========================================

-- Check enum constraints (CHECK constraints)
SELECT 
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name, tc.constraint_name;

-- ==========================================
-- 8. TRIGGER VERIFICATION
-- ==========================================

-- Check for update triggers
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table;

-- Expected: Triggers on organizations, projects, test_cases, test_suites, sessions, test_targets

-- ==========================================
-- 9. FUNCTION VERIFICATION
-- ==========================================

-- Check for custom functions
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%update%'
ORDER BY routine_name;

-- Expected: update_updated_at_column function

-- ==========================================
-- 10. DEPLOYMENT SUMMARY
-- ==========================================

-- Final deployment status summary
SELECT 
  'Tables' as component,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as count,
  '21 expected' as expected_count
UNION ALL
SELECT 
  'Foreign Keys' as component,
  (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY') as count,
  '20+ expected' as expected_count
UNION ALL
SELECT 
  'RLS Policies' as component,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as count,
  '60+ expected' as expected_count
UNION ALL
SELECT 
  'Performance Indexes' as component,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') as count,
  '70+ expected' as expected_count
UNION ALL
SELECT 
  'Storage Buckets' as component,
  (SELECT COUNT(*) FROM storage.buckets) as count,
  '2 expected' as expected_count;

-- ==========================================
-- VERIFICATION COMPLETE
-- ==========================================

-- If all components show expected counts, your database is 100% production-ready!
-- If any component is missing, refer to the specific section in supabase_schema.sql