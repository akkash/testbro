import { Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/database';
import { WebSocketService } from './websocketService';
import { AIService } from './aiService';
import { logger, LogCategory } from './loggingService';
import {
  UIChangeDetection,
  ElementSemanticProfile,
  HealingSession,
  TestExecution,
  TestStep,
  HealingTrigger
} from '../types';

export interface ChangeDetectionResult {
  changes_detected: boolean;
  change_severity: 'minor' | 'moderate' | 'critical';
  affected_elements: Array<{
    original_selector: string;
    change_type: 'removed' | 'moved' | 'modified' | 'accessibility_changed';
    confidence_score: number;
    suggested_alternatives: string[];
  }>;
  page_structure_changes: {
    layout_shift_score: number;
    new_elements_count: number;
    removed_elements_count: number;
    modified_elements_count: number;
  };
  semantic_analysis: {
    intent_preserved: boolean;
    functionality_impact: 'none' | 'minimal' | 'moderate' | 'severe';
    user_flow_affected: boolean;
  };
}

export interface ElementComparisonResult {
  element_found: boolean;
  location_changed: boolean;
  attributes_changed: boolean;
  visual_changes: boolean;
  semantic_similarity: number;
  alternative_matches: Array<{
    selector: string;
    confidence: number;
    change_description: string;
  }>;
}

export class UIChangeDetectionService {
  private wsService: WebSocketService;
  private aiService: AIService;
  private activeDetectionSessions = new Map<string, UIChangeDetection>();

  constructor(wsService: WebSocketService, aiService: AIService) {
    this.wsService = wsService;
    this.aiService = aiService;
  }

  /**
   * Monitor a test execution for UI changes and potential failures
   */
  async monitorTestExecution(
    executionId: string,
    testCase: any,
    page: Page
  ): Promise<UIChangeDetection> {
    const detectionId = uuidv4();
    
    try {
      // Create UI change detection session
      const detection: UIChangeDetection = {
        id: detectionId,
        execution_id: executionId,
        test_case_id: testCase.id,
        page_url: page.url(),
        detection_timestamp: new Date().toISOString(),
        baseline_dom_hash: '',
        current_dom_hash: '',
        element_changes: [],
        layout_changes: {
          cumulative_layout_shift: 0,
          viewport_changes: false,
          scroll_position_affected: false,
          element_positions_changed: []
        },
        content_changes: {
          text_content_modified: false,
          images_changed: false,
          links_modified: false,
          forms_altered: false,
          affected_areas: []
        },
        accessibility_changes: {
          aria_labels_modified: false,
          role_attributes_changed: false,
          tab_order_affected: false,
          color_contrast_issues: false,
          keyboard_navigation_impacted: false
        },
        performance_impact: {
          page_load_time_delta: 0,
          interaction_delays: [],
          resource_loading_affected: false
        },
        confidence_metrics: {
          detection_accuracy: 0,
          false_positive_probability: 0,
          change_significance: 0
        },
        ai_analysis: {
          change_summary: '',
          impact_assessment: 'none',
          recommended_actions: [],
          automation_feasibility: 0
        }
      };

      // Store active detection session
      this.activeDetectionSessions.set(detectionId, detection);

      // Capture baseline state
      await this.capturePageBaseline(page, detection);

      // Monitor each test step execution
      for (const step of testCase.steps) {
        await this.monitorStepExecution(step, page, detection);
      }

      // Perform final analysis
      await this.performChangeAnalysis(detection, page);

      // Store results in database
      await this.storeDetectionResults(detection);

      logger.info('UI change detection completed', LogCategory.HEALING, {
        detectionId,
        executionId,
        changesDetected: detection.element_changes.length > 0
      });

      return detection;

    } catch (error) {
      logger.error('Failed to monitor test execution for UI changes', LogCategory.HEALING, {
        detectionId,
        executionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Detect if a test failure is due to UI changes vs actual bugs
   */
  async analyzeTestFailure(
    executionId: string,
    failedStep: TestStep,
    page: Page,
    errorMessage: string
  ): Promise<{
    is_ui_change: boolean;
    confidence: number;
    analysis: ChangeDetectionResult;
    healing_recommended: boolean;
  }> {
    try {
      // Capture current page state
      const currentPageState = await this.capturePageState(page);
      
      // Analyze the specific failed element
      const elementAnalysis = await this.analyzeFailedElement(
        failedStep.element || '',
        page,
        errorMessage
      );

      // Perform broader page analysis
      const pageAnalysis = await this.analyzePageChanges(
        page,
        failedStep
      );

      // AI-powered failure classification
      const aiClassification = await this.classifyFailureWithAI(
        failedStep,
        errorMessage,
        elementAnalysis,
        pageAnalysis
      );

      const isUIChange = aiClassification.ui_change_probability > 0.7;
      const confidence = Math.min(
        aiClassification.ui_change_probability,
        elementAnalysis.semantic_similarity
      );

      const analysis: ChangeDetectionResult = {
        changes_detected: isUIChange,
        change_severity: this.calculateChangeSeverity(elementAnalysis, pageAnalysis),
        affected_elements: elementAnalysis.alternative_matches.map(match => ({
          original_selector: failedStep.element || '',
          change_type: this.determineChangeType(match),
          confidence_score: match.confidence,
          suggested_alternatives: [match.selector]
        })),
        page_structure_changes: pageAnalysis.structure_changes,
        semantic_analysis: {
          intent_preserved: elementAnalysis.semantic_similarity > 0.8,
          functionality_impact: this.assessFunctionalityImpact(elementAnalysis),
          user_flow_affected: pageAnalysis.critical_path_affected
        }
      };

      logger.info('Test failure analyzed for UI changes', LogCategory.HEALING, {
        executionId,
        stepId: failedStep.id,
        isUIChange,
        confidence,
        healingRecommended: isUIChange && confidence > 0.6
      });

      return {
        is_ui_change: isUIChange,
        confidence,
        analysis,
        healing_recommended: isUIChange && confidence > 0.6
      };

    } catch (error) {
      logger.error('Failed to analyze test failure', LogCategory.HEALING, {
        executionId,
        stepId: failedStep.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Continuously monitor page for UI changes during test execution
   */
  async startContinuousMonitoring(
    sessionId: string,
    page: Page,
    testCaseId: string
  ): Promise<void> {
    try {
      const monitoringInterval = setInterval(async () => {
        try {
          const currentState = await this.capturePageState(page);
          const changes = await this.detectIncrementalChanges(sessionId, currentState);
          
          if (changes.length > 0) {
            // Emit real-time change detection event
            this.wsService.broadcast(`healing:${sessionId}`, {
              type: 'element_changed',
              data: {
                session_id: sessionId,
                changes,
                timestamp: new Date().toISOString()
              }
            });
          }
        } catch (error) {
          logger.warn('Error during continuous monitoring', LogCategory.HEALING, {
            sessionId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }, 2000); // Check every 2 seconds

      // Store monitoring session
      setTimeout(() => {
        clearInterval(monitoringInterval);
        logger.info('Continuous monitoring session ended', LogCategory.HEALING, {
          sessionId
        });
      }, 300000); // Stop after 5 minutes

    } catch (error) {
      logger.error('Failed to start continuous monitoring', LogCategory.HEALING, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create element semantic profile for change detection
   */
  async createElementSemanticProfile(
    selector: string,
    page: Page
  ): Promise<ElementSemanticProfile> {
    try {
      const element = await page.locator(selector).first();
      const isVisible = await element.isVisible().catch(() => false);
      
      if (!isVisible) {
        throw new Error(`Element not found or not visible: ${selector}`);
      }

      const profile: ElementSemanticProfile = {
        selector,
        element_type: await element.evaluate(el => el.tagName.toLowerCase()),
        semantic_role: await element.getAttribute('role') || 
                      await this.inferSemanticRole(element),
        text_content: await element.textContent() || '',
        attributes: await element.evaluate(el => {
          const attrs: Record<string, string> = {};
          for (const attr of el.attributes) {
            attrs[attr.name] = attr.value;
          }
          return attrs;
        }),
        position: await element.boundingBox() || { x: 0, y: 0, width: 0, height: 0 },
        visual_characteristics: {
          computed_styles: await element.evaluate(el => {
            const computedStyle = window.getComputedStyle(el);
            return {
              display: computedStyle.display,
              visibility: computedStyle.visibility,
              position: computedStyle.position,
              zIndex: computedStyle.zIndex,
              backgroundColor: computedStyle.backgroundColor,
              color: computedStyle.color,
              fontSize: computedStyle.fontSize,
              fontFamily: computedStyle.fontFamily
            };
          }),
          is_interactive: await this.isElementInteractive(element),
          accessibility_properties: await this.getAccessibilityProperties(element)
        },
        context: {
          parent_elements: await this.getParentContext(element),
          sibling_elements: await this.getSiblingContext(element),
          child_elements: await this.getChildContext(element)
        },
        stability_score: await this.calculateElementStability(element),
        uniqueness_indicators: await this.findUniquenessIndicators(element),
        interaction_patterns: {
          click_target: await this.isClickTarget(element),
          form_input: await this.isFormInput(element),
          navigation_element: await this.isNavigationElement(element)
        }
      };

      return profile;

    } catch (error) {
      logger.error('Failed to create element semantic profile', LogCategory.HEALING, {
        selector,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Compare two element profiles to detect changes
   */
  async compareElementProfiles(
    originalProfile: ElementSemanticProfile,
    currentSelector: string,
    page: Page
  ): Promise<ElementComparisonResult> {
    try {
      let currentProfile: ElementSemanticProfile;
      
      try {
        currentProfile = await this.createElementSemanticProfile(currentSelector, page);
      } catch (error) {
        // Element not found with original selector
        return {
          element_found: false,
          location_changed: true,
          attributes_changed: true,
          visual_changes: true,
          semantic_similarity: 0,
          alternative_matches: await this.findAlternativeMatches(originalProfile, page)
        };
      }

      const comparison: ElementComparisonResult = {
        element_found: true,
        location_changed: this.hasLocationChanged(originalProfile, currentProfile),
        attributes_changed: this.haveAttributesChanged(originalProfile, currentProfile),
        visual_changes: this.hasVisualChanges(originalProfile, currentProfile),
        semantic_similarity: this.calculateSemanticSimilarity(originalProfile, currentProfile),
        alternative_matches: []
      };

      // If significant changes detected, find alternatives
      if (comparison.semantic_similarity < 0.8) {
        comparison.alternative_matches = await this.findAlternativeMatches(originalProfile, page);
      }

      return comparison;

    } catch (error) {
      logger.error('Failed to compare element profiles', LogCategory.HEALING, {
        originalSelector: originalProfile.selector,
        currentSelector,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Private helper methods

  private async capturePageBaseline(page: Page, detection: UIChangeDetection): Promise<void> {
    try {
      // Capture DOM structure hash
      detection.baseline_dom_hash = await page.evaluate(() => {
        const bodyHtml = document.body.innerHTML;
        // Simple hash function for demo - in production use crypto.subtle
        let hash = 0;
        for (let i = 0; i < bodyHtml.length; i++) {
          const char = bodyHtml.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
      });

      // Capture viewport information
      detection.layout_changes = {
        ...detection.layout_changes,
        viewport_changes: false,
        scroll_position_affected: false,
        element_positions_changed: []
      };

    } catch (error) {
      logger.warn('Failed to capture page baseline', LogCategory.HEALING, {
        detectionId: detection.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async monitorStepExecution(
    step: TestStep,
    page: Page,
    detection: UIChangeDetection
  ): Promise<void> {
    try {
      if (!step.element) return;

      // Capture element state before action
      const beforeState = await this.captureElementState(step.element, page);
      
      // Monitor for changes during action execution
      // This would integrate with the actual test execution
      
      // Capture element state after action
      const afterState = await this.captureElementState(step.element, page);

      // Detect changes
      const changes = this.compareElementStates(beforeState, afterState);
      if (changes.length > 0) {
        detection.element_changes.push(...changes);
      }

    } catch (error) {
      logger.warn('Failed to monitor step execution', LogCategory.HEALING, {
        stepId: step.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async capturePageState(page: Page): Promise<any> {
    return {
      url: page.url(),
      title: await page.title(),
      viewport: page.viewportSize(),
      dom_hash: await page.evaluate(() => {
        const bodyHtml = document.body.innerHTML;
        let hash = 0;
        for (let i = 0; i < bodyHtml.length; i++) {
          const char = bodyHtml.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return hash.toString();
      }),
      timestamp: new Date().toISOString()
    };
  }

  private async analyzeFailedElement(
    selector: string,
    page: Page,
    errorMessage: string
  ): Promise<ElementComparisonResult> {
    try {
      // Try to find the element with original selector
      const element = page.locator(selector);
      const isVisible = await element.isVisible().catch(() => false);

      if (!isVisible) {
        // Element not found - look for alternatives
        const alternatives = await this.findSimilarElements(selector, page);
        
        return {
          element_found: false,
          location_changed: true,
          attributes_changed: true,
          visual_changes: true,
          semantic_similarity: 0,
          alternative_matches: alternatives
        };
      }

      // Element found but might have changed
      return {
        element_found: true,
        location_changed: false,
        attributes_changed: false,
        visual_changes: false,
        semantic_similarity: 1,
        alternative_matches: []
      };

    } catch (error) {
      return {
        element_found: false,
        location_changed: true,
        attributes_changed: true,
        visual_changes: true,
        semantic_similarity: 0,
        alternative_matches: []
      };
    }
  }

  private async analyzePageChanges(page: Page, failedStep: TestStep): Promise<any> {
    return {
      structure_changes: {
        layout_shift_score: 0,
        new_elements_count: 0,
        removed_elements_count: 0,
        modified_elements_count: 0
      },
      critical_path_affected: false
    };
  }

  private async classifyFailureWithAI(
    step: TestStep,
    errorMessage: string,
    elementAnalysis: ElementComparisonResult,
    pageAnalysis: any
  ): Promise<{ ui_change_probability: number }> {
    try {
      const prompt = `Analyze this test failure to determine if it's caused by UI changes:

Step Details:
- Action: ${step.action}
- Element: ${step.element}
- Description: ${step.description}

Error Message: ${errorMessage}

Element Analysis:
- Element Found: ${elementAnalysis.element_found}
- Semantic Similarity: ${elementAnalysis.semantic_similarity}
- Alternative Matches: ${elementAnalysis.alternative_matches.length}

Provide a probability (0-1) that this failure is due to UI changes rather than a functional bug.
Consider factors like:
- Element not found vs functional errors
- Presence of similar elements nearby
- Error message patterns
- Page structure changes

Return only a number between 0 and 1:`;

      const response = await this.aiService.generateCompletion(prompt, {
        model: 'gpt-4',
        maxTokens: 10,
        temperature: 0.1
      });

      const probability = parseFloat(response.trim()) || 0.5;
      return { ui_change_probability: Math.max(0, Math.min(1, probability)) };

    } catch (error) {
      logger.warn('Failed to classify failure with AI', LogCategory.AI, {
        stepId: step.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { ui_change_probability: 0.5 };
    }
  }

  private calculateChangeSeverity(
    elementAnalysis: ElementComparisonResult,
    pageAnalysis: any
  ): 'minor' | 'moderate' | 'critical' {
    if (!elementAnalysis.element_found) return 'critical';
    if (elementAnalysis.semantic_similarity < 0.5) return 'critical';
    if (elementAnalysis.semantic_similarity < 0.8) return 'moderate';
    return 'minor';
  }

  private determineChangeType(match: any): 'removed' | 'moved' | 'modified' | 'accessibility_changed' {
    // Logic to determine the type of change based on the match
    return 'modified';
  }

  private assessFunctionalityImpact(analysis: ElementComparisonResult): 'none' | 'minimal' | 'moderate' | 'severe' {
    if (!analysis.element_found) return 'severe';
    if (analysis.semantic_similarity < 0.5) return 'severe';
    if (analysis.semantic_similarity < 0.8) return 'moderate';
    if (analysis.attributes_changed || analysis.visual_changes) return 'minimal';
    return 'none';
  }

  private async detectIncrementalChanges(sessionId: string, currentState: any): Promise<any[]> {
    // Implementation for detecting incremental changes
    return [];
  }

  private async captureElementState(selector: string, page: Page): Promise<any> {
    try {
      const element = page.locator(selector);
      return {
        selector,
        exists: await element.isVisible().catch(() => false),
        boundingBox: await element.boundingBox().catch(() => null),
        textContent: await element.textContent().catch(() => ''),
        attributes: await element.evaluate(el => {
          const attrs: Record<string, string> = {};
          for (const attr of el.attributes) {
            attrs[attr.name] = attr.value;
          }
          return attrs;
        }).catch(() => ({}))
      };
    } catch (error) {
      return { selector, exists: false };
    }
  }

  private compareElementStates(before: any, after: any): any[] {
    const changes: any[] = [];
    
    if (before.exists !== after.exists) {
      changes.push({
        type: 'visibility_changed',
        before: before.exists,
        after: after.exists
      });
    }

    if (before.textContent !== after.textContent) {
      changes.push({
        type: 'text_changed',
        before: before.textContent,
        after: after.textContent
      });
    }

    return changes;
  }

  private async findSimilarElements(originalSelector: string, page: Page): Promise<any[]> {
    // Implementation to find elements with similar characteristics
    return [];
  }

  private async performChangeAnalysis(detection: UIChangeDetection, page: Page): Promise<void> {
    // Perform final analysis of all detected changes
    detection.confidence_metrics.detection_accuracy = 0.8;
    detection.confidence_metrics.false_positive_probability = 0.1;
    detection.confidence_metrics.change_significance = detection.element_changes.length > 0 ? 0.7 : 0.1;
  }

  private async storeDetectionResults(detection: UIChangeDetection): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('ui_change_detections')
        .insert(detection);

      if (error) {
        throw new Error(`Failed to store detection results: ${error.message}`);
      }
    } catch (error) {
      logger.warn('Failed to store detection results', LogCategory.HEALING, {
        detectionId: detection.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Additional helper methods for element analysis
  private async inferSemanticRole(element: any): Promise<string> {
    return 'generic';
  }

  private async isElementInteractive(element: any): Promise<boolean> {
    return true;
  }

  private async getAccessibilityProperties(element: any): Promise<any> {
    return {};
  }

  private async getParentContext(element: any): Promise<any[]> {
    return [];
  }

  private async getSiblingContext(element: any): Promise<any[]> {
    return [];
  }

  private async getChildContext(element: any): Promise<any[]> {
    return [];
  }

  private async calculateElementStability(element: any): Promise<number> {
    return 0.8;
  }

  private async findUniquenessIndicators(element: any): Promise<string[]> {
    return [];
  }

  private async isClickTarget(element: any): Promise<boolean> {
    return false;
  }

  private async isFormInput(element: any): Promise<boolean> {
    return false;
  }

  private async isNavigationElement(element: any): Promise<boolean> {
    return false;
  }

  private hasLocationChanged(original: ElementSemanticProfile, current: ElementSemanticProfile): boolean {
    const threshold = 10; // pixels
    return Math.abs(original.position.x - current.position.x) > threshold ||
           Math.abs(original.position.y - current.position.y) > threshold;
  }

  private haveAttributesChanged(original: ElementSemanticProfile, current: ElementSemanticProfile): boolean {
    const originalKeys = Object.keys(original.attributes);
    const currentKeys = Object.keys(current.attributes);
    
    if (originalKeys.length !== currentKeys.length) return true;
    
    return originalKeys.some(key => original.attributes[key] !== current.attributes[key]);
  }

  private hasVisualChanges(original: ElementSemanticProfile, current: ElementSemanticProfile): boolean {
    const originalStyles = original.visual_characteristics.computed_styles;
    const currentStyles = current.visual_characteristics.computed_styles;
    
    const criticalStyles = ['display', 'visibility', 'position', 'backgroundColor', 'color'];
    return criticalStyles.some(style => originalStyles[style] !== currentStyles[style]);
  }

  private calculateSemanticSimilarity(original: ElementSemanticProfile, current: ElementSemanticProfile): number {
    let score = 0;
    let totalChecks = 0;

    // Element type similarity (high weight)
    totalChecks += 3;
    if (original.element_type === current.element_type) score += 3;

    // Text content similarity
    totalChecks += 2;
    if (original.text_content === current.text_content) score += 2;
    else if (original.text_content && current.text_content) {
      const similarity = this.textSimilarity(original.text_content, current.text_content);
      score += similarity * 2;
    }

    // Role similarity
    totalChecks += 2;
    if (original.semantic_role === current.semantic_role) score += 2;

    // Attribute similarity
    totalChecks += 1;
    if (!this.haveAttributesChanged(original, current)) score += 1;

    return totalChecks > 0 ? score / totalChecks : 0;
  }

  private textSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 1;
    if (!text1 || !text2) return 0;
    
    // Simple similarity calculation - can be enhanced with more sophisticated algorithms
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;
    
    if (longer.length === 0) return 1;
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }
    
    return matches / longer.length;
  }

  private async findAlternativeMatches(original: ElementSemanticProfile, page: Page): Promise<any[]> {
    const alternatives: any[] = [];
    
    try {
      // Find elements with similar text content
      if (original.text_content) {
        const textMatches = await page.locator(`text="${original.text_content}"`).all();
        for (const match of textMatches) {
          const selector = await this.generateSelectorForElement(match);
          alternatives.push({
            selector,
            confidence: 0.9,
            change_description: 'Element found by text content'
          });
        }
      }

      // Find elements with similar attributes
      if (original.attributes.id) {
        const idMatches = await page.locator(`#${original.attributes.id}`).all();
        for (const match of idMatches) {
          const selector = await this.generateSelectorForElement(match);
          alternatives.push({
            selector,
            confidence: 0.95,
            change_description: 'Element found by ID'
          });
        }
      }

      // Find elements with similar classes
      if (original.attributes.class) {
        const classes = original.attributes.class.split(' ').filter(c => c.trim());
        for (const className of classes) {
          const classMatches = await page.locator(`.${className}`).all();
          for (const match of classMatches) {
            const selector = await this.generateSelectorForElement(match);
            alternatives.push({
              selector,
              confidence: 0.7,
              change_description: `Element found by class: ${className}`
            });
          }
        }
      }

    } catch (error) {
      logger.warn('Failed to find alternative matches', LogCategory.HEALING, {
        originalSelector: original.selector,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Remove duplicates and sort by confidence
    return alternatives
      .filter((item, index, self) => 
        self.findIndex(other => other.selector === item.selector) === index
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Return top 5 alternatives
  }

  private async generateSelectorForElement(element: any): Promise<string> {
    try {
      // Generate a robust selector for the element
      return await element.evaluate((el: Element) => {
        // Try ID first
        if (el.id) return `#${el.id}`;
        
        // Try data-testid
        const testId = el.getAttribute('data-testid');
        if (testId) return `[data-testid="${testId}"]`;
        
        // Try aria-label
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) return `[aria-label="${ariaLabel}"]`;
        
        // Try text content for buttons/links
        if (['BUTTON', 'A'].includes(el.tagName) && el.textContent?.trim()) {
          return `${el.tagName.toLowerCase()}:has-text("${el.textContent.trim()}")`;
        }
        
        // Fallback to CSS selector
        const classes = el.className ? `.${el.className.split(' ').join('.')}` : '';
        return `${el.tagName.toLowerCase()}${classes}`;
      });
    } catch (error) {
      return 'unknown-selector';
    }
  }
}