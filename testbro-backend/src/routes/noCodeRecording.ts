import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { NoCodeRecordingService } from '../services/noCodeRecordingService';
import { ElementRecognitionService } from '../services/elementRecognitionService';
import { WebSocketService } from '../services/websocketService';
import { AIService } from '../services/aiService';
import { BrowserControlService } from '../services/browserControlService';
import { logger, LogCategory } from '../services/loggingService';
import { 
  CreateInteractiveRecordingRequest,
  UpdateNoCodeStepRequest,
  ElementIdentificationRequest,
  ConversationalTestRequest,
  NoCodeTestStep,
  InteractiveRecording
} from '../types';

const router = Router();

// Initialize services
const wsService = new WebSocketService();
const aiService = new AIService();
const noCodeRecordingService = new NoCodeRecordingService(wsService, aiService);
const elementRecognitionService = new ElementRecognitionService(aiService);
const browserControlService = new BrowserControlService();

// Validation schemas
const createRecordingSchema = z.object({
  session_id: z.string().uuid(),
  project_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  auto_generate_steps: z.boolean().default(true),
  real_time_preview: z.boolean().default(true),
  page_url: z.string().url().optional()
});

const updateStepSchema = z.object({
  natural_language: z.string().optional(),
  element_description: z.string().optional(),
  element_selector: z.string().optional(),
  value: z.string().optional(),
  user_verified: z.boolean().optional()
});

const elementIdentificationSchema = z.object({
  page_url: z.string().url(),
  click_coordinates: z.object({
    x: z.number(),
    y: z.number()
  }),
  page_html: z.string().optional(),
  context: z.object({
    user_intent: z.string().optional(),
    interaction_history: z.array(z.object({
      action: z.string(),
      element: z.string(),
      timestamp: z.string()
    })).optional()
  }).optional()
});

const conversationalTestSchema = z.object({
  project_id: z.string().uuid(),
  message: z.string().min(1),
  session_id: z.string().uuid().optional(),
  context: z.object({
    target_url: z.string().url().optional(),
    user_intent: z.string().optional()
  }).optional()
});

// =====================================================
// Interactive Recording Endpoints
// =====================================================

/**
 * POST /api/no-code/recordings
 * Start a new interactive recording session
 */
router.post('/recordings', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validatedData = createRecordingSchema.parse(req.body);

    const recording = await noCodeRecordingService.startInteractiveRecording(
      validatedData.session_id,
      validatedData.project_id,
      validatedData.name,
      validatedData.description || '',
      userId,
      {
        auto_generate_steps: validatedData.auto_generate_steps,
        real_time_preview: validatedData.real_time_preview,
        page_url: validatedData.page_url
      }
    );

    logger.info('Interactive recording started', LogCategory.API, {
      recordingId: recording.id,
      userId,
      projectId: validatedData.project_id
    });

    res.status(201).json({
      data: recording,
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to start interactive recording', LogCategory.API, {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to start interactive recording',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/no-code/recordings/:id
 * Get recording details
 */
router.get('/recordings/:id', async (req: Request, res: Response) => {
  try {
    const recordingId = req.params.id;
    
    // This would typically fetch from database
    // For now, we'll implement a basic response structure
    res.status(200).json({
      data: {
        id: recordingId,
        message: 'Recording details endpoint - to be implemented with database query'
      }
    });

  } catch (error) {
    logger.error('Failed to get recording details', LogCategory.API, {
      recordingId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to get recording details'
    });
  }
});

/**
 * POST /api/no-code/recordings/:id/action
 * Add an action to the recording (convert to step)
 */
router.post('/recordings/:id/action', async (req: Request, res: Response) => {
  try {
    const recordingId = req.params.id;
    const action = req.body;

    const step = await noCodeRecordingService.convertActionToStep(recordingId, action);

    logger.info('Action converted to step', LogCategory.API, {
      recordingId,
      stepId: step.id,
      actionType: action.action_type
    });

    res.status(201).json({
      data: step,
      meta: {
        timestamp: new Date().toISOString(),
        auto_generated: true
      }
    });

  } catch (error) {
    logger.error('Failed to convert action to step', LogCategory.API, {
      recordingId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to convert action to step',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/no-code/recordings/:id/complete
 * Complete the recording session
 */
router.post('/recordings/:id/complete', async (req: Request, res: Response) => {
  try {
    const recordingId = req.params.id;

    const completedRecording = await noCodeRecordingService.completeRecording(recordingId);

    logger.info('Recording completed', LogCategory.API, {
      recordingId,
      stepsCount: completedRecording.steps_count
    });

    res.status(200).json({
      data: completedRecording,
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to complete recording', LogCategory.API, {
      recordingId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to complete recording',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/no-code/recordings/:id
 * Cancel/delete the recording session
 */
router.delete('/recordings/:id', async (req: Request, res: Response) => {
  try {
    const recordingId = req.params.id;

    // Implementation would handle cleanup and database deletion
    logger.info('Recording cancelled', LogCategory.API, {
      recordingId,
      userId: req.user?.id
    });

    res.status(200).json({
      data: { 
        id: recordingId,
        status: 'cancelled' 
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to cancel recording', LogCategory.API, {
      recordingId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to cancel recording'
    });
  }
});

// =====================================================
// Step Management Endpoints
// =====================================================

/**
 * PUT /api/no-code/steps/:id
 * Update a test step
 */
router.put('/steps/:id', async (req: Request, res: Response) => {
  try {
    const stepId = req.params.id;
    const updates = updateStepSchema.parse(req.body);

    // This would be implemented with the database update
    logger.info('Step updated', LogCategory.API, {
      stepId,
      updates: Object.keys(updates),
      userId: req.user?.id
    });

    res.status(200).json({
      data: {
        id: stepId,
        ...updates,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to update step', LogCategory.API, {
      stepId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to update step'
    });
  }
});

/**
 * DELETE /api/no-code/steps/:id
 * Delete a test step
 */
router.delete('/steps/:id', async (req: Request, res: Response) => {
  try {
    const stepId = req.params.id;

    logger.info('Step deleted', LogCategory.API, {
      stepId,
      userId: req.user?.id
    });

    res.status(200).json({
      data: { 
        id: stepId,
        deleted: true 
      }
    });

  } catch (error) {
    logger.error('Failed to delete step', LogCategory.API, {
      stepId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to delete step'
    });
  }
});

/**
 * POST /api/no-code/steps/:id/verify
 * Verify/approve an AI-generated step
 */
router.post('/steps/:id/verify', async (req: Request, res: Response) => {
  try {
    const stepId = req.params.id;
    const { verified, modifications } = req.body;

    // This would be implemented with the NoCodeRecordingService
    logger.info('Step verification updated', LogCategory.API, {
      stepId,
      verified,
      hasModifications: !!modifications,
      userId: req.user?.id
    });

    res.status(200).json({
      data: {
        id: stepId,
        user_verified: verified,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to verify step', LogCategory.API, {
      stepId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to verify step'
    });
  }
});

/**
 * POST /api/no-code/steps/batch
 * Batch operations on steps
 */
router.post('/steps/batch', async (req: Request, res: Response) => {
  try {
    const { operation, step_ids, data } = req.body;

    logger.info('Batch step operation', LogCategory.API, {
      operation,
      stepCount: step_ids?.length || 0,
      userId: req.user?.id
    });

    res.status(200).json({
      data: {
        operation,
        processed_count: step_ids?.length || 0,
        success: true
      }
    });

  } catch (error) {
    logger.error('Failed to perform batch step operation', LogCategory.API, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to perform batch operation'
    });
  }
});

// =====================================================
// Element Recognition Endpoints
// =====================================================

/**
 * POST /api/no-code/elements/identify
 * Identify element from screenshot and coordinates
 */
router.post('/elements/identify', async (req: Request, res: Response) => {
  try {
    const validatedData = elementIdentificationSchema.parse(req.body);

    // This would require browser session integration
    logger.info('Element identification requested', LogCategory.API, {
      pageUrl: validatedData.page_url,
      coordinates: validatedData.click_coordinates,
      userId: req.user?.id
    });

    // Mock response for now - would be implemented with actual element recognition
    const mockIdentification = {
      id: 'elem_' + Date.now(),
      element_type: 'button',
      natural_description: 'Login button',
      selectors: {
        primary: '#login-btn',
        alternatives: ['.btn-login', 'button[type="submit"]'],
        confidence_scores: [0.95, 0.8, 0.7]
      },
      visual_context: {
        nearby_text: ['Username', 'Password', 'Sign In'],
        parent_elements: ['form', 'div.login-form'],
        aria_labels: ['Login'],
        position: validatedData.click_coordinates
      },
      confidence_metrics: {
        element_recognition: 0.9,
        selector_reliability: 0.95,
        overall: 0.92
      },
      created_at: new Date().toISOString()
    };

    res.status(200).json({
      data: mockIdentification,
      meta: {
        timestamp: new Date().toISOString(),
        processing_time_ms: 150
      }
    });

  } catch (error) {
    logger.error('Failed to identify element', LogCategory.API, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to identify element'
    });
  }
});

/**
 * POST /api/no-code/elements/suggest-selectors
 * Suggest alternative selectors for an element
 */
router.post('/elements/suggest-selectors', async (req: Request, res: Response) => {
  try {
    const { current_selector, element_identification } = req.body;

    logger.info('Selector suggestions requested', LogCategory.API, {
      currentSelector: current_selector,
      userId: req.user?.id
    });

    // Mock response - would be implemented with ElementRecognitionService
    const mockSuggestions = [
      {
        selector: '[data-testid="login-button"]',
        confidence: 0.95,
        pros: ['Test-specific attribute', 'High reliability'],
        cons: ['Requires test attributes in code']
      },
      {
        selector: 'button:contains("Login")',
        confidence: 0.85,
        pros: ['Text-based', 'Human readable'],
        cons: ['May break with text changes']
      },
      {
        selector: '.login-form button[type="submit"]',
        confidence: 0.75,
        pros: ['Context-specific', 'Semantic'],
        cons: ['Dependent on form structure']
      }
    ];

    res.status(200).json({
      data: mockSuggestions,
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to suggest selectors', LogCategory.API, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to suggest selectors'
    });
  }
});

/**
 * POST /api/no-code/elements/validate-selector
 * Validate if a selector works on the current page
 */
router.post('/elements/validate-selector', async (req: Request, res: Response) => {
  try {
    const { selector, page_url, session_id } = req.body;

    logger.info('Selector validation requested', LogCategory.API, {
      selector,
      pageUrl: page_url,
      sessionId: session_id,
      userId: req.user?.id
    });

    // Mock validation result - would be implemented with browser session
    const mockValidation = {
      valid: true,
      found_elements: 1,
      is_unique: true,
      is_visible: true,
      matches_expected: true,
      recommendations: []
    };

    res.status(200).json({
      data: mockValidation,
      meta: {
        timestamp: new Date().toISOString(),
        validation_time_ms: 50
      }
    });

  } catch (error) {
    logger.error('Failed to validate selector', LogCategory.API, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to validate selector'
    });
  }
});

// =====================================================
// Test Templates Endpoints
// =====================================================

/**
 * GET /api/no-code/templates
 * Get available test templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { category, is_public, tags } = req.query;

    logger.info('Templates requested', LogCategory.API, {
      category,
      isPublic: is_public,
      tags,
      userId: req.user?.id
    });

    // This would be implemented with database query
    const mockTemplates = [
      {
        id: 'template_login',
        name: 'User Login Flow',
        description: 'Test user authentication flow with email and password',
        category: 'Authentication',
        template_steps: [
          { order: 1, action: 'navigate', description: 'Go to login page', element: 'login page' },
          { order: 2, action: 'type', description: 'Enter email address', element: 'email input' },
          { order: 3, action: 'type', description: 'Enter password', element: 'password input' },
          { order: 4, action: 'click', description: 'Click login button', element: 'login button' },
          { order: 5, action: 'verify', description: 'Verify successful login', element: 'dashboard' }
        ],
        tags: ['authentication', 'login'],
        usage_count: 156,
        is_public: true
      }
    ];

    res.status(200).json({
      data: mockTemplates,
      meta: {
        total: mockTemplates.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get templates', LogCategory.API, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to get templates'
    });
  }
});

/**
 * POST /api/no-code/templates/:id/use
 * Use a template to create new test steps
 */
router.post('/templates/:id/use', async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const { project_id, target_id, customizations } = req.body;

    logger.info('Template usage requested', LogCategory.API, {
      templateId,
      projectId: project_id,
      targetId: target_id,
      userId: req.user?.id
    });

    res.status(200).json({
      data: {
        template_id: templateId,
        generated_steps: [],
        message: 'Template applied successfully'
      }
    });

  } catch (error) {
    logger.error('Failed to use template', LogCategory.API, {
      templateId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to use template'
    });
  }
});

// =====================================================
// Analytics and Metrics Endpoints
// =====================================================

/**
 * GET /api/no-code/analytics/usage
 * Get no-code usage analytics
 */
router.get('/analytics/usage', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;

    logger.info('No-code analytics requested', LogCategory.API, {
      period,
      userId: req.user?.id
    });

    const mockAnalytics = {
      total_recordings: 42,
      completed_recordings: 38,
      avg_steps_per_recording: 7.5,
      avg_recording_duration: 180, // seconds
      step_verification_rate: 0.85,
      element_identification_accuracy: 0.92,
      most_used_actions: [
        { action_type: 'click', count: 156, success_rate: 0.94 },
        { action_type: 'type', count: 89, success_rate: 0.91 },
        { action_type: 'verify', count: 67, success_rate: 0.89 }
      ]
    };

    res.status(200).json({
      data: mockAnalytics,
      meta: {
        period,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get analytics', LogCategory.API, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to get analytics'
    });
  }
});

export default router;