import { Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/database';
import { WebSocketService } from './websocketService';
import { AIService } from './aiService';
import { logger, LogCategory } from './loggingService';
import {
  SelectorUpdate,
  ElementSemanticProfile,
  HealingAttempt,
  HealingStrategy,
  TestStep
} from '../types';

export interface SelectorAdaptationResult {
  success: boolean;
  new_selector: string;
  confidence_score: number;
  adaptation_method: string;
  semantic_similarity: number;
  validation_results: {
    element_found: boolean;
    functionality_preserved: boolean;
    interaction_successful: boolean;
    visual_similarity: number;
  };
  alternative_selectors: Array<{
    selector: string;
    confidence: number;
    method: string;
    reasoning: string;
  }>;
  rollback_data: {
    original_selector: string;
    original_context: any;
    adaptation_timestamp: string;
  };
}

export interface AdaptationStrategy {
  name: string;
  priority: number;
  confidence_threshold: number;
  execute: (
    originalProfile: ElementSemanticProfile,
    page: Page,
    context: AdaptationContext
  ) => Promise<SelectorAdaptationResult>;
}

export interface AdaptationContext {
  test_case_id: string;
  step_id: string;
  original_selector: string;
  failure_context: {
    error_message: string;
    page_url: string;
    screenshot_url?: string;
  };
  page_changes: {
    layout_modified: boolean;
    content_updated: boolean;
    structure_changed: boolean;
  };
  user_intent: {
    action_type: string;
    expected_outcome: string;
    semantic_description: string;
  };
}

export class IntelligentSelectorAdaptationEngine {
  private wsService: WebSocketService;
  private aiService: AIService;
  private adaptationStrategies: Map<string, AdaptationStrategy> = new Map();

  constructor(wsService: WebSocketService, aiService: AIService) {
    this.wsService = wsService;
    this.aiService = aiService;
    this.initializeAdaptationStrategies();
  }

  /**
   * Main entry point for intelligent selector adaptation
   */
  async adaptSelector(
    originalProfile: ElementSemanticProfile,
    page: Page,
    context: AdaptationContext
  ): Promise<SelectorAdaptationResult> {
    const adaptationId = uuidv4();
    
    try {
      logger.info('Starting intelligent selector adaptation', LogCategory.HEALING, {
        adaptationId,
        originalSelector: originalProfile.selector,
        testCaseId: context.test_case_id
      });

      // Select and execute adaptation strategies
      const strategies = Array.from(this.adaptationStrategies.values())
        .sort((a, b) => a.priority - b.priority);

      let bestResult: SelectorAdaptationResult | null = null;

      for (const strategy of strategies) {
        try {
          const result = await strategy.execute(originalProfile, page, context);
          
          if (result.success && result.confidence_score >= strategy.confidence_threshold) {
            if (!bestResult || result.confidence_score > bestResult.confidence_score) {
              bestResult = result;
            }
          }

          if (bestResult && bestResult.confidence_score >= 0.9) break;

        } catch (error) {
          logger.warn(`Strategy failed: ${strategy.name}`, LogCategory.HEALING, {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Validate final result
      const finalResult = bestResult || this.createFailureResult(originalProfile, 'No successful adaptations');
      const validatedResult = await this.validateAdaptation(finalResult, page, context);

      // Store result
      await this.storeAdaptationResult(validatedResult, context);

      return validatedResult;

    } catch (error) {
      logger.error('Failed to adapt selector', LogCategory.HEALING, {
        adaptationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return this.createFailureResult(originalProfile, 'Adaptation process failed');
    }
  }

  /**
   * Apply selector update to test case
   */
  async applySelectorUpdate(
    testCaseId: string,
    stepId: string,
    selectorUpdate: SelectorUpdate
  ): Promise<{ success: boolean; updated_step: TestStep | null }> {
    try {
      const { data: testStep, error } = await supabaseAdmin
        .from('test_steps')
        .select('*')
        .eq('id', stepId)
        .single();

      if (error || !testStep) {
        throw new Error(`Test step not found: ${stepId}`);
      }

      const updatedStep = {
        ...testStep,
        element: selectorUpdate.new_selector,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabaseAdmin
        .from('test_steps')
        .update(updatedStep)
        .eq('id', stepId);

      if (updateError) {
        throw new Error(`Failed to update test step: ${updateError.message}`);
      }

      await supabaseAdmin
        .from('selector_updates')
        .update({
          applied_at: new Date().toISOString(),
          validation_status: 'validated'
        })
        .eq('id', selectorUpdate.id);

      return { success: true, updated_step: updatedStep };

    } catch (error) {
      logger.error('Failed to apply selector update', LogCategory.HEALING, {
        testCaseId,
        stepId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return { success: false, updated_step: null };
    }
  }

  /**
   * Rollback selector update
   */
  async rollbackSelectorUpdate(
    selectorUpdateId: string,
    reason: string
  ): Promise<{ success: boolean; rolled_back_step: TestStep | null }> {
    try {
      const { data: selectorUpdate, error } = await supabaseAdmin
        .from('selector_updates')
        .select('*')
        .eq('id', selectorUpdateId)
        .single();

      if (error || !selectorUpdate) {
        throw new Error(`Selector update not found: ${selectorUpdateId}`);
      }

      if (!selectorUpdate.rollback_data?.original_step) {
        throw new Error('No rollback data available');
      }

      const originalStep = selectorUpdate.rollback_data.original_step;
      const { error: updateError } = await supabaseAdmin
        .from('test_steps')
        .update({
          element: originalStep.element,
          updated_at: new Date().toISOString()
        })
        .eq('id', originalStep.id);

      if (updateError) {
        throw new Error(`Failed to rollback test step: ${updateError.message}`);
      }

      return { success: true, rolled_back_step: originalStep };

    } catch (error) {
      logger.error('Failed to rollback selector update', LogCategory.HEALING, {
        selectorUpdateId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return { success: false, rolled_back_step: null };
    }
  }

  // Private methods

  private initializeAdaptationStrategies(): void {
    // Semantic Element Matching Strategy
    this.adaptationStrategies.set('semantic_matching', {
      name: 'Semantic Element Matching',
      priority: 1,
      confidence_threshold: 0.8,
      execute: async (originalProfile, page, context) => 
        this.executeSemanticMatching(originalProfile, page, context)
    });

    // Attribute-Based Adaptation Strategy
    this.adaptationStrategies.set('attribute_adaptation', {
      name: 'Attribute-Based Adaptation',
      priority: 2,
      confidence_threshold: 0.7,
      execute: async (originalProfile, page, context) => 
        this.executeAttributeAdaptation(originalProfile, page, context)
    });

    // Text Content Matching Strategy
    this.adaptationStrategies.set('text_matching', {
      name: 'Text Content Matching',
      priority: 3,
      confidence_threshold: 0.6,
      execute: async (originalProfile, page, context) => 
        this.executeTextContentMatching(originalProfile, page, context)
    });

    // AI-Powered Analysis Strategy
    this.adaptationStrategies.set('ai_analysis', {
      name: 'AI-Powered Analysis',
      priority: 4,
      confidence_threshold: 0.7,
      execute: async (originalProfile, page, context) => 
        this.executeAIAnalysis(originalProfile, page, context)
    });
  }

  private async executeSemanticMatching(
    originalProfile: ElementSemanticProfile,
    page: Page,
    context: AdaptationContext
  ): Promise<SelectorAdaptationResult> {
    try {
      // Find elements with similar semantic characteristics
      const candidates = await this.findSemanticCandidates(originalProfile, page);
      
      if (candidates.length === 0) {
        return this.createFailureResult(originalProfile, 'No semantic candidates found');
      }

      const bestCandidate = candidates[0];

      return {
        success: true,
        new_selector: bestCandidate.selector,
        confidence_score: bestCandidate.confidence,
        adaptation_method: 'semantic_matching',
        semantic_similarity: bestCandidate.similarity,
        validation_results: await this.validateElement(bestCandidate.selector, page),
        alternative_selectors: candidates.slice(1, 3).map(c => ({
          selector: c.selector,
          confidence: c.confidence,
          method: 'semantic_matching',
          reasoning: `Semantic similarity: ${c.similarity.toFixed(2)}`
        })),
        rollback_data: {
          original_selector: originalProfile.selector,
          original_context: context,
          adaptation_timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return this.createFailureResult(originalProfile, 'Semantic matching failed');
    }
  }

  private async executeAttributeAdaptation(
    originalProfile: ElementSemanticProfile,
    page: Page,
    context: AdaptationContext
  ): Promise<SelectorAdaptationResult> {
    try {
      const attributePriority = ['data-testid', 'id', 'aria-label', 'name', 'class'];
      const alternatives: Array<{ selector: string; confidence: number; reasoning: string }> = [];

      for (const attr of attributePriority) {
        if (originalProfile.attributes[attr]) {
          const value = originalProfile.attributes[attr];
          let selector: string;
          let confidence: number;

          switch (attr) {
            case 'data-testid':
              selector = `[data-testid="${value}"]`;
              confidence = 0.95;
              break;
            case 'id':
              selector = `#${value}`;
              confidence = 0.9;
              break;
            case 'aria-label':
              selector = `[aria-label="${value}"]`;
              confidence = 0.85;
              break;
            case 'name':
              selector = `[name="${value}"]`;
              confidence = 0.8;
              break;
            case 'class':
              const classes = value.split(' ').filter(c => c.trim());
              selector = `.${classes.join('.')}`;
              confidence = 0.6;
              break;
            default:
              continue;
          }

          const elementExists = await page.locator(selector).first().isVisible().catch(() => false);
          if (elementExists) {
            alternatives.push({
              selector,
              confidence,
              reasoning: `Found element using ${attr} attribute`
            });
          }
        }
      }

      if (alternatives.length === 0) {
        return this.createFailureResult(originalProfile, 'No attribute-based alternatives found');
      }

      const bestAlternative = alternatives.sort((a, b) => b.confidence - a.confidence)[0];

      return {
        success: true,
        new_selector: bestAlternative.selector,
        confidence_score: bestAlternative.confidence,
        adaptation_method: 'attribute_adaptation',
        semantic_similarity: 0.8,
        validation_results: await this.validateElement(bestAlternative.selector, page),
        alternative_selectors: alternatives.slice(1).map(alt => ({
          ...alt,
          method: 'attribute_adaptation'
        })),
        rollback_data: {
          original_selector: originalProfile.selector,
          original_context: context,
          adaptation_timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return this.createFailureResult(originalProfile, 'Attribute adaptation failed');
    }
  }

  private async executeTextContentMatching(
    originalProfile: ElementSemanticProfile,
    page: Page,
    context: AdaptationContext
  ): Promise<SelectorAdaptationResult> {
    try {
      if (!originalProfile.text_content || originalProfile.text_content.trim().length < 3) {
        return this.createFailureResult(originalProfile, 'No meaningful text content');
      }

      const textContent = originalProfile.text_content.trim();
      const alternatives: Array<{ selector: string; confidence: number; reasoning: string }> = [];

      // Try exact text match
      const exactSelector = `text="${textContent}"`;
      const exactExists = await page.locator(exactSelector).first().isVisible().catch(() => false);
      
      if (exactExists) {
        alternatives.push({
          selector: exactSelector,
          confidence: 0.9,
          reasoning: 'Exact text match found'
        });
      }

      // Try element type + text combination
      const typeTextSelector = `${originalProfile.element_type}:has-text("${textContent}")`;
      const typeTextExists = await page.locator(typeTextSelector).first().isVisible().catch(() => false);
      
      if (typeTextExists) {
        alternatives.push({
          selector: typeTextSelector,
          confidence: 0.85,
          reasoning: 'Element type with exact text match'
        });
      }

      if (alternatives.length === 0) {
        return this.createFailureResult(originalProfile, 'No text-based alternatives found');
      }

      const bestAlternative = alternatives[0];

      return {
        success: true,
        new_selector: bestAlternative.selector,
        confidence_score: bestAlternative.confidence,
        adaptation_method: 'text_matching',
        semantic_similarity: 0.85,
        validation_results: await this.validateElement(bestAlternative.selector, page),
        alternative_selectors: alternatives.slice(1).map(alt => ({
          ...alt,
          method: 'text_matching'
        })),
        rollback_data: {
          original_selector: originalProfile.selector,
          original_context: context,
          adaptation_timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return this.createFailureResult(originalProfile, 'Text matching failed');
    }
  }

  private async executeAIAnalysis(
    originalProfile: ElementSemanticProfile,
    page: Page,
    context: AdaptationContext
  ): Promise<SelectorAdaptationResult> {
    try {
      const prompt = `Find a CSS selector for element: ${originalProfile.element_type} with text "${originalProfile.text_content}". Original selector "${originalProfile.selector}" failed with error: ${context.failure_context.error_message}. Suggest 3 alternative selectors with confidence scores. Return JSON format: {"alternatives": [{"selector": "...", "confidence": 0.8, "reasoning": "..."}]}`;

      const response = await this.aiService.generateCompletion(prompt, {
        model: 'gpt-4',
        maxTokens: 300,
        temperature: 0.3
      });

      const aiResult = JSON.parse(response);
      const alternatives = aiResult.alternatives || [];

      if (alternatives.length === 0) {
        return this.createFailureResult(originalProfile, 'AI found no alternatives');
      }

      const bestAlternative = alternatives[0];

      return {
        success: true,
        new_selector: bestAlternative.selector,
        confidence_score: bestAlternative.confidence,
        adaptation_method: 'ai_analysis',
        semantic_similarity: 0.8,
        validation_results: await this.validateElement(bestAlternative.selector, page),
        alternative_selectors: alternatives.slice(1).map((alt: any) => ({
          selector: alt.selector,
          confidence: alt.confidence,
          method: 'ai_analysis',
          reasoning: alt.reasoning
        })),
        rollback_data: {
          original_selector: originalProfile.selector,
          original_context: context,
          adaptation_timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return this.createFailureResult(originalProfile, 'AI analysis failed');
    }
  }

  // Helper methods

  private async findSemanticCandidates(
    originalProfile: ElementSemanticProfile,
    page: Page
  ): Promise<Array<{ selector: string; confidence: number; similarity: number }>> {
    const candidates: Array<{ selector: string; confidence: number; similarity: number }> = [];

    // Look for elements with similar attributes
    if (originalProfile.attributes.role) {
      const roleSelector = `[role="${originalProfile.attributes.role}"]`;
      const exists = await page.locator(roleSelector).first().isVisible().catch(() => false);
      if (exists) {
        candidates.push({
          selector: roleSelector,
          confidence: 0.8,
          similarity: 0.85
        });
      }
    }

    // Look for elements with similar tag and class
    if (originalProfile.attributes.class) {
      const mainClass = originalProfile.attributes.class.split(' ')[0];
      const classSelector = `${originalProfile.element_type}.${mainClass}`;
      const exists = await page.locator(classSelector).first().isVisible().catch(() => false);
      if (exists) {
        candidates.push({
          selector: classSelector,
          confidence: 0.7,
          similarity: 0.75
        });
      }
    }

    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  private async validateElement(
    selector: string,
    page: Page
  ): Promise<{
    element_found: boolean;
    functionality_preserved: boolean;
    interaction_successful: boolean;
    visual_similarity: number;
  }> {
    try {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible();
      const isEnabled = await element.isEnabled().catch(() => false);

      return {
        element_found: isVisible,
        functionality_preserved: isEnabled,
        interaction_successful: isVisible && isEnabled,
        visual_similarity: 0.8
      };
    } catch (error) {
      return {
        element_found: false,
        functionality_preserved: false,
        interaction_successful: false,
        visual_similarity: 0
      };
    }
  }

  private async validateAdaptation(
    result: SelectorAdaptationResult,
    page: Page,
    context: AdaptationContext
  ): Promise<SelectorAdaptationResult> {
    if (!result.success) return result;

    const validation = await this.validateElement(result.new_selector, page);
    result.validation_results = validation;

    if (!validation.element_found) {
      result.success = false;
      result.confidence_score *= 0.5;
    }

    return result;
  }

  private async storeAdaptationResult(
    result: SelectorAdaptationResult,
    context: AdaptationContext
  ): Promise<void> {
    try {
      await supabaseAdmin.from('selector_updates').insert({
        test_case_id: context.test_case_id,
        step_id: context.step_id,
        original_selector: result.rollback_data.original_selector,
        new_selector: result.new_selector,
        confidence_score: result.confidence_score,
        semantic_similarity: result.semantic_similarity,
        update_reason: result.adaptation_method,
        alternative_selectors: result.alternative_selectors,
        rollback_data: result.rollback_data
      });
    } catch (error) {
      logger.warn('Failed to store adaptation result', LogCategory.HEALING, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private createFailureResult(
    originalProfile: ElementSemanticProfile,
    reason: string
  ): SelectorAdaptationResult {
    return {
      success: false,
      new_selector: originalProfile.selector,
      confidence_score: 0,
      adaptation_method: 'failed',
      semantic_similarity: 0,
      validation_results: {
        element_found: false,
        functionality_preserved: false,
        interaction_successful: false,
        visual_similarity: 0
      },
      alternative_selectors: [],
      rollback_data: {
        original_selector: originalProfile.selector,
        original_context: {},
        adaptation_timestamp: new Date().toISOString()
      }
    };
  }
}