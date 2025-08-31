import { Router } from 'express';
import { ConversationalAIService } from '../services/conversationalAIService';
import { WebSocketService } from '../services/websocketService';
import { AIService } from '../services/aiService';
import { logger, LogCategory } from '../services/loggingService';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param } from 'express-validator';

const router = Router();

// Initialize services
let conversationalAI: ConversationalAIService;

export const initializeConversationalRoutes = (wsService: WebSocketService, aiService: AIService) => {
  conversationalAI = new ConversationalAIService(wsService, aiService);
};

/**
 * Start a new conversational test generation session
 */
router.post(
  '/start',
  authenticateToken,
  [
    body('message').notEmpty().withMessage('Initial message is required'),
    body('context').optional().isObject(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { message, context } = req.body;
      const userId = req.user?.id;

      const result = await conversationalAI.startConversation(userId, message, context);

      res.json({
        success: true,
        data: result
      });

      logger.info('Started conversational AI session', LogCategory.AI, {
        conversationId: result.conversation_id,
        userId
      });

    } catch (error) {
      logger.error('Failed to start conversation', LogCategory.AI, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to start conversation'
      });
    }
  }
);

/**
 * Continue an existing conversation
 */
router.post(
  '/:conversationId/continue',
  authenticateToken,
  [
    param('conversationId').isUUID().withMessage('Valid conversation ID is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('context').optional().isObject(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { message, context } = req.body;

      const result = await conversationalAI.continueConversation(conversationId, message, context);

      res.json({
        success: true,
        data: result
      });

      logger.info('Continued conversation', LogCategory.AI, {
        conversationId,
        hasSteps: !!result.generated_steps,
        hasTest: !!result.updated_test
      });

    } catch (error) {
      logger.error('Failed to continue conversation', LogCategory.AI, {
        conversationId: req.params.conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to continue conversation'
      });
    }
  }
);

/**
 * Generate a complete test case from natural language
 */
router.post(
  '/generate-test',
  authenticateToken,
  [
    body('description').notEmpty().withMessage('Test description is required'),
    body('context').optional().isObject(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { description, context } = req.body;

      const result = await conversationalAI.generateTestCase(description, context);

      res.json({
        success: true,
        data: result
      });

      logger.info('Generated test case from description', LogCategory.AI, {
        descriptionLength: description.length,
        success: result.success,
        stepsCount: result.test_case?.steps?.length || 0
      });

    } catch (error) {
      logger.error('Failed to generate test case', LogCategory.AI, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate test case'
      });
    }
  }
);

/**
 * Refine existing test steps based on feedback
 */
router.post(
  '/refine-steps',
  authenticateToken,
  [
    body('steps').isArray().notEmpty().withMessage('Test steps are required'),
    body('feedback').notEmpty().withMessage('Feedback is required'),
    body('context').optional().isObject(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { steps, feedback, context } = req.body;

      const result = await conversationalAI.refineTestSteps(steps, feedback, context);

      res.json({
        success: true,
        data: result
      });

      logger.info('Refined test steps', LogCategory.AI, {
        originalStepsCount: steps.length,
        refinedStepsCount: result.refined_steps.length,
        confidenceScore: result.confidence_score
      });

    } catch (error) {
      logger.error('Failed to refine test steps', LogCategory.AI, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to refine test steps'
      });
    }
  }
);

/**
 * Get conversation history
 */
router.get(
  '/:conversationId/history',
  authenticateToken,
  [
    param('conversationId').isUUID().withMessage('Valid conversation ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { conversationId } = req.params;

      const history = await conversationalAI.getConversationHistory(conversationId);

      res.json({
        success: true,
        data: {
          messages: history,
          total_messages: history.length
        }
      });

      logger.info('Retrieved conversation history', LogCategory.AI, {
        conversationId,
        messageCount: history.length
      });

    } catch (error) {
      logger.error('Failed to get conversation history', LogCategory.AI, {
        conversationId: req.params.conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get conversation history'
      });
    }
  }
);

/**
 * Get suggested questions for conversation starter
 */
router.get(
  '/suggestions',
  authenticateToken,
  async (req, res) => {
    try {
      const suggestions = [
        'Create a login test for my e-commerce website',
        'Test the checkout process with payment validation',
        'Generate a user registration flow test',
        'Create tests for my dashboard functionality',
        'Test form submission with error handling',
        'Generate API integration tests',
        'Create mobile responsive tests',
        'Test user authentication and authorization'
      ];

      const categories = [
        {
          name: 'Authentication',
          suggestions: [
            'Test login functionality',
            'Test password reset flow',
            'Test user registration',
            'Test logout process'
          ]
        },
        {
          name: 'E-commerce',
          suggestions: [
            'Test product search',
            'Test shopping cart',
            'Test checkout process',
            'Test payment integration'
          ]
        },
        {
          name: 'Forms',
          suggestions: [
            'Test contact form submission',
            'Test form validation',
            'Test file upload',
            'Test multi-step forms'
          ]
        }
      ];

      res.json({
        success: true,
        data: {
          general_suggestions: suggestions,
          categorized_suggestions: categories
        }
      });

    } catch (error) {
      logger.error('Failed to get suggestions', LogCategory.AI, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get suggestions'
      });
    }
  }
);

export default router;