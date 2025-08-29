import { AIService } from '../../src/services/aiService';
import { AIGenerateTestRequest } from '../../src/types';

// Mock OpenAI and database config
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

jest.mock('../../src/config/database', () => ({
  openRouterKey: 'test-openrouter-key',
  supabaseAdmin: {
    from: jest.fn(),
  },
  TABLES: {
    AI_USAGE_LOGS: 'ai_usage_logs',
  },
}));

describe('AIService', () => {
  let aiService: AIService;
  let mockOpenAI: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create service instance
    aiService = new AIService();

    // Get the mocked OpenAI instance
    mockOpenAI = (aiService as any).openai;
  });



  describe('generateTest', () => {
    const mockRequest: AIGenerateTestRequest = {
      prompt: 'Test login functionality with valid credentials',
      target_url: 'https://example.com/login',
      project_id: 'project-123',
      target_id: 'target-123',
      model: 'gpt-4',
    };

    const mockOpenAIResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            name: 'Login Test',
            description: 'Test login functionality with valid credentials',
            steps: [
              {
                order: 1,
                action: 'navigate',
                element: 'https://example.com/login',
                description: 'Navigate to login page',
              },
              {
                order: 2,
                action: 'type',
                element: '#email',
                value: 'test@example.com',
                description: 'Enter email address',
              },
              {
                order: 3,
                action: 'type',
                element: '#password',
                value: 'password123',
                description: 'Enter password',
              },
              {
                order: 4,
                action: 'click',
                element: '#login-button',
                description: 'Click login button',
              },
              {
                order: 5,
                action: 'verify',
                element: '.dashboard',
                description: 'Verify dashboard is displayed',
              },
            ],
          }),
        },
      }],
      usage: {
        total_tokens: 150,
      },
    };

    it('should generate test case successfully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

      const result = await aiService.generateTest(mockRequest);

      expect(result.testCase.name).toBe('Login Test');
      expect(result.testCase.description).toBe('Test login functionality with valid credentials');
      expect(result.testCase.steps).toHaveLength(5);
      expect(result.testCase.ai_generated).toBe(true);
      expect(result.metadata.model).toBe('gpt-4');
      expect(result.metadata.tokens_used).toBe(150);
    });

    it('should handle OpenAI API errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI API error'));

      await expect(aiService.generateTest(mockRequest)).rejects.toThrow('Failed to generate test case from AI');
    });

    it('should validate and clean test steps', async () => {
      const mockResponseWithInvalidSteps = {
        choices: [{
          message: {
            content: JSON.stringify({
              name: 'Test',
              steps: [
                {
                  order: 1,
                  action: 'invalid_action', // Invalid action
                  description: 'Test step',
                },
                {
                  order: 2,
                  action: 'click',
                  element: '#button',
                  description: 'Click button',
                },
              ],
            }),
          },
        }],
        usage: { total_tokens: 100 },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponseWithInvalidSteps);

      const result = await aiService.generateTest(mockRequest);

      expect(result.testCase.steps?.[0].action).toBe('click'); // Should default to 'click'
      expect(result.testCase.steps?.[1].action).toBe('click'); // Should remain 'click'
    });

    it('should generate test name from prompt when not provided', async () => {
      const mockResponseWithoutName = {
        choices: [{
          message: {
            content: JSON.stringify({
              description: 'Test functionality',
              steps: [
                {
                  order: 1,
                  action: 'click',
                  element: '#button',
                  description: 'Click button',
                },
              ],
            }),
          },
        }],
        usage: { total_tokens: 100 },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponseWithoutName);

      const result = await aiService.generateTest(mockRequest);

      expect(result.testCase.name).toContain('Test'); // Should generate a name
    });

    it('should calculate confidence score correctly', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              name: 'Test',
              description: 'Test description',
              steps: [
                { order: 1, action: 'click', element: '#btn', description: 'Click' },
                { order: 2, action: 'type', element: '#input', value: 'test', description: 'Type' },
              ],
            }),
          },
        }],
        usage: { total_tokens: 100 },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await aiService.generateTest(mockRequest);

      expect(result.metadata.confidence_score).toBeGreaterThan(50);
      expect(result.metadata.confidence_score).toBeLessThanOrEqual(100);
    });
  });

  describe('analyzeExecution', () => {
    const mockExecutionData = {
      id: 'execution-123',
      status: 'completed',
      test_case_id: 'test-case-123',
      project_id: 'project-123',
      target_id: 'target-123',
    };

    const mockLogs = [
      { message: 'Page loaded successfully', level: 'info' as const },
      { message: 'Element clicked', level: 'info' as const },
    ];

    const mockScreenshots = ['screenshot1.png'];

    const mockAnalysisResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            insights: [
              {
                type: 'performance',
                severity: 'low',
                title: 'Page Load Time',
                description: 'Page loaded within acceptable time',
              },
            ],
            recommendations: [
              'Consider optimizing images for better performance',
            ],
            score: 85,
          }),
        },
      }],
    };

    it('should analyze execution successfully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockAnalysisResponse);

      const result = await aiService.analyzeExecution(
        mockExecutionData,
        mockLogs,
        mockScreenshots
      );

      expect(result.insights).toHaveLength(1);
      expect(result.recommendations).toHaveLength(1);
      expect(result.score).toBe(85);
    });

    it('should handle analysis errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Analysis failed'));

      const result = await aiService.analyzeExecution(
        mockExecutionData,
        mockLogs,
        mockScreenshots
      );

      expect(result.insights).toEqual([]);
      expect(result.recommendations).toEqual(['Unable to generate AI insights at this time']);
      expect(result.score).toBe(50);
    });
  });

  describe('optimizeSelectors', () => {
    const mockHtml = '<html><body><button id="btn" class="btn-primary">Click me</button></body></html>';
    const mockTargetUrl = 'https://example.com';

    const mockOptimizationResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            selectors: {
              button: '[data-testid="submit-button"], .btn-primary, #btn',
            },
            recommendations: [
              'Add data-testid attributes for better test reliability',
              'Use semantic selectors when possible',
            ],
          }),
        },
      }],
    };

    it('should optimize selectors successfully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOptimizationResponse);

      const result = await aiService.optimizeSelectors(mockHtml, mockTargetUrl);

      expect(result.selectors).toHaveProperty('button');
      expect(result.recommendations).toHaveLength(2);
    });

    it('should handle optimization errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Optimization failed'));

      const result = await aiService.optimizeSelectors(mockHtml, mockTargetUrl);

      expect(result.selectors).toEqual({});
      expect(result.recommendations).toEqual(['Unable to generate selector recommendations at this time']);
    });
  });

  describe('constructor', () => {
    it('should throw error when OpenRouter key is not set', () => {
      // Temporarily mock the openRouterKey to be undefined
      const originalOpenRouterKey = jest.requireMock('../../src/config/database').openRouterKey;
      jest.requireMock('../../src/config/database').openRouterKey = undefined;

      expect(() => new AIService()).toThrow('OPENROUTER_KEY environment variable is required');

      // Restore the original value
      jest.requireMock('../../src/config/database').openRouterKey = originalOpenRouterKey;
    });
  });
});
