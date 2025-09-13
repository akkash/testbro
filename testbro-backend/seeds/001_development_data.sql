-- =============================================================================
-- Development Seed Data for TestBro
-- =============================================================================
-- This file contains sample data for development and testing purposes

-- Note: This seed data assumes basic tables (organizations, projects, etc.) already exist
-- Run this after your core schema migrations are complete

-- =============================================================================
-- Sample AI Generations for Development
-- =============================================================================

-- Insert sample AI generations (assuming a test user exists)
INSERT INTO ai_generations (
    user_id, 
    project_id, 
    prompt, 
    request_type, 
    model_used, 
    response_content, 
    confidence_score, 
    tokens_used, 
    processing_time_ms, 
    metadata, 
    status
) VALUES 
-- Sample test generation requests
(
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM projects LIMIT 1),
    'Generate a test to verify user login functionality with email and password validation',
    'test_generation',
    'openai/gpt-4',
    '{
        "test_steps": [
            {
                "action": "navigate",
                "target": "/login",
                "description": "Navigate to login page"
            },
            {
                "action": "type",
                "target": "[data-testid=email-input]",
                "value": "test@example.com",
                "description": "Enter email address"
            },
            {
                "action": "type",
                "target": "[data-testid=password-input]",
                "value": "password123",
                "description": "Enter password"
            },
            {
                "action": "click",
                "target": "[data-testid=login-button]",
                "description": "Click login button"
            },
            {
                "action": "verify",
                "target": ".dashboard",
                "assertion": "visible",
                "description": "Verify user is redirected to dashboard"
            }
        ],
        "expected_results": "User successfully logs in and is redirected to dashboard"
    }',
    0.92,
    1250,
    2340,
    '{"complexity": "medium", "confidence_factors": ["clear_requirements", "standard_pattern"]}',
    'completed'
),
(
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM projects LIMIT 1),
    'Create an e-commerce checkout flow test including product selection and payment',
    'test_generation',
    'openai/gpt-4',
    '{
        "test_steps": [
            {
                "action": "navigate",
                "target": "/products",
                "description": "Navigate to products page"
            },
            {
                "action": "click",
                "target": "[data-product-id=123] .add-to-cart",
                "description": "Add product to cart"
            },
            {
                "action": "click",
                "target": ".cart-icon",
                "description": "Open cart"
            },
            {
                "action": "click",
                "target": ".checkout-button",
                "description": "Proceed to checkout"
            },
            {
                "action": "type",
                "target": "#payment-form [name=card-number]",
                "value": "4111111111111111",
                "description": "Enter test card number"
            },
            {
                "action": "verify",
                "target": ".order-confirmation",
                "assertion": "visible",
                "description": "Verify order confirmation is displayed"
            }
        ]
    }',
    0.88,
    1890,
    3200,
    '{"complexity": "high", "integration_points": ["payment_gateway", "inventory"]}',
    'completed'
),
(
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM projects LIMIT 1),
    'Test form validation for user registration with multiple field types',
    'test_generation',
    'openai/gpt-4',
    '{
        "test_steps": [
            {
                "action": "navigate",
                "target": "/register",
                "description": "Navigate to registration page"
            },
            {
                "action": "type",
                "target": "[name=email]",
                "value": "invalid-email",
                "description": "Enter invalid email"
            },
            {
                "action": "click",
                "target": ".submit-button",
                "description": "Submit form"
            },
            {
                "action": "verify",
                "target": ".email-error",
                "assertion": "visible",
                "description": "Verify email validation error appears"
            }
        ]
    }',
    0.95,
    980,
    1800,
    '{"validation_types": ["email", "password", "required_fields"]}',
    'completed'
);

-- =============================================================================
-- Sample Browser Sessions
-- =============================================================================

INSERT INTO browser_sessions (
    user_id,
    project_id,
    browser_type,
    session_status,
    viewport_width,
    viewport_height,
    device_type,
    current_url,
    page_title,
    session_data,
    actions_executed,
    screenshots_taken,
    errors_encountered,
    started_at,
    completed_at
) VALUES
(
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM projects LIMIT 1),
    'chromium',
    'completed',
    1280,
    720,
    'desktop',
    'https://example.com/dashboard',
    'Dashboard - TestBro Demo',
    '{
        "browser_version": "119.0.6045.105",
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "session_metadata": {
            "test_environment": "development",
            "test_suite": "smoke_tests"
        }
    }',
    15,
    8,
    0,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour 45 minutes'
),
(
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM projects LIMIT 1),
    'firefox',
    'completed',
    1920,
    1080,
    'desktop',
    'https://example.com/checkout',
    'Checkout - E-commerce Demo',
    '{
        "browser_version": "119.0",
        "performance_metrics": {
            "page_load_time": 1200,
            "first_contentful_paint": 800,
            "largest_contentful_paint": 1500
        }
    }',
    22,
    12,
    1,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '23 hours 30 minutes'
),
(
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM projects LIMIT 1),
    'webkit',
    'active',
    375,
    667,
    'mobile',
    'https://example.com/mobile',
    'Mobile App - TestBro',
    '{
        "device_model": "iPhone 12",
        "mobile_specific": {
            "touch_events": true,
            "orientation": "portrait"
        }
    }',
    8,
    4,
    0,
    NOW() - INTERVAL '30 minutes',
    NULL
);

-- =============================================================================
-- Sample Visual Test Flows
-- =============================================================================

INSERT INTO visual_test_flows (
    project_id,
    created_by,
    name,
    description,
    target_url,
    browser_settings,
    timeout_ms,
    retry_count,
    status,
    total_steps,
    ai_generated,
    ai_prompt,
    tags
) VALUES
(
    (SELECT id FROM projects LIMIT 1),
    (SELECT id FROM auth.users LIMIT 1),
    'User Login Flow',
    'Complete user authentication flow including login and logout',
    'https://demo.testbro.ai/login',
    '{
        "browser": "chromium",
        "viewport": {"width": 1280, "height": 720},
        "device": "desktop",
        "headless": false,
        "timeout": 30000
    }',
    45000,
    2,
    'active',
    5,
    true,
    'Create a comprehensive login test flow',
    ARRAY['authentication', 'critical', 'smoke-test']
),
(
    (SELECT id FROM projects LIMIT 1),
    (SELECT id FROM auth.users LIMIT 1),
    'E-commerce Checkout',
    'End-to-end e-commerce checkout process with payment',
    'https://demo.testbro.ai/shop',
    '{
        "browser": "chromium",
        "viewport": {"width": 1920, "height": 1080},
        "device": "desktop",
        "headless": true,
        "timeout": 60000
    }',
    120000,
    3,
    'active',
    12,
    true,
    'Test complete e-commerce checkout flow',
    ARRAY['e-commerce', 'payment', 'integration']
),
(
    (SELECT id FROM projects LIMIT 1),
    (SELECT id FROM auth.users LIMIT 1),
    'Mobile Navigation Test',
    'Mobile-responsive navigation and menu testing',
    'https://demo.testbro.ai/mobile',
    '{
        "browser": "chromium",
        "viewport": {"width": 375, "height": 667},
        "device": "mobile",
        "device_name": "iPhone 12",
        "headless": false
    }',
    30000,
    1,
    'draft',
    8,
    false,
    NULL,
    ARRAY['mobile', 'navigation', 'responsive']
);

-- Get the flow IDs for creating steps
WITH flow_ids AS (
    SELECT id, name FROM visual_test_flows 
    WHERE name IN ('User Login Flow', 'E-commerce Checkout', 'Mobile Navigation Test')
)

-- =============================================================================
-- Sample Visual Test Steps
-- =============================================================================

-- Login Flow Steps
INSERT INTO visual_test_steps (
    flow_id,
    step_order,
    action_type,
    element_selector,
    element_description,
    input_value,
    screenshot_before,
    screenshot_after,
    natural_language_description,
    ai_generated,
    ai_confidence_score
) 
SELECT 
    (SELECT id FROM flow_ids WHERE name = 'User Login Flow'),
    1,
    'navigate',
    NULL,
    'Login page URL',
    'https://demo.testbro.ai/login',
    false,
    true,
    'Navigate to the login page to start authentication process',
    true,
    0.95
UNION ALL
SELECT 
    (SELECT id FROM flow_ids WHERE name = 'User Login Flow'),
    2,
    'type',
    '[data-testid="email-input"]',
    'Email input field',
    'user@testbro.ai',
    false,
    false,
    'Enter the user email address in the email field',
    true,
    0.92
UNION ALL
SELECT 
    (SELECT id FROM flow_ids WHERE name = 'User Login Flow'),
    3,
    'type',
    '[data-testid="password-input"]',
    'Password input field',
    'TestPassword123!',
    false,
    false,
    'Enter the password in the password field',
    true,
    0.90
UNION ALL
SELECT 
    (SELECT id FROM flow_ids WHERE name = 'User Login Flow'),
    4,
    'click',
    '[data-testid="login-button"]',
    'Login submit button',
    NULL,
    true,
    true,
    'Click the login button to submit credentials',
    true,
    0.88
UNION ALL
SELECT 
    (SELECT id FROM flow_ids WHERE name = 'User Login Flow'),
    5,
    'verify',
    '.dashboard-header',
    'Dashboard header element',
    NULL,
    false,
    true,
    'Verify that user is successfully redirected to dashboard',
    true,
    0.93;

-- E-commerce Checkout Steps (sample of the 12 steps)
INSERT INTO visual_test_steps (
    flow_id,
    step_order,
    action_type,
    element_selector,
    element_description,
    input_value,
    screenshot_before,
    screenshot_after,
    natural_language_description,
    ai_generated,
    ai_confidence_score
)
SELECT 
    (SELECT id FROM flow_ids WHERE name = 'E-commerce Checkout'),
    1,
    'navigate',
    NULL,
    'Shop page',
    'https://demo.testbro.ai/shop',
    false,
    true,
    'Navigate to the shop page to browse products',
    true,
    0.94
UNION ALL
SELECT 
    (SELECT id FROM flow_ids WHERE name = 'E-commerce Checkout'),
    2,
    'click',
    '[data-product="demo-product-1"] .add-to-cart',
    'Add to cart button for first product',
    NULL,
    false,
    true,
    'Add the first product to shopping cart',
    true,
    0.91
UNION ALL
SELECT 
    (SELECT id FROM flow_ids WHERE name = 'E-commerce Checkout'),
    3,
    'click',
    '.cart-icon',
    'Shopping cart icon',
    NULL,
    false,
    false,
    'Open the shopping cart to view added items',
    true,
    0.89;

-- =============================================================================
-- Sample Test Schedules
-- =============================================================================

INSERT INTO test_schedules (
    project_id,
    created_by,
    name,
    description,
    visual_test_flow_ids,
    schedule_type,
    cron_expression,
    timezone,
    max_concurrent_tests,
    retry_failed_tests,
    retry_count,
    notification_settings,
    status,
    next_execution_at
) VALUES
(
    (SELECT id FROM projects LIMIT 1),
    (SELECT id FROM auth.users LIMIT 1),
    'Daily Smoke Tests',
    'Critical functionality tests run daily at 2 AM',
    ARRAY[(SELECT id FROM visual_test_flows WHERE name = 'User Login Flow')],
    'cron',
    '0 2 * * *',
    'UTC',
    2,
    true,
    3,
    '{
        "email": true,
        "webhook": false,
        "slack": true,
        "recipients": ["team@testbro.ai"]
    }',
    'active',
    DATE_TRUNC('day', NOW() + INTERVAL '1 day') + INTERVAL '2 hours'
),
(
    (SELECT id FROM projects LIMIT 1),
    (SELECT id FROM auth.users LIMIT 1),
    'Weekly Full Regression',
    'Comprehensive test suite run weekly on Sundays',
    ARRAY[
        (SELECT id FROM visual_test_flows WHERE name = 'User Login Flow'),
        (SELECT id FROM visual_test_flows WHERE name = 'E-commerce Checkout')
    ],
    'cron',
    '0 1 * * 0',
    'UTC',
    1,
    true,
    2,
    '{
        "email": true,
        "webhook": true,
        "webhook_url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
    }',
    'active',
    DATE_TRUNC('week', NOW() + INTERVAL '1 week') + INTERVAL '1 hour'
),
(
    (SELECT id FROM projects LIMIT 1),
    (SELECT id FROM auth.users LIMIT 1),
    'Pre-deployment Tests',
    'Tests to run before each deployment',
    ARRAY[(SELECT id FROM visual_test_flows WHERE name = 'User Login Flow')],
    'once',
    NULL,
    'UTC',
    3,
    true,
    1,
    '{"email": false, "webhook": false}',
    'completed',
    NULL
);

-- =============================================================================
-- Sample Scheduled Test Executions
-- =============================================================================

INSERT INTO scheduled_test_executions (
    schedule_id,
    execution_type,
    status,
    tests_total,
    tests_completed,
    tests_passed,
    tests_failed,
    execution_results,
    duration_seconds,
    queue_wait_time_seconds,
    started_at,
    completed_at
) VALUES
(
    (SELECT id FROM test_schedules WHERE name = 'Daily Smoke Tests'),
    'scheduled',
    'completed',
    1,
    1,
    1,
    0,
    '{
        "test_results": [
            {
                "flow_id": "' || (SELECT id FROM visual_test_flows WHERE name = 'User Login Flow') || '",
                "status": "passed",
                "duration": 45000,
                "steps_executed": 5,
                "screenshots": ["login_1.png", "login_2.png"],
                "performance_metrics": {
                    "page_load_time": 1200,
                    "total_execution_time": 45000
                }
            }
        ],
        "summary": "All critical tests passed successfully"
    }',
    52,
    3,
    NOW() - INTERVAL '1 day 22 hours',
    NOW() - INTERVAL '1 day 21 hours 59 minutes'
),
(
    (SELECT id FROM test_schedules WHERE name = 'Weekly Full Regression'),
    'scheduled',
    'completed',
    2,
    2,
    1,
    1,
    '{
        "test_results": [
            {
                "flow_id": "' || (SELECT id FROM visual_test_flows WHERE name = 'User Login Flow') || '",
                "status": "passed",
                "duration": 48000
            },
            {
                "flow_id": "' || (SELECT id FROM visual_test_flows WHERE name = 'E-commerce Checkout') || '",
                "status": "failed",
                "duration": 89000,
                "error": "Payment gateway timeout"
            }
        ]
    }',
    145,
    5,
    NOW() - INTERVAL '6 days 23 hours',
    NOW() - INTERVAL '6 days 22 hours 37 minutes'
);

-- =============================================================================
-- Sample Job Queue Entries
-- =============================================================================

INSERT INTO job_queue (
    job_type,
    job_name,
    job_data,
    job_options,
    status,
    priority,
    attempts,
    max_attempts,
    progress,
    result,
    created_by,
    started_at,
    completed_at
) VALUES
(
    'test_execution',
    'Execute Login Flow Test',
    '{
        "flow_id": "' || (SELECT id FROM visual_test_flows WHERE name = 'User Login Flow') || '",
        "browser_config": {
            "browser": "chromium",
            "headless": true,
            "viewport": {"width": 1280, "height": 720}
        },
        "execution_context": "manual_trigger"
    }',
    '{"attempts": 3, "delay": 0, "timeout": 300000}',
    'completed',
    0,
    1,
    3,
    '{"percent": 100, "message": "Test completed successfully", "current_step": "Verification complete"}',
    '{
        "status": "passed",
        "duration": 47500,
        "steps_executed": 5,
        "screenshots_captured": 8,
        "performance_data": {
            "average_step_time": 9500,
            "total_wait_time": 12000
        }
    }',
    (SELECT id FROM auth.users LIMIT 1),
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour 58 minutes'
),
(
    'ai_generation',
    'Generate Mobile Navigation Test',
    '{
        "prompt": "Create a mobile navigation test for responsive design",
        "target_url": "https://demo.testbro.ai/mobile",
        "project_id": "' || (SELECT id FROM projects LIMIT 1) || '",
        "model": "openai/gpt-4"
    }',
    '{"attempts": 2, "delay": 5000}',
    'completed',
    1,
    1,
    2,
    '{"percent": 100, "message": "AI generation complete"}',
    '{
        "generated_steps": 8,
        "confidence_score": 0.87,
        "tokens_used": 1450,
        "processing_time": 3200
    }',
    (SELECT id FROM auth.users LIMIT 1),
    NOW() - INTERVAL '4 hours',
    NOW() - INTERVAL '3 hours 55 minutes'
),
(
    'scheduled_test',
    'Daily Smoke Tests Execution',
    '{
        "schedule_id": "' || (SELECT id FROM test_schedules WHERE name = 'Daily Smoke Tests') || '",
        "execution_type": "scheduled",
        "flows_to_execute": ["' || (SELECT id FROM visual_test_flows WHERE name = 'User Login Flow') || '"]
    }',
    '{"attempts": 3, "delay": 0}',
    'pending',
    0,
    0,
    3,
    '{"percent": 0, "message": "Queued for execution"}',
    NULL,
    (SELECT id FROM auth.users LIMIT 1),
    NULL,
    NULL
);

-- =============================================================================
-- Update Flow Step Counts
-- =============================================================================

-- Update total_steps count in visual_test_flows based on actual steps created
UPDATE visual_test_flows 
SET total_steps = (
    SELECT COUNT(*) 
    FROM visual_test_steps 
    WHERE visual_test_steps.flow_id = visual_test_flows.id
);

-- =============================================================================
-- Create some test data for performance monitoring
-- =============================================================================

-- This will help populate the performance monitoring views with data
UPDATE visual_test_flows 
SET last_executed_at = NOW() - INTERVAL '2 hours'
WHERE name = 'User Login Flow';

UPDATE test_schedules 
SET execution_count = 30, success_count = 28, failure_count = 2
WHERE name = 'Daily Smoke Tests';

UPDATE test_schedules 
SET execution_count = 4, success_count = 3, failure_count = 1
WHERE name = 'Weekly Full Regression';

-- Add some historical AI generation data for performance views
INSERT INTO ai_generations (
    user_id, 
    project_id, 
    prompt, 
    request_type, 
    model_used, 
    response_content, 
    tokens_used, 
    processing_time_ms, 
    status,
    created_at
) 
SELECT 
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM projects LIMIT 1),
    'Generate test for feature #' || generate_series,
    CASE 
        WHEN generate_series % 3 = 0 THEN 'test_generation'
        WHEN generate_series % 3 = 1 THEN 'selector_optimization' 
        ELSE 'execution_analysis'
    END,
    'openai/gpt-4',
    '{"test_steps": []}',
    800 + (generate_series * 50),
    1500 + (generate_series * 100),
    'completed',
    NOW() - (generate_series || ' hours')::INTERVAL
FROM generate_series(1, 24);

COMMENT ON TABLE ai_generations IS 'Sample development data created';
COMMENT ON TABLE browser_sessions IS 'Sample development data created';
COMMENT ON TABLE visual_test_flows IS 'Sample development data created';
COMMENT ON TABLE visual_test_steps IS 'Sample development data created';
COMMENT ON TABLE test_schedules IS 'Sample development data created';
COMMENT ON TABLE scheduled_test_executions IS 'Sample development data created';
COMMENT ON TABLE job_queue IS 'Sample development data created';
