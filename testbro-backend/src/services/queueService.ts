import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { testExecutionService } from './testExecutionService';
import { TestCase, TestTarget, TestExecution } from '../types';
import { supabaseAdmin, TABLES } from '../config/database';

export interface TestExecutionJob {
  id: string;
  execution_id: string;
  test_case: TestCase;
  target: TestTarget;
  config: Partial<TestExecution>;
  user_id: string;
  project_id: string;
  started_at: string;
}

export class QueueService {
  private redis: IORedis;
  private testExecutionQueue: Queue;
  private testExecutionWorker: Worker;

  constructor() {
    // Redis connection
    this.redis = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null, // BullMQ requires this to be null
    });

    // Test execution queue
    this.testExecutionQueue = new Queue('test-execution', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    // Note: QueueScheduler is not available in newer BullMQ versions
    // Delayed jobs are handled by the queue itself

    // Worker to process test execution jobs
    this.testExecutionWorker = new Worker(
      'test-execution',
      this.processTestExecution.bind(this),
      {
        connection: this.redis,
        concurrency: parseInt(process.env.MAX_CONCURRENT_EXECUTIONS || '5'),
        limiter: {
          max: 10,
          duration: 1000, // 10 jobs per second
        },
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Add test execution job to queue
   */
  async enqueueTestExecution(
    testCase: TestCase,
    target: TestTarget,
    config: Partial<TestExecution> = {},
    userId: string
  ): Promise<string> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const jobData: TestExecutionJob = {
      id: `job_${executionId}`,
      execution_id: executionId,
      test_case: testCase,
      target: target,
      config: {
        ...config,
        initiated_by: userId,
      },
      user_id: userId,
      project_id: testCase.project_id,
      started_at: new Date().toISOString(),
    };

    // Create execution record in database
    const execution: TestExecution = {
      id: executionId,
      test_case_id: testCase.id,
      project_id: testCase.project_id,
      target_id: target.id,
      status: 'queued',
      browser: config.browser || 'chromium',
      device: config.device || 'desktop',
      environment: config.environment || 'staging',
      initiated_by: userId,
      results: [],
      logs: [],
    };

    const { error: insertError } = await supabaseAdmin
      .from(TABLES.TEST_EXECUTIONS)
      .insert(execution);

    if (insertError) {
      throw new Error(`Failed to create execution record: ${insertError.message}`);
    }

    // Add to queue
    const _job = await this.testExecutionQueue.add('execute-test', jobData, {
      jobId: jobData.id,
      priority: this.getJobPriority(testCase),
      delay: config.scheduled_for ? new Date(config.scheduled_for).getTime() - Date.now() : 0,
    });

    return executionId;
  }

  /**
   * Process test execution job
   */
  private async processTestExecution(job: Job<TestExecutionJob>) {
    const { test_case, target, config, execution_id, user_id: _user_id } = job.data;

    try {
      // Update execution status to running
      await supabaseAdmin
        .from(TABLES.TEST_EXECUTIONS)
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          worker_id: job.id,
        })
        .eq('id', execution_id);

      // Emit progress update
      job.updateProgress(10);

      // Execute the test
      const result = await testExecutionService.executeTestCase(test_case, target, config);

      // Update progress
      job.updateProgress(90);

      // Process results and generate insights
      // (AI analysis would go here)

      // Final progress update
      job.updateProgress(100);

      return {
        execution_id,
        status: 'completed',
        results: result.results,
        metrics: result.metrics,
      };

    } catch (error) {
      console.error(`Test execution failed for job ${job.id}:`, error);

      // Update execution status to failed
      await supabaseAdmin
        .from(TABLES.TEST_EXECUTIONS)
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', execution_id);

      throw error;
    }
  }

  /**
   * Cancel execution job
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    try {
      // Find job by execution ID
      const jobs = await this.testExecutionQueue.getJobs(['active', 'waiting', 'delayed']);

      for (const job of jobs) {
        if (job.data.execution_id === executionId) {
          await job.remove();

          // Cancel the actual execution if it's running
          await testExecutionService.cancelExecution(executionId);

          // Update database status
          await supabaseAdmin
            .from(TABLES.TEST_EXECUTIONS)
            .update({
              status: 'cancelled',
              completed_at: new Date().toISOString(),
            })
            .eq('id', executionId);

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Failed to cancel execution:', error);
      return false;
    }
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<any> {
    const execution = await testExecutionService.getExecutionStatus(executionId);

    if (execution) {
      // If running, get job progress
      if (execution.status === 'running' && execution.worker_id) {
        try {
          const job = await this.testExecutionQueue.getJob(execution.worker_id);
          if (job) {
            const progress = job.progress;
            return {
              ...execution,
              progress,
            };
          }
        } catch (error) {
          console.error('Failed to get job progress:', error);
        }
      }

      return execution;
    }

    return null;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.testExecutionQueue.getWaiting(),
      this.testExecutionQueue.getActive(),
      this.testExecutionQueue.getCompleted(),
      this.testExecutionQueue.getFailed(),
      this.testExecutionQueue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  /**
   * Clean up old jobs
   */
  async cleanupOldJobs(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = Date.now() - maxAge;

    await this.testExecutionQueue.clean(cutoff, 1000, 'completed');
    await this.testExecutionQueue.clean(cutoff, 1000, 'failed');
  }

  /**
   * Schedule recurring test execution
   */
  async scheduleRecurringTest(
    testCase: TestCase,
    target: TestTarget,
    cronExpression: string,
    userId: string
  ): Promise<string> {
    const jobData: TestExecutionJob = {
      id: `scheduled_${Date.now()}`,
      execution_id: `sched_${Date.now()}`,
      test_case: testCase,
      target: target,
      config: {
        initiated_by: userId,
      },
      user_id: userId,
      project_id: testCase.project_id,
      started_at: new Date().toISOString(),
    };

    const job = await this.testExecutionQueue.add(
      'execute-test',
      jobData,
      {
        jobId: jobData.id,
        repeat: {
          pattern: cronExpression,
        },
      }
    );

    return job.id!;
  }

  /**
   * Get job priority based on test case properties
   */
  private getJobPriority(testCase: TestCase): number {
    if (testCase.priority === 'critical') return 10;
    if (testCase.priority === 'high') return 7;
    if (testCase.priority === 'medium') return 5;
    return 3; // low priority
  }

  /**
   * Setup event handlers for monitoring
   */
  private setupEventHandlers(): void {
    // Job completed
    this.testExecutionWorker.on('completed', async (job, _result) => {
      console.log(`Job ${job.id} completed successfully`);

      // Send notification to user
      await this.sendNotification(job.data.user_id, {
        type: 'execution_complete',
        title: 'Test Execution Completed',
        message: `Test "${job.data.test_case.name}" has completed successfully`,
        execution_id: job.data.execution_id,
      });
    });

    // Job failed
    this.testExecutionWorker.on('failed', async (job, error) => {
      if (!job) {
        console.error('Job failed but job object is undefined:', error);
        return;
      }

      console.error(`Job ${job.id} failed:`, error);

      // Send notification to user
      await this.sendNotification(job.data.user_id, {
        type: 'execution_failed',
        title: 'Test Execution Failed',
        message: `Test "${job.data.test_case.name}" has failed`,
        execution_id: job.data.execution_id,
        error: error.message,
      });
    });

    // Worker error
    this.testExecutionWorker.on('error', (error) => {
      console.error('Worker error:', error);
    });

    // Redis connection events
    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });
  }

  /**
   * Send notification to user
   */
  private async sendNotification(
    userId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      execution_id?: string;
      error?: string;
    }
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from(TABLES.NOTIFICATIONS)
        .insert({
          user_id: userId,
          ...notification,
          read: false,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to send notification:', error);
      }
    } catch (error) {
      console.error('Notification error:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down queue service...');

    await this.testExecutionWorker.close();
    await this.testExecutionQueue.close();
    await this.redis.disconnect();
  }
}

// Export singleton instance
export const queueService = new QueueService();
