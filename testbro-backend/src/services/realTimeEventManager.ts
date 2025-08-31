import { WebSocketService } from './websocketService';
import { logger, LogCategory } from './loggingService';
import { 
  NoCodeTestStep, 
  TestExecution, 
  ElementIdentification,
  InteractiveRecording,
  StandardWebSocketEvent
} from '../types';

export interface RecordingFeedbackEvent {
  type: 'recording_started' | 'step_captured' | 'element_identified' | 'recording_paused' | 'recording_stopped' | 'error_occurred';
  recording_id: string;
  data: {
    step?: NoCodeTestStep;
    element?: ElementIdentification;
    error?: string;
    confidence?: number;
    suggestions?: string[];
    screenshot_url?: string;
    timestamp: string;
  };
}

export interface TestValidationEvent {
  type: 'validation_started' | 'step_validated' | 'element_verified' | 'validation_completed' | 'validation_failed';
  test_id: string;
  execution_id?: string;
  data: {
    step?: NoCodeTestStep;
    validation_result?: {
      success: boolean;
      confidence: number;
      issues: string[];
      suggestions: string[];
    };
    element_health?: {
      element_id: string;
      status: 'healthy' | 'warning' | 'broken';
      selector_confidence: number;
      alternative_selectors: string[];
    };
    overall_health?: {
      total_steps: number;
      healthy_steps: number;
      warning_steps: number;
      broken_steps: number;
      overall_confidence: number;
    };
    timestamp: string;
  };
}

export interface RealTimeInsight {
  type: 'performance_metric' | 'best_practice_suggestion' | 'optimization_tip' | 'error_pattern' | 'success_feedback';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  action_required: boolean;
  suggested_actions?: string[];
  related_data?: any;
}

export class RealTimeEventManager {
  private wsService: WebSocketService;
  private activeRecordings = new Map<string, InteractiveRecording>();
  private activeValidations = new Map<string, TestExecution>();
  private feedbackBuffer = new Map<string, RecordingFeedbackEvent[]>();

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
    this.initializeEventHandlers();
  }

  /**
   * Start real-time recording feedback for a session
   */
  async startRecordingFeedback(recordingId: string, userId: string): Promise<void> {
    try {
      const channelName = `recording:${recordingId}`;
      
      // Initialize feedback buffer
      this.feedbackBuffer.set(recordingId, []);

      // Send recording started event
      const startEvent: RecordingFeedbackEvent = {
        type: 'recording_started',
        recording_id: recordingId,
        data: {
          timestamp: new Date().toISOString()
        }
      };

      await this.broadcastRecordingEvent(channelName, startEvent);

      // Send real-time insights
      await this.sendRecordingInsights(recordingId, 'recording_started');

      logger.info('Started recording feedback', LogCategory.AI, {
        recordingId,
        userId
      });

    } catch (error) {
      logger.error('Failed to start recording feedback', LogCategory.AI, {
        recordingId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send step captured event with AI analysis
   */
  async onStepCaptured(
    recordingId: string,
    step: NoCodeTestStep,
    element: ElementIdentification,
    screenshot?: string
  ): Promise<void> {
    try {
      const channelName = `recording:${recordingId}`;

      // Analyze step quality and provide feedback
      const stepAnalysis = await this.analyzeStepQuality(step, element);

      const event: RecordingFeedbackEvent = {
        type: 'step_captured',
        recording_id: recordingId,
        data: {
          step,
          element,
          confidence: stepAnalysis.confidence,
          suggestions: stepAnalysis.suggestions,
          screenshot_url: screenshot,
          timestamp: new Date().toISOString()
        }
      };

      // Add to buffer and broadcast
      this.addToFeedbackBuffer(recordingId, event);
      await this.broadcastRecordingEvent(channelName, event);

      // Send contextual insights
      if (stepAnalysis.confidence < 0.7) {
        await this.sendRealTimeInsight(channelName, {
          type: 'optimization_tip',
          priority: 'medium',
          title: 'Step Quality Could Be Improved',
          message: 'This step has lower confidence. Consider using more stable selectors.',
          action_required: false,
          suggested_actions: stepAnalysis.suggestions
        });
      }

      logger.info('Step captured with feedback', LogCategory.AI, {
        recordingId,
        stepOrder: step.order,
        confidence: stepAnalysis.confidence
      });

    } catch (error) {
      logger.error('Failed to process step capture', LogCategory.AI, {
        recordingId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send element identified event with quality assessment
   */
  async onElementIdentified(
    recordingId: string,
    element: ElementIdentification,
    alternativeSelectors?: string[]
  ): Promise<void> {
    try {
      const channelName = `recording:${recordingId}`;

      const event: RecordingFeedbackEvent = {
        type: 'element_identified',
        recording_id: recordingId,
        data: {
          element,
          confidence: element.confidence_metrics?.selector_stability || 0.8,
          suggestions: alternativeSelectors,
          timestamp: new Date().toISOString()
        }
      };

      this.addToFeedbackBuffer(recordingId, event);
      await this.broadcastRecordingEvent(channelName, event);

      // Provide element quality insights
      const selectorQuality = this.assessSelectorQuality(element.primary_selector);
      if (selectorQuality.score < 0.8) {
        await this.sendRealTimeInsight(channelName, {
          type: 'best_practice_suggestion',
          priority: 'medium',
          title: 'Selector Could Be More Stable',
          message: selectorQuality.message,
          action_required: false,
          suggested_actions: ['Use data-testid attributes', 'Avoid CSS classes', 'Consider aria-labels']
        });
      }

    } catch (error) {
      logger.error('Failed to process element identification', LogCategory.AI, {
        recordingId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Start test validation with real-time feedback
   */
  async startTestValidation(testId: string, executionId: string): Promise<void> {
    try {
      const channelName = `validation:${testId}`;

      const event: TestValidationEvent = {
        type: 'validation_started',
        test_id: testId,
        execution_id: executionId,
        data: {
          timestamp: new Date().toISOString()
        }
      };

      await this.broadcastValidationEvent(channelName, event);

      logger.info('Started test validation', LogCategory.AI, {
        testId,
        executionId
      });

    } catch (error) {
      logger.error('Failed to start test validation', LogCategory.AI, {
        testId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send step validation result
   */
  async onStepValidated(
    testId: string,
    executionId: string,
    step: NoCodeTestStep,
    validationResult: {
      success: boolean;
      confidence: number;
      issues: string[];
      suggestions: string[];
    }
  ): Promise<void> {
    try {
      const channelName = `validation:${testId}`;

      const event: TestValidationEvent = {
        type: 'step_validated',
        test_id: testId,
        execution_id: executionId,
        data: {
          step,
          validation_result: validationResult,
          timestamp: new Date().toISOString()
        }
      };

      await this.broadcastValidationEvent(channelName, event);

      // Send insights based on validation results
      if (!validationResult.success) {
        await this.sendRealTimeInsight(channelName, {
          type: 'error_pattern',
          priority: 'high',
          title: 'Step Validation Failed',
          message: `Step ${step.order} failed validation: ${validationResult.issues.join(', ')}`,
          action_required: true,
          suggested_actions: validationResult.suggestions
        });
      } else if (validationResult.confidence < 0.8) {
        await this.sendRealTimeInsight(channelName, {
          type: 'performance_metric',
          priority: 'medium',
          title: 'Low Confidence Step',
          message: `Step ${step.order} has lower confidence (${Math.round(validationResult.confidence * 100)}%)`,
          action_required: false,
          suggested_actions: validationResult.suggestions
        });
      }

    } catch (error) {
      logger.error('Failed to process step validation', LogCategory.AI, {
        testId,
        stepId: step.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send element health check results
   */
  async onElementVerified(
    testId: string,
    elementId: string,
    healthStatus: {
      status: 'healthy' | 'warning' | 'broken';
      selector_confidence: number;
      alternative_selectors: string[];
      issues?: string[];
    }
  ): Promise<void> {
    try {
      const channelName = `validation:${testId}`;

      const event: TestValidationEvent = {
        type: 'element_verified',
        test_id: testId,
        data: {
          element_health: {
            element_id: elementId,
            ...healthStatus
          },
          timestamp: new Date().toISOString()
        }
      };

      await this.broadcastValidationEvent(channelName, event);

      // Send health-specific insights
      if (healthStatus.status === 'broken') {
        await this.sendRealTimeInsight(channelName, {
          type: 'error_pattern',
          priority: 'critical',
          title: 'Element Not Found',
          message: `Element ${elementId} could not be located. Self-healing may be required.`,
          action_required: true,
          suggested_actions: ['Use alternative selectors', 'Update element identification', 'Review recent UI changes']
        });
      } else if (healthStatus.status === 'warning') {
        await this.sendRealTimeInsight(channelName, {
          type: 'optimization_tip',
          priority: 'medium',
          title: 'Element Selector Unstable',
          message: `Element ${elementId} has reduced stability. Consider updating selector.`,
          action_required: false,
          suggested_actions: healthStatus.alternative_selectors.slice(0, 3)
        });
      }

    } catch (error) {
      logger.error('Failed to process element verification', LogCategory.AI, {
        testId,
        elementId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send overall test health summary
   */
  async sendTestHealthSummary(
    testId: string,
    healthSummary: {
      total_steps: number;
      healthy_steps: number;
      warning_steps: number;
      broken_steps: number;
      overall_confidence: number;
    }
  ): Promise<void> {
    try {
      const channelName = `validation:${testId}`;

      const event: TestValidationEvent = {
        type: 'validation_completed',
        test_id: testId,
        data: {
          overall_health: healthSummary,
          timestamp: new Date().toISOString()
        }
      };

      await this.broadcastValidationEvent(channelName, event);

      // Send summary insights
      const healthPercentage = (healthSummary.healthy_steps / healthSummary.total_steps) * 100;
      
      if (healthPercentage < 70) {
        await this.sendRealTimeInsight(channelName, {
          type: 'error_pattern',
          priority: 'high',
          title: 'Test Health Critical',
          message: `Only ${Math.round(healthPercentage)}% of steps are healthy. Immediate attention required.`,
          action_required: true,
          suggested_actions: ['Review broken steps', 'Run self-healing', 'Update selectors']
        });
      } else if (healthPercentage < 90) {
        await this.sendRealTimeInsight(channelName, {
          type: 'optimization_tip',
          priority: 'medium',
          title: 'Test Health Good',
          message: `${Math.round(healthPercentage)}% of steps are healthy. Some optimization possible.`,
          action_required: false,
          suggested_actions: ['Review warning steps', 'Update unstable selectors']
        });
      } else {
        await this.sendRealTimeInsight(channelName, {
          type: 'success_feedback',
          priority: 'low',
          title: 'Excellent Test Health',
          message: `${Math.round(healthPercentage)}% of steps are healthy. Great job!`,
          action_required: false
        });
      }

    } catch (error) {
      logger.error('Failed to send test health summary', LogCategory.AI, {
        testId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Stop recording feedback
   */
  async stopRecordingFeedback(recordingId: string): Promise<void> {
    try {
      const channelName = `recording:${recordingId}`;

      const event: RecordingFeedbackEvent = {
        type: 'recording_stopped',
        recording_id: recordingId,
        data: {
          timestamp: new Date().toISOString()
        }
      };

      await this.broadcastRecordingEvent(channelName, event);

      // Clean up
      this.feedbackBuffer.delete(recordingId);
      this.activeRecordings.delete(recordingId);

      logger.info('Stopped recording feedback', LogCategory.AI, {
        recordingId
      });

    } catch (error) {
      logger.error('Failed to stop recording feedback', LogCategory.AI, {
        recordingId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Private helper methods

  private initializeEventHandlers(): void {
    // Set up any global event handlers if needed
    logger.info('Real-time event manager initialized', LogCategory.AI);
  }

  private async analyzeStepQuality(
    step: NoCodeTestStep,
    element: ElementIdentification
  ): Promise<{
    confidence: number;
    suggestions: string[];
  }> {
    let confidence = step.confidence_score || 0.8;
    const suggestions: string[] = [];

    // Analyze element selector quality
    if (element.primary_selector.includes('#')) {
      confidence += 0.1; // ID selectors are stable
    } else if (element.primary_selector.includes('[data-testid')) {
      confidence += 0.15; // Test IDs are most stable
    } else if (element.primary_selector.includes('.')) {
      confidence -= 0.1; // CSS classes are less stable
      suggestions.push('Consider using data-testid attributes for more stable selectors');
    }

    // Check for natural language quality
    if (!step.natural_language || step.natural_language.length < 10) {
      confidence -= 0.2;
      suggestions.push('Add more descriptive natural language description');
    }

    // Check for element description
    if (!step.element_description || step.element_description.length < 5) {
      confidence -= 0.1;
      suggestions.push('Provide better element description');
    }

    return {
      confidence: Math.max(0, Math.min(1, confidence)),
      suggestions
    };
  }

  private assessSelectorQuality(selector: string): { score: number; message: string } {
    if (selector.includes('[data-testid')) {
      return { score: 0.95, message: 'Excellent: Using data-testid attribute' };
    } else if (selector.includes('#')) {
      return { score: 0.85, message: 'Good: Using ID selector' };
    } else if (selector.includes('[aria-label')) {
      return { score: 0.8, message: 'Good: Using aria-label for accessibility' };
    } else if (selector.includes('[name')) {
      return { score: 0.75, message: 'Fair: Using name attribute' };
    } else if (selector.includes('.')) {
      return { score: 0.6, message: 'Caution: CSS classes may change during redesigns' };
    } else {
      return { score: 0.4, message: 'Warning: Complex selector may be brittle' };
    }
  }

  private addToFeedbackBuffer(recordingId: string, event: RecordingFeedbackEvent): void {
    const buffer = this.feedbackBuffer.get(recordingId) || [];
    buffer.push(event);
    
    // Keep only last 50 events to prevent memory issues
    if (buffer.length > 50) {
      buffer.shift();
    }
    
    this.feedbackBuffer.set(recordingId, buffer);
  }

  private async broadcastRecordingEvent(
    channelName: string,
    event: RecordingFeedbackEvent
  ): Promise<void> {
    const wsEvent: StandardWebSocketEvent = {
      type: 'recording_feedback',
      data: event,
      timestamp: new Date().toISOString()
    };

    this.wsService.broadcast(channelName, wsEvent);
  }

  private async broadcastValidationEvent(
    channelName: string,
    event: TestValidationEvent
  ): Promise<void> {
    const wsEvent: StandardWebSocketEvent = {
      type: 'test_validation',
      data: event,
      timestamp: new Date().toISOString()
    };

    this.wsService.broadcast(channelName, wsEvent);
  }

  private async sendRealTimeInsight(
    channelName: string,
    insight: RealTimeInsight
  ): Promise<void> {
    const wsEvent: StandardWebSocketEvent = {
      type: 'realtime_insight',
      data: insight,
      timestamp: new Date().toISOString()
    };

    this.wsService.broadcast(channelName, wsEvent);
  }

  private async sendRecordingInsights(
    recordingId: string,
    phase: 'recording_started' | 'recording_stopped'
  ): Promise<void> {
    const channelName = `recording:${recordingId}`;

    if (phase === 'recording_started') {
      await this.sendRealTimeInsight(channelName, {
        type: 'best_practice_suggestion',
        priority: 'low',
        title: 'Recording Tips',
        message: 'Use clear, deliberate actions. TestBro will capture and analyze each step.',
        action_required: false,
        suggested_actions: ['Click slowly and deliberately', 'Use test-friendly selectors when possible', 'Add meaningful descriptions']
      });
    }
  }
}