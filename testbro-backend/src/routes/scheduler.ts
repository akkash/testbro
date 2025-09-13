import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { schedulerService, TestSchedule } from '../services/schedulerService';
import { handleApiError, ApiResponse } from '../utils/apiResponse';

const router = express.Router();

// Validation schemas
const createScheduleSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  test_case_ids: z.array(z.string().uuid()).default([]),
  test_suite_ids: z.array(z.string().uuid()).default([]),
  visual_test_flow_ids: z.array(z.string().uuid()).default([]),
  schedule_type: z.enum(['once', 'recurring', 'cron']),
  cron_expression: z.string().optional(),
  timezone: z.string().default('UTC'),
  max_concurrent_tests: z.number().min(1).max(10).default(1),
  retry_failed_tests: z.boolean().default(true),
  retry_count: z.number().min(0).max(5).default(2),
  notification_settings: z.object({
    email: z.boolean().default(false),
    webhook: z.boolean().default(false),
    webhook_url: z.string().url().optional(),
    email_recipients: z.array(z.string().email()).optional()
  }).default({ email: false, webhook: false }),
  status: z.enum(['active', 'paused']).default('active'),
  next_execution_at: z.string().datetime().optional()
});

const updateScheduleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  test_case_ids: z.array(z.string().uuid()).optional(),
  test_suite_ids: z.array(z.string().uuid()).optional(),
  visual_test_flow_ids: z.array(z.string().uuid()).optional(),
  schedule_type: z.enum(['once', 'recurring', 'cron']).optional(),
  cron_expression: z.string().optional(),
  timezone: z.string().optional(),
  max_concurrent_tests: z.number().min(1).max(10).optional(),
  retry_failed_tests: z.boolean().optional(),
  retry_count: z.number().min(0).max(5).optional(),
  notification_settings: z.object({
    email: z.boolean().default(false),
    webhook: z.boolean().default(false),
    webhook_url: z.string().url().optional(),
    email_recipients: z.array(z.string().email()).optional()
  }).optional(),
  status: z.enum(['active', 'paused']).optional(),
  next_execution_at: z.string().datetime().optional()
});

const triggerScheduleSchema = z.object({
  execution_type: z.enum(['manual', 'triggered']).default('manual')
});

/**
 * @route POST /api/scheduler/schedule-test
 * @desc Create a new scheduled test
 * @access Private
 */
router.post('/schedule-test', 
  authenticateUser,
  validateRequest(createScheduleSchema),
  async (req: Request, res: Response) => {
    try {
      const user_id = req.user!.id;
      const scheduleData = req.body;

      // Validate cron expression if provided
      if (scheduleData.schedule_type === 'cron') {
        if (!scheduleData.cron_expression) {
          const response: ApiResponse<null> = {
            success: false,
            data: null,
            message: 'Cron expression is required for cron schedule type'
          };
          return res.status(400).json(response);
        }

        // Basic cron validation (5 or 6 fields)
        const cronParts = scheduleData.cron_expression.trim().split(/\s+/);
        if (cronParts.length < 5 || cronParts.length > 6) {
          const response: ApiResponse<null> = {
            success: false,
            data: null,
            message: 'Invalid cron expression format. Expected 5 or 6 fields.'
          };
          return res.status(400).json(response);
        }
      }

      // Validate that at least one test type is selected
      if (scheduleData.test_case_ids.length === 0 && 
          scheduleData.test_suite_ids.length === 0 && 
          scheduleData.visual_test_flow_ids.length === 0) {
        const response: ApiResponse<null> = {
          success: false,
          data: null,
          message: 'At least one test case, test suite, or visual test flow must be selected'
        };
        return res.status(400).json(response);
      }

      const schedule = await schedulerService.createSchedule({
        ...scheduleData,
        created_by: user_id
      });

      const response: ApiResponse<TestSchedule> = {
        success: true,
        data: schedule,
        message: 'Test schedule created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route GET /api/scheduler/schedules
 * @desc Get all schedules for the authenticated user
 * @access Private
 */
router.get('/schedules', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const user_id = req.user!.id;
      const project_id = req.query.project_id as string;
      const status = req.query.status as string;

      let schedules = await schedulerService.getUserSchedules(user_id, project_id);

      // Filter by status if provided
      if (status && ['active', 'paused', 'completed', 'cancelled'].includes(status)) {
        schedules = schedules.filter(schedule => schedule.status === status);
      }

      const response: ApiResponse<TestSchedule[]> = {
        success: true,
        data: schedules,
        message: 'Schedules retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route GET /api/scheduler/schedules/:id
 * @desc Get a specific schedule by ID
 * @access Private
 */
router.get('/schedules/:id', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const schedule_id = req.params.id;
      const user_id = req.user!.id;

      const schedule = await schedulerService.getSchedule(schedule_id, user_id);

      if (!schedule) {
        const response: ApiResponse<null> = {
          success: false,
          data: null,
          message: 'Schedule not found or access denied'
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse<TestSchedule> = {
        success: true,
        data: schedule,
        message: 'Schedule retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route PUT /api/scheduler/:id/update
 * @desc Update a schedule configuration
 * @access Private
 */
router.put('/:id/update', 
  authenticateUser,
  validateRequest(updateScheduleSchema),
  async (req: Request, res: Response) => {
    try {
      const schedule_id = req.params.id;
      const user_id = req.user!.id;
      const updates = req.body;

      // Validate cron expression if being updated
      if (updates.schedule_type === 'cron' || updates.cron_expression) {
        if (updates.schedule_type === 'cron' && !updates.cron_expression) {
          const response: ApiResponse<null> = {
            success: false,
            data: null,
            message: 'Cron expression is required for cron schedule type'
          };
          return res.status(400).json(response);
        }

        if (updates.cron_expression) {
          const cronParts = updates.cron_expression.trim().split(/\s+/);
          if (cronParts.length < 5 || cronParts.length > 6) {
            const response: ApiResponse<null> = {
              success: false,
              data: null,
              message: 'Invalid cron expression format. Expected 5 or 6 fields.'
            };
            return res.status(400).json(response);
          }
        }
      }

      const updatedSchedule = await schedulerService.updateSchedule(schedule_id, updates, user_id);

      const response: ApiResponse<TestSchedule> = {
        success: true,
        data: updatedSchedule,
        message: 'Schedule updated successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route DELETE /api/scheduler/:id/cancel
 * @desc Cancel a scheduled test
 * @access Private
 */
router.delete('/:id/cancel', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const schedule_id = req.params.id;
      const user_id = req.user!.id;

      await schedulerService.cancelSchedule(schedule_id, user_id);

      const response: ApiResponse<null> = {
        success: true,
        data: null,
        message: 'Schedule cancelled successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route GET /api/scheduler/:id/history
 * @desc Get execution history for a schedule
 * @access Private
 */
router.get('/:id/history', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const schedule_id = req.params.id;
      const user_id = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string;

      if (limit > 200) {
        const response: ApiResponse<null> = {
          success: false,
          data: null,
          message: 'Limit cannot exceed 200'
        };
        return res.status(400).json(response);
      }

      let history = await schedulerService.getExecutionHistory(schedule_id, user_id, limit);

      // Filter by status if provided
      if (status && ['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'].includes(status)) {
        history = history.filter(execution => execution.status === status);
      }

      const response: ApiResponse<typeof history> = {
        success: true,
        data: history,
        message: 'Execution history retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route POST /api/scheduler/:id/trigger
 * @desc Manually trigger a scheduled test execution
 * @access Private
 */
router.post('/:id/trigger', 
  authenticateUser,
  validateRequest(triggerScheduleSchema),
  async (req: Request, res: Response) => {
    try {
      const schedule_id = req.params.id;
      const user_id = req.user!.id;
      const { execution_type } = req.body;

      const execution_id = await schedulerService.triggerSchedule(schedule_id, user_id, execution_type);

      const response: ApiResponse<{ execution_id: string }> = {
        success: true,
        data: { execution_id },
        message: 'Test execution triggered successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route POST /api/scheduler/:id/pause
 * @desc Pause a schedule
 * @access Private
 */
router.post('/:id/pause', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const schedule_id = req.params.id;
      const user_id = req.user!.id;

      const updatedSchedule = await schedulerService.updateSchedule(
        schedule_id, 
        { status: 'paused' }, 
        user_id
      );

      const response: ApiResponse<TestSchedule> = {
        success: true,
        data: updatedSchedule,
        message: 'Schedule paused successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route POST /api/scheduler/:id/resume
 * @desc Resume a paused schedule
 * @access Private
 */
router.post('/:id/resume', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const schedule_id = req.params.id;
      const user_id = req.user!.id;

      const updatedSchedule = await schedulerService.updateSchedule(
        schedule_id, 
        { status: 'active' }, 
        user_id
      );

      const response: ApiResponse<TestSchedule> = {
        success: true,
        data: updatedSchedule,
        message: 'Schedule resumed successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route GET /api/scheduler/stats
 * @desc Get scheduler statistics
 * @access Private
 */
router.get('/stats', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const stats = await schedulerService.getSchedulerStats();

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats,
        message: 'Scheduler statistics retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route GET /api/scheduler/next-runs
 * @desc Get next scheduled runs for the user
 * @access Private
 */
router.get('/next-runs', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const user_id = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 10;

      if (limit > 50) {
        const response: ApiResponse<null> = {
          success: false,
          data: null,
          message: 'Limit cannot exceed 50'
        };
        return res.status(400).json(response);
      }

      const schedules = await schedulerService.getUserSchedules(user_id);
      
      const nextRuns = schedules
        .filter(s => s.status === 'active' && s.next_execution_at)
        .sort((a, b) => new Date(a.next_execution_at!).getTime() - new Date(b.next_execution_at!).getTime())
        .slice(0, limit)
        .map(s => ({
          schedule_id: s.id,
          schedule_name: s.name,
          schedule_type: s.schedule_type,
          next_run: s.next_execution_at,
          test_count: s.test_case_ids.length + s.test_suite_ids.length + s.visual_test_flow_ids.length
        }));

      const response: ApiResponse<typeof nextRuns> = {
        success: true,
        data: nextRuns,
        message: 'Next scheduled runs retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route POST /api/scheduler/validate-cron
 * @desc Validate a cron expression
 * @access Private
 */
router.post('/validate-cron', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { cron_expression, timezone } = req.body;

      if (!cron_expression) {
        const response: ApiResponse<null> = {
          success: false,
          data: null,
          message: 'Cron expression is required'
        };
        return res.status(400).json(response);
      }

      // Basic validation
      const cronParts = cron_expression.trim().split(/\s+/);
      if (cronParts.length < 5 || cronParts.length > 6) {
        const response: ApiResponse<null> = {
          success: false,
          data: null,
          message: 'Invalid cron expression format. Expected 5 or 6 fields.'
        };
        return res.status(400).json(response);
      }

      // Try to create a test cron job to validate
      const cron = require('node-cron');
      
      let isValid = false;
      let errorMessage = '';

      try {
        const task = cron.schedule(cron_expression, () => {}, { 
          scheduled: false, 
          timezone: timezone || 'UTC' 
        });
        task.destroy();
        isValid = true;
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Invalid cron expression';
      }

      // Calculate next few execution times if valid
      let nextExecutions: string[] = [];
      if (isValid) {
        try {
          // This is a simplified approach - in production, use a proper cron parser
          const now = new Date();
          for (let i = 1; i <= 5; i++) {
            const nextTime = new Date(now);
            nextTime.setMinutes(nextTime.getMinutes() + i);
            nextExecutions.push(nextTime.toISOString());
          }
        } catch (error) {
          // Continue with empty next executions if calculation fails
        }
      }

      const response: ApiResponse<{
        is_valid: boolean;
        error_message?: string;
        next_executions: string[];
      }> = {
        success: true,
        data: {
          is_valid: isValid,
          error_message: errorMessage || undefined,
          next_executions: nextExecutions
        },
        message: isValid ? 'Cron expression is valid' : 'Cron expression is invalid'
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route GET /api/scheduler/execution/:id
 * @desc Get details of a specific execution
 * @access Private
 */
router.get('/execution/:id', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const execution_id = req.params.id;
      const user_id = req.user!.id;

      // This would require a method in the scheduler service to get execution details
      // For now, we'll return a basic response
      const response: ApiResponse<{ execution_id: string; message: string }> = {
        success: false,
        data: { execution_id, message: 'Execution details endpoint not yet implemented' },
        message: 'Feature coming soon'
      };

      res.status(501).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

/**
 * @route POST /api/scheduler/bulk-operations
 * @desc Perform bulk operations on schedules
 * @access Private
 */
router.post('/bulk-operations', 
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { operation, schedule_ids } = req.body;
      const user_id = req.user!.id;

      if (!operation || !Array.isArray(schedule_ids) || schedule_ids.length === 0) {
        const response: ApiResponse<null> = {
          success: false,
          data: null,
          message: 'Operation and schedule_ids are required'
        };
        return res.status(400).json(response);
      }

      if (schedule_ids.length > 50) {
        const response: ApiResponse<null> = {
          success: false,
          data: null,
          message: 'Cannot perform bulk operations on more than 50 schedules at once'
        };
        return res.status(400).json(response);
      }

      const results = {
        successful: [] as string[],
        failed: [] as { id: string; error: string }[]
      };

      for (const schedule_id of schedule_ids) {
        try {
          switch (operation) {
            case 'pause':
              await schedulerService.updateSchedule(schedule_id, { status: 'paused' }, user_id);
              break;
            case 'resume':
              await schedulerService.updateSchedule(schedule_id, { status: 'active' }, user_id);
              break;
            case 'cancel':
              await schedulerService.cancelSchedule(schedule_id, user_id);
              break;
            default:
              throw new Error(`Unknown operation: ${operation}`);
          }
          results.successful.push(schedule_id);
        } catch (error) {
          results.failed.push({
            id: schedule_id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const response: ApiResponse<typeof results> = {
        success: true,
        data: results,
        message: `Bulk ${operation} operation completed. ${results.successful.length} successful, ${results.failed.length} failed.`
      };

      res.status(200).json(response);
    } catch (error) {
      handleApiError(error, res);
    }
  }
);

export default router;
