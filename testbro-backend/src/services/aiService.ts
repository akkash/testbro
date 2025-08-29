import OpenAI from 'openai';
import { AIGenerateTestRequest, TestStep, TestCase } from '../types';
import { openRouterKey } from '../config/database';

export class AIService {
  private openai: OpenAI;

  constructor() {
    if (!openRouterKey) {
      throw new Error('OPENROUTER_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: openRouterKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  /**
   * Generate test case from natural language prompt
   */
  async generateTest(request: AIGenerateTestRequest): Promise<{
    testCase: Partial<TestCase>;
    metadata: {
      prompt: string;
      model: string;
      confidence_score: number;
      tokens_used: number;
    };
  }> {
    const { prompt, target_url, model = 'openai/gpt-4' } = request;

    // Create comprehensive prompt for test generation
    const systemPrompt = `You are an expert QA engineer specializing in automated testing. Your task is to generate comprehensive, executable Playwright test cases from natural language descriptions.

Guidelines:
1. Analyze the target URL to understand the application context
2. Break down the described functionality into logical, testable steps
3. Use appropriate Playwright actions (click, type, navigate, wait, verify, etc.)
4. Include proper element selectors (prefer data-testid, then semantic selectors)
5. Add meaningful descriptions for each step
6. Consider edge cases and validation requirements
7. Ensure steps are in logical order with proper timing
8. Include AI context for each step to explain the reasoning

Output format: JSON with test case structure including name, description, and steps array.`;

    const userPrompt = `Target URL: ${target_url}
Test Description: ${prompt}

Generate a comprehensive Playwright test case that covers the described functionality. Include proper element selectors, timing considerations, and validation steps.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const parsedResponse = JSON.parse(response);

      // Validate and structure the response
      const testCase: Partial<TestCase> = {
        name: parsedResponse.name || this.generateTestName(prompt),
        description: parsedResponse.description || prompt,
        steps: this.validateAndCleanSteps(parsedResponse.steps || []),
        ai_generated: true,
        ai_metadata: {
          prompt: prompt,
          model: model,
          confidence_score: this.calculateConfidenceScore(parsedResponse),
          generated_at: new Date().toISOString(),
        },
      };

      return {
        testCase,
        metadata: {
          prompt,
          model,
          confidence_score: testCase.ai_metadata!.confidence_score,
          tokens_used: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('AI test generation error:', error);
      throw new Error('Failed to generate test case from AI');
    }
  }

  /**
   * Analyze test execution results and provide insights
   */
  async analyzeExecution(
    executionData: any,
    logs: any[],
    screenshots: string[]
  ): Promise<{
    insights: any[];
    recommendations: string[];
    score: number;
  }> {
    const prompt = `Analyze this test execution data and provide insights:

Execution Data: ${JSON.stringify(executionData, null, 2)}
Logs: ${logs.map(log => log.message).join('\n')}
Screenshots: ${screenshots.length} screenshots taken

Provide:
1. Performance insights
2. UX recommendations
3. Potential issues identified
4. Overall quality score (0-100)
5. Actionable recommendations

Format as JSON with insights array, recommendations array, and score number.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a senior QA engineer analyzing test execution results. Provide actionable insights and recommendations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const parsedResponse = JSON.parse(response);

      return {
        insights: parsedResponse.insights || [],
        recommendations: parsedResponse.recommendations || [],
        score: Math.max(0, Math.min(100, parsedResponse.score || 50)),
      };
    } catch (error) {
      console.error('AI execution analysis error:', error);
      return {
        insights: [],
        recommendations: ['Unable to generate AI insights at this time'],
        score: 50,
      };
    }
  }

  /**
   * Generate optimized selectors for elements
   */
  async optimizeSelectors(html: string, targetUrl: string): Promise<{
    selectors: Record<string, string>;
    recommendations: string[];
  }> {
    const prompt = `Analyze this HTML and suggest optimized selectors for testing:

HTML: ${html}
Target URL: ${targetUrl}

Provide:
1. Recommended selectors for key interactive elements
2. Best practices for selector strategies
3. Data attributes that should be added for testing

Format as JSON with selectors object and recommendations array.`;

    try {
      const completion = await this.openai.chat.completions.create({
                    model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a frontend testing expert. Provide optimized selectors and testing recommendations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(response);
    } catch (error) {
      console.error('AI selector optimization error:', error);
      return {
        selectors: {},
        recommendations: ['Unable to generate selector recommendations at this time'],
      };
    }
  }

  /**
   * Validate and clean generated test steps
   */
  private validateAndCleanSteps(steps: any[]): TestStep[] {
    return steps.map((step, index) => ({
      id: `step_${index + 1}`,
      order: step.order || index,
      action: this.validateAction(step.action),
      element: step.element || '',
      value: step.value || '',
      description: step.description || 'Test step',
      timeout: step.timeout || 5000,
      screenshot: step.screenshot || false,
      ai_context: step.ai_context || '',
    }));
  }

  /**
   * Validate action type
   */
  private validateAction(action: string): TestStep['action'] {
    const validActions: TestStep['action'][] = [
      'click', 'type', 'navigate', 'wait', 'verify', 'upload', 'select', 'scroll'
    ];

    return validActions.includes(action as TestStep['action'])
      ? action as TestStep['action']
      : 'click';
  }

  /**
   * Generate test name from prompt
   */
  private generateTestName(prompt: string): string {
    // Extract key action from prompt
    const keywords = ['login', 'register', 'search', 'checkout', 'payment', 'profile', 'settings'];
    const lowerPrompt = prompt.toLowerCase();

    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        return `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Test`;
      }
    }

    // Fallback: use first few words
    const words = prompt.split(' ').slice(0, 3);
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + ' Test';
  }

  /**
   * Calculate confidence score based on response quality
   */
  private calculateConfidenceScore(response: any): number {
    let score = 50; // Base score

    // Check if response has required fields
    if (response.name) score += 10;
    if (response.description) score += 10;
    if (response.steps && response.steps.length > 0) score += 20;

    // Check step quality
    if (response.steps) {
      const validSteps = response.steps.filter((step: any) =>
        step.action && step.description
      );
      score += Math.min(20, validSteps.length * 2);
    }

    // Check for element selectors
    if (response.steps) {
      const stepsWithSelectors = response.steps.filter((step: any) => step.element);
      score += Math.min(10, stepsWithSelectors.length);
    }

    return Math.max(0, Math.min(100, score));
  }
}

// Export singleton instance
export const aiService = new AIService();
