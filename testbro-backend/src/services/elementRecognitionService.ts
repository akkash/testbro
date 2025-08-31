import { Page } from 'playwright';
import { AIService } from './aiService';
import { logger, LogCategory } from './loggingService';
import { supabaseAdmin } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface ElementIdentification {
  id: string;
  element_type: 'button' | 'input' | 'link' | 'text' | 'image' | 'dropdown' | 'checkbox' | 'radio' | 'textarea' | 'select';
  natural_description: string; // "Login button", "Email input field"
  selectors: {
    primary: string;
    alternatives: string[];
    confidence_scores: number[];
  };
  visual_context: {
    nearby_text: string[];
    parent_elements: string[];
    aria_labels: string[];
    position: { x: number; y: number; width: number; height: number };
  };
  confidence_metrics: {
    element_recognition: number;
    selector_reliability: number;
    overall: number;
  };
  created_at: string;
}

export class ElementRecognitionService {
  private aiService: AIService;

  constructor(aiService?: AIService) {
    this.aiService = aiService || new AIService();
  }

  /**
   * Identify an element from page screenshot and click coordinates
   */
  async identifyElement(
    page: Page,
    clickCoordinates: { x: number; y: number },
    pageHTML: string
  ): Promise<ElementIdentification> {
    try {
      // Get element at coordinates
      const elementHandle = await page.elementHandle(`document.elementFromPoint(${clickCoordinates.x}, ${clickCoordinates.y})`);
      
      if (!elementHandle) {
        throw new Error('No element found at the specified coordinates');
      }

      // Extract element information
      const elementInfo = await this.extractElementInfo(page, elementHandle);
      
      // Generate natural language description
      const naturalDescription = await this.generateNaturalLanguageDescription(elementInfo);
      
      // Generate robust selectors
      const selectors = await this.generateRobustSelectors(page, elementHandle);
      
      // Analyze visual context
      const visualContext = await this.analyzeVisualContext(page, elementHandle);
      
      // Calculate confidence metrics
      const confidenceMetrics = await this.calculateConfidenceMetrics(elementInfo, selectors);

      const identification: ElementIdentification = {
        id: uuidv4(),
        element_type: this.classifyElementType(elementInfo),
        natural_description: naturalDescription,
        selectors,
        visual_context: visualContext,
        confidence_metrics: confidenceMetrics,
        created_at: new Date().toISOString()
      };

      logger.info('Element identified successfully', LogCategory.BROWSER, {
        elementType: identification.element_type,
        confidence: identification.confidence_metrics.overall
      });

      return identification;

    } catch (error) {
      logger.error('Failed to identify element', LogCategory.BROWSER, {
        coordinates: clickCoordinates,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate natural language description for an element
   */
  async generateNaturalLanguageDescription(elementInfo: any): Promise<string> {
    try {
      const prompt = `Generate a clear description for this web element:

Element: ${elementInfo.tag_name}
Text: ${elementInfo.text_content || 'No text'}
Attributes: ${JSON.stringify(elementInfo.attributes)}

Examples: "Login button", "Email input field", "Search dropdown"

Description (max 50 chars):`;

      const response = await this.aiService.generateCompletion(prompt, {
        model: 'gpt-4',
        maxTokens: 50,
        temperature: 0.3
      });

      return response.trim().replace(/['"]/g, '');

    } catch (error) {
      return this.generateFallbackDescription(elementInfo);
    }
  }

  /**
   * Generate robust selectors with alternatives
   */
  async generateRobustSelector(page: Page, elementHandle: any): Promise<{ selector: string; confidence: number }> {
    try {
      const selectors = await this.generateRobustSelectors(page, elementHandle);
      
      const bestIndex = selectors.confidence_scores.indexOf(Math.max(...selectors.confidence_scores));
      const bestSelector = bestIndex === 0 ? selectors.primary : selectors.alternatives[bestIndex - 1];
      
      return {
        selector: bestSelector,
        confidence: selectors.confidence_scores[bestIndex]
      };

    } catch (error) {
      return {
        selector: '*',
        confidence: 0.1
      };
    }
  }

  /**
   * Suggest alternative selectors for an element
   */
  async suggestAlternativeSelectors(elementIdentification: ElementIdentification): Promise<string[]> {
    try {
      const alternatives: string[] = [];
      
      // Add existing alternatives
      alternatives.push(...elementIdentification.selectors.alternatives);
      
      // Generate additional selectors based on element properties
      const element = elementIdentification;
      
      // Text-based selectors
      if (element.natural_description.includes('button')) {
        alternatives.push(`button:contains("${element.visual_context.nearby_text[0]}")`);
      }
      
      // Aria-based selectors
      element.visual_context.aria_labels.forEach(label => {
        alternatives.push(`[aria-label="${label}"]`);
      });

      return alternatives.slice(0, 5);

    } catch (error) {
      logger.error('Failed to suggest alternative selectors', LogCategory.BROWSER, { error });
      return [];
    }
  }

  // Private helper methods
  private async extractElementInfo(page: Page, elementHandle: any): Promise<any> {
    return await page.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const attributes: Record<string, string> = {};
      
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        attributes[attr.name] = attr.value;
      }

      return {
        tag_name: el.tagName.toLowerCase(),
        attributes,
        text_content: el.textContent?.trim() || '',
        is_interactive: ['button', 'input', 'a', 'select', 'textarea'].includes(el.tagName.toLowerCase()),
        bounding_box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      };
    }, elementHandle);
  }

  private async generateRobustSelectors(page: Page, elementHandle: any): Promise<{
    primary: string;
    alternatives: string[];
    confidence_scores: number[];
  }> {
    const selectorStrategies = await page.evaluate((el) => {
      const strategies: Array<{ selector: string; confidence: number }> = [];

      // ID selector (highest priority)
      if (el.id && el.id.trim()) {
        strategies.push({ selector: `#${el.id}`, confidence: 0.95 });
      }

      // Data attributes
      for (const attr of el.attributes) {
        if (attr.name.startsWith('data-test')) {
          strategies.push({ selector: `[${attr.name}="${attr.value}"]`, confidence: 0.9 });
        }
      }

      // Aria attributes
      if (el.getAttribute('aria-label')) {
        strategies.push({ selector: `[aria-label="${el.getAttribute('aria-label')}"]`, confidence: 0.85 });
      }

      // Text-based selectors
      if (['button', 'a'].includes(el.tagName.toLowerCase()) && el.textContent?.trim()) {
        const text = el.textContent.trim();
        strategies.push({ selector: `${el.tagName.toLowerCase()}:contains("${text}")`, confidence: 0.75 });
      }

      // Name attribute
      if (el.name) {
        strategies.push({ selector: `[name="${el.name}"]`, confidence: 0.8 });
      }

      // Class-based selector
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(' ').filter(c => c.trim() && !c.includes('ng-') && !c.includes('_'));
        if (classes.length > 0) {
          strategies.push({ selector: `.${classes[0]}`, confidence: 0.6 });
        }
      }

      return strategies;
    }, elementHandle);

    const selectors = selectorStrategies.map(s => s.selector);
    const confidences = selectorStrategies.map(s => s.confidence);

    return {
      primary: selectors[0] || '*',
      alternatives: selectors.slice(1),
      confidence_scores: confidences
    };
  }

  private async analyzeVisualContext(page: Page, elementHandle: any): Promise<ElementIdentification['visual_context']> {
    return await page.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      
      // Find nearby text elements
      const nearbyText: string[] = [];
      const siblings = Array.from(el.parentElement?.children || []);
      siblings.forEach((sibling: Element) => {
        if (sibling !== el && sibling.textContent?.trim()) {
          nearbyText.push(sibling.textContent.trim().substring(0, 50));
        }
      });

      // Get parent elements
      const parentElements: string[] = [];
      let parent = el.parentElement;
      let depth = 0;
      while (parent && depth < 2) {
        parentElements.push(parent.tagName.toLowerCase());
        parent = parent.parentElement;
        depth++;
      }

      // Get aria labels
      const ariaLabels: string[] = [];
      if (el.getAttribute('aria-label')) ariaLabels.push(el.getAttribute('aria-label'));

      return {
        nearby_text: nearbyText.slice(0, 3),
        parent_elements: parentElements,
        aria_labels: ariaLabels,
        position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      };
    }, elementHandle);
  }

  private async calculateConfidenceMetrics(elementInfo: any, selectors: any): Promise<{
    element_recognition: number;
    selector_reliability: number;
    overall: number;
  }> {
    let elementRecognition = 0.5;
    let selectorReliability = 0.5;

    // Element recognition confidence
    if (elementInfo.attributes?.id) elementRecognition += 0.3;
    if (elementInfo.attributes?.['data-testid']) elementRecognition += 0.4;
    if (elementInfo.text_content) elementRecognition += 0.2;

    // Selector reliability
    if (selectors.confidence_scores.length > 0) {
      selectorReliability = Math.max(...selectors.confidence_scores);
    }

    elementRecognition = Math.min(elementRecognition, 1);
    const overall = (elementRecognition * 0.5 + selectorReliability * 0.5);

    return {
      element_recognition: elementRecognition,
      selector_reliability: selectorReliability,
      overall: overall
    };
  }

  private classifyElementType(elementInfo: any): ElementIdentification['element_type'] {
    const tagName = elementInfo.tag_name;
    const type = elementInfo.attributes?.type;

    if (tagName === 'button') return 'button';
    if (tagName === 'input') {
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      return 'input';
    }
    if (tagName === 'textarea') return 'textarea';
    if (tagName === 'select') return 'select';
    if (tagName === 'a') return 'link';
    if (tagName === 'img') return 'image';
    
    return 'text';
  }

  private generateFallbackDescription(elementInfo: any): string {
    const tagName = elementInfo.tag_name;
    const text = elementInfo.text_content?.substring(0, 20) || '';
    
    if (text) {
      return `${text} ${tagName}`;
    }
    
    if (elementInfo.attributes?.placeholder) {
      return `${elementInfo.attributes.placeholder} field`;
    }
    
    return `${tagName} element`;
  }
}