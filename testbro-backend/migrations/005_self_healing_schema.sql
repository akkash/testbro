-- Migration: Add Self-Healing Test Maintenance Infrastructure
-- Version: 005_self_healing_schema.sql
-- Description: Database schema for automated test maintenance, UI change detection, and intelligent healing

-- =====================================================
-- Healing Sessions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS healing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('failure_detection', 'scheduled_check', 'manual_trigger')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'healing', 'validating', 'completed', 'failed', 'requires_review')),
  failure_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  healing_attempts JSONB DEFAULT '[]'::jsonb,
  successful_adaptations JSONB DEFAULT '[]'::jsonb,
  validation_results JSONB DEFAULT '{}'::jsonb,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  healing_strategy VARCHAR(100),
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for healing_sessions
CREATE INDEX IF NOT EXISTS idx_healing_sessions_test_case_id ON healing_sessions(test_case_id);
CREATE INDEX IF NOT EXISTS idx_healing_sessions_execution_id ON healing_sessions(execution_id);
CREATE INDEX IF NOT EXISTS idx_healing_sessions_status ON healing_sessions(status);
CREATE INDEX IF NOT EXISTS idx_healing_sessions_trigger_type ON healing_sessions(trigger_type);
CREATE INDEX IF NOT EXISTS idx_healing_sessions_confidence ON healing_sessions(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_healing_sessions_created_at ON healing_sessions(created_at DESC);

-- GIN indexes for JSON search
CREATE INDEX IF NOT EXISTS idx_healing_sessions_failure_details_gin ON healing_sessions USING GIN(failure_details);
CREATE INDEX IF NOT EXISTS idx_healing_sessions_ai_analysis_gin ON healing_sessions USING GIN(ai_analysis);

-- =====================================================
-- UI Change Detections Table
-- =====================================================
CREATE TABLE IF NOT EXISTS ui_change_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  detection_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  baseline_dom_hash TEXT,
  current_dom_hash TEXT,
  element_changes JSONB DEFAULT '[]'::jsonb,
  layout_changes JSONB DEFAULT '{}'::jsonb,
  content_changes JSONB DEFAULT '{}'::jsonb,
  accessibility_changes JSONB DEFAULT '{}'::jsonb,
  performance_impact JSONB DEFAULT '{}'::jsonb,
  confidence_metrics JSONB DEFAULT '{}'::jsonb,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ui_change_detections
CREATE INDEX IF NOT EXISTS idx_ui_change_detections_execution_id ON ui_change_detections(execution_id);
CREATE INDEX IF NOT EXISTS idx_ui_change_detections_test_case_id ON ui_change_detections(test_case_id);
CREATE INDEX IF NOT EXISTS idx_ui_change_detections_page_url ON ui_change_detections(page_url);
CREATE INDEX IF NOT EXISTS idx_ui_change_detections_detection_timestamp ON ui_change_detections(detection_timestamp DESC);

-- GIN indexes for JSON search
CREATE INDEX IF NOT EXISTS idx_ui_change_detections_element_changes_gin ON ui_change_detections USING GIN(element_changes);
CREATE INDEX IF NOT EXISTS idx_ui_change_detections_ai_analysis_gin ON ui_change_detections USING GIN(ai_analysis);

-- =====================================================
-- Element Semantic Profiles Table
-- =====================================================
CREATE TABLE IF NOT EXISTS element_semantic_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
  step_id UUID,
  selector TEXT NOT NULL,
  element_type VARCHAR(50) NOT NULL,
  semantic_role VARCHAR(100),
  text_content TEXT,
  attributes JSONB DEFAULT '{}'::jsonb,
  position JSONB DEFAULT '{}'::jsonb,
  visual_characteristics JSONB DEFAULT '{}'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  stability_score DECIMAL(3,2) CHECK (stability_score >= 0 AND stability_score <= 1),
  uniqueness_indicators JSONB DEFAULT '[]'::jsonb,
  interaction_patterns JSONB DEFAULT '{}'::jsonb,
  page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for element_semantic_profiles
CREATE INDEX IF NOT EXISTS idx_element_semantic_profiles_test_case_id ON element_semantic_profiles(test_case_id);
CREATE INDEX IF NOT EXISTS idx_element_semantic_profiles_step_id ON element_semantic_profiles(step_id);
CREATE INDEX IF NOT EXISTS idx_element_semantic_profiles_selector ON element_semantic_profiles(selector);
CREATE INDEX IF NOT EXISTS idx_element_semantic_profiles_element_type ON element_semantic_profiles(element_type);
CREATE INDEX IF NOT EXISTS idx_element_semantic_profiles_semantic_role ON element_semantic_profiles(semantic_role);
CREATE INDEX IF NOT EXISTS idx_element_semantic_profiles_stability_score ON element_semantic_profiles(stability_score DESC);
CREATE INDEX IF NOT EXISTS idx_element_semantic_profiles_page_url ON element_semantic_profiles(page_url);

-- GIN indexes for JSON search
CREATE INDEX IF NOT EXISTS idx_element_semantic_profiles_attributes_gin ON element_semantic_profiles USING GIN(attributes);
CREATE INDEX IF NOT EXISTS idx_element_semantic_profiles_visual_characteristics_gin ON element_semantic_profiles USING GIN(visual_characteristics);
CREATE INDEX IF NOT EXISTS idx_element_semantic_profiles_context_gin ON element_semantic_profiles USING GIN(context);

-- =====================================================
-- Healing Strategies Table
-- =====================================================
CREATE TABLE IF NOT EXISTS healing_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  strategy_type VARCHAR(50) NOT NULL CHECK (strategy_type IN ('selector_adaptation', 'element_remapping', 'context_analysis', 'ml_prediction', 'fallback_chain')),
  algorithm_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  success_conditions JSONB DEFAULT '{}'::jsonb,
  fallback_strategy_id UUID REFERENCES healing_strategies(id),
  confidence_threshold DECIMAL(3,2) DEFAULT 0.7 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1),
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_execution_time_ms INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

-- Indexes for healing_strategies
CREATE INDEX IF NOT EXISTS idx_healing_strategies_strategy_type ON healing_strategies(strategy_type);
CREATE INDEX IF NOT EXISTS idx_healing_strategies_is_active ON healing_strategies(is_active);
CREATE INDEX IF NOT EXISTS idx_healing_strategies_success_rate ON healing_strategies(success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_healing_strategies_usage_count ON healing_strategies(usage_count DESC);

-- GIN index for algorithm_config
CREATE INDEX IF NOT EXISTS idx_healing_strategies_algorithm_config_gin ON healing_strategies USING GIN(algorithm_config);

-- =====================================================
-- Healing Metrics Table
-- =====================================================
CREATE TABLE IF NOT EXISTS healing_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES healing_sessions(id) ON DELETE CASCADE,
  metric_type VARCHAR(100) NOT NULL,
  metric_name VARCHAR(255) NOT NULL,
  metric_value DECIMAL(10,4),
  metric_unit VARCHAR(50),
  additional_data JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for healing_metrics
CREATE INDEX IF NOT EXISTS idx_healing_metrics_session_id ON healing_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_healing_metrics_metric_type ON healing_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_healing_metrics_metric_name ON healing_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_healing_metrics_timestamp ON healing_metrics(timestamp DESC);

-- =====================================================
-- Healing Configurations Table
-- =====================================================
CREATE TABLE IF NOT EXISTS healing_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  auto_healing_enabled BOOLEAN DEFAULT true,
  confidence_threshold DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1),
  max_healing_attempts INTEGER DEFAULT 3,
  require_review_threshold DECIMAL(3,2) DEFAULT 0.6 CHECK (require_review_threshold >= 0 AND require_review_threshold <= 1),
  notification_settings JSONB DEFAULT '{}'::jsonb,
  strategy_preferences JSONB DEFAULT '[]'::jsonb,
  exclusion_patterns JSONB DEFAULT '[]'::jsonb,
  performance_limits JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

-- Indexes for healing_configurations
CREATE INDEX IF NOT EXISTS idx_healing_configurations_project_id ON healing_configurations(project_id);
CREATE INDEX IF NOT EXISTS idx_healing_configurations_organization_id ON healing_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_healing_configurations_auto_healing_enabled ON healing_configurations(auto_healing_enabled);

-- =====================================================
-- Selector Updates Table
-- =====================================================
CREATE TABLE IF NOT EXISTS selector_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  healing_session_id UUID REFERENCES healing_sessions(id) ON DELETE CASCADE,
  test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
  step_id UUID,
  original_selector TEXT NOT NULL,
  new_selector TEXT NOT NULL,
  update_reason VARCHAR(100),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  validation_status VARCHAR(50) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'failed', 'requires_manual_review')),
  semantic_similarity DECIMAL(3,2) CHECK (semantic_similarity >= 0 AND semantic_similarity <= 1),
  alternative_selectors JSONB DEFAULT '[]'::jsonb,
  context_preservation JSONB DEFAULT '{}'::jsonb,
  rollback_data JSONB DEFAULT '{}'::jsonb,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  validated_by UUID,
  validated_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for selector_updates
CREATE INDEX IF NOT EXISTS idx_selector_updates_healing_session_id ON selector_updates(healing_session_id);
CREATE INDEX IF NOT EXISTS idx_selector_updates_test_case_id ON selector_updates(test_case_id);
CREATE INDEX IF NOT EXISTS idx_selector_updates_step_id ON selector_updates(step_id);
CREATE INDEX IF NOT EXISTS idx_selector_updates_validation_status ON selector_updates(validation_status);
CREATE INDEX IF NOT EXISTS idx_selector_updates_confidence_score ON selector_updates(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_selector_updates_applied_at ON selector_updates(applied_at DESC);

-- =====================================================
-- Healing Audit Log Table
-- =====================================================
CREATE TABLE IF NOT EXISTS healing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES healing_sessions(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  action_description TEXT,
  actor_type VARCHAR(50) NOT NULL CHECK (actor_type IN ('system', 'ai_agent', 'user', 'admin')),
  actor_id UUID,
  before_state JSONB DEFAULT '{}'::jsonb,
  after_state JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for healing_audit_log
CREATE INDEX IF NOT EXISTS idx_healing_audit_log_session_id ON healing_audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_healing_audit_log_action_type ON healing_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_healing_audit_log_actor_type ON healing_audit_log(actor_type);
CREATE INDEX IF NOT EXISTS idx_healing_audit_log_actor_id ON healing_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_healing_audit_log_timestamp ON healing_audit_log(timestamp DESC);

-- =====================================================
-- Functions and Triggers
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_healing_sessions_updated_at 
  BEFORE UPDATE ON healing_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_element_semantic_profiles_updated_at 
  BEFORE UPDATE ON element_semantic_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_healing_strategies_updated_at 
  BEFORE UPDATE ON healing_strategies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_healing_configurations_updated_at 
  BEFORE UPDATE ON healing_configurations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update healing strategy metrics
CREATE OR REPLACE FUNCTION update_healing_strategy_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
        UPDATE healing_strategies 
        SET 
            usage_count = usage_count + 1,
            success_rate = (
                SELECT 
                    ROUND(
                        (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*)) * 100, 2
                    )
                FROM healing_sessions 
                WHERE healing_strategy = NEW.healing_strategy
            ),
            updated_at = NOW()
        WHERE name = NEW.healing_strategy;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update strategy metrics
CREATE TRIGGER update_healing_strategy_metrics_trigger
AFTER INSERT OR UPDATE OF status ON healing_sessions
FOR EACH ROW EXECUTE FUNCTION update_healing_strategy_metrics();

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_healing_audit_entry()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO healing_audit_log (
            session_id,
            action_type,
            action_description,
            actor_type,
            actor_id,
            after_state
        ) VALUES (
            NEW.id,
            'session_created',
            'Healing session created for test case: ' || NEW.test_case_id,
            'system',
            NEW.created_by,
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO healing_audit_log (
            session_id,
            action_type,
            action_description,
            actor_type,
            actor_id,
            before_state,
            after_state
        ) VALUES (
            NEW.id,
            'session_updated',
            'Healing session status changed from ' || OLD.status || ' to ' || NEW.status,
            'system',
            NEW.reviewed_by,
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger for audit logging
CREATE TRIGGER healing_sessions_audit_trigger
AFTER INSERT OR UPDATE ON healing_sessions
FOR EACH ROW EXECUTE FUNCTION create_healing_audit_entry();

-- =====================================================
-- Insert Default Healing Strategies
-- =====================================================
INSERT INTO healing_strategies (name, description, strategy_type, algorithm_config, confidence_threshold) VALUES
('Semantic Element Matching', 'Uses AI to find elements with similar semantic meaning and context', 'ml_prediction', 
 '{
   "model_type": "semantic_similarity",
   "similarity_threshold": 0.8,
   "context_weight": 0.3,
   "text_weight": 0.4,
   "attributes_weight": 0.3
 }', 0.8),

('Attribute-Based Adaptation', 'Updates selectors based on element attribute analysis', 'selector_adaptation',
 '{
   "priority_attributes": ["id", "data-testid", "aria-label", "name", "class"],
   "fallback_attributes": ["role", "type", "value", "placeholder"],
   "attribute_stability_weights": {
     "id": 0.95,
     "data-testid": 0.9,
     "aria-label": 0.85,
     "name": 0.8,
     "class": 0.6
   }
 }', 0.7),

('Positional Context Analysis', 'Finds elements based on their position relative to stable landmarks', 'context_analysis',
 '{
   "landmark_selectors": ["header", "nav", "main", "footer", "[role=banner]", "[role=navigation]"],
   "relative_position_tolerance": 50,
   "sibling_analysis_depth": 3,
   "parent_chain_depth": 5
 }', 0.75),

('Text Content Matching', 'Matches elements by their visible text content', 'element_remapping',
 '{
   "exact_text_weight": 0.9,
   "partial_text_weight": 0.6,
   "case_sensitive": false,
   "trim_whitespace": true,
   "min_text_length": 3
 }', 0.6),

('Hierarchical Selector Chain', 'Uses multiple fallback selectors in order of reliability', 'fallback_chain',
 '{
   "selector_chain": [
     "data-testid",
     "id", 
     "aria-label",
     "text_content",
     "class_based",
     "xpath_relative"
   ],
   "chain_confidence_decay": 0.1
 }', 0.5)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Views for Analytics and Monitoring
-- =====================================================

-- View for healing success metrics
CREATE OR REPLACE VIEW healing_success_metrics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_sessions,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_sessions,
    COUNT(*) FILTER (WHERE status = 'requires_review') as review_required_sessions,
    ROUND(AVG(confidence_score), 3) as avg_confidence_score,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as success_rate_percentage
FROM healing_sessions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- View for strategy performance analysis
CREATE OR REPLACE VIEW strategy_performance_analysis AS
SELECT 
    hs.name,
    hs.strategy_type,
    hs.usage_count,
    hs.success_rate,
    hs.avg_execution_time_ms,
    COUNT(heal.id) as recent_usage_count,
    ROUND(
        COUNT(heal.id) FILTER (WHERE heal.status = 'completed')::DECIMAL / 
        NULLIF(COUNT(heal.id), 0) * 100, 2
    ) as recent_success_rate,
    ROUND(AVG(heal.confidence_score), 3) as avg_recent_confidence
FROM healing_strategies hs
LEFT JOIN healing_sessions heal ON hs.name = heal.healing_strategy 
    AND heal.created_at >= NOW() - INTERVAL '7 days'
WHERE hs.is_active = true
GROUP BY hs.id, hs.name, hs.strategy_type, hs.usage_count, hs.success_rate, hs.avg_execution_time_ms
ORDER BY hs.success_rate DESC, recent_success_rate DESC;

-- View for element stability analysis
CREATE OR REPLACE VIEW element_stability_analysis AS
SELECT 
    esp.element_type,
    esp.semantic_role,
    COUNT(*) as total_elements,
    ROUND(AVG(esp.stability_score), 3) as avg_stability_score,
    COUNT(su.id) as total_updates,
    ROUND(
        COUNT(su.id)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 2
    ) as update_rate_percentage,
    ROUND(AVG(su.confidence_score), 3) as avg_update_confidence
FROM element_semantic_profiles esp
LEFT JOIN selector_updates su ON esp.selector = su.original_selector
    AND su.created_at >= NOW() - INTERVAL '30 days'
WHERE esp.created_at >= NOW() - INTERVAL '30 days'
GROUP BY esp.element_type, esp.semantic_role
ORDER BY update_rate_percentage DESC, avg_stability_score ASC;

-- View for healing configuration summary
CREATE OR REPLACE VIEW healing_configuration_summary AS
SELECT 
    hc.project_id,
    p.name as project_name,
    hc.auto_healing_enabled,
    hc.confidence_threshold,
    hc.max_healing_attempts,
    hc.require_review_threshold,
    COUNT(hs.id) as total_healing_sessions,
    COUNT(hs.id) FILTER (WHERE hs.status = 'completed') as successful_healings,
    COUNT(hs.id) FILTER (WHERE hs.status = 'requires_review') as pending_reviews
FROM healing_configurations hc
JOIN projects p ON hc.project_id = p.id
LEFT JOIN healing_sessions hs ON hs.test_case_id IN (
    SELECT tc.id FROM test_cases tc WHERE tc.project_id = hc.project_id
) AND hs.created_at >= NOW() - INTERVAL '30 days'
GROUP BY hc.id, hc.project_id, p.name, hc.auto_healing_enabled, 
         hc.confidence_threshold, hc.max_healing_attempts, hc.require_review_threshold
ORDER BY p.name;

-- =====================================================
-- Performance Optimization Indexes
-- =====================================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_healing_sessions_project_status 
ON healing_sessions(test_case_id, status, created_at DESC)
WHERE status IN ('completed', 'failed', 'requires_review');

CREATE INDEX IF NOT EXISTS idx_ui_change_detections_recent 
ON ui_change_detections(test_case_id, detection_timestamp DESC)
WHERE detection_timestamp >= NOW() - INTERVAL '7 days';

CREATE INDEX IF NOT EXISTS idx_selector_updates_recent_validated 
ON selector_updates(test_case_id, validation_status, applied_at DESC)
WHERE applied_at >= NOW() - INTERVAL '30 days';

-- Partial indexes for active configurations
CREATE INDEX IF NOT EXISTS idx_healing_configurations_active 
ON healing_configurations(project_id, auto_healing_enabled)
WHERE auto_healing_enabled = true;

-- =====================================================
-- End of Migration
-- =====================================================