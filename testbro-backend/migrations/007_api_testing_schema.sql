-- Migration for API Testing functionality
-- Add tables for API test management

-- API Environments table
CREATE TABLE IF NOT EXISTS api_environments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    variables JSONB DEFAULT '{}',
    base_url VARCHAR(2048),
    headers JSONB DEFAULT '{}',
    authentication JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME zone DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME zone DEFAULT NOW(),
    
    UNIQUE(project_id, name)
);

-- API Test Suites table
CREATE TABLE IF NOT EXISTS api_test_suites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    environment_id UUID REFERENCES api_environments(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME zone DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME zone DEFAULT NOW()
);

-- API Test Steps table
CREATE TABLE IF NOT EXISTS api_test_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suite_id UUID NOT NULL REFERENCES api_test_suites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    step_order INTEGER NOT NULL,
    
    -- Request configuration
    http_method VARCHAR(10) NOT NULL CHECK (http_method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS')),
    url VARCHAR(2048) NOT NULL,
    headers JSONB DEFAULT '{}',
    body JSONB,
    authentication JSONB DEFAULT '{}',
    timeout_ms INTEGER DEFAULT 30000,
    
    -- Test configuration
    validations JSONB DEFAULT '[]',
    data_extractions JSONB DEFAULT '[]',
    continue_on_failure BOOLEAN DEFAULT false,
    retry_count INTEGER DEFAULT 0,
    retry_delay_ms INTEGER DEFAULT 1000,
    
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME zone DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME zone DEFAULT NOW(),
    
    UNIQUE(suite_id, step_order)
);

-- API Test Executions table
CREATE TABLE IF NOT EXISTS api_test_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suite_id UUID NOT NULL REFERENCES api_test_suites(id) ON DELETE CASCADE,
    environment_id UUID REFERENCES api_environments(id) ON DELETE SET NULL,
    
    -- Execution status and metrics
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    total_steps INTEGER NOT NULL DEFAULT 0,
    passed_steps INTEGER NOT NULL DEFAULT 0,
    failed_steps INTEGER NOT NULL DEFAULT 0,
    total_execution_time_ms INTEGER DEFAULT 0,
    
    -- Execution context
    triggered_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trigger_type VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'scheduled', 'webhook', 'pipeline')),
    execution_context JSONB DEFAULT '{}',
    
    started_at TIMESTAMP WITH TIME zone DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME zone,
    
    created_at TIMESTAMP WITH TIME zone DEFAULT NOW()
);

-- API Test Results table (stores individual step results)
CREATE TABLE IF NOT EXISTS api_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES api_test_executions(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES api_test_steps(id) ON DELETE CASCADE,
    
    -- Execution results
    success BOOLEAN NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    error_message TEXT,
    
    -- Request/Response data
    request_data JSONB NOT NULL,
    response_data JSONB,
    validation_results JSONB DEFAULT '[]',
    extracted_data JSONB DEFAULT '{}',
    
    executed_at TIMESTAMP WITH TIME zone DEFAULT NOW()
);

-- Hybrid Test Cases table (combining UI and API tests)
CREATE TABLE IF NOT EXISTS hybrid_test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Test configuration
    steps JSONB NOT NULL DEFAULT '[]', -- Array of hybrid steps
    environment_id UUID REFERENCES api_environments(id) ON DELETE SET NULL,
    
    -- Execution settings
    parallel_execution BOOLEAN DEFAULT false,
    max_parallel_steps INTEGER DEFAULT 1,
    
    tags TEXT[] DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME zone DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME zone DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_environments_project_id ON api_environments(project_id);
CREATE INDEX IF NOT EXISTS idx_api_test_suites_project_id ON api_test_suites(project_id);
CREATE INDEX IF NOT EXISTS idx_api_test_suites_environment_id ON api_test_suites(environment_id);
CREATE INDEX IF NOT EXISTS idx_api_test_steps_suite_id ON api_test_steps(suite_id);
CREATE INDEX IF NOT EXISTS idx_api_test_steps_order ON api_test_steps(suite_id, step_order);
CREATE INDEX IF NOT EXISTS idx_api_test_executions_suite_id ON api_test_executions(suite_id);
CREATE INDEX IF NOT EXISTS idx_api_test_executions_status ON api_test_executions(status);
CREATE INDEX IF NOT EXISTS idx_api_test_executions_started_at ON api_test_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_api_test_results_execution_id ON api_test_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_api_test_results_step_id ON api_test_results(step_id);
CREATE INDEX IF NOT EXISTS idx_hybrid_test_cases_project_id ON hybrid_test_cases(project_id);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_api_environments_updated_at BEFORE UPDATE ON api_environments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_test_suites_updated_at BEFORE UPDATE ON api_test_suites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_test_steps_updated_at BEFORE UPDATE ON api_test_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hybrid_test_cases_updated_at BEFORE UPDATE ON hybrid_test_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();