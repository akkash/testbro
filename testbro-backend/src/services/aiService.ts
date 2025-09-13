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

  /**
   * Generate test steps from natural language description
   * New Phase 1 method for enhanced test step generation
   */
  async generateTestSteps(request: {
    prompt: string;
    context?: string;
    target_url?: string;
    project_id?: string;
    model?: string;
  }): Promise<{
    steps: any[];
    confidence_score: number;
    metadata: any;
  }> {
    const { prompt, context, target_url, model = 'openai/gpt-4' } = request;
    
    // Create comprehensive prompt for test step generation
    const systemPrompt = `You are an expert test automation engineer. Generate detailed, executable test steps from the provided description.

Instructions:
1. Break down the test description into clear, logical steps
2. Each step should have a specific action (click, type, navigate, wait, verify, etc.)
3. Include appropriate element selectors or descriptions
4. Add natural language descriptions for each step
5. Consider timing, validation, and edge cases
6. Provide reasoning for each step to explain your logic

Output format: JSON array of steps with the following properties:
- action: The action type (click, type, navigate, wait, verify, select, etc.)
- element: Element selector or description
- value: Input value if applicable
- description: Human-readable description of the step
- reasoning: Brief explanation of why this step is necessary
- confidence: Confidence score for this step (0-100)`;

    const userPrompt = `Test Description: ${prompt}
${context ? `Additional Context: ${context}\n` : ''}
${target_url ? `Target URL: ${target_url}\n` : ''}

Generate a detailed sequence of test steps.`;

    const startTime = Date.now();

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
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI service');
      }

      const processingTime = Date.now() - startTime;
      const parsedResponse = JSON.parse(response);
      const steps = parsedResponse.steps || [];
      const confidence = this.calculateStepsConfidence(steps);

      return {
        steps,
        confidence_score: confidence,
        metadata: {
          model,
          prompt,
          tokens_used: completion.usage?.total_tokens || 0,
          processing_time_ms: processingTime,
          step_count: steps.length,
        },
      };
    } catch (error) {
      console.error('AI test step generation error:', error);
      throw new Error('Failed to generate test steps from AI');
    }
  }

  /**
   * Analyze requirements and suggest test scenarios
   * New Phase 1 method for requirements analysis
   */
  async analyzeRequirements(requirements: string, context?: string): Promise<{
    scenarios: any[];
    coverage_analysis: any;
    priority_recommendations: string[];
    metadata: any;
  }> {
    const systemPrompt = `You are an expert test analyst specializing in test planning and requirements analysis. Analyze the given requirements and suggest comprehensive test scenarios.

Instructions:
1. Extract key testable functionality from the requirements
2. Identify explicit and implicit requirements
3. Suggest prioritized test scenarios covering critical paths
4. Identify edge cases and potential risks
5. Provide coverage analysis
6. Recommend test priorities

Output format: JSON with scenarios array, coverage_analysis object, and priority_recommendations array.`;

    const userPrompt = `Requirements: ${requirements}
${context ? `Additional Context: ${context}\n` : ''}

Provide comprehensive test analysis and scenarios.`;

    const startTime = Date.now();

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'openai/gpt-4',
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
        max_tokens: 2500,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI service');
      }

      const processingTime = Date.now() - startTime;
      const parsedResponse = JSON.parse(response);

      return {
        scenarios: parsedResponse.scenarios || [],
        coverage_analysis: parsedResponse.coverage_analysis || {},
        priority_recommendations: parsedResponse.priority_recommendations || [],
        metadata: {
          model: 'openai/gpt-4',
          tokens_used: completion.usage?.total_tokens || 0,
          processing_time_ms: processingTime,
          scenario_count: (parsedResponse.scenarios || []).length,
        },
      };
    } catch (error) {
      console.error('AI requirements analysis error:', error);
      throw new Error('Failed to analyze requirements');
    }
  }

  /**
   * Get AI generation history from database
   * New Phase 1 method to retrieve generation history
   */
  async getGenerationHistory(userId: string, options?: {
    limit?: number;
    offset?: number;
    request_type?: string;
    project_id?: string;
  }): Promise<{
    generations: any[];
    total: number;
    metadata: any;
  }> {
    try {
      const { supabaseAdmin } = await import('../config/database');
      const { limit = 20, offset = 0, request_type, project_id } = options || {};

      // Build query
      let query = supabaseAdmin
        .from('ai_generations')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters if provided
      if (request_type) {
        query = query.eq('request_type', request_type);
      }

      if (project_id) {
        query = query.eq('project_id', project_id);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        generations: data || [],
        total: count || 0,
        metadata: {
          limit,
          offset,
          has_more: (count || 0) > offset + limit,
        },
      };
    } catch (error) {
      console.error('Failed to get AI generation history:', error);
      throw new Error('Failed to retrieve AI generation history');
    }
  }

  /**
   * Log AI generation to database
   * New Phase 1 method to track AI usage in structured format
   */
  async logGeneration(params: {
    user_id: string;
    prompt: string;
    request_type: string;
    project_id?: string;
    target_id?: string;
    model_used: string;
    response_content: any;
    confidence_score?: number;
    tokens_used?: number;
    processing_time_ms?: number;
    metadata?: any;
    generated_test_case_id?: string;
  }): Promise<{ id: string }> {
    try {
      const { supabaseAdmin } = await import('../config/database');
      
      const { data, error } = await supabaseAdmin
        .from('ai_generations')
        .insert({
          ...params,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          status: 'completed',
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return { id: data.id };
    } catch (error) {
      console.error('Failed to log AI generation:', error);
      // Don't throw here, just log the error
      // to avoid failing the main operation
      return { id: 'logging_failed' };
    }
  }

  /**
   * Calculate confidence score for individual steps
   * Helper for new Phase 1 methods
   */
  private calculateStepsConfidence(steps: any[]): number {
    if (!steps || steps.length === 0) return 50; // Base score

    let score = 70; // Start with higher base for valid steps

    // Check for step completeness
    const completeSteps = steps.filter(step => 
      step.action && 
      (step.element || step.action === 'navigate' || step.action === 'wait') &&
      step.description
    );
    
    // Adjust score based on completion percentage
    score += Math.round((completeSteps.length / steps.length) * 20);

    // Bonus for steps with reasoning
    const stepsWithReasoning = steps.filter(step => step.reasoning);
    score += Math.round((stepsWithReasoning.length / steps.length) * 10);

    return Math.max(0, Math.min(100, score));
  }
}

// Export singleton instance
export const aiService = new AIService();
