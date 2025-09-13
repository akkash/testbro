import Queue, { Job, JobOptions } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import * as cron from 'node-cron';
import { supabase } from '../config/supabase';
import { visualTestService } from './visualTestService';
import { WebSocketService } from './webSocketService';
import { logger, LogCategory } from './loggingService';
import Redis from 'ioredis';

// Types and interfaces
export interface TestSchedule {
  id: string;
  project_id: string;
  created_by: string;
  name: string;
  description?: string;
  test_case_ids: string[];
  test_suite_ids: string[];
  visual_test_flow_ids: string[];
  schedule_type: 'once' | 'recurring' | 'cron';
  cron_expression?: string;
  timezone: string;
  max_concurrent_tests: number;
  retry_failed_tests: boolean;
  retry_count: number;
  notification_settings: {
    email: boolean;
    webhook: boolean;
    webhook_url?: string;
    email_recipients?: string[];
  };
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  next_execution_at?: string;
  last_execution_at?: string;
  execution_count: number;
  success_count: number;
  failure_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduledTestExecution {
  id: string;
  schedule_id: string;
  execution_type: 'manual' | 'scheduled' | 'triggered';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  tests_total: number;
  tests_completed: number;
  tests_passed: number;
  tests_failed: number;
  execution_results: any;
  error_message?: string;
  execution_logs: any[];
  duration_seconds?: number;
  queue_wait_time_seconds?: number;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface ScheduleJobData {
  schedule_id: string;
  execution_id: string;
  user_id: string;
  execution_type: 'manual' | 'scheduled' | 'triggered';
  tests_to_run: {
    test_case_ids: string[];
    test_suite_ids: string[];
    visual_test_flow_ids: string[];
  };
  retry_count: number;
  notification_settings: any;
}

export interface ScheduleJobResult {
  execution_id: string;
  status: 'completed' | 'failed' | 'cancelled';
  results: {
    tests_total: number;
    tests_completed: number;
    tests_passed: number;
    tests_failed: number;
    execution_logs: any[];
    error_message?: string;
  };
  duration_seconds: number;
}

export interface ScheduleStats {
  total_schedules: number;
  active_schedules: number;
  paused_schedules: number;
  pending_jobs: number;
  active_jobs: number;
  completed_jobs_today: number;
  failed_jobs_today: number;
  average_execution_time: number;
  next_scheduled_runs: Array<{
    schedule_id: string;
    schedule_name: string;
    next_run: string;
  }>;
}

class SchedulerService {
  private testExecutionQueue: Queue<ScheduleJobData>;
  private redisClient: Redis;
  private webSocketService: WebSocketService;
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private activeExecutions: Map<string, ScheduledTestExecution> = new Map();

  constructor() {
    // Initialize Redis client
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

    // Initialize Bull queue
    this.testExecutionQueue = new Queue<ScheduleJobData>('test-execution', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
      },
    });

    this.webSocketService = WebSocketService.getInstance();
    
    this.initializeJobProcessors();
    this.initializeEventHandlers();
    this.startScheduleProcessor();
  }

  /**
   * Create a new test schedule
   */
  async createSchedule(
    scheduleData: Omit<TestSchedule, 'id' | 'execution_count' | 'success_count' | 'failure_count'>
  ): Promise<TestSchedule> {
    const schedule: TestSchedule = {
      id: uuidv4(),
      execution_count: 0,
      success_count: 0,
      failure_count: 0,
      ...scheduleData,
    };

    // Calculate next execution time
    if (schedule.schedule_type === 'cron' && schedule.cron_expression) {
      schedule.next_execution_at = this.calculateNextExecution(schedule.cron_expression, schedule.timezone);
    } else if (schedule.schedule_type === 'once') {
      // For 'once' type, next execution should be set separately
      schedule.next_execution_at = schedule.next_execution_at || new Date().toISOString();
    }

    // Save to database
    const { data, error } = await supabase
      .from('test_schedules')
      .insert([schedule])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create schedule: ${error.message}`);
    }

    // Register cron job if needed
    if (schedule.status === 'active') {
      await this.registerCronJob(data);
    }

    logger.info('Test schedule created', LogCategory.SCHEDULER, {
      schedule_id: data.id,
      schedule_type: data.schedule_type,
      user_id: data.created_by
    });

    return data;
  }

  /**
   * Update an existing schedule
   */
  async updateSchedule(
    schedule_id: string,
    updates: Partial<TestSchedule>,
    user_id: string
  ): Promise<TestSchedule> {
    // Remove the old cron job if it exists
    this.unregisterCronJob(schedule_id);

    // Recalculate next execution if cron expression changed
    if (updates.cron_expression || updates.schedule_type) {
      if (updates.schedule_type === 'cron' && updates.cron_expression) {
        updates.next_execution_at = this.calculateNextExecution(
          updates.cron_expression, 
          updates.timezone || 'UTC'
        );
      }
    }

    const { data, error } = await supabase
      .from('test_schedules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', schedule_id)
      .eq('created_by', user_id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update schedule: ${error.message}`);
    }

    // Register new cron job if active
    if (data.status === 'active') {
      await this.registerCronJob(data);
    }

    logger.info('Test schedule updated', LogCategory.SCHEDULER, {
      schedule_id: data.id,
      user_id
    });

    return data;
  }

  /**
   * Cancel a schedule
   */
  async cancelSchedule(schedule_id: string, user_id: string): Promise<void> {
    // Remove cron job
    this.unregisterCronJob(schedule_id);

    // Update database
    const { error } = await supabase
      .from('test_schedules')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', schedule_id)
      .eq('created_by', user_id);

    if (error) {
      throw new Error(`Failed to cancel schedule: ${error.message}`);
    }

    // Cancel any pending jobs for this schedule
    await this.cancelPendingJobs(schedule_id);

    logger.info('Test schedule cancelled', LogCategory.SCHEDULER, {
      schedule_id,
      user_id
    });
  }

  /**
   * Get user's schedules
   */
  async getUserSchedules(user_id: string, project_id?: string): Promise<TestSchedule[]> {
    let query = supabase
      .from('test_schedules')
      .select('*')
      .eq('created_by', user_id);

    if (project_id) {
      query = query.eq('project_id', project_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch schedules: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get schedule by ID
   */
  async getSchedule(schedule_id: string, user_id: string): Promise<TestSchedule | null> {
    const { data, error } = await supabase
      .from('test_schedules')
      .select('*')
      .eq('id', schedule_id)
      .eq('created_by', user_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch schedule: ${error.message}`);
    }

    return data;
  }

  /**
   * Get execution history for a schedule
   */
  async getExecutionHistory(
    schedule_id: string, 
    user_id: string,
    limit: number = 50
  ): Promise<ScheduledTestExecution[]> {
    // First verify the user owns this schedule
    const schedule = await this.getSchedule(schedule_id, user_id);
    if (!schedule) {
      throw new Error('Schedule not found or access denied');
    }

    const { data, error } = await supabase
      .from('scheduled_test_executions')
      .select('*')
      .eq('schedule_id', schedule_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch execution history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Manually trigger a scheduled test
   */
  async triggerSchedule(
    schedule_id: string, 
    user_id: string,
    execution_type: 'manual' | 'triggered' = 'manual'
  ): Promise<string> {
    const schedule = await this.getSchedule(schedule_id, user_id);
    if (!schedule) {
      throw new Error('Schedule not found or access denied');
    }

    if (schedule.status !== 'active') {
      throw new Error('Cannot trigger inactive schedule');
    }

    return await this.executeSchedule(schedule, execution_type);
  }

  /**
   * Execute a schedule (internal method)
   */
  private async executeSchedule(
    schedule: TestSchedule,
    execution_type: 'manual' | 'scheduled' | 'triggered'
  ): Promise<string> {
    const execution_id = uuidv4();
    
    // Create execution record
    const execution: ScheduledTestExecution = {
      id: execution_id,
      schedule_id: schedule.id,
      execution_type,
      status: 'pending',
      tests_total: schedule.test_case_ids.length + 
                   schedule.test_suite_ids.length + 
                   schedule.visual_test_flow_ids.length,
      tests_completed: 0,
      tests_passed: 0,
      tests_failed: 0,
      execution_results: {},
      execution_logs: [],
      created_at: new Date().toISOString()
    };

    // Save execution to database
    const { error } = await supabase
      .from('scheduled_test_executions')
      .insert([execution]);

    if (error) {
      throw new Error(`Failed to create execution record: ${error.message}`);
    }

    // Store in memory for tracking
    this.activeExecutions.set(execution_id, execution);

    // Create job data
    const jobData: ScheduleJobData = {
      schedule_id: schedule.id,
      execution_id,
      user_id: schedule.created_by,
      execution_type,
      tests_to_run: {
        test_case_ids: schedule.test_case_ids,
        test_suite_ids: schedule.test_suite_ids,
        visual_test_flow_ids: schedule.visual_test_flow_ids
      },
      retry_count: schedule.retry_count,
      notification_settings: schedule.notification_settings
    };

    // Add job to queue with priority based on execution type
    const priority = execution_type === 'manual' ? 10 : 5;
    
    await this.testExecutionQueue.add('execute-scheduled-tests', jobData, {
      priority,
      attempts: schedule.retry_failed_tests ? schedule.retry_count + 1 : 1,
    });

    logger.info('Scheduled test execution queued', LogCategory.SCHEDULER, {
      schedule_id: schedule.id,
      execution_id,
      execution_type,
      user_id: schedule.created_by
    });

    return execution_id;
  }

  /**
   * Initialize job processors
   */
  private initializeJobProcessors(): void {
    this.testExecutionQueue.process('execute-scheduled-tests', async (job: Job<ScheduleJobData>) => {
      return await this.processScheduledTestJob(job);
    });

    logger.info('Job processors initialized', LogCategory.SCHEDULER);
  }

  /**
   * Process scheduled test job
   */
  private async processScheduledTestJob(job: Job<ScheduleJobData>): Promise<ScheduleJobResult> {
    const { schedule_id, execution_id, user_id, tests_to_run } = job.data;
    const startTime = Date.now();
    
    // Update execution status to running
    const execution = this.activeExecutions.get(execution_id);
    if (!execution) {
      throw new Error(`Execution ${execution_id} not found`);
    }

    execution.status = 'running';
    execution.started_at = new Date().toISOString();
    
    await this.updateExecutionInDb(execution);
    
    // Broadcast status update
    this.broadcastExecutionUpdate(user_id, execution);

    try {
      // Process visual test flows
      const visualTestResults = await this.executeVisualTests(
        tests_to_run.visual_test_flow_ids,
        user_id,
        execution_id
      );

      // TODO: Process test cases and test suites when those services are available
      // const testCaseResults = await this.executeTestCases(tests_to_run.test_case_ids, user_id, execution_id);
      // const testSuiteResults = await this.executeTestSuites(tests_to_run.test_suite_ids, user_id, execution_id);

      // Combine results
      const allResults = [
        ...visualTestResults,
        // ...testCaseResults,
        // ...testSuiteResults
      ];

      const passed = allResults.filter(r => r.status === 'passed').length;
      const failed = allResults.filter(r => r.status === 'failed').length;
      
      // Update execution with final results
      execution.status = failed > 0 ? 'failed' : 'completed';
      execution.tests_completed = allResults.length;
      execution.tests_passed = passed;
      execution.tests_failed = failed;
      execution.execution_results = {
        visual_tests: visualTestResults,
        // test_cases: testCaseResults,
        // test_suites: testSuiteResults
      };
      execution.completed_at = new Date().toISOString();
      execution.duration_seconds = Math.floor((Date.now() - startTime) / 1000);

      await this.updateExecutionInDb(execution);
      await this.updateScheduleStats(schedule_id, execution.status === 'completed');

      // Broadcast final status
      this.broadcastExecutionUpdate(user_id, execution);

      // Clean up
      this.activeExecutions.delete(execution_id);

      const result: ScheduleJobResult = {
        execution_id,
        status: execution.status as 'completed' | 'failed',
        results: {
          tests_total: execution.tests_total,
          tests_completed: execution.tests_completed,
          tests_passed: execution.tests_passed,
          tests_failed: execution.tests_failed,
          execution_logs: execution.execution_logs,
          error_message: execution.error_message
        },
        duration_seconds: execution.duration_seconds || 0
      };

      logger.info('Scheduled test job completed', LogCategory.SCHEDULER, {
        schedule_id,
        execution_id,
        status: result.status,
        duration: result.duration_seconds
      });

      return result;

    } catch (error) {
      // Handle execution failure
      execution.status = 'failed';
      execution.error_message = error instanceof Error ? error.message : 'Unknown error';
      execution.completed_at = new Date().toISOString();
      execution.duration_seconds = Math.floor((Date.now() - startTime) / 1000);

      await this.updateExecutionInDb(execution);
      await this.updateScheduleStats(schedule_id, false);

      this.broadcastExecutionUpdate(user_id, execution);
      this.activeExecutions.delete(execution_id);

      logger.error('Scheduled test job failed', LogCategory.SCHEDULER, {
        schedule_id,
        execution_id,
        error: error instanceof Error ? error.message : error
      });

      throw error;
    }
  }

  /**
   * Execute visual tests
   */
  private async executeVisualTests(
    visual_test_flow_ids: string[],
    user_id: string,
    execution_id: string
  ): Promise<Array<{ id: string; status: 'passed' | 'failed'; error?: string }>> {
    const results = [];

    for (const flow_id of visual_test_flow_ids) {
      try {
        const visualExecutionId = await visualTestService.executeVisualTest(flow_id, user_id);
        
        // Wait for execution to complete (simplified - in real implementation, use proper async handling)
        let attempts = 0;
        const maxAttempts = 120; // 2 minutes timeout
        
        while (attempts < maxAttempts) {
          const status = visualTestService.getExecutionStatus(visualExecutionId);
          if (status && (status.status === 'completed' || status.status === 'failed')) {
            results.push({
              id: flow_id,
              status: status.status === 'completed' ? 'passed' : 'failed',
              error: status.error
            });
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          attempts++;
        }

        if (attempts >= maxAttempts) {
          results.push({
            id: flow_id,
            status: 'failed',
            error: 'Execution timeout'
          });
        }

      } catch (error) {
        results.push({
          id: flow_id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Register cron job for a schedule
   */
  private async registerCronJob(schedule: TestSchedule): Promise<void> {
    if (schedule.schedule_type === 'cron' && schedule.cron_expression) {
      try {
        const task = cron.schedule(schedule.cron_expression, async () => {
          logger.info('Executing scheduled test via cron', LogCategory.SCHEDULER, {
            schedule_id: schedule.id
          });
          
          try {
            await this.executeSchedule(schedule, 'scheduled');
            
            // Update next execution time
            const nextExecution = this.calculateNextExecution(
              schedule.cron_expression!,
              schedule.timezone
            );
            
            await supabase
              .from('test_schedules')
              .update({ 
                next_execution_at: nextExecution,
                last_execution_at: new Date().toISOString()
              })
              .eq('id', schedule.id);

          } catch (error) {
            logger.error('Cron job execution failed', LogCategory.SCHEDULER, {
              schedule_id: schedule.id,
              error: error instanceof Error ? error.message : error
            });
          }
        }, {
          timezone: schedule.timezone
        });

        this.cronJobs.set(schedule.id, task);
        
        logger.info('Cron job registered', LogCategory.SCHEDULER, {
          schedule_id: schedule.id,
          cron_expression: schedule.cron_expression,
          timezone: schedule.timezone
        });

      } catch (error) {
        logger.error('Failed to register cron job', LogCategory.SCHEDULER, {
          schedule_id: schedule.id,
          error: error instanceof Error ? error.message : error
        });
      }
    }
  }

  /**
   * Unregister cron job
   */
  private unregisterCronJob(schedule_id: string): void {
    const task = this.cronJobs.get(schedule_id);
    if (task) {
      task.stop();
      task.destroy();
      this.cronJobs.delete(schedule_id);
      
      logger.info('Cron job unregistered', LogCategory.SCHEDULER, { schedule_id });
    }
  }

  /**
   * Calculate next execution time from cron expression
   */
  private calculateNextExecution(cronExpression: string, timezone: string): string {
    try {
      const task = cron.schedule(cronExpression, () => {}, { scheduled: false, timezone });
      // This is a simplified calculation - in a real implementation,
      // you'd use a proper cron parser library like 'cron-parser'
      const now = new Date();
      now.setMinutes(now.getMinutes() + 1); // Next minute as approximation
      return now.toISOString();
    } catch (error) {
      logger.error('Failed to calculate next execution', LogCategory.SCHEDULER, { 
        cronExpression, 
        error 
      });
      return new Date().toISOString();
    }
  }

  /**
   * Update execution record in database
   */
  private async updateExecutionInDb(execution: ScheduledTestExecution): Promise<void> {
    const { error } = await supabase
      .from('scheduled_test_executions')
      .update({
        status: execution.status,
        tests_completed: execution.tests_completed,
        tests_passed: execution.tests_passed,
        tests_failed: execution.tests_failed,
        execution_results: execution.execution_results,
        execution_logs: execution.execution_logs,
        error_message: execution.error_message,
        duration_seconds: execution.duration_seconds,
        started_at: execution.started_at,
        completed_at: execution.completed_at
      })
      .eq('id', execution.id);

    if (error) {
      logger.error('Failed to update execution in database', LogCategory.DATABASE, {
        execution_id: execution.id,
        error: error.message
      });
    }
  }

  /**
   * Update schedule statistics
   */
  private async updateScheduleStats(schedule_id: string, success: boolean): Promise<void> {
    const { error } = await supabase.rpc('update_schedule_stats', {
      schedule_id,
      success
    });

    if (error) {
      // Fallback to manual update if RPC function doesn't exist
      const incrementField = success ? 'success_count' : 'failure_count';
      await supabase
        .from('test_schedules')
        .update({
          execution_count: supabase.sql`execution_count + 1`,
          [incrementField]: supabase.sql`${incrementField} + 1`,
          last_execution_at: new Date().toISOString()
        })
        .eq('id', schedule_id);
    }
  }

  /**
   * Broadcast execution updates via WebSocket
   */
  private broadcastExecutionUpdate(user_id: string, execution: ScheduledTestExecution): void {
    this.webSocketService.broadcastToUser(user_id, 'scheduled-test-execution-update', {
      execution_id: execution.id,
      schedule_id: execution.schedule_id,
      status: execution.status,
      tests_total: execution.tests_total,
      tests_completed: execution.tests_completed,
      tests_passed: execution.tests_passed,
      tests_failed: execution.tests_failed,
      error_message: execution.error_message,
      started_at: execution.started_at,
      completed_at: execution.completed_at
    });
  }

  /**
   * Initialize event handlers
   */
  private initializeEventHandlers(): void {
    this.testExecutionQueue.on('completed', (job: Job<ScheduleJobData>, result: ScheduleJobResult) => {
      logger.info('Job completed', LogCategory.SCHEDULER, {
        job_id: job.id,
        execution_id: result.execution_id,
        status: result.status
      });
    });

    this.testExecutionQueue.on('failed', (job: Job<ScheduleJobData>, error: Error) => {
      logger.error('Job failed', LogCategory.SCHEDULER, {
        job_id: job.id,
        execution_id: job.data.execution_id,
        error: error.message
      });
    });

    this.testExecutionQueue.on('stalled', (job: Job<ScheduleJobData>) => {
      logger.warn('Job stalled', LogCategory.SCHEDULER, {
        job_id: job.id,
        execution_id: job.data.execution_id
      });
    });
  }

  /**
   * Start the schedule processor (loads active schedules on startup)
   */
  private async startScheduleProcessor(): Promise<void> {
    try {
      // Load active schedules from database and register cron jobs
      const { data: activeSchedules, error } = await supabase
        .from('test_schedules')
        .select('*')
        .eq('status', 'active');

      if (error) {
        logger.error('Failed to load active schedules', LogCategory.SCHEDULER, { error: error.message });
        return;
      }

      // Register cron jobs for active schedules
      for (const schedule of activeSchedules || []) {
        await this.registerCronJob(schedule);
      }

      logger.info('Schedule processor started', LogCategory.SCHEDULER, {
        active_schedules: activeSchedules?.length || 0
      });

    } catch (error) {
      logger.error('Failed to start schedule processor', LogCategory.SCHEDULER, {
        error: error instanceof Error ? error.message : error
      });
    }
  }

  /**
   * Cancel pending jobs for a schedule
   */
  private async cancelPendingJobs(schedule_id: string): Promise<void> {
    try {
      const jobs = await this.testExecutionQueue.getJobs(['waiting', 'delayed']);
      
      for (const job of jobs) {
        if (job.data.schedule_id === schedule_id) {
          await job.remove();
          logger.info('Cancelled pending job', LogCategory.SCHEDULER, {
            job_id: job.id,
            schedule_id
          });
        }
      }
    } catch (error) {
      logger.error('Failed to cancel pending jobs', LogCategory.SCHEDULER, {
        schedule_id,
        error: error instanceof Error ? error.message : error
      });
    }
  }

  /**
   * Get scheduler statistics
   */
  async getSchedulerStats(): Promise<ScheduleStats> {
    try {
      // Get schedule counts
      const { data: scheduleCounts } = await supabase
        .from('test_schedules')
        .select('status')
        .not('status', 'eq', 'cancelled');

      const total_schedules = scheduleCounts?.length || 0;
      const active_schedules = scheduleCounts?.filter(s => s.status === 'active').length || 0;
      const paused_schedules = scheduleCounts?.filter(s => s.status === 'paused').length || 0;

      // Get job counts
      const jobCounts = await this.testExecutionQueue.getJobCounts();
      
      // Get today's executions
      const today = new Date().toISOString().split('T')[0];
      const { data: todayExecutions } = await supabase
        .from('scheduled_test_executions')
        .select('status, duration_seconds')
        .gte('created_at', today + 'T00:00:00Z')
        .lt('created_at', today + 'T23:59:59Z');

      const completed_jobs_today = todayExecutions?.filter(e => e.status === 'completed').length || 0;
      const failed_jobs_today = todayExecutions?.filter(e => e.status === 'failed').length || 0;
      
      const durations = todayExecutions?.filter(e => e.duration_seconds).map(e => e.duration_seconds) || [];
      const average_execution_time = durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0;

      // Get next scheduled runs
      const { data: nextRuns } = await supabase
        .from('test_schedules')
        .select('id, name, next_execution_at')
        .eq('status', 'active')
        .not('next_execution_at', 'is', null)
        .order('next_execution_at', { ascending: true })
        .limit(10);

      const next_scheduled_runs = nextRuns?.map(run => ({
        schedule_id: run.id,
        schedule_name: run.name,
        next_run: run.next_execution_at
      })) || [];

      return {
        total_schedules,
        active_schedules,
        paused_schedules,
        pending_jobs: jobCounts.waiting + jobCounts.delayed,
        active_jobs: jobCounts.active,
        completed_jobs_today,
        failed_jobs_today,
        average_execution_time,
        next_scheduled_runs
      };

    } catch (error) {
      logger.error('Failed to get scheduler stats', LogCategory.SCHEDULER, { error });
      throw error;
    }
  }

  /**
   * Shutdown scheduler service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down scheduler service', LogCategory.SCHEDULER);

    // Stop all cron jobs
    for (const [schedule_id, task] of this.cronJobs) {
      task.stop();
      task.destroy();
      logger.info('Stopped cron job', LogCategory.SCHEDULER, { schedule_id });
    }
    this.cronJobs.clear();

    // Close queue
    await this.testExecutionQueue.close();

    // Close Redis connection
    await this.redisClient.quit();

    logger.info('Scheduler service shutdown completed', LogCategory.SCHEDULER);
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();
