import { Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/database';
import { WebSocketService } from './websocketService';
import { UIChangeDetectionService } from './uiChangeDetectionService';
import { IntelligentSelectorAdaptationEngine } from './intelligentSelectorAdaptationEngine';
import { logger, LogCategory } from './loggingService';
import {
  HealingSession,
  HealingAttempt,
  HealingStrategy,
  HealingConfiguration,
  TestExecution,
  TestStep,
  ElementSemanticProfile,
  SelectorUpdate
} from '../types';

export interface HealingWorkflowResult {
  success: boolean;
  session_id: string;
  healing_attempts: HealingAttempt[];
  successful_adaptations: SelectorUpdate[];
  final_status: 'completed' | 'failed' | 'requires_review';
  confidence_score: number;
  execution_time_ms: number;
  error_message?: string;
}

export interface HealingExecutionContext {
  test_execution: TestExecution;
  failed_step: TestStep;
  failure_details: {
    error_message: string;
    failure_type: 'element_not_found' | 'timeout' | 'assertion_failed' | 'interaction_failed';
    screenshot_url?: string;
    page_context: any;
  };
  healing_config: HealingConfiguration;
  page: Page;
}

export class TestHealingExecutionManager {
  private wsService: WebSocketService;
  private uiChangeDetectionService: UIChangeDetectionService;
  private selectorAdaptationEngine: IntelligentSelectorAdaptationEngine;
  private activeHealingSessions = new Map<string, HealingSession>();
  private healingQueue: Array<{ sessionId: string; priority: number; context: HealingExecutionContext }> = [];
  private isProcessingQueue = false;

  constructor(
    wsService: WebSocketService,
    uiChangeDetectionService: UIChangeDetectionService,
    selectorAdaptationEngine: IntelligentSelectorAdaptationEngine
  ) {
    this.wsService = wsService;
    this.uiChangeDetectionService = uiChangeDetectionService;
    this.selectorAdaptationEngine = selectorAdaptationEngine;
    this.startQueueProcessor();
  }

  /**
   * Main entry point for initiating test healing workflow
   */
  async initiateHealing(
    testExecution: TestExecution,
    failedStep: TestStep,
    failureDetails: any,
    page: Page,
    trigger: 'automatic' | 'manual' = 'automatic'
  ): Promise<HealingWorkflowResult> {
    const sessionId = uuidv4();
    const startTime = Date.now();

    try {
      logger.info('Initiating test healing workflow', LogCategory.HEALING, {
        sessionId,
        testCaseId: testExecution.test_case_id,
        executionId: testExecution.id,
        failedStepId: failedStep.id,
        trigger
      });

      // 1. Get healing configuration
      const healingConfig = await this.getHealingConfiguration(testExecution.project_id);
      
      if (!healingConfig.auto_healing_enabled && trigger === 'automatic') {
        return {
          success: false,
          session_id: sessionId,
          healing_attempts: [],
          successful_adaptations: [],
          final_status: 'failed',
          confidence_score: 0,
          execution_time_ms: Date.now() - startTime,
          error_message: 'Auto-healing is disabled for this project'
        };
      }

      // 2. Create healing session
      const healingSession = await this.createHealingSession(
        sessionId,
        testExecution,
        failedStep,
        failureDetails,
        trigger === 'manual' ? 'manual_trigger' : 'failure_detection'
      );

      // 3. Analyze failure to determine if it's suitable for healing
      const failureAnalysis = await this.analyzeFailureForHealing(
        testExecution,
        failedStep,
        failureDetails,
        page
      );

      if (!failureAnalysis.is_healable) {
        await this.updateHealingSession(sessionId, {
          status: 'failed',
          ai_analysis: { analysis: failureAnalysis, reason: 'Not suitable for healing' }
        });

        return {
          success: false,
          session_id: sessionId,
          healing_attempts: [],
          successful_adaptations: [],
          final_status: 'failed',
          confidence_score: 0,
          execution_time_ms: Date.now() - startTime,
          error_message: failureAnalysis.reason
        };
      }

      // 4. Execute healing workflow
      const healingResult = await this.executeHealingWorkflow(
        healingSession,
        {
          test_execution: testExecution,
          failed_step: failedStep,
          failure_details: failureDetails,
          healing_config: healingConfig,
          page
        }
      );

      // 5. Validate healing results
      const validationResult = await this.validateHealingResults(
        healingResult,
        page,
        testExecution
      );

      // 6. Apply healing if confidence is high enough
      let finalStatus: 'completed' | 'failed' | 'requires_review' = 'failed';
      let appliedAdaptations: SelectorUpdate[] = [];

      if (validationResult.should_apply) {
        if (validationResult.requires_review || 
            healingResult.confidence_score < healingConfig.confidence_threshold) {
          finalStatus = 'requires_review';
          // Store for manual review but don't apply yet
        } else {
          // Apply healing automatically
          appliedAdaptations = await this.applyHealingResults(healingResult);
          finalStatus = appliedAdaptations.length > 0 ? 'completed' : 'failed';
        }
      }

      // 7. Update healing session with final results
      await this.updateHealingSession(sessionId, {
        status: finalStatus,
        successful_adaptations: appliedAdaptations,
        confidence_score: healingResult.confidence_score,
        completed_at: new Date().toISOString()
      });

      // 8. Emit completion event
      this.emitHealingEvent(sessionId, 'healing_completed', {
        session: await this.getHealingSession(sessionId),
        result: healingResult
      });

      const result: HealingWorkflowResult = {
        success: finalStatus === 'completed',
        session_id: sessionId,
        healing_attempts: healingResult.healing_attempts,
        successful_adaptations: appliedAdaptations,
        final_status: finalStatus,
        confidence_score: healingResult.confidence_score,
        execution_time_ms: Date.now() - startTime
      };

      logger.info('Test healing workflow completed', LogCategory.HEALING, {
        sessionId,
        success: result.success,
        finalStatus,
        executionTime: result.execution_time_ms,
        adaptationsApplied: appliedAdaptations.length
      });

      return result;

    } catch (error) {
      logger.error('Test healing workflow failed', LogCategory.HEALING, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Update session with error
      await this.updateHealingSession(sessionId, {
        status: 'failed',
        completed_at: new Date().toISOString()
      }).catch(() => {});

      return {
        success: false,
        session_id: sessionId,
        healing_attempts: [],
        successful_adaptations: [],
        final_status: 'failed',
        confidence_score: 0,
        execution_time_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Queue healing request for batch processing
   */
  async queueHealing(
    testExecution: TestExecution,
    failedStep: TestStep,
    failureDetails: any,
    page: Page,
    priority: number = 1
  ): Promise<string> {
    const sessionId = uuidv4();
    
    const healingConfig = await this.getHealingConfiguration(testExecution.project_id);
    
    this.healingQueue.push({
      sessionId,
      priority,
      context: {
        test_execution: testExecution,
        failed_step: failedStep,
        failure_details: failureDetails,
        healing_config: healingConfig,
        page
      }
    });

    // Sort queue by priority
    this.healingQueue.sort((a, b) => b.priority - a.priority);

    logger.info('Healing request queued', LogCategory.HEALING, {
      sessionId,
      queueLength: this.healingQueue.length,
      priority
    });

    return sessionId;
  }

  /**
   * Get healing session status and results
   */
  async getHealingSessionStatus(sessionId: string): Promise<HealingSession | null> {
    return this.getHealingSession(sessionId);
  }

  /**
   * Approve healing results for application
   */
  async approveHealing(
    sessionId: string,
    approvedBy: string,
    reviewNotes?: string
  ): Promise<{ success: boolean; applied_adaptations: SelectorUpdate[] }> {
    try {
      const session = await this.getHealingSession(sessionId);
      if (!session) {
        throw new Error(`Healing session not found: ${sessionId}`);
      }

      if (session.status !== 'requires_review') {
        throw new Error(`Session is not in review status: ${session.status}`);
      }

      // Apply the healing results
      const appliedAdaptations = await this.applyHealingResults({
        session_id: sessionId,
        healing_attempts: session.healing_attempts,
        confidence_score: session.confidence_score || 0,
        successful_adaptations: []
      });

      // Update session
      await this.updateHealingSession(sessionId, {
        status: 'completed',
        reviewed_by: approvedBy,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes,
        successful_adaptations: appliedAdaptations
      });

      logger.info('Healing approved and applied', LogCategory.HEALING, {
        sessionId,
        approvedBy,
        adaptationsApplied: appliedAdaptations.length
      });

      return {
        success: true,
        applied_adaptations: appliedAdaptations
      };

    } catch (error) {
      logger.error('Failed to approve healing', LogCategory.HEALING, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        applied_adaptations: []
      };
    }
  }

  /**
   * Reject healing results
   */
  async rejectHealing(
    sessionId: string,
    rejectedBy: string,
    reason: string
  ): Promise<{ success: boolean }> {
    try {
      await this.updateHealingSession(sessionId, {
        status: 'failed',
        reviewed_by: rejectedBy,
        reviewed_at: new Date().toISOString(),
        review_notes: `Rejected: ${reason}`
      });

      logger.info('Healing rejected', LogCategory.HEALING, {
        sessionId,
        rejectedBy,
        reason
      });

      return { success: true };

    } catch (error) {
      logger.error('Failed to reject healing', LogCategory.HEALING, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return { success: false };
    }
  }

  // Private methods

  private async createHealingSession(
    sessionId: string,
    testExecution: TestExecution,
    failedStep: TestStep,
    failureDetails: any,
    triggerType: 'failure_detection' | 'scheduled_check' | 'manual_trigger'
  ): Promise<HealingSession> {
    const session: HealingSession = {
      id: sessionId,
      test_case_id: testExecution.test_case_id || '',
      execution_id: testExecution.id,
      trigger_type: triggerType,
      status: 'pending',
      failure_details: {
        failed_step_id: failedStep.id,
        failure_type: this.categorizeFailure(failureDetails.error_message),
        original_selector: failedStep.element || '',
        error_message: failureDetails.error_message,
        screenshot_url: failureDetails.screenshot_url,
        page_url: failureDetails.page_context?.url || '',
        failure_timestamp: new Date().toISOString()
      },
      healing_attempts: [],
      successful_adaptations: [],
      validation_results: {
        validation_passed: false,
        validation_errors: [],
        performance_impact: { execution_time_delta: 0 },
        regression_test_results: []
      },
      confidence_score: 0,
      healing_strategy: '',
      ai_analysis: {
        failure_classification: { category: 'unknown', confidence: 0, reasoning: '' },
        healing_feasibility: { is_healable: false, confidence: 0, reasoning: '' },
        recommended_strategies: [],
        risk_assessment: { risk_level: 'low', potential_issues: [], mitigation_strategies: [] }
      },
      performance_metrics: {
        total_execution_time: 0,
        strategy_execution_times: {},
        resource_usage: { cpu_usage: 0, memory_usage: 0 },
        api_calls_made: 0
      },
      review_notes: '',
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      created_by: testExecution.initiated_by
    };

    // Store in database
    const { error } = await supabaseAdmin
      .from('healing_sessions')
      .insert(session);

    if (error) {
      throw new Error(`Failed to create healing session: ${error.message}`);
    }

    // Store in memory
    this.activeHealingSessions.set(sessionId, session);

    return session;
  }

  private async analyzeFailureForHealing(
    testExecution: TestExecution,
    failedStep: TestStep,
    failureDetails: any,
    page: Page
  ): Promise<{ is_healable: boolean; confidence: number; reason: string }> {
    try {
      // Use UI Change Detection Service to analyze the failure
      const changeAnalysis = await this.uiChangeDetectionService.analyzeTestFailure(
        testExecution.id,
        failedStep,
        page,
        failureDetails.error_message
      );

      return {
        is_healable: changeAnalysis.is_ui_change,
        confidence: changeAnalysis.confidence,
        reason: changeAnalysis.is_ui_change ? 
          'Failure appears to be caused by UI changes' : 
          'Failure does not appear to be UI-related'
      };

    } catch (error) {
      return {
        is_healable: false,
        confidence: 0,
        reason: 'Failed to analyze failure'
      };
    }
  }

  private async executeHealingWorkflow(
    session: HealingSession,
    context: HealingExecutionContext
  ): Promise<{
    session_id: string;
    healing_attempts: HealingAttempt[];
    confidence_score: number;
    successful_adaptations: any[];
  }> {
    const startTime = Date.now();
    const healingAttempts: HealingAttempt[] = [];
    
    try {
      // Update session status
      await this.updateHealingSession(session.id, { status: 'analyzing' });
      this.emitHealingEvent(session.id, 'healing_progress', { 
        status: 'analyzing', 
        message: 'Analyzing failure and page changes' 
      });

      // 1. Create element semantic profile for the failed step
      let originalProfile: ElementSemanticProfile;
      try {
        originalProfile = await this.createElementProfile(context.failed_step, context.page);
      } catch (error) {
        // If we can't create a profile, use minimal data
        originalProfile = {
          selector: context.failed_step.element || '',
          element_type: 'unknown',
          semantic_role: 'unknown',
          text_content: '',
          attributes: {},
          position: { x: 0, y: 0, width: 0, height: 0 },
          visual_characteristics: {
            computed_styles: {},
            is_interactive: false,
            accessibility_properties: {}
          },
          context: {
            parent_elements: [],
            sibling_elements: [],
            child_elements: []
          },
          stability_score: 0,
          uniqueness_indicators: [],
          interaction_patterns: {
            click_target: false,
            form_input: false,
            navigation_element: false
          }
        };
      }

      // 2. Update session status to healing
      await this.updateHealingSession(session.id, { status: 'healing' });
      this.emitHealingEvent(session.id, 'healing_progress', {
        status: 'healing',
        message: 'Attempting to adapt selector'
      });

      // 3. Attempt selector adaptation
      const adaptationContext = {
        test_case_id: context.test_execution.test_case_id || '',
        step_id: context.failed_step.id,
        original_selector: context.failed_step.element || '',
        failure_context: {
          error_message: context.failure_details.error_message,
          page_url: context.failure_details.page_context?.url || '',
          screenshot_url: context.failure_details.screenshot_url
        },
        page_changes: {
          layout_modified: true,
          content_updated: true,
          structure_changed: true
        },
        user_intent: {
          action_type: context.failed_step.action,
          expected_outcome: context.failed_step.description,
          semantic_description: `${context.failed_step.action} on ${context.failed_step.element}`
        }
      };

      const adaptationResult = await this.selectorAdaptationEngine.adaptSelector(
        originalProfile,
        context.page,
        adaptationContext
      );

      // 4. Create healing attempt record
      const attempt: HealingAttempt = {
        attempt_number: 1,
        strategy_used: adaptationResult.adaptation_method,
        original_selector: context.failed_step.element || '',
        proposed_selector: adaptationResult.new_selector,
        confidence_score: adaptationResult.confidence_score,
        reasoning: `Adaptation using ${adaptationResult.adaptation_method}`,
        validation_results: adaptationResult.validation_results,
        execution_time_ms: Date.now() - startTime,
        success: adaptationResult.success,
        error_message: adaptationResult.success ? undefined : 'Adaptation failed'
      };

      healingAttempts.push(attempt);

      // 5. Update session with attempt
      await this.updateHealingSession(session.id, {
        healing_attempts: healingAttempts,
        confidence_score: adaptationResult.confidence_score
      });

      return {
        session_id: session.id,
        healing_attempts: healingAttempts,
        confidence_score: adaptationResult.confidence_score,
        successful_adaptations: adaptationResult.success ? [adaptationResult] : []
      };

    } catch (error) {
      logger.error('Healing workflow execution failed', LogCategory.HEALING, {
        sessionId: session.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      const failedAttempt: HealingAttempt = {
        attempt_number: healingAttempts.length + 1,
        strategy_used: 'failed',
        original_selector: context.failed_step.element || '',
        proposed_selector: context.failed_step.element || '',
        confidence_score: 0,
        reasoning: 'Healing workflow failed',
        validation_results: {
          element_found: false,
          functionality_preserved: false,
          interaction_successful: false,
          visual_similarity: 0
        },
        execution_time_ms: Date.now() - startTime,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };

      healingAttempts.push(failedAttempt);

      return {
        session_id: session.id,
        healing_attempts: healingAttempts,
        confidence_score: 0,
        successful_adaptations: []
      };
    }
  }

  private async validateHealingResults(
    healingResult: any,
    page: Page,
    testExecution: TestExecution
  ): Promise<{ should_apply: boolean; requires_review: boolean; reason: string }> {
    try {
      // Basic validation checks
      if (healingResult.healing_attempts.length === 0) {
        return {
          should_apply: false,
          requires_review: false,
          reason: 'No healing attempts were made'
        };
      }

      const lastAttempt = healingResult.healing_attempts[healingResult.healing_attempts.length - 1];
      
      if (!lastAttempt.success) {
        return {
          should_apply: false,
          requires_review: false,
          reason: 'Last healing attempt was unsuccessful'
        };
      }

      if (healingResult.confidence_score < 0.5) {
        return {
          should_apply: false,
          requires_review: true,
          reason: 'Confidence score too low for automatic application'
        };
      }

      if (healingResult.confidence_score < 0.8) {
        return {
          should_apply: true,
          requires_review: true,
          reason: 'Moderate confidence - requires manual review'
        };
      }

      return {
        should_apply: true,
        requires_review: false,
        reason: 'High confidence healing result'
      };

    } catch (error) {
      return {
        should_apply: false,
        requires_review: false,
        reason: 'Validation failed'
      };
    }
  }

  private async applyHealingResults(healingResult: any): Promise<SelectorUpdate[]> {
    const appliedUpdates: SelectorUpdate[] = [];

    try {
      for (const adaptation of healingResult.successful_adaptations) {
        if (adaptation.success && adaptation.confidence_score > 0.6) {
          // Create selector update record
          const selectorUpdate: SelectorUpdate = {
            id: uuidv4(),
            healing_session_id: healingResult.session_id,
            test_case_id: '', // Would be filled from context
            step_id: '', // Would be filled from context
            original_selector: adaptation.rollback_data.original_selector,
            new_selector: adaptation.new_selector,
            update_reason: adaptation.adaptation_method,
            confidence_score: adaptation.confidence_score,
            validation_status: 'pending',
            semantic_similarity: adaptation.semantic_similarity,
            alternative_selectors: adaptation.alternative_selectors,
            context_preservation: {
              user_intent_preserved: true,
              functionality_maintained: true,
              visual_consistency: adaptation.validation_results.visual_similarity > 0.7
            },
            rollback_data: adaptation.rollback_data,
            created_at: new Date().toISOString()
          };

          // Apply the selector update
          const applyResult = await this.selectorAdaptationEngine.applySelectorUpdate(
            selectorUpdate.test_case_id,
            selectorUpdate.step_id,
            selectorUpdate
          );

          if (applyResult.success) {
            appliedUpdates.push(selectorUpdate);
          }
        }
      }

    } catch (error) {
      logger.error('Failed to apply healing results', LogCategory.HEALING, {
        sessionId: healingResult.session_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return appliedUpdates;
  }

  private startQueueProcessor(): void {
    setInterval(async () => {
      if (!this.isProcessingQueue && this.healingQueue.length > 0) {
        this.isProcessingQueue = true;
        
        try {
          const queueItem = this.healingQueue.shift();
          if (queueItem) {
            await this.initiateHealing(
              queueItem.context.test_execution,
              queueItem.context.failed_step,
              queueItem.context.failure_details,
              queueItem.context.page,
              'automatic'
            );
          }
        } catch (error) {
          logger.error('Queue processing failed', LogCategory.HEALING, {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        } finally {
          this.isProcessingQueue = false;
        }
      }
    }, 5000); // Process queue every 5 seconds
  }

  // Helper methods

  private async getHealingConfiguration(projectId: string): Promise<HealingConfiguration> {
    try {
      const { data, error } = await supabaseAdmin
        .from('healing_configurations')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error || !data) {
        // Return default configuration
        return {
          id: uuidv4(),
          project_id: projectId,
          auto_healing_enabled: true,
          confidence_threshold: 0.8,
          max_healing_attempts: 3,
          require_review_threshold: 0.6,
          notification_settings: {
            email_notifications: true,
            webhook_notifications: false,
            real_time_updates: true
          },
          strategy_preferences: [],
          exclusion_patterns: [],
          performance_limits: {
            max_execution_time_ms: 30000,
            max_memory_usage_mb: 512
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: ''
        };
      }

      return data;

    } catch (error) {
      logger.warn('Failed to get healing configuration, using defaults', LogCategory.HEALING, {
        projectId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        id: uuidv4(),
        project_id: projectId,
        auto_healing_enabled: true,
        confidence_threshold: 0.8,
        max_healing_attempts: 3,
        require_review_threshold: 0.6,
        notification_settings: { email_notifications: true, webhook_notifications: false, real_time_updates: true },
        strategy_preferences: [],
        exclusion_patterns: [],
        performance_limits: { max_execution_time_ms: 30000, max_memory_usage_mb: 512 },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: ''
      };
    }
  }

  private async getHealingSession(sessionId: string): Promise<HealingSession | null> {
    try {
      // Check memory first
      if (this.activeHealingSessions.has(sessionId)) {
        return this.activeHealingSessions.get(sessionId) || null;
      }

      // Check database
      const { data, error } = await supabaseAdmin
        .from('healing_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;

    } catch (error) {
      logger.warn('Failed to get healing session', LogCategory.HEALING, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  private async updateHealingSession(sessionId: string, updates: Partial<HealingSession>): Promise<void> {
    try {
      // Update in memory
      if (this.activeHealingSessions.has(sessionId)) {
        const session = this.activeHealingSessions.get(sessionId)!;
        const updatedSession = { ...session, ...updates };
        this.activeHealingSessions.set(sessionId, updatedSession);
      }

      // Update in database
      const { error } = await supabaseAdmin
        .from('healing_sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) {
        throw new Error(`Failed to update healing session: ${error.message}`);
      }

    } catch (error) {
      logger.warn('Failed to update healing session', LogCategory.HEALING, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private categorizeFailure(errorMessage: string): 'element_not_found' | 'timeout' | 'assertion_failed' | 'interaction_failed' {
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('element') && (lowerError.includes('not found') || lowerError.includes('not visible'))) {
      return 'element_not_found';
    }
    if (lowerError.includes('timeout')) {
      return 'timeout';
    }
    if (lowerError.includes('assertion') || lowerError.includes('expected')) {
      return 'assertion_failed';
    }
    return 'interaction_failed';
  }

  private async createElementProfile(step: TestStep, page: Page): Promise<ElementSemanticProfile> {
    // This would integrate with the UI Change Detection Service
    // For now, return a basic profile
    return {
      selector: step.element || '',
      element_type: 'unknown',
      semantic_role: 'unknown',
      text_content: '',
      attributes: {},
      position: { x: 0, y: 0, width: 0, height: 0 },
      visual_characteristics: {
        computed_styles: {},
        is_interactive: false,
        accessibility_properties: {}
      },
      context: {
        parent_elements: [],
        sibling_elements: [],
        child_elements: []
      },
      stability_score: 0.5,
      uniqueness_indicators: [],
      interaction_patterns: {
        click_target: step.action === 'click',
        form_input: step.action === 'type',
        navigation_element: false
      }
    };
  }

  private emitHealingEvent(sessionId: string, eventType: string, data: any): void {
    this.wsService.broadcast(`healing:${sessionId}`, {
      type: 'healing_progress',
      data: {
        session_id: sessionId,
        event_type: eventType,
        timestamp: new Date().toISOString(),
        ...data
      }
    });
  }
}