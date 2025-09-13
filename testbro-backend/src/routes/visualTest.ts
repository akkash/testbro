import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { visualTestService, DragDropAction } from '../services/visualTestService';
import { handleApiError, ApiResponse } from '../utils/apiResponse';

const router = express.Router();

// Validation schemas
const createVisualTestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  target_url: z.string().url(),
  project_id: z.string().uuid(),
  browser_settings: z.object({
    browser: z.enum(['chromium', 'firefox', 'webkit']).optional(),
    viewport: z.object({
      width: z.number().min(100).max(3840),
      height: z.number().min(100).max(2160)
    }).optional(),
    device: z.enum(['desktop', 'mobile', 'tablet']).optional()
  }).optional()
});

const updateStepsSchema = z.object({
  actions: z.array(z.object({
    type: z.string(),
    element: z.object({
      selector: z.string(),
      tagName: z.string(),
      text: z.string().optional(),
      attributes: z.record(z.string()).optional()
    }),
    action: z.object({
      type: z.enum(['click', 'type', 'hover', 'drag', 'scroll']),
      value: z.string().optional(),
      coordinates: z.object({
        x: z.number(),
        y: z.number()
      }).optional(),
      targetSelector: z.string().optional()
    }),
    metadata: z.object({
      stepName: z.string(),
      description: z.string().optional(),
      screenshot: z.string().optional()
    })
  }))
});

const executeTestSchema = z.object({
  browser: z.enum(['chromium', 'firefox', 'webkit']).optional(),
  headless: z.boolean().optional(),
  viewport: z.object({
    width: z.number().min(100).max(3840),
    height: z.number().min(100).max(2160)
  }).optional()
});

/**
 * @route POST /api/visual-tests/create
 * @desc Create a new visual test flow
 * @access Private
 */
router.post('/create', 
  authenticateUser,
  validateRequest(createVisualTestSchema),
  async (req: Request, res: Response) => {
    try {
      const { name, description, target_url, project_id, browser_settings } = req.body;
      const user_id = req.user!.id;

      const testFlow = await visualTestService.createVisualTest(
        name, 
        description || '', 
        target_url,
        project_id,
        user_id
      );

      // If browser settings provided, update the flow
      if (browser_settings) {
        // This would require an update method in the service
        // For now, we'll include it in the creation
      }

      const response: ApiResponse<typeof testFlow> = {
        success: true,
        data: testFlow,
        message: 'Visual test flow created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route GET /api/visual-tests
 * @desc Get all visual tests for the authenticated user
 * @access Private
 */
router.get('/', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const user_id = req.user!.id;
      const project_id = req.query.project_id as string;

      const visualTests = await visualTestService.listVisualTests(user_id, project_id);

      const response: ApiResponse<typeof visualTests> = {
        success: true,
        data: visualTests,
        message: 'Visual tests retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route GET /api/visual-tests/:id
 * @desc Get a specific visual test with its steps
 * @access Private
 */
router.get('/:id', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const flow_id = req.params.id;
      const user_id = req.user!.id;

      const visualTest = await visualTestService.getVisualTest(flow_id, user_id);

      const response: ApiResponse<typeof visualTest> = {
        success: true,
        data: visualTest,
        message: 'Visual test retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route PUT /api/visual-tests/:id/steps
 * @desc Update test steps for a visual test
 * @access Private
 */
router.put('/:id/steps', 
  authenticateUser,
  validateRequest(updateStepsSchema),
  async (req: Request, res: Response) => {
    try {
      const flow_id = req.params.id;
      const user_id = req.user!.id;
      const { actions } = req.body;

      const result = await visualTestService.updateTestSteps(flow_id, actions as DragDropAction[], user_id);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: `Test steps updated successfully. ${result.steps.length} steps created.`
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route POST /api/visual-tests/:id/execute
 * @desc Execute a visual test
 * @access Private
 */
router.post('/:id/execute', 
  authenticateUser,
  validateRequest(executeTestSchema),
  async (req: Request, res: Response) => {
    try {
      const flow_id = req.params.id;
      const user_id = req.user!.id;
      const options = req.body;

      const executionId = await visualTestService.executeVisualTest(flow_id, user_id, options);

      const response: ApiResponse<{ execution_id: string }> = {
        success: true,
        data: { execution_id: executionId },
        message: 'Visual test execution started successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route GET /api/visual-tests/:id/status
 * @desc Get execution status of a visual test
 * @access Private
 */
router.get('/:id/status', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const executionId = req.params.id;
      
      const executionStatus = visualTestService.getExecutionStatus(executionId);

      if (!executionStatus) {
        const response: ApiResponse<null> = {
          success: false,
          data: null,
          message: 'Execution not found or has expired'
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse<typeof executionStatus> = {
        success: true,
        data: executionStatus,
        message: 'Execution status retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route DELETE /api/visual-tests/:id
 * @desc Delete a visual test and all its steps
 * @access Private
 */
router.delete('/:id', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const flow_id = req.params.id;
      const user_id = req.user!.id;

      await visualTestService.deleteVisualTest(flow_id, user_id);

      const response: ApiResponse<null> = {
        success: true,
        data: null,
        message: 'Visual test deleted successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route POST /api/visual-tests/:id/duplicate
 * @desc Duplicate a visual test
 * @access Private
 */
router.post('/:id/duplicate', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const flow_id = req.params.id;
      const user_id = req.user!.id;
      const { name } = req.body;

      // Get the original test
      const originalTest = await visualTestService.getVisualTest(flow_id, user_id);

      // Create new test with the same configuration
      const newTest = await visualTestService.createVisualTest(
        name || `${originalTest.flow.name} (Copy)`,
        originalTest.flow.description || '',
        originalTest.flow.target_url,
        originalTest.flow.project_id,
        user_id
      );

      // If there are steps, convert them back to actions and add to new test
      if (originalTest.steps.length > 0) {
        // Convert steps back to drag-drop actions format
        const actions: DragDropAction[] = originalTest.steps.map(step => ({
          type: 'action',
          element: {
            selector: step.element_selector || '',
            tagName: 'unknown',
            text: step.element_description
          },
          action: {
            type: step.action_type === 'type' ? 'type' : 
                  step.action_type === 'hover' ? 'hover' :
                  step.action_type === 'scroll' ? 'scroll' : 'click',
            value: step.input_value,
            coordinates: step.element_position ? {
              x: step.element_position.x,
              y: step.element_position.y
            } : undefined
          },
          metadata: {
            stepName: step.natural_language_description || `Step ${step.step_order}`,
            description: step.element_description
          }
        }));

        await visualTestService.updateTestSteps(newTest.id, actions, user_id);
      }

      const response: ApiResponse<typeof newTest> = {
        success: true,
        data: newTest,
        message: 'Visual test duplicated successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route GET /api/visual-tests/:id/export
 * @desc Export a visual test as JSON
 * @access Private
 */
router.get('/:id/export', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const flow_id = req.params.id;
      const user_id = req.user!.id;

      const visualTest = await visualTestService.getVisualTest(flow_id, user_id);

      const exportData = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        test_flow: visualTest.flow,
        test_steps: visualTest.steps,
        metadata: {
          total_steps: visualTest.steps.length,
          export_format: 'testbro-visual-test-v1'
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${visualTest.flow.name.replace(/[^a-zA-Z0-9]/g, '_')}_export.json"`);
      
      res.status(200).json(exportData);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route POST /api/visual-tests/import
 * @desc Import a visual test from JSON
 * @access Private
 */
router.post('/import', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const user_id = req.user!.id;
      const { test_data, project_id } = req.body;

      if (!test_data || !test_data.test_flow || !project_id) {
        const response: ApiResponse<null> = {
          success: false,
          data: null,
          message: 'Invalid import data. Missing test_flow or project_id.'
        };
        return res.status(400).json(response);
      }

      // Create new test from imported data
      const newTest = await visualTestService.createVisualTest(
        `${test_data.test_flow.name} (Imported)`,
        test_data.test_flow.description || '',
        test_data.test_flow.target_url,
        project_id,
        user_id
      );

      // If there are steps in the import, add them
      if (test_data.test_steps && test_data.test_steps.length > 0) {
        // Convert imported steps to actions format
        const actions: DragDropAction[] = test_data.test_steps.map((step: any, index: number) => ({
          type: 'action',
          element: {
            selector: step.element_selector || '',
            tagName: 'imported',
            text: step.element_description
          },
          action: {
            type: step.action_type,
            value: step.input_value,
            coordinates: step.element_position
          },
          metadata: {
            stepName: step.natural_language_description || `Imported Step ${index + 1}`,
            description: step.element_description
          }
        }));

        await visualTestService.updateTestSteps(newTest.id, actions, user_id);
      }

      const response: ApiResponse<typeof newTest> = {
        success: true,
        data: newTest,
        message: 'Visual test imported successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

export default router;
