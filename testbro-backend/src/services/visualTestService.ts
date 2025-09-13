import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';
import { browserAutomationService } from './browserAutomationService';
import { WebSocketService } from './webSocketService';

// Types for visual test components
export interface VisualTestStep {
  id: string;
  flow_id: string;
  step_order: number;
  action_type: 'navigate' | 'click' | 'type' | 'wait' | 'verify' | 'screenshot' | 'scroll' | 'hover' | 'select' | 'upload';
  element_selector?: string;
  element_description?: string;
  element_position?: { x: number; y: number; width: number; height: number };
  input_value?: string;
  wait_duration?: number;
  verification_type?: string;
  verification_value?: string;
  screenshot_before?: boolean;
  screenshot_after?: boolean;
  highlight_element?: boolean;
  natural_language_description?: string;
  ai_generated?: boolean;
  ai_confidence_score?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VisualTestFlow {
  id: string;
  project_id: string;
  created_by: string;
  name: string;
  description?: string;
  target_url: string;
  browser_settings?: {
    browser: 'chromium' | 'firefox' | 'webkit';
    viewport: { width: number; height: number };
    device: 'desktop' | 'mobile' | 'tablet';
  };
  timeout_ms?: number;
  retry_count?: number;
  parallel_execution?: boolean;
  status: 'draft' | 'active' | 'archived';
  version?: number;
  total_steps?: number;
  ai_generated?: boolean;
  ai_prompt?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  last_executed_at?: string;
}

export interface DragDropAction {
  type: string;
  element: {
    selector: string;
    tagName: string;
    text?: string;
    attributes?: Record<string, string>;
  };
  action: {
    type: 'click' | 'type' | 'hover' | 'drag' | 'scroll';
    value?: string;
    coordinates?: { x: number; y: number };
    targetSelector?: string;
  };
  metadata: {
    stepName: string;
    description?: string;
    screenshot?: string;
  };
}

export interface TestExecutionResult {
  step_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
  screenshot?: string;
  execution_time?: number;
  started_at?: string;
  completed_at?: string;
}

export interface TestExecutionContext {
  flow_id: string;
  browser_session_id: string;
  steps: VisualTestStep[];
  current_step_index: number;
  results: TestExecutionResult[];
  status: 'initializing' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  error?: string;
}

class VisualTestService {
  private executionContexts = new Map<string, TestExecutionContext>();
  private webSocketService: WebSocketService;

  constructor() {
    this.webSocketService = WebSocketService.getInstance();
  }

  /**
   * Create a new visual test flow
   */
  async createVisualTest(
    name: string,
    description: string,
    target_url: string,
    project_id: string,
    user_id: string
  ): Promise<VisualTestFlow> {
    const testFlow: Partial<VisualTestFlow> = {
      id: uuidv4(),
      project_id,
      created_by: user_id,
      name,
      description,
      target_url,
      status: 'draft',
      browser_settings: {
        browser: 'chromium',
        viewport: { width: 1280, height: 720 },
        device: 'desktop'
      },
      timeout_ms: 30000,
      retry_count: 1,
      parallel_execution: false,
      version: 1,
      total_steps: 0,
      ai_generated: false,
      tags: []
    };

    const { data, error } = await supabase
      .from('visual_test_flows')
      .insert([testFlow])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create visual test: ${error.message}`);
    }

    return data;
  }

  /**
   * Convert drag-drop actions to executable test steps
   */
  convertDragDropActionsToSteps(
    actions: DragDropAction[],
    flow_id: string
  ): VisualTestStep[] {
    const steps: VisualTestStep[] = [];
    
    actions.forEach((action, index) => {
      const step = this.convertSingleActionToStep(action, flow_id, index);
      steps.push(step);
    });

    // Optimize steps (remove redundant actions, merge similar steps)
    return this.optimizeSteps(steps);
  }

  /**
   * Convert a single drag-drop action to a test step
   */
  private convertSingleActionToStep(
    action: DragDropAction,
    flow_id: string,
    order: number
  ): VisualTestStep {
    const step: VisualTestStep = {
      id: uuidv4(),
      flow_id,
      step_order: order,
      action_type: this.mapActionTypeToStepType(action.action.type),
      element_selector: this.optimizeSelector(action.element.selector),
      element_description: action.element.text || action.metadata.description,
      natural_language_description: action.metadata.stepName,
      highlight_element: true,
      ai_generated: false
    };

    // Configure step based on action type
    switch (action.action.type) {
      case 'click':
        if (action.action.coordinates) {
          step.element_position = {
            x: action.action.coordinates.x,
            y: action.action.coordinates.y,
            width: 0,
            height: 0
          };
        }
        break;
      case 'type':
        step.input_value = action.action.value;
        break;
      case 'hover':
        // Hover configuration is minimal, just selector needed
        break;
      case 'drag':
        step.action_type = 'click'; // Convert drag to click for now, can be enhanced
        if (action.action.coordinates) {
          step.element_position = {
            x: action.action.coordinates.x,
            y: action.action.coordinates.y,
            width: 0,
            height: 0
          };
        }
        break;
      case 'scroll':
        step.action_type = 'scroll';
        step.wait_duration = 1000; // Wait after scroll
        break;
    }

    return step;
  }

  /**
   * Map drag-drop action types to test step types
   */
  private mapActionTypeToStepType(actionType: string): VisualTestStep['action_type'] {
    const mapping: Record<string, VisualTestStep['action_type']> = {
      'click': 'click',
      'type': 'type',
      'hover': 'hover',
      'drag': 'click', // Simplified for now
      'scroll': 'scroll'
    };

    return mapping[actionType] || 'click';
  }

  /**
   * Optimize CSS selectors for better reliability
   */
  private optimizeSelector(selector: string): string {
    // Remove overly specific selectors that might break
    let optimized = selector;

    // Remove nth-child selectors that are too specific
    optimized = optimized.replace(/:nth-child\(\d+\)/g, '');
    
    // Prefer ID and data attributes over complex CSS paths
    if (selector.includes('[id=')) {
      const idMatch = selector.match(/\[id="([^"]+)"\]/);
      if (idMatch) {
        optimized = `#${idMatch[1]}`;
      }
    }

    // Prefer data attributes for test automation
    if (selector.includes('[data-testid=')) {
      const testIdMatch = selector.match(/\[data-testid="([^"]+)"\]/);
      if (testIdMatch) {
        optimized = `[data-testid="${testIdMatch[1]}"]`;
      }
    }

    return optimized || selector; // Fallback to original if optimization fails
  }

  /**
   * Optimize test steps by removing redundancy and improving efficiency
   */
  private optimizeSteps(steps: VisualTestStep[]): VisualTestStep[] {
    const optimized: VisualTestStep[] = [];
    let previousStep: VisualTestStep | null = null;

    for (const step of steps) {
      // Skip redundant consecutive actions on the same element
      if (previousStep && 
          previousStep.element_selector === step.element_selector && 
          previousStep.action_type === step.action_type) {
        continue;
      }

      // Add wait steps before actions that might need loading time
      if (step.action_type === 'click' && this.isNavigationLikeSelector(step.element_selector)) {
        optimized.push({
          id: uuidv4(),
          flow_id: step.flow_id,
          step_order: optimized.length,
          action_type: 'wait',
          wait_duration: 2000,
          natural_language_description: 'Wait for page load',
          highlight_element: false,
          ai_generated: true
        });
      }

      optimized.push(step);
      previousStep = step;
    }

    // Re-number the order after optimization
    optimized.forEach((step, index) => {
      step.step_order = index;
    });

    return optimized;
  }

  /**
   * Check if selector likely triggers navigation
   */
  private isNavigationLikeSelector(selector: string): boolean {
    const navigationSelectors = ['a[href]', 'button[type="submit"]', '[role="button"]'];
    return navigationSelectors.some(nav => selector.includes(nav.split('[')[0]));
  }

  /**
   * Update test steps for an existing visual test
   */
  async updateTestSteps(
    flow_id: string,
    actions: DragDropAction[],
    user_id: string
  ): Promise<{ flow: VisualTestFlow; steps: VisualTestStep[] }> {
    // Convert actions to steps
    const steps = this.convertDragDropActionsToSteps(actions, flow_id);

    // Start a transaction to update both flow and steps
    const { data: flow, error: flowError } = await supabase
      .from('visual_test_flows')
      .update({ 
        total_steps: steps.length,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', flow_id)
      .eq('created_by', user_id) // Ensure user owns the test
      .select()
      .single();

    if (flowError) {
      throw new Error(`Failed to update test flow: ${flowError.message}`);
    }

    // Delete existing steps
    await supabase
      .from('visual_test_steps')
      .delete()
      .eq('flow_id', flow_id);

    // Insert new steps
    if (steps.length > 0) {
      const { error: stepsError } = await supabase
        .from('visual_test_steps')
        .insert(steps);

      if (stepsError) {
        throw new Error(`Failed to insert test steps: ${stepsError.message}`);
      }
    }

    return { flow, steps };
  }

  /**
   * Execute a visual test
   */
  async executeVisualTest(
    flow_id: string,
    user_id: string,
    options: {
      browser?: 'chromium' | 'firefox' | 'webkit';
      headless?: boolean;
      viewport?: { width: number; height: number };
    } = {}
  ): Promise<string> {
    // Get test flow and steps
    const { data: flow, error: flowError } = await supabase
      .from('visual_test_flows')
      .select('*')
      .eq('id', flow_id)
      .eq('created_by', user_id)
      .single();

    if (flowError || !flow) {
      throw new Error(`Test flow not found: ${flowError?.message}`);
    }

    const { data: steps, error: stepsError } = await supabase
      .from('visual_test_steps')
      .select('*')
      .eq('flow_id', flow_id)
      .order('step_order');

    if (stepsError) {
      throw new Error(`Failed to fetch test steps: ${stepsError.message}`);
    }

    if (!steps || steps.length === 0) {
      throw new Error('No test steps found');
    }

    // Create browser session using flow's browser settings
    const browserSettings = flow.browser_settings || {
      browser: 'chromium',
      viewport: { width: 1280, height: 720 },
      device: 'desktop'
    };

    const session = await browserAutomationService.createSessionForVisualTest({
      browser: options.browser || browserSettings.browser,
      headless: options.headless !== false,
      viewport: options.viewport || browserSettings.viewport
    });

    // Create execution context
    const executionId = uuidv4();
    const executionContext: TestExecutionContext = {
      flow_id,
      browser_session_id: session.id,
      steps,
      current_step_index: 0,
      results: [],
      status: 'initializing',
      started_at: new Date().toISOString()
    };

    this.executionContexts.set(executionId, executionContext);

    // Update flow status and last execution time
    await supabase
      .from('visual_test_flows')
      .update({ 
        status: 'active',
        last_executed_at: new Date().toISOString()
      })
      .eq('id', flow_id);

    // Start execution (fire and forget)
    this.executeStepsSequentially(executionId, user_id).catch(console.error);

    return executionId;
  }

  /**
   * Execute test steps sequentially
   */
  private async executeStepsSequentially(executionId: string, user_id: string): Promise<void> {
    const context = this.executionContexts.get(executionId);
    if (!context) return;

    try {
      context.status = 'running';
      this.broadcastExecutionUpdate(executionId, user_id, context);

      for (let i = 0; i < context.steps.length; i++) {
        context.current_step_index = i;
        const step = context.steps[i];

        const stepResult: TestExecutionResult = {
          step_id: step.id,
          status: 'running',
          started_at: new Date().toISOString()
        };

        context.results.push(stepResult);
        this.broadcastExecutionUpdate(executionId, user_id, context);

        try {
          const startTime = Date.now();
          await this.executeStep(step, context.browser_session_id);
          const endTime = Date.now();

          stepResult.status = 'completed';
          stepResult.execution_time = endTime - startTime;
          stepResult.completed_at = new Date().toISOString();

          // Capture screenshot after each step
          try {
            const screenshot = await browserAutomationService.takeScreenshot(context.browser_session_id);
            stepResult.screenshot = screenshot;
          } catch (screenshotError) {
            console.warn('Failed to capture screenshot:', screenshotError);
          }

        } catch (error) {
          stepResult.status = 'failed';
          stepResult.error = error instanceof Error ? error.message : 'Unknown error';
          stepResult.completed_at = new Date().toISOString();

          // Continue execution or stop based on step criticality
          // For now, we'll stop on any error
          context.status = 'failed';
          context.error = stepResult.error;
          break;
        }

        this.broadcastExecutionUpdate(executionId, user_id, context);
      }

      // Mark as completed if not already failed
      if (context.status !== 'failed') {
        context.status = 'completed';
      }

    } catch (error) {
      context.status = 'failed';
      context.error = error instanceof Error ? error.message : 'Unknown execution error';
    } finally {
      context.completed_at = new Date().toISOString();
      
      // Update database
      await supabase
        .from('visual_test_flows')
        .update({ 
          status: context.status === 'completed' ? 'active' : 'archived'
        })
        .eq('id', context.flow_id);

      // Close browser session
      try {
        await browserAutomationService.closeSession(context.browser_session_id);
      } catch (error) {
        console.warn('Failed to close browser session:', error);
      }

      this.broadcastExecutionUpdate(executionId, user_id, context);
      
      // Clean up execution context after some time
      setTimeout(() => {
        this.executionContexts.delete(executionId);
      }, 30 * 60 * 1000); // Keep for 30 minutes
    }
  }

  /**
   * Execute a single test step
   */
  private async executeStep(step: VisualTestStep, sessionId: string): Promise<void> {
    const { action_type, element_selector, input_value, wait_duration, element_position } = step;

    switch (action_type) {
      case 'navigate':
        // Navigation should be handled at flow level with target_url
        // For individual steps, we skip navigation
        break;

      case 'click':
        if (element_selector) {
          await browserAutomationService.executeAction(sessionId, {
            type: 'click',
            selector: element_selector,
            coordinates: element_position ? { x: element_position.x, y: element_position.y } : undefined
          });
        }
        break;

      case 'type':
        if (element_selector && input_value) {
          await browserAutomationService.executeAction(sessionId, {
            type: 'type',
            selector: element_selector,
            value: input_value
          });
        }
        break;

      case 'wait':
        const timeout = wait_duration || 1000;
        await new Promise(resolve => setTimeout(resolve, timeout));
        break;

      case 'scroll':
        await browserAutomationService.executeAction(sessionId, {
          type: 'scroll',
          coordinates: { x: 0, y: 300 } // Scroll down by 300 pixels
        });
        break;

      case 'hover':
        if (element_selector) {
          await browserAutomationService.executeAction(sessionId, {
            type: 'hover',
            selector: element_selector
          });
        }
        break;

      case 'verify':
        if (element_selector) {
          await this.executeAssertion(sessionId, step);
        }
        break;

      case 'screenshot':
        await browserAutomationService.takeScreenshot(sessionId);
        break;

      case 'select':
        if (element_selector && input_value) {
          await browserAutomationService.executeAction(sessionId, {
            type: 'select',
            selector: element_selector,
            value: input_value
          });
        }
        break;

      case 'upload':
        if (element_selector && input_value) {
          // Upload is not directly supported in the current browser service
          // We'll convert it to a type action for now
          await browserAutomationService.executeAction(sessionId, {
            type: 'type',
            selector: element_selector,
            value: input_value
          });
        }
        break;

      default:
        throw new Error(`Unknown step type: ${action_type}`);
    }
  }

  /**
   * Execute assertion step
   */
  private async executeAssertion(sessionId: string, step: VisualTestStep): Promise<void> {
    const { element_selector, verification_type, verification_value } = step;

    if (!element_selector) {
      throw new Error('Element selector required for assertion');
    }

    const assertionType = verification_type || 'exists';

    switch (assertionType) {
      case 'exists':
        const exists = await browserAutomationService.elementExists(sessionId, element_selector);
        if (!exists) {
          throw new Error(`Element not found: ${element_selector}`);
        }
        break;

      case 'visible':
        const visible = await browserAutomationService.elementVisible(sessionId, element_selector);
        if (!visible) {
          throw new Error(`Element not visible: ${element_selector}`);
        }
        break;

      case 'text':
        if (verification_value) {
          const actualText = await browserAutomationService.getElementText(sessionId, element_selector);
          if (actualText !== verification_value) {
            throw new Error(`Text assertion failed. Expected: "${verification_value}", Actual: "${actualText}"`);
          }
        }
        break;

      case 'value':
        if (verification_value) {
          const actualValue = await browserAutomationService.getElementValue(sessionId, element_selector);
          if (actualValue !== verification_value) {
            throw new Error(`Value assertion failed. Expected: "${verification_value}", Actual: "${actualValue}"`);
          }
        }
        break;

      default:
        // Default to existence check
        const defaultExists = await browserAutomationService.elementExists(sessionId, element_selector);
        if (!defaultExists) {
          throw new Error(`Element verification failed: ${element_selector}`);
        }
    }
  }

  /**
   * Broadcast execution updates via WebSocket
   */
  private broadcastExecutionUpdate(executionId: string, user_id: string, context: TestExecutionContext): void {
    this.webSocketService.broadcastToUser(user_id, 'visual-test-execution-update', {
      execution_id: executionId,
      flow_id: context.flow_id,
      status: context.status,
      current_step_index: context.current_step_index,
      total_steps: context.steps.length,
      results: context.results,
      started_at: context.started_at,
      completed_at: context.completed_at,
      error: context.error
    });
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): TestExecutionContext | null {
    return this.executionContexts.get(executionId) || null;
  }

  /**
   * Get visual test by ID
   */
  async getVisualTest(flow_id: string, user_id: string): Promise<{ flow: VisualTestFlow; steps: VisualTestStep[] }> {
    const { data: flow, error: flowError } = await supabase
      .from('visual_test_flows')
      .select('*')
      .eq('id', flow_id)
      .eq('created_by', user_id)
      .single();

    if (flowError || !flow) {
      throw new Error(`Test flow not found: ${flowError?.message}`);
    }

    const { data: steps, error: stepsError } = await supabase
      .from('visual_test_steps')
      .select('*')
      .eq('flow_id', flow_id)
      .order('step_order');

    if (stepsError) {
      throw new Error(`Failed to fetch test steps: ${stepsError.message}`);
    }

    return { flow, steps: steps || [] };
  }

  /**
   * List visual tests for a user
   */
  async listVisualTests(user_id: string, project_id?: string): Promise<VisualTestFlow[]> {
    let query = supabase
      .from('visual_test_flows')
      .select('*')
      .eq('created_by', user_id);

    if (project_id) {
      query = query.eq('project_id', project_id);
    }

    const { data: flows, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch visual tests: ${error.message}`);
    }

    return flows || [];
  }

  /**
   * Delete a visual test
   */
  async deleteVisualTest(flow_id: string, user_id: string): Promise<void> {
    // Delete steps first (foreign key constraint)
    await supabase
      .from('visual_test_steps')
      .delete()
      .eq('flow_id', flow_id);

    // Delete the flow
    const { error } = await supabase
      .from('visual_test_flows')
      .delete()
      .eq('id', flow_id)
      .eq('created_by', user_id);

    if (error) {
      throw new Error(`Failed to delete visual test: ${error.message}`);
    }
  }
}

export const visualTestService = new VisualTestService();
