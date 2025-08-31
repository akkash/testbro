import { Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/database';
import { WebSocketService } from './websocketService';
import { AIService } from './aiService';
import { logger, LogCategory } from './loggingService';
import { ActionRecordingService } from './actionRecordingService';

export interface NoCodeTestStep {
  id: string;
  order: number;
  natural_language: string; // "Click the Login button"
  action_type: 'click' | 'type' | 'verify' | 'navigate' | 'wait' | 'select' | 'scroll' | 'hover';
  element_description: string; // "Login button" instead of CSS selector
  element_selector: string; // Auto-generated technical selector
  element_alternatives: string[]; // Alternative selectors
  value?: string;
  screenshot_before?: string;
  screenshot_after?: string;
  confidence_score: number; // AI confidence in element identification
  user_verified: boolean;
  ai_metadata?: {
    element_recognition_confidence: number;
    language_generation_confidence: number;
    suggested_improvements: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface InteractiveRecording {
  id: string;
  session_id: string;
  project_id: string;
  name: string;
  description?: string;
  steps: NoCodeTestStep[];
  current_url: string;
  status: 'recording' | 'paused' | 'completed' | 'failed';
  auto_generate_steps: boolean;
  real_time_preview: boolean;
  steps_count: number;
  duration_seconds: number;
  created_by: string;
  created_at: string;
  completed_at?: string;
}

export interface StepPreview {
  step: NoCodeTestStep;
  execution_preview: {
    can_execute: boolean;
    estimated_success_rate: number;
    potential_issues: string[];
    suggested_improvements: string[];
  };
  visual_preview?: {
    highlighted_element: string;
    screenshot_url: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  confidence_score: number;
  issues: Array<{
    type: 'warning' | 'error';
    message: string;
    suggestion: string;
  }>;
  suggested_fixes: NoCodeTestStep[];
}

export interface ActionToStepConversion {
  recorded_action: any;
  generated_step: NoCodeTestStep;
  confidence_metrics: {
    element_identification: number;
    action_interpretation: number;
    natural_language_quality: number;
    overall: number;
  };
}

export class NoCodeRecordingService {
  private activeRecordings = new Map<string, InteractiveRecording>();
  private wsService: WebSocketService;
  private aiService: AIService;
  private actionRecordingService: ActionRecordingService;

  constructor(wsService: WebSocketService, aiService: AIService) {
    this.wsService = wsService;
    this.aiService = aiService;
    this.actionRecordingService = new ActionRecordingService(wsService);
  }

  /**
   * Start an interactive recording session with real-time step generation
   */
  async startInteractiveRecording(
    sessionId: string,
    projectId: string,
    name: string,
    description: string,
    userId: string,
    options: {
      auto_generate_steps?: boolean;
      real_time_preview?: boolean;
      page_url?: string;
    } = {}
  ): Promise<InteractiveRecording> {
    const recordingId = uuidv4();

    try {
      const recording: InteractiveRecording = {
        id: recordingId,
        session_id: sessionId,
        project_id: projectId,
        name,
        description,
        steps: [],
        current_url: options.page_url || '',
        status: 'recording',
        auto_generate_steps: options.auto_generate_steps ?? true,
        real_time_preview: options.real_time_preview ?? true,
        steps_count: 0,
        duration_seconds: 0,
        created_by: userId,
        created_at: new Date().toISOString()
      };

      // Store in database
      const { error } = await supabaseAdmin
        .from('interactive_recordings')
        .insert(recording);

      if (error) {
        throw new Error(`Failed to create interactive recording: ${error.message}`);
      }

      // Store in memory
      this.activeRecordings.set(recordingId, recording);

      // Notify clients
      this.wsService.broadcast(`recording:${sessionId}`, {
        type: 'recording_started',
        data: { recording }
      });

      logger.info('Interactive recording started', LogCategory.BROWSER, {
        recordingId,
        sessionId,
        projectId,
        userId
      });

      return recording;

    } catch (error) {
      logger.error('Failed to start interactive recording', LogCategory.BROWSER, {
        recordingId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Convert a recorded browser action to a no-code test step
   */
  async convertActionToStep(recordingId: string, action: any): Promise<NoCodeTestStep> {
    try {
      const recording = this.activeRecordings.get(recordingId);
      if (!recording) {
        throw new Error(`Recording ${recordingId} not found`);
      }

      // Generate natural language description
      const naturalLanguage = await this.generateNaturalLanguageDescription(action);
      
      // Extract element description
      const elementDescription = await this.extractElementDescription(action);
      
      // Generate robust selectors
      const selectors = await this.generateRobustSelectors(action);

      // Calculate confidence score
      const confidenceScore = await this.calculateConfidenceScore(action, naturalLanguage, selectors);

      const step: NoCodeTestStep = {
        id: uuidv4(),
        order: recording.steps.length + 1,
        natural_language: naturalLanguage,
        action_type: this.mapActionType(action.action_type),
        element_description: elementDescription,
        element_selector: selectors.primary,
        element_alternatives: selectors.alternatives,
        value: action.value,
        confidence_score: confidenceScore,
        user_verified: false,
        ai_metadata: {
          element_recognition_confidence: selectors.confidence,
          language_generation_confidence: confidenceScore,
          suggested_improvements: []
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Store step in database
      await this.saveStep(recordingId, step);

      // Update recording
      recording.steps.push(step);
      recording.steps_count = recording.steps.length;
      this.activeRecordings.set(recordingId, recording);

      // Broadcast step generation
      this.wsService.broadcast(`recording:${recording.session_id}`, {
        type: 'step_generated',
        data: { step, recording_id: recordingId }
      });

      logger.info('Action converted to step', LogCategory.BROWSER, {
        recordingId,
        stepId: step.id,
        actionType: action.action_type,
        confidenceScore
      });

      return step;

    } catch (error) {
      logger.error('Failed to convert action to step', LogCategory.BROWSER, {
        recordingId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate natural language description for an action
   */
  async generateNaturalLanguageDescription(action: any): Promise<string> {
    try {
      const prompt = `Convert this browser action into a clear, natural language description that a non-technical user would understand:

Action Type: ${action.action_type}
Element: ${JSON.stringify(action.element, null, 2)}
Value: ${action.value || 'N/A'}
Page URL: ${action.page_url}

Guidelines:
- Use simple, clear language
- Describe what the user is doing, not technical details
- Focus on the intent and outcome
- Examples: "Click the Login button", "Enter email address", "Select Country from dropdown"

Generate a concise description (max 100 characters):`;

      const response = await this.aiService.generateCompletion(prompt, {
        model: 'gpt-4',
        maxTokens: 100,
        temperature: 0.3
      });

      return response.trim().replace(/['"]/g, '');

    } catch (error) {
      logger.error('Failed to generate natural language description', LogCategory.AI, {
        actionType: action.action_type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fallback to basic description
      return this.generateBasicDescription(action);
    }
  }

  /**
   * Extract human-readable element description
   */
  async extractElementDescription(action: any): Promise<string> {
    try {
      const element = action.element;
      
      // Try to get meaningful text content
      if (element.text_content && element.text_content.trim()) {
        const text = element.text_content.trim().substring(0, 50);
        return `"${text}" ${element.tag_name}`;
      }

      // Try button/link text
      if (element.attributes?.value) {
        return `"${element.attributes.value}" ${element.tag_name}`;
      }

      // Try aria-label or label
      if (element.attributes?.['aria-label']) {
        return `"${element.attributes['aria-label']}" ${element.tag_name}`;
      }

      // Try placeholder
      if (element.attributes?.placeholder) {
        return `"${element.attributes.placeholder}" input field`;
      }

      // Try ID or class
      if (element.attributes?.id) {
        return `${element.tag_name} with ID "${element.attributes.id}"`;
      }

      if (element.attributes?.class) {
        const firstClass = element.attributes.class.split(' ')[0];
        return `${element.tag_name} with class "${firstClass}"`;
      }

      // Generic description
      return `${element.tag_name} element`;

    } catch (error) {
      logger.error('Failed to extract element description', LogCategory.BROWSER, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 'Unknown element';
    }
  }

  /**
   * Generate robust selectors for reliable element identification
   */
  async generateRobustSelectors(action: any): Promise<{
    primary: string;
    alternatives: string[];
    confidence: number;
  }> {
    try {
      const element = action.element;
      const selectors: string[] = [];
      let confidence = 0.5;

      // ID selector (highest priority)
      if (element.attributes?.id) {
        selectors.push(`#${element.attributes.id}`);
        confidence = Math.max(confidence, 0.9);
      }

      // Data-testid or similar
      if (element.attributes?.['data-testid']) {
        selectors.push(`[data-testid="${element.attributes['data-testid']}"]`);
        confidence = Math.max(confidence, 0.95);
      }

      // Aria-label
      if (element.attributes?.['aria-label']) {
        selectors.push(`[aria-label="${element.attributes['aria-label']}"]`);
        confidence = Math.max(confidence, 0.8);
      }

      // Text-based selector for links and buttons
      if (element.text_content && ['a', 'button'].includes(element.tag_name)) {
        const text = element.text_content.trim();
        selectors.push(`${element.tag_name}:contains("${text}")`);
        confidence = Math.max(confidence, 0.7);
      }

      // Class-based selector
      if (element.attributes?.class) {
        const classes = element.attributes.class.split(' ').filter(c => 
          c.trim() && !c.includes('ng-') && !c.includes('_')
        );
        if (classes.length > 0) {
          selectors.push(`.${classes.join('.')}`);
          confidence = Math.max(confidence, 0.6);
        }
      }

      // XPath as fallback
      if (element.xpath) {
        selectors.push(element.xpath);
        confidence = Math.max(confidence, 0.5);
      }

      // Use the original selector as backup
      if (element.selector && !selectors.includes(element.selector)) {
        selectors.push(element.selector);
      }

      return {
        primary: selectors[0] || element.selector || element.tag_name,
        alternatives: selectors.slice(1),
        confidence
      };

    } catch (error) {
      logger.error('Failed to generate robust selectors', LogCategory.BROWSER, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        primary: action.element?.selector || action.element?.tag_name || 'unknown',
        alternatives: [],
        confidence: 0.3
      };
    }
  }

  /**
   * Calculate overall confidence score for the generated step
   */
  async calculateConfidenceScore(action: any, naturalLanguage: string, selectors: any): Promise<number> {
    try {
      let score = 0;

      // Element identification confidence (40%)
      score += selectors.confidence * 0.4;

      // Action type confidence (20%)
      const actionTypeConfidence = this.getActionTypeConfidence(action.action_type);
      score += actionTypeConfidence * 0.2;

      // Natural language quality (20%)
      const languageQuality = this.assessLanguageQuality(naturalLanguage);
      score += languageQuality * 0.2;

      // Context confidence (20%)
      const contextConfidence = this.assessContextConfidence(action);
      score += contextConfidence * 0.2;

      return Math.min(Math.max(score, 0), 1);

    } catch (error) {
      logger.error('Failed to calculate confidence score', LogCategory.BROWSER, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0.5;
    }
  }

  /**
   * Preview how a step would execute
   */
  async previewStep(step: NoCodeTestStep): Promise<StepPreview> {
    try {
      const executionPreview = {
        can_execute: step.confidence_score > 0.6,
        estimated_success_rate: step.confidence_score,
        potential_issues: this.identifyPotentialIssues(step),
        suggested_improvements: this.suggestImprovements(step)
      };

      return {
        step,
        execution_preview: executionPreview
      };

    } catch (error) {
      logger.error('Failed to preview step', LogCategory.BROWSER, {
        stepId: step.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Validate a step and provide feedback
   */
  async validateStep(step: NoCodeTestStep): Promise<ValidationResult> {
    try {
      const issues: ValidationResult['issues'] = [];
      let valid = true;

      // Check confidence score
      if (step.confidence_score < 0.5) {
        issues.push({
          type: 'warning',
          message: 'Low confidence in element identification',
          suggestion: 'Consider providing a more specific element description'
        });
      }

      // Check selector validity
      if (!step.element_selector || step.element_selector === 'unknown') {
        valid = false;
        issues.push({
          type: 'error',
          message: 'Invalid or missing element selector',
          suggestion: 'Re-record this step or manually specify the element'
        });
      }

      // Check natural language description
      if (!step.natural_language || step.natural_language.length < 5) {
        issues.push({
          type: 'warning',
          message: 'Description is too short or unclear',
          suggestion: 'Provide a more descriptive explanation of what this step does'
        });
      }

      // Check required value for input actions
      if (['type', 'select'].includes(step.action_type) && !step.value) {
        valid = false;
        issues.push({
          type: 'error',
          message: 'Missing required value for input action',
          suggestion: 'Specify what text to enter or option to select'
        });
      }

      return {
        valid,
        confidence_score: step.confidence_score,
        issues,
        suggested_fixes: valid ? [] : await this.generateSuggestedFixes(step, issues)
      };

    } catch (error) {
      logger.error('Failed to validate step', LogCategory.BROWSER, {
        stepId: step.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update step verification status
   */
  async updateStepVerification(
    recordingId: string, 
    stepId: string, 
    verified: boolean, 
    modifications?: Partial<NoCodeTestStep>
  ): Promise<NoCodeTestStep> {
    try {
      const recording = this.activeRecordings.get(recordingId);
      if (!recording) {
        throw new Error(`Recording ${recordingId} not found`);
      }

      const stepIndex = recording.steps.findIndex(s => s.id === stepId);
      if (stepIndex === -1) {
        throw new Error(`Step ${stepId} not found in recording`);
      }

      // Update step
      const updatedStep = {
        ...recording.steps[stepIndex],
        user_verified: verified,
        updated_at: new Date().toISOString(),
        ...modifications
      };

      recording.steps[stepIndex] = updatedStep;
      this.activeRecordings.set(recordingId, recording);

      // Update in database
      await this.updateStepInDatabase(stepId, updatedStep);

      // Broadcast update
      this.wsService.broadcast(`recording:${recording.session_id}`, {
        type: 'step_verified',
        data: { step: updatedStep, recording_id: recordingId }
      });

      logger.info('Step verification updated', LogCategory.BROWSER, {
        recordingId,
        stepId,
        verified,
        hasModifications: !!modifications
      });

      return updatedStep;

    } catch (error) {
      logger.error('Failed to update step verification', LogCategory.BROWSER, {
        recordingId,
        stepId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Complete an interactive recording
   */
  async completeRecording(recordingId: string): Promise<InteractiveRecording> {
    try {
      const recording = this.activeRecordings.get(recordingId);
      if (!recording) {
        throw new Error(`Recording ${recordingId} not found`);
      }

      recording.status = 'completed';
      recording.completed_at = new Date().toISOString();

      // Update in database
      const { error } = await supabaseAdmin
        .from('interactive_recordings')
        .update({
          status: recording.status,
          completed_at: recording.completed_at,
          steps_count: recording.steps_count
        })
        .eq('id', recordingId);

      if (error) {
        throw new Error(`Failed to complete recording: ${error.message}`);
      }

      // Clean up from memory
      this.activeRecordings.delete(recordingId);

      // Broadcast completion
      this.wsService.broadcast(`recording:${recording.session_id}`, {
        type: 'recording_completed',
        data: { recording }
      });

      logger.info('Interactive recording completed', LogCategory.BROWSER, {
        recordingId,
        stepsCount: recording.steps_count,
        duration: recording.duration_seconds
      });

      return recording;

    } catch (error) {
      logger.error('Failed to complete recording', LogCategory.BROWSER, {
        recordingId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Private helper methods

  private mapActionType(originalType: string): NoCodeTestStep['action_type'] {
    const mapping: Record<string, NoCodeTestStep['action_type']> = {
      'click': 'click',
      'type': 'type',
      'input': 'type',
      'keypress': 'type',
      'select': 'select',
      'change': 'select',
      'scroll': 'scroll',
      'hover': 'hover',
      'mouseenter': 'hover',
      'navigate': 'navigate',
      'wait': 'wait'
    };

    return mapping[originalType] || 'click';
  }

  private generateBasicDescription(action: any): string {
    const actionTypeMap: Record<string, string> = {
      'click': 'Click',
      'type': 'Enter text in',
      'select': 'Select from',
      'scroll': 'Scroll',
      'hover': 'Hover over',
      'navigate': 'Navigate to',
      'wait': 'Wait for'
    };

    const actionDescription = actionTypeMap[action.action_type] || 'Interact with';
    const elementName = action.element?.tag_name || 'element';
    
    return `${actionDescription} ${elementName}`;
  }

  private getActionTypeConfidence(actionType: string): number {
    const confidenceMap: Record<string, number> = {
      'click': 0.9,
      'type': 0.8,
      'select': 0.8,
      'navigate': 0.9,
      'wait': 0.7,
      'scroll': 0.6,
      'hover': 0.5
    };

    return confidenceMap[actionType] || 0.5;
  }

  private assessLanguageQuality(text: string): number {
    if (!text || text.length < 5) return 0.2;
    if (text.length > 100) return 0.6;
    
    // Basic quality indicators
    const hasAction = /^(click|enter|select|navigate|scroll|hover|wait)/i.test(text);
    const hasElement = /\b(button|input|field|link|dropdown|menu)\b/i.test(text);
    
    let score = 0.5;
    if (hasAction) score += 0.3;
    if (hasElement) score += 0.2;
    
    return Math.min(score, 1);
  }

  private assessContextConfidence(action: any): number {
    let score = 0.5;
    
    // Page URL reliability
    if (action.page_url && action.page_url.startsWith('http')) {
      score += 0.2;
    }
    
    // Element context
    if (action.element?.attributes?.id) score += 0.2;
    if (action.element?.text_content) score += 0.1;
    
    return Math.min(score, 1);
  }

  private identifyPotentialIssues(step: NoCodeTestStep): string[] {
    const issues: string[] = [];
    
    if (step.confidence_score < 0.5) {
      issues.push('Low confidence in element identification');
    }
    
    if (!step.element_alternatives.length) {
      issues.push('No alternative selectors available');
    }
    
    if (step.action_type === 'type' && !step.value) {
      issues.push('Missing text value for input action');
    }
    
    return issues;
  }

  private suggestImprovements(step: NoCodeTestStep): string[] {
    const suggestions: string[] = [];
    
    if (step.confidence_score < 0.7) {
      suggestions.push('Consider re-recording this step for better element identification');
    }
    
    if (!step.user_verified) {
      suggestions.push('Verify this step before including in your test');
    }
    
    if (step.natural_language.length < 20) {
      suggestions.push('Add more detail to the step description');
    }
    
    return suggestions;
  }

  private async generateSuggestedFixes(step: NoCodeTestStep, issues: ValidationResult['issues']): Promise<NoCodeTestStep[]> {
    // Generate alternative step configurations based on identified issues
    const fixes: NoCodeTestStep[] = [];
    
    // This could be enhanced with AI-generated fixes
    return fixes;
  }

  private async saveStep(recordingId: string, step: NoCodeTestStep): Promise<void> {
    const { error } = await supabaseAdmin
      .from('no_code_test_steps')
      .insert({
        ...step,
        recording_id: recordingId
      });

    if (error) {
      throw new Error(`Failed to save step: ${error.message}`);
    }
  }

  private async updateStepInDatabase(stepId: string, step: NoCodeTestStep): Promise<void> {
    const { error } = await supabaseAdmin
      .from('no_code_test_steps')
      .update(step)
      .eq('id', stepId);

    if (error) {
      throw new Error(`Failed to update step: ${error.message}`);
    }
  }
}