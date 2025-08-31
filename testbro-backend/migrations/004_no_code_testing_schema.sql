-- Migration: Add No-Code Testing Infrastructure
-- Version: 004_no_code_testing_schema.sql
-- Description: Database schema for no-code test recording, element identification, and conversational AI features

-- =====================================================
-- No-Code Test Steps Table
-- =====================================================
CREATE TABLE IF NOT EXISTS no_code_test_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID,
  test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  natural_language TEXT NOT NULL,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('click', 'type', 'verify', 'navigate', 'wait', 'select', 'scroll', 'hover')),
  element_description TEXT,
  element_selector TEXT,
  element_alternatives JSONB DEFAULT '[]'::jsonb,
  value TEXT,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  user_verified BOOLEAN DEFAULT false,
  screenshot_before TEXT, -- Base64 encoded screenshot
  screenshot_after TEXT,  -- Base64 encoded screenshot
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for no_code_test_steps
CREATE INDEX IF NOT EXISTS idx_no_code_test_steps_recording_id ON no_code_test_steps(recording_id);
CREATE INDEX IF NOT EXISTS idx_no_code_test_steps_test_case_id ON no_code_test_steps(test_case_id);
CREATE INDEX IF NOT EXISTS idx_no_code_test_steps_order ON no_code_test_steps(test_case_id, order_index);
CREATE INDEX IF NOT EXISTS idx_no_code_test_steps_action_type ON no_code_test_steps(action_type);
CREATE INDEX IF NOT EXISTS idx_no_code_test_steps_confidence ON no_code_test_steps(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_no_code_test_steps_verified ON no_code_test_steps(user_verified);

-- =====================================================
-- Interactive Recordings Table
-- =====================================================
CREATE TABLE IF NOT EXISTS interactive_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'recording' CHECK (status IN ('recording', 'paused', 'completed', 'failed', 'cancelled')),
  auto_generate_steps BOOLEAN DEFAULT true,
  real_time_preview BOOLEAN DEFAULT true,
  steps_count INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  current_url TEXT,
  browser_session_id UUID,
  settings JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for interactive_recordings
CREATE INDEX IF NOT EXISTS idx_interactive_recordings_session_id ON interactive_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_interactive_recordings_project_id ON interactive_recordings(project_id);
CREATE INDEX IF NOT EXISTS idx_interactive_recordings_created_by ON interactive_recordings(created_by);
CREATE INDEX IF NOT EXISTS idx_interactive_recordings_status ON interactive_recordings(status);
CREATE INDEX IF NOT EXISTS idx_interactive_recordings_created_at ON interactive_recordings(created_at DESC);

-- =====================================================
-- Element Identifications Table
-- =====================================================
CREATE TABLE IF NOT EXISTS element_identifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES interactive_recordings(id) ON DELETE CASCADE,
  element_type VARCHAR(50) NOT NULL,
  natural_description TEXT NOT NULL,
  primary_selector TEXT NOT NULL,
  alternative_selectors JSONB DEFAULT '[]'::jsonb,
  confidence_scores JSONB DEFAULT '[]'::jsonb,
  visual_context JSONB DEFAULT '{}'::jsonb,
  technical_details JSONB DEFAULT '{}'::jsonb,
  interaction_hints JSONB DEFAULT '{}'::jsonb,
  confidence_metrics JSONB DEFAULT '{}'::jsonb,
  coordinates JSONB,
  screenshot_region TEXT, -- Base64 encoded element screenshot
  page_url TEXT,
  page_context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for element_identifications
CREATE INDEX IF NOT EXISTS idx_element_identifications_recording_id ON element_identifications(recording_id);
CREATE INDEX IF NOT EXISTS idx_element_identifications_element_type ON element_identifications(element_type);
CREATE INDEX IF NOT EXISTS idx_element_identifications_page_url ON element_identifications(page_url);
CREATE INDEX IF NOT EXISTS idx_element_identifications_created_at ON element_identifications(created_at DESC);

-- GIN index for JSON search
CREATE INDEX IF NOT EXISTS idx_element_identifications_technical_details_gin ON element_identifications USING GIN(technical_details);
CREATE INDEX IF NOT EXISTS idx_element_identifications_visual_context_gin ON element_identifications USING GIN(visual_context);

-- =====================================================
-- Conversational Test Sessions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS conversational_test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  conversation_history JSONB DEFAULT '[]'::jsonb,
  generated_steps JSONB DEFAULT '[]'::jsonb,
  current_context JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
  ai_model VARCHAR(100) DEFAULT 'gpt-4',
  session_settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for conversational_test_sessions
CREATE INDEX IF NOT EXISTS idx_conversational_test_sessions_project_id ON conversational_test_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_conversational_test_sessions_created_by ON conversational_test_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_conversational_test_sessions_status ON conversational_test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_conversational_test_sessions_created_at ON conversational_test_sessions(created_at DESC);

-- =====================================================
-- Test Templates Table
-- =====================================================
CREATE TABLE IF NOT EXISTS test_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  template_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  usage_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  created_by UUID,
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for test_templates
CREATE INDEX IF NOT EXISTS idx_test_templates_category ON test_templates(category);
CREATE INDEX IF NOT EXISTS idx_test_templates_is_public ON test_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_test_templates_organization_id ON test_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_test_templates_usage_count ON test_templates(usage_count DESC);

-- GIN index for tags search
CREATE INDEX IF NOT EXISTS idx_test_templates_tags_gin ON test_templates USING GIN(tags);

-- =====================================================
-- AI Learning Data Table (for improving recognition)
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_learning_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('element_identification', 'step_generation', 'natural_language', 'selector_validation')),
  input_data JSONB NOT NULL,
  expected_output JSONB NOT NULL,
  actual_output JSONB,
  user_feedback JSONB,
  confidence_score DECIMAL(3,2),
  validation_status VARCHAR(50) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'rejected', 'improved')),
  model_version VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID
);

-- Indexes for ai_learning_data
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_type ON ai_learning_data(data_type);
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_validation_status ON ai_learning_data(validation_status);
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_confidence ON ai_learning_data(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_created_at ON ai_learning_data(created_at DESC);

-- =====================================================
-- User Onboarding Progress Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  onboarding_type VARCHAR(50) NOT NULL CHECK (onboarding_type IN ('no_code_recorder', 'visual_builder', 'conversational_ai', 'general')),
  current_step INTEGER DEFAULT 0,
  completed_steps JSONB DEFAULT '[]'::jsonb,
  skipped_steps JSONB DEFAULT '[]'::jsonb,
  total_steps INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
  preferences JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_onboarding_progress
CREATE INDEX IF NOT EXISTS idx_user_onboarding_progress_user_id ON user_onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_progress_type_status ON user_onboarding_progress(onboarding_type, status);

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
CREATE TRIGGER update_no_code_test_steps_updated_at BEFORE UPDATE ON no_code_test_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interactive_recordings_updated_at BEFORE UPDATE ON interactive_recordings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_element_identifications_updated_at BEFORE UPDATE ON element_identifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversational_test_sessions_updated_at BEFORE UPDATE ON conversational_test_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_templates_updated_at BEFORE UPDATE ON test_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_onboarding_progress_updated_at BEFORE UPDATE ON user_onboarding_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update steps count in interactive_recordings
CREATE OR REPLACE FUNCTION update_recording_steps_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE interactive_recordings 
        SET steps_count = steps_count + 1 
        WHERE id = NEW.recording_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE interactive_recordings 
        SET steps_count = GREATEST(0, steps_count - 1) 
        WHERE id = OLD.recording_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger to automatically update steps count
CREATE TRIGGER update_recording_steps_count_trigger
AFTER INSERT OR DELETE ON no_code_test_steps
FOR EACH ROW EXECUTE FUNCTION update_recording_steps_count();

-- =====================================================
-- Insert Sample Test Templates
-- =====================================================
INSERT INTO test_templates (name, description, category, template_steps, tags, is_public) VALUES
('User Login Flow', 'Test user authentication flow with email and password', 'Authentication', 
 '[
   {"order": 1, "action": "navigate", "description": "Go to login page", "element": "login page"},
   {"order": 2, "action": "type", "description": "Enter email address", "element": "email input", "value": "test@example.com"},
   {"order": 3, "action": "type", "description": "Enter password", "element": "password input", "value": "password123"},
   {"order": 4, "action": "click", "description": "Click login button", "element": "login button"},
   {"order": 5, "action": "verify", "description": "Verify successful login", "element": "dashboard or welcome message"}
 ]', '["authentication", "login", "email", "password"]', true),

('E-commerce Checkout', 'Complete purchase flow from cart to confirmation', 'E-commerce',
 '[
   {"order": 1, "action": "click", "description": "Add item to cart", "element": "add to cart button"},
   {"order": 2, "action": "navigate", "description": "Go to cart", "element": "cart page"},
   {"order": 3, "action": "click", "description": "Proceed to checkout", "element": "checkout button"},
   {"order": 4, "action": "type", "description": "Enter shipping address", "element": "address form"},
   {"order": 5, "action": "select", "description": "Choose payment method", "element": "payment options"},
   {"order": 6, "action": "click", "description": "Complete purchase", "element": "place order button"},
   {"order": 7, "action": "verify", "description": "Verify order confirmation", "element": "confirmation message"}
 ]', '["ecommerce", "checkout", "payment", "shopping"]', true),

('Search and Filter', 'Test search functionality with filters', 'Navigation',
 '[
   {"order": 1, "action": "type", "description": "Enter search term", "element": "search input", "value": "test query"},
   {"order": 2, "action": "click", "description": "Submit search", "element": "search button"},
   {"order": 3, "action": "verify", "description": "Verify search results", "element": "results list"},
   {"order": 4, "action": "select", "description": "Apply filter", "element": "filter dropdown"},
   {"order": 5, "action": "verify", "description": "Verify filtered results", "element": "filtered results"}
 ]', '["search", "filter", "navigation", "results"]', true),

('Form Submission', 'Test form validation and submission', 'Forms',
 '[
   {"order": 1, "action": "type", "description": "Fill required field", "element": "required input"},
   {"order": 2, "action": "type", "description": "Fill optional field", "element": "optional input"},
   {"order": 3, "action": "select", "description": "Choose from dropdown", "element": "dropdown menu"},
   {"order": 4, "action": "click", "description": "Submit form", "element": "submit button"},
   {"order": 5, "action": "verify", "description": "Verify success message", "element": "success notification"}
 ]', '["forms", "validation", "submission"]', true),

('User Registration', 'New user account creation flow', 'Authentication',
 '[
   {"order": 1, "action": "navigate", "description": "Go to registration page", "element": "signup page"},
   {"order": 2, "action": "type", "description": "Enter full name", "element": "name input"},
   {"order": 3, "action": "type", "description": "Enter email", "element": "email input"},
   {"order": 4, "action": "type", "description": "Create password", "element": "password input"},
   {"order": 5, "action": "type", "description": "Confirm password", "element": "confirm password input"},
   {"order": 6, "action": "click", "description": "Accept terms", "element": "terms checkbox"},
   {"order": 7, "action": "click", "description": "Create account", "element": "register button"},
   {"order": 8, "action": "verify", "description": "Verify account created", "element": "welcome message"}
 ]', '["registration", "signup", "account", "authentication"]', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Grant Permissions (adjust as needed for your setup)
-- =====================================================
-- These would be adjusted based on your authentication setup
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- Views for Analytics and Reporting
-- =====================================================

-- View for recording success metrics
CREATE OR REPLACE VIEW recording_success_metrics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_recordings,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_recordings,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_recordings,
    AVG(steps_count) as avg_steps_per_recording,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds
FROM interactive_recordings
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- View for element identification quality
CREATE OR REPLACE VIEW element_identification_quality AS
SELECT 
    element_type,
    COUNT(*) as total_identifications,
    AVG((confidence_metrics->>'overall')::DECIMAL) as avg_confidence,
    COUNT(*) FILTER (WHERE (confidence_metrics->>'overall')::DECIMAL > 0.8) as high_confidence_count,
    COUNT(*) FILTER (WHERE (confidence_metrics->>'overall')::DECIMAL < 0.5) as low_confidence_count
FROM element_identifications
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY element_type
ORDER BY total_identifications DESC;

-- View for test step verification rates
CREATE OR REPLACE VIEW step_verification_rates AS
SELECT 
    action_type,
    COUNT(*) as total_steps,
    COUNT(*) FILTER (WHERE user_verified = true) as verified_steps,
    ROUND(COUNT(*) FILTER (WHERE user_verified = true) * 100.0 / COUNT(*), 2) as verification_rate,
    AVG(confidence_score) as avg_confidence
FROM no_code_test_steps
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY action_type
ORDER BY total_steps DESC;

-- =====================================================
-- End of Migration
-- =====================================================