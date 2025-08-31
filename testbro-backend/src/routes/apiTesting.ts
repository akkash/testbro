import { Router } from 'express';
import { APITestingService } from '../services/apiTestingService';
import { WebSocketService } from '../services/websocketService';
import { logger, LogCategory } from '../services/loggingService';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';
import { supabaseAdmin } from '../config/database';
import { APIResponse } from '../types/api';
import { 
  APITestStep, 
  APITestSuite, 
  APIEnvironment, 
  APITestExecution,
  APITestResult
} from '../types/apiTesting';

const router = Router();

let apiTestingService: APITestingService;
let wsService: WebSocketService;

export const initializeAPITestingRoutes = (webSocketService: WebSocketService) => {
  apiTestingService = new APITestingService();
  wsService = webSocketService;
};

/**
 * Execute a single API test step
 */
router.post(
  '/execute-step',
  authenticateToken,
  [
    body('step').isObject().withMessage('Step configuration is required'),
    body('environment_id').optional().isUUID(),
    body('data_context').optional().isObject(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { step, environment_id, data_context = {} } = req.body;
      const userId = req.user?.id;

      // Get environment variables if specified
      let environmentVars = {};
      if (environment_id) {
        const { data: environment } = await supabaseAdmin
          .from('api_environments')
          .select('*')
          .eq('id', environment_id)
          .single();
        
        if (environment) {
          environmentVars = environment.variables || {};
        }
      }

      // Execute the API step
      const result = await apiTestingService.executeAPIStep(
        step,
        environmentVars,
        data_context
      );

      // Emit real-time update
      wsService.broadcast(`user:${userId}`, {
        type: 'api_test_completed',
        execution_id: `single-${Date.now()}`,
        data: {
          step_id: step.id,
          result
        },
        timestamp: new Date().toISOString()
      });

      const response: APIResponse<APITestResult> = {
        data: result,
        meta: {
          execution_time_ms: result.executionTime
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('Failed to execute API step', LogCategory.API, {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to execute API step'
      });
    }
  }
);

/**
 * Create new API environment
 */
router.post(
  '/environments',
  authenticateToken,
  [
    body('name').notEmpty().withMessage('Environment name is required'),
    body('project_id').isUUID().withMessage('Valid project ID is required'),
    body('variables').optional().isObject(),
    body('base_url').optional().isURL(),
    body('headers').optional().isObject(),
    body('authentication').optional().isObject(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { name, project_id, description, variables, base_url, headers, authentication } = req.body;
      const userId = req.user?.id;

      const { data: environment, error } = await supabaseAdmin
        .from('api_environments')
        .insert({
          name,
          project_id,
          description,
          variables: variables || {},
          base_url,
          headers: headers || {},
          authentication: authentication || {},
          created_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      const response: APIResponse<APIEnvironment> = {
        data: environment
      };

      res.status(201).json(response);

      logger.info('Created API environment', LogCategory.API, {
        environmentId: environment.id,
        projectId: project_id,
        userId
      });

    } catch (error) {
      logger.error('Failed to create API environment', LogCategory.API, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to create API environment'
      });
    }
  }
);

/**
 * Get API environments for a project
 */
router.get(
  '/environments',
  authenticateToken,
  [
    query('project_id').isUUID().withMessage('Valid project ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { project_id } = req.query;

      const { data: environments, error } = await supabaseAdmin
        .from('api_environments')
        .select('*')
        .eq('project_id', project_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const response: APIResponse<APIEnvironment[]> = {
        data: environments || []
      };

      res.json(response);

    } catch (error) {
      logger.error('Failed to get API environments', LogCategory.API, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to get API environments'
      });
    }
  }
);

/**
 * Create new API test suite
 */
router.post(
  '/suites',
  authenticateToken,
  [
    body('name').notEmpty().withMessage('Suite name is required'),
    body('project_id').isUUID().withMessage('Valid project ID is required'),
    body('steps').isArray().withMessage('Steps array is required'),
    body('environment_id').optional().isUUID(),
    body('tags').optional().isArray(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { name, project_id, description, steps, environment_id, tags } = req.body;
      const userId = req.user?.id;

      // Create the suite
      const { data: suite, error: suiteError } = await supabaseAdmin
        .from('api_test_suites')
        .insert({
          name,
          project_id,
          description,
          environment_id,
          tags: tags || [],
          created_by: userId
        })
        .select()
        .single();

      if (suiteError) throw suiteError;

      // Create the steps
      if (steps && steps.length > 0) {
        const stepsToInsert = steps.map((step: any, index: number) => ({
          suite_id: suite.id,
          name: step.name,
          description: step.description,
          step_order: index + 1,
          http_method: step.request.method,
          url: step.request.url,
          headers: step.request.headers || {},
          body: step.request.body,
          authentication: step.request.authentication || {},
          timeout_ms: step.request.timeout || 30000,
          validations: step.validations || [],
          data_extractions: step.dataExtractions || [],
          continue_on_failure: step.continueOnFailure || false,
          retry_count: step.retryCount || 0,
          retry_delay_ms: step.retryDelay || 1000,
          tags: step.tags || []
        }));

        const { error: stepsError } = await supabaseAdmin
          .from('api_test_steps')
          .insert(stepsToInsert);

        if (stepsError) throw stepsError;
      }

      const response: APIResponse<APITestSuite> = {
        data: suite
      };

      res.status(201).json(response);

      logger.info('Created API test suite', LogCategory.API, {
        suiteId: suite.id,
        projectId: project_id,
        stepsCount: steps.length,
        userId
      });

    } catch (error) {
      logger.error('Failed to create API test suite', LogCategory.API, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to create API test suite'
      });
    }
  }
);

/**
 * Execute API test suite
 */
router.post(
  '/suites/:suiteId/execute',
  authenticateToken,
  [
    param('suiteId').isUUID().withMessage('Valid suite ID is required'),
    body('environment_id').optional().isUUID(),
    body('data_context').optional().isObject(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { suiteId } = req.params;
      const { environment_id, data_context = {} } = req.body;
      const userId = req.user?.id;

      // Get the test suite and steps
      const { data: suite, error: suiteError } = await supabaseAdmin
        .from('api_test_suites')
        .select('*')
        .eq('id', suiteId)
        .single();

      if (suiteError || !suite) {
        return res.status(404).json({ error: 'Test suite not found' });
      }

      const { data: steps, error: stepsError } = await supabaseAdmin
        .from('api_test_steps')
        .select('*')
        .eq('suite_id', suiteId)
        .order('step_order', { ascending: true });

      if (stepsError) throw stepsError;

      // Create execution record
      const { data: execution, error: executionError } = await supabaseAdmin
        .from('api_test_executions')
        .insert({
          suite_id: suiteId,
          environment_id,
          total_steps: steps.length,
          triggered_by: userId,
          trigger_type: 'manual',
          execution_context: { data_context }
        })
        .select()
        .single();

      if (executionError) throw executionError;

      // Start execution asynchronously
      executeTestSuiteAsync(execution.id, steps, environment_id, data_context, userId);

      const response: APIResponse<{ execution_id: string }> = {
        data: { execution_id: execution.id }
      };

      res.json(response);

      logger.info('Started API test suite execution', LogCategory.API, {
        suiteId,
        executionId: execution.id,
        stepsCount: steps.length,
        userId
      });

    } catch (error) {
      logger.error('Failed to execute API test suite', LogCategory.API, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to execute API test suite'
      });
    }
  }
);

/**
 * Get API test execution results
 */
router.get(
  '/executions/:executionId',
  authenticateToken,
  [
    param('executionId').isUUID().withMessage('Valid execution ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { executionId } = req.params;

      const { data: execution, error: executionError } = await supabaseAdmin
        .from('api_test_executions')
        .select('*')
        .eq('id', executionId)
        .single();

      if (executionError || !execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }

      const { data: results, error: resultsError } = await supabaseAdmin
        .from('api_test_results')
        .select('*')
        .eq('execution_id', executionId)
        .order('executed_at', { ascending: true });

      if (resultsError) throw resultsError;

      const response: APIResponse<APITestExecution & { results: APITestResult[] }> = {
        data: {
          ...execution,
          results: results || []
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('Failed to get execution results', LogCategory.API, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to get execution results'
      });
    }
  }
);

/**
 * Execute test suite asynchronously and emit real-time updates
 */
async function executeTestSuiteAsync(
  executionId: string,
  steps: any[],
  environmentId?: string,
  dataContext: Record<string, any> = {},
  userId?: string
) {
  try {
    // Update execution status to running
    await supabaseAdmin
      .from('api_test_executions')
      .update({ status: 'running' })
      .eq('id', executionId);

    // Get environment variables
    let environmentVars = {};
    if (environmentId) {
      const { data: environment } = await supabaseAdmin
        .from('api_environments')
        .select('*')
        .eq('id', environmentId)
        .single();
      
      if (environment) {
        environmentVars = environment.variables || {};
      }
    }

    const results: any[] = [];
    const currentContext = { ...dataContext };
    let passedSteps = 0;
    let failedSteps = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Emit progress update
      wsService.broadcast(`user:${userId}`, {
        type: 'api_test_progress',
        execution_id: executionId,
        data: {
          step_id: step.id,
          step_name: step.name,
          progress: Math.round(((i) / steps.length) * 100)
        },
        timestamp: new Date().toISOString()
      });

      try {
        // Convert DB step to APITestStep format
        const apiStep: APITestStep = {
          id: step.id,
          name: step.name,
          description: step.description,
          order: step.step_order,
          request: {
            method: step.http_method,
            url: step.url,
            headers: step.headers,
            body: step.body,
            authentication: step.authentication,
            timeout: step.timeout_ms
          },
          validations: step.validations,
          dataExtractions: step.data_extractions,
          continueOnFailure: step.continue_on_failure,
          retryCount: step.retry_count,
          retryDelay: step.retry_delay_ms,
          tags: step.tags,
          created_at: step.created_at,
          updated_at: step.updated_at
        };

        const result = await apiTestingService.executeAPIStep(
          apiStep,
          environmentVars,
          currentContext
        );

        // Store result in database
        await supabaseAdmin
          .from('api_test_results')
          .insert({
            execution_id: executionId,
            step_id: step.id,
            success: result.success,
            execution_time_ms: result.executionTime,
            error_message: result.error,
            request_data: result.request,
            response_data: result.response,
            validation_results: result.validations,
            extracted_data: result.extractedData
          });

        results.push(result);

        // Update context with extracted data
        Object.assign(currentContext, result.extractedData);

        if (result.success) {
          passedSteps++;
        } else {
          failedSteps++;
          
          // Stop execution if step failed and continue_on_failure is false
          if (!step.continue_on_failure) {
            break;
          }
        }

        // Emit step completion
        wsService.broadcast(`user:${userId}`, {
          type: 'api_validation_result',
          execution_id: executionId,
          data: {
            step_id: step.id,
            result
          },
          timestamp: new Date().toISOString()
        });

      } catch (stepError) {
        failedSteps++;
        
        const errorResult = {
          stepId: step.id,
          success: false,
          executionTime: 0,
          request: {
            method: step.http_method,
            url: step.url,
            headers: step.headers,
            body: step.body
          },
          error: stepError instanceof Error ? stepError.message : 'Unknown error',
          validations: [],
          extractedData: {},
          timestamp: new Date().toISOString()
        };

        // Store error result
        await supabaseAdmin
          .from('api_test_results')
          .insert({
            execution_id: executionId,
            step_id: step.id,
            success: false,
            execution_time_ms: 0,
            error_message: errorResult.error,
            request_data: errorResult.request,
            validation_results: [],
            extracted_data: {}
          });

        results.push(errorResult);

        if (!step.continue_on_failure) {
          break;
        }
      }
    }

    // Update final execution status
    const finalStatus = failedSteps === 0 ? 'completed' : 'failed';
    const totalExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0);

    await supabaseAdmin
      .from('api_test_executions')
      .update({
        status: finalStatus,
        passed_steps: passedSteps,
        failed_steps: failedSteps,
        total_execution_time_ms: totalExecutionTime,
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId);

    // Emit completion event
    wsService.broadcast(`user:${userId}`, {
      type: 'api_test_completed',
      execution_id: executionId,
      data: {
        status: finalStatus,
        passed_steps: passedSteps,
        failed_steps: failedSteps,
        total_execution_time: totalExecutionTime,
        results
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Update execution status to failed
    await supabaseAdmin
      .from('api_test_executions')
      .update({ 
        status: 'failed',
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId);

    // Emit failure event
    wsService.broadcast(`user:${userId}`, {
      type: 'api_test_failed',
      execution_id: executionId,
      data: {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: new Date().toISOString()
    });

    logger.error('API test suite execution failed', LogCategory.API, {
      executionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default router;