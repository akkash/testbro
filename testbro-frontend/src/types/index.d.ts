// Global type declarations for third-party modules
// This file contains type declarations for modules that don't have built-in TypeScript support

// Re-export lucide-react types for easy access
export * from './lucide-react.d.ts'

// Core testing types
export interface NoCodeTestStep {
  id: string;
  recording_id?: string;
  test_case_id?: string;
  order: number;
  natural_language: string;
  action_type: 'click' | 'type' | 'verify' | 'navigate' | 'wait' | 'select' | 'scroll' | 'hover';
  element_description: string;
  element_selector: string;
  element_alternatives: string[];
  value?: string;
  confidence_score: number;
  user_verified: boolean;
  screenshot_before?: string;
  screenshot_after?: string;
  ai_metadata?: {
    element_recognition_confidence: number;
    language_generation_confidence: number;
    suggested_improvements: string[];
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  suite_id?: string;
  target_id: string;
  steps: NoCodeTestStep[];
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'active' | 'archived';
  ai_generated: boolean;
  ai_metadata?: {
    prompt: string;
    model: string;
    confidence_score: number;
    generated_at: string;
  };
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ElementIdentification {
  id: string;
  recording_id: string;
  element_type: string;
  natural_description: string;
  primary_selector: string;
  alternative_selectors: string[];
  confidence_scores: number[];
  visual_context: {
    bounding_box: { x: number; y: number; width: number; height: number };
    is_visible: boolean;
    is_clickable: boolean;
  };
  technical_details: {
    tag_name: string;
    attributes: Record<string, string>;
    text_content: string;
    computed_styles?: Record<string, string>;
  };
  interaction_hints: {
    recommended_action: string;
    interaction_confidence: number;
    alternative_actions: string[];
  };
  confidence_metrics: {
    selector_stability: number;
    element_uniqueness: number;
    visual_prominence: number;
  };
  coordinates: { x: number; y: number };
  page_url: string;
  page_context: {
    title: string;
    url: string;
    viewport: { width: number; height: number };
  };
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    step_generated?: boolean;
    test_updated?: boolean;
    confidence_score?: number;
    suggestions?: string[];
  };
}

export interface StandardWebSocketEvent {
  type: string;
  data: any;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  conversation_id: string;
  user_intent: string;
  domain_context?: {
    website_url?: string;
    application_type?: string;
    user_flows?: string[];
  };
  existing_steps: NoCodeTestStep[];
  constraints: {
    max_steps?: number;
    test_type?: 'smoke' | 'regression' | 'integration' | 'e2e';
    browser_requirements?: string[];
    data_requirements?: string[];
  };
  user_preferences: {
    verbosity: 'minimal' | 'detailed' | 'comprehensive';
    step_granularity: 'high' | 'medium' | 'low';
    include_validations: boolean;
    include_error_handling: boolean;
  };
}

export interface TestGenerationRequest {
  description: string;
  context: ConversationContext;
}

export interface TestGenerationResponse {
  success: boolean;
  test_case: Partial<TestCase> | null;
  confidence_score: number;
  suggestions: string[];
  warnings: string[];
}