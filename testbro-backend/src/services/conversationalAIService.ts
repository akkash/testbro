import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/database';
import { WebSocketService } from './websocketService';
import { AIService } from './aiService';
import { logger, LogCategory } from './loggingService';
import {
  TestCase,
  NoCodeTestStep,
  ConversationContext,
  TestGenerationRequest,
  TestGenerationResponse
} from '../types';

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

export interface TestGenerationContext {
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

export class ConversationalAIService {
  private wsService: WebSocketService;
  private aiService: AIService;
  private activeConversations = new Map<string, ConversationMessage[]>();

  constructor(wsService: WebSocketService, aiService: AIService) {
    this.wsService = wsService;
    this.aiService = aiService;
  }

  /**
   * Start a new conversational test generation session
   */
  async startConversation(
    userId: string,
    initialMessage: string,
    context?: Partial<TestGenerationContext>
  ): Promise<{
    conversation_id: string;
    initial_response: ConversationMessage;
    suggested_questions: string[];
  }> {
    const conversationId = uuidv4();
    
    try {
      // Initialize conversation with system context
      const systemMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'system',
        content: this.buildSystemPrompt(context),
        timestamp: new Date().toISOString()
      };

      const userMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'user',
        content: initialMessage,
        timestamp: new Date().toISOString()
      };

      // Generate initial AI response
      const aiResponse = await this.generateAIResponse([systemMessage, userMessage], context);
      
      const assistantMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date().toISOString(),
        metadata: {
          confidence_score: aiResponse.confidence,
          suggestions: aiResponse.suggestions
        }
      };

      // Store conversation
      this.activeConversations.set(conversationId, [systemMessage, userMessage, assistantMessage]);

      // Store in database
      await this.storeConversation(conversationId, userId, [userMessage, assistantMessage]);

      const suggestedQuestions = this.generateSuggestedQuestions(initialMessage, context);

      logger.info('Started new conversational test generation', LogCategory.AI, {
        conversationId,
        userId,
        initialMessageLength: initialMessage.length
      });

      return {
        conversation_id: conversationId,
        initial_response: assistantMessage,
        suggested_questions: suggestedQuestions
      };

    } catch (error) {
      logger.error('Failed to start conversation', LogCategory.AI, {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Continue an existing conversation with a new message
   */
  async continueConversation(
    conversationId: string,
    userMessage: string,
    context?: Partial<TestGenerationContext>
  ): Promise<{
    response: ConversationMessage;
    generated_steps?: NoCodeTestStep[];
    updated_test?: Partial<TestCase>;
    suggested_actions: string[];
  }> {
    try {
      const conversation = this.activeConversations.get(conversationId);
      if (!conversation) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      // Add user message
      const newUserMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      };

      conversation.push(newUserMessage);

      // Analyze user intent and generate response
      const intentAnalysis = await this.analyzeUserIntent(userMessage, context);
      
      let generatedSteps: NoCodeTestStep[] = [];
      let updatedTest: Partial<TestCase> | undefined;

      // Generate AI response based on intent
      let aiResponse;
      if (intentAnalysis.intent === 'generate_test') {
        const testGeneration = await this.generateTestSteps(userMessage, context);
        generatedSteps = testGeneration.steps;
        aiResponse = testGeneration.response;
        
        if (testGeneration.complete_test) {
          updatedTest = testGeneration.complete_test;
        }
      } else {
        aiResponse = await this.generateAIResponse(conversation, context);
      }

      const assistantMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date().toISOString(),
        metadata: {
          step_generated: generatedSteps.length > 0,
          test_updated: !!updatedTest,
          confidence_score: aiResponse.confidence,
          suggestions: aiResponse.suggestions
        }
      };

      conversation.push(assistantMessage);

      // Store updated conversation
      await this.storeConversation(conversationId, '', [newUserMessage, assistantMessage]);

      // Emit real-time updates
      this.wsService.broadcast(`conversation:${conversationId}`, {
        type: 'message_received',
        data: {
          conversation_id: conversationId,
          message: assistantMessage,
          generated_steps: generatedSteps,
          updated_test: updatedTest
        }
      });

      const suggestedActions = this.generateSuggestedActions(intentAnalysis, context);

      return {
        response: assistantMessage,
        generated_steps: generatedSteps.length > 0 ? generatedSteps : undefined,
        updated_test: updatedTest,
        suggested_actions: suggestedActions
      };

    } catch (error) {
      logger.error('Failed to continue conversation', LogCategory.AI, {
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate complete test case from natural language description
   */
  async generateTestCase(
    description: string,
    context: TestGenerationContext
  ): Promise<TestGenerationResponse> {
    try {
      const prompt = this.buildTestGenerationPrompt(description, context);
      
      const response = await this.aiService.generateCompletion(prompt, {
        model: 'gpt-4',
        maxTokens: 2000,
        temperature: 0.3
      });

      const parsedResponse = this.parseTestGenerationResponse(response);
      
      // Validate and enhance generated steps
      const enhancedSteps = await this.enhanceGeneratedSteps(parsedResponse.steps, context);

      const testCase: Partial<TestCase> = {
        name: parsedResponse.name || `Test: ${description.slice(0, 50)}...`,
        description: parsedResponse.description || description,
        steps: enhancedSteps,
        priority: parsedResponse.priority || 'medium',
        tags: parsedResponse.tags || ['ai-generated'],
        ai_generated: true,
        status: 'draft'
      };

      return {
        success: true,
        test_case: testCase,
        confidence_score: parsedResponse.confidence || 0.8,
        suggestions: parsedResponse.suggestions || [],
        warnings: parsedResponse.warnings || []
      };

    } catch (error) {
      logger.error('Failed to generate test case', LogCategory.AI, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        test_case: null,
        confidence_score: 0,
        suggestions: [],
        warnings: [`Failed to generate test: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Refine existing test steps based on user feedback
   */
  async refineTestSteps(
    steps: NoCodeTestStep[],
    feedback: string,
    context?: Partial<TestGenerationContext>
  ): Promise<{
    refined_steps: NoCodeTestStep[];
    changes_summary: string;
    confidence_score: number;
  }> {
    try {
      const prompt = `Refine these test steps based on user feedback:

Current Steps:
${steps.map((step, i) => `${i + 1}. ${step.natural_language} (${step.action_type})`).join('\n')}

User Feedback: ${feedback}

Provide refined steps with improved clarity, accuracy, and completeness. 
Return JSON format: {
  "steps": [...],
  "changes_summary": "...",
  "confidence": 0.8
}`;

      const response = await this.aiService.generateCompletion(prompt, {
        model: 'gpt-4',
        maxTokens: 1500,
        temperature: 0.3
      });

      const parsed = JSON.parse(response);
      
      const refinedSteps = parsed.steps.map((step: any, index: number) => ({
        ...steps[index],
        natural_language: step.natural_language,
        element_description: step.element_description,
        value: step.value,
        updated_at: new Date().toISOString()
      }));

      return {
        refined_steps: refinedSteps,
        changes_summary: parsed.changes_summary,
        confidence_score: parsed.confidence
      };

    } catch (error) {
      logger.error('Failed to refine test steps', LogCategory.AI, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        refined_steps: steps,
        changes_summary: 'No changes applied due to error',
        confidence_score: 0
      };
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
    const conversation = this.activeConversations.get(conversationId);
    if (conversation) {
      return conversation.filter(msg => msg.role !== 'system');
    }

    // Fallback to database
    try {
      const { data, error } = await supabaseAdmin
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
        metadata: msg.metadata
      }));

    } catch (error) {
      logger.error('Failed to get conversation history', LogCategory.AI, {
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  // Private helper methods

  private buildSystemPrompt(context?: Partial<TestGenerationContext>): string {
    return `You are an expert test automation consultant helping users create comprehensive test cases through natural conversation. 

Your role:
- Help users define clear, actionable test steps
- Ask clarifying questions when requirements are unclear
- Suggest best practices for test automation
- Generate realistic test data and scenarios
- Provide confidence scores for suggestions

Context:
${context?.domain_context ? `Website: ${context.domain_context.website_url}` : ''}
${context?.constraints?.test_type ? `Test Type: ${context.constraints.test_type}` : ''}
${context?.user_preferences ? `Verbosity: ${context.user_preferences.verbosity}` : ''}

Guidelines:
- Be conversational and helpful
- Ask one question at a time
- Provide actionable steps
- Include relevant validations
- Consider error scenarios
- Maintain test maintainability`;
  }

  private async generateAIResponse(
    conversation: ConversationMessage[],
    context?: Partial<TestGenerationContext>
  ): Promise<{ content: string; confidence: number; suggestions: string[] }> {
    const messages = conversation.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
    
    const prompt = `Continue this test automation conversation naturally and helpfully:

${messages}

Provide a helpful response that:
1. Addresses the user's question/request
2. Asks clarifying questions if needed
3. Suggests next steps
4. Maintains a conversational tone

Return JSON format: {
  "content": "response text",
  "confidence": 0.8,
  "suggestions": ["suggestion1", "suggestion2"]
}`;

    try {
      const response = await this.aiService.generateCompletion(prompt, {
        model: 'gpt-4',
        maxTokens: 500,
        temperature: 0.7
      });

      return JSON.parse(response);
    } catch (error) {
      return {
        content: "I'm here to help you create test cases. What would you like to test?",
        confidence: 0.5,
        suggestions: ['Describe your application', 'What user flow to test?', 'Any specific requirements?']
      };
    }
  }

  private async analyzeUserIntent(
    message: string,
    context?: Partial<TestGenerationContext>
  ): Promise<{
    intent: 'generate_test' | 'modify_test' | 'ask_question' | 'clarify_requirement';
    confidence: number;
    entities: string[];
  }> {
    const generateKeywords = ['create', 'generate', 'build', 'test', 'scenario', 'steps'];
    const modifyKeywords = ['change', 'update', 'modify', 'edit', 'fix', 'improve'];
    const questionKeywords = ['how', 'what', 'why', 'when', 'which', 'can', 'should'];

    const lowerMessage = message.toLowerCase();
    
    const hasGenerateIntent = generateKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasModifyIntent = modifyKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasQuestionIntent = questionKeywords.some(keyword => lowerMessage.startsWith(keyword));

    if (hasGenerateIntent && (lowerMessage.includes('test') || lowerMessage.includes('step'))) {
      return {
        intent: 'generate_test',
        confidence: 0.8,
        entities: this.extractEntities(message)
      };
    } else if (hasModifyIntent) {
      return {
        intent: 'modify_test',
        confidence: 0.7,
        entities: this.extractEntities(message)
      };
    } else if (hasQuestionIntent) {
      return {
        intent: 'ask_question',
        confidence: 0.6,
        entities: []
      };
    }

    return {
      intent: 'clarify_requirement',
      confidence: 0.5,
      entities: []
    };
  }

  private async generateTestSteps(
    userMessage: string,
    context?: Partial<TestGenerationContext>
  ): Promise<{
    steps: NoCodeTestStep[];
    response: { content: string; confidence: number; suggestions: string[] };
    complete_test?: Partial<TestCase>;
  }> {
    const prompt = `Generate test automation steps for: ${userMessage}

Context: ${JSON.stringify(context, null, 2)}

Create detailed test steps with natural language descriptions. Include:
1. Navigation steps
2. Interaction steps  
3. Validation steps
4. Error handling (if requested)

Return JSON format: {
  "steps": [
    {
      "natural_language": "Navigate to login page",
      "action_type": "navigate",
      "element_description": "Login page URL",
      "value": "https://app.example.com/login",
      "order": 1
    }
  ],
  "response_message": "I've generated X test steps for your scenario...",
  "confidence": 0.8,
  "suggestions": ["Add error validation", "Include data cleanup"]
}`;

    try {
      const response = await this.aiService.generateCompletion(prompt, {
        model: 'gpt-4',
        maxTokens: 1500,
        temperature: 0.3
      });

      const parsed = JSON.parse(response);
      
      const steps: NoCodeTestStep[] = parsed.steps.map((step: any, index: number) => ({
        id: uuidv4(),
        order: step.order || index + 1,
        natural_language: step.natural_language,
        action_type: step.action_type,
        element_description: step.element_description || '',
        element_selector: step.element_selector || '',
        element_alternatives: [],
        value: step.value || '',
        confidence_score: 0.8,
        user_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      return {
        steps,
        response: {
          content: parsed.response_message,
          confidence: parsed.confidence,
          suggestions: parsed.suggestions
        }
      };

    } catch (error) {
      return {
        steps: [],
        response: {
          content: 'I encountered an issue generating test steps. Could you provide more specific details about what you want to test?',
          confidence: 0.3,
          suggestions: ['Be more specific', 'Provide example URLs', 'Describe user actions']
        }
      };
    }
  }

  private buildTestGenerationPrompt(
    description: string,
    context: TestGenerationContext
  ): string {
    return `Generate a comprehensive test case for: ${description}

Context:
- Test Type: ${context.constraints.test_type || 'e2e'}
- Verbosity: ${context.user_preferences.verbosity}
- Include Validations: ${context.user_preferences.include_validations}
- Website: ${context.domain_context?.website_url || 'Not specified'}

Requirements:
1. Create realistic, actionable test steps
2. Include proper validations
3. Consider error scenarios if requested
4. Use clear, natural language descriptions
5. Provide confidence scores

Return JSON format with complete test case structure including name, description, steps, priority, and tags.`;
  }

  private parseTestGenerationResponse(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      // Fallback parsing for malformed JSON
      return {
        name: 'Generated Test',
        description: 'AI-generated test case',
        steps: [],
        confidence: 0.5,
        suggestions: ['Review and modify as needed']
      };
    }
  }

  private async enhanceGeneratedSteps(
    steps: any[],
    context: TestGenerationContext
  ): Promise<NoCodeTestStep[]> {
    return steps.map((step, index) => ({
      id: uuidv4(),
      order: index + 1,
      natural_language: step.natural_language || `Step ${index + 1}`,
      action_type: step.action_type || 'click',
      element_description: step.element_description || '',
      element_selector: step.element_selector || '',
      element_alternatives: step.element_alternatives || [],
      value: step.value || '',
      confidence_score: step.confidence_score || 0.7,
      user_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  }

  private generateSuggestedQuestions(
    initialMessage: string,
    context?: Partial<TestGenerationContext>
  ): string[] {
    const suggestions = [
      'What specific user actions should be tested?',
      'Are there any error scenarios to consider?',
      'What data is needed for this test?',
      'Should we include performance validations?'
    ];

    // Customize based on context
    if (!context?.domain_context?.website_url) {
      suggestions.unshift('What website or application are we testing?');
    }

    if (!context?.constraints?.test_type) {
      suggestions.push('What type of test is this? (smoke, regression, e2e)');
    }

    return suggestions.slice(0, 3);
  }

  private generateSuggestedActions(
    intentAnalysis: any,
    context?: Partial<TestGenerationContext>
  ): string[] {
    const actions = [];

    switch (intentAnalysis.intent) {
      case 'generate_test':
        actions.push('Run generated test', 'Save test case', 'Modify steps');
        break;
      case 'modify_test':
        actions.push('Apply changes', 'Preview test', 'Compare versions');
        break;
      case 'ask_question':
        actions.push('Get more details', 'See examples', 'Start over');
        break;
      default:
        actions.push('Generate test steps', 'Ask questions', 'Provide examples');
    }

    return actions;
  }

  private extractEntities(message: string): string[] {
    // Simple entity extraction - could be enhanced with NLP
    const entities = [];
    
    // URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = message.match(urlRegex);
    if (urls) entities.push(...urls);

    // Common UI elements
    const uiElements = ['button', 'input', 'form', 'link', 'menu', 'dropdown', 'checkbox'];
    uiElements.forEach(element => {
      if (message.toLowerCase().includes(element)) {
        entities.push(element);
      }
    });

    return entities;
  }

  private async storeConversation(
    conversationId: string,
    userId: string,
    messages: ConversationMessage[]
  ): Promise<void> {
    try {
      for (const message of messages) {
        await supabaseAdmin.from('conversation_messages').insert({
          id: message.id,
          conversation_id: conversationId,
          user_id: userId,
          role: message.role,
          content: message.content,
          metadata: message.metadata,
          created_at: message.timestamp
        });
      }
    } catch (error) {
      logger.warn('Failed to store conversation messages', LogCategory.AI, {
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}