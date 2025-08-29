import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright';
import { TestCase, TestTarget, TestExecution, TestResult, ExecutionMetrics, ExecutionLog } from '../types';
import { supabaseAdmin, TABLES } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export interface ExecutionContext {
  executionId: string;
  testCase: TestCase;
  target: TestTarget;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  logs: ExecutionLog[];
}

export class TestExecutionService {
  private activeExecutions = new Map<string, ExecutionContext>();

  /**
   * Execute a single test case
   */
  async executeTestCase(
    testCase: TestCase,
    target: TestTarget,
    executionConfig: Partial<TestExecution> = {}
  ): Promise<{
    execution: TestExecution;
    results: TestResult[];
    metrics: ExecutionMetrics;
  }> {
    const executionId = uuidv4();
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      // Create execution record
      const execution: TestExecution = {
        id: executionId,
        test_case_id: testCase.id,
        project_id: testCase.project_id,
        target_id: target.id,
        status: 'running',
        started_at: new Date().toISOString(),
        browser: executionConfig.browser || 'chromium',
        device: executionConfig.device || 'desktop',
        environment: executionConfig.environment || 'staging',
        initiated_by: executionConfig.initiated_by || 'system',
        results: [],
        logs: [],
      };

      // Insert execution record
      const { error: insertError } = await supabaseAdmin
        .from(TABLES.TEST_EXECUTIONS)
        .insert(execution);

      if (insertError) {
        throw new Error(`Failed to create execution record: ${insertError.message}`);
      }

      // Launch browser
      browser = await this.launchBrowser(execution.browser);
      context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        recordVideo: { dir: path.join(process.cwd(), 'videos', executionId) },
      });
      page = await context.newPage();

      // Set up monitoring
      const logs: ExecutionLog[] = [];
      const startTime = Date.now();

      // Track network requests
      let networkRequests = 0;
      page.on('request', () => networkRequests++);

      // Track console logs
      page.on('console', (msg) => {
        logs.push({
          timestamp: new Date().toISOString(),
          level: msg.type() as any,
          message: msg.text(),
          step_id: 'system',
        });
      });

      // Track page errors
      page.on('pageerror', (error) => {
        logs.push({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: error.message,
          step_id: 'system',
        });
      });

      // Store execution context for real-time updates
      const executionContext: ExecutionContext = {
        executionId,
        testCase,
        target,
        browser,
        context,
        page,
        logs,
      };
      this.activeExecutions.set(executionId, executionContext);

      // Execute test steps
      const results: TestResult[] = [];
      let overallStatus: TestResult['status'] = 'passed';

      for (const step of testCase.steps.sort((a, b) => a.order - b.order)) {
        try {
          // Update step status to running
          await this.updateStepStatus(executionId, step.id, 'running');

          // Execute step
          const stepResult = await this.executeStep(step, page, executionId);

          // Add to results
          results.push(stepResult);

          // Update step status
          // Map 'skipped' status to 'passed' for the step status update
          const stepStatus = stepResult.status === 'skipped' ? 'passed' : stepResult.status;
          await this.updateStepStatus(executionId, step.id, stepStatus as 'running' | 'passed' | 'failed');

          if (stepResult.status === 'failed') {
            overallStatus = 'failed';
            // Break if step fails (unless configured to continue)
            break;
          }

          // Add step logs to main logs
          logs.push(...stepResult.logs);

        } catch (error) {
          console.error(`Step ${step.id} failed:`, error);
          const errorResult: TestResult = {
            step_id: step.id,
            step_order: step.order,
            status: 'failed',
            duration_seconds: 0,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            logs: [{
              timestamp: new Date().toISOString(),
              level: 'error',
              message: error instanceof Error ? error.message : 'Unknown error',
              step_id: step.id,
            }],
            timestamp: new Date().toISOString(),
          };
          results.push(errorResult);
          overallStatus = 'failed';
          break;
        }
      }

      // Calculate metrics
      const endTime = Date.now();
      const duration = endTime - startTime;

      const metrics: ExecutionMetrics = {
        page_load_time: await this.measurePageLoadTime(page),
        total_requests: networkRequests,
        failed_requests: logs.filter(log => log.level === 'error').length,
        memory_usage_mb: await this.getMemoryUsage(page),
        cpu_usage_percent: 0, // Would need additional monitoring
        network_transfer_mb: await this.getNetworkTransfer(page),
        screenshot_count: results.filter(r => r.screenshot_url).length,
      };

      // Update execution record
      const { error: updateError } = await supabaseAdmin
        .from(TABLES.TEST_EXECUTIONS)
        .update({
          status: overallStatus === 'passed' ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          duration_seconds: Math.floor(duration / 1000),
          results: results,
          metrics: metrics,
        })
        .eq('id', executionId);

      if (updateError) {
        console.error('Failed to update execution:', updateError);
      }

      // Save logs
      await this.saveExecutionLogs(executionId, logs);

      return {
        execution: {
          ...execution,
          status: overallStatus === 'passed' ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          duration_seconds: Math.floor(duration / 1000),
          results,
          metrics,
        },
        results,
        metrics,
      };

    } catch (error) {
      console.error('Test execution failed:', error);

      // Update execution status to failed
      await supabaseAdmin
        .from(TABLES.TEST_EXECUTIONS)
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', executionId);

      throw error;
    } finally {
      // Cleanup
      if (page) await page.close().catch(console.error);
      if (context) await context.close().catch(console.error);
      if (browser) await browser.close().catch(console.error);
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Execute a single test step
   */
  private async executeStep(
    step: TestCase['steps'][0],
    page: Page,
    executionId: string
  ): Promise<TestResult> {
    const startTime = Date.now();
    const stepLogs: ExecutionLog[] = [];
    let screenshotUrl: string | undefined;

    try {
      stepLogs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Executing step: ${step.description}`,
        step_id: step.id,
      });

      // Execute based on action type
      switch (step.action) {
        case 'navigate':
          if (step.element) {
            await page.goto(step.element, {
              waitUntil: 'domcontentloaded',
              timeout: step.timeout || 30000,
            });
          }
          break;

        case 'click':
          if (step.element) {
            await page.click(step.element, { timeout: step.timeout || 5000 });
          }
          break;

        case 'type':
          if (step.element && step.value) {
            await page.fill(step.element, step.value, { timeout: step.timeout || 5000 });
          }
          break;

        case 'wait':
          if (step.element) {
            await page.waitForSelector(step.element, { timeout: step.timeout || 10000 });
          } else {
            await page.waitForTimeout(step.timeout || 1000);
          }
          break;

        case 'verify':
          if (step.element) {
            const element = await page.$(step.element);
            if (!element) {
              throw new Error(`Element not found: ${step.element}`);
            }
            // Additional verification logic based on step.value
            if (step.value) {
              const text = await element.textContent();
              if (!text?.includes(step.value)) {
                throw new Error(`Expected text "${step.value}" not found in element`);
              }
            }
          }
          break;

        case 'select':
          if (step.element && step.value) {
            await page.selectOption(step.element, step.value, { timeout: step.timeout || 5000 });
          }
          break;

        case 'upload':
          if (step.element && step.value) {
            await page.setInputFiles(step.element, step.value);
          }
          break;

        case 'scroll':
          if (step.element) {
            await page.locator(step.element).scrollIntoViewIfNeeded();
          }
          break;

        default:
          console.warn(`Unknown action: ${step.action}`);
      }

      // Take screenshot if requested
      if (step.screenshot) {
        const screenshotPath = await this.takeScreenshot(page, executionId, step.id);
        screenshotUrl = await this.uploadScreenshot(screenshotPath, executionId, step.id);
      }

      const duration = (Date.now() - startTime) / 1000;

      stepLogs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Step completed successfully in ${duration}s`,
        step_id: step.id,
      });

      return {
        step_id: step.id,
        step_order: step.order,
        status: 'passed',
        duration_seconds: duration,
        screenshot_url: screenshotUrl,
        logs: stepLogs,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      stepLogs.push({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Step failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        step_id: step.id,
      });

      return {
        step_id: step.id,
        step_order: step.order,
        status: 'failed',
        duration_seconds: duration,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        screenshot_url: screenshotUrl,
        logs: stepLogs,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Launch browser instance
   */
  private async launchBrowser(browserType: TestExecution['browser']): Promise<Browser> {
    const options = {
      headless: process.env.NODE_ENV === 'production',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
    };

    switch (browserType) {
      case 'firefox':
        return await firefox.launch(options);
      case 'webkit':
        return await webkit.launch(options);
      default:
        return await chromium.launch(options);
    }
  }

  /**
   * Take screenshot
   */
  private async takeScreenshot(page: Page, executionId: string, stepId: string): Promise<string> {
    const screenshotsDir = path.join(process.cwd(), 'screenshots', executionId);
    await fs.mkdir(screenshotsDir, { recursive: true });

    const screenshotPath = path.join(screenshotsDir, `${stepId}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    return screenshotPath;
  }

  /**
   * Upload screenshot to Supabase Storage
   */
  private async uploadScreenshot(
    localPath: string,
    executionId: string,
    stepId: string
  ): Promise<string> {
    try {
      const fileName = `${executionId}/${stepId}.png`;
      const fileBuffer = await fs.readFile(localPath);

      const { data: _data, error } = await supabaseAdmin.storage
        .from('screenshots')
        .upload(fileName, fileBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (error) {
        console.error('Screenshot upload failed:', error);
        return '';
      }

      // Get public URL
      const { data: publicUrl } = supabaseAdmin.storage
        .from('screenshots')
        .getPublicUrl(fileName);

      return publicUrl.publicUrl;
    } catch (error) {
      console.error('Screenshot upload error:', error);
      return '';
    }
  }

  /**
   * Update step status in real-time
   */
  private async updateStepStatus(
    executionId: string,
    stepId: string,
    status: 'running' | 'passed' | 'failed'
  ): Promise<void> {
    // This could emit WebSocket events for real-time updates
    console.log(`Execution ${executionId} - Step ${stepId}: ${status}`);
  }

  /**
   * Save execution logs
   */
  private async saveExecutionLogs(executionId: string, logs: ExecutionLog[]): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('execution_logs')
        .insert(logs.map(log => ({ ...log, execution_id: executionId })));

      if (error) {
        console.error('Failed to save execution logs:', error);
      }
    } catch (error) {
      console.error('Error saving execution logs:', error);
    }
  }

  /**
   * Measure page load time
   */
  private async measurePageLoadTime(_page: Page): Promise<number> {
    // Simple implementation - could be enhanced with more sophisticated metrics
    return 1000; // milliseconds
  }

  /**
   * Get memory usage
   */
  private async getMemoryUsage(page: Page): Promise<number> {
    try {
      const metrics = await page.evaluate(() => {
        // @ts-ignore
        if (performance.memory) {
          // @ts-ignore
          return performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        }
        return 0;
      });
      return metrics;
    } catch {
      return 0;
    }
  }

  /**
   * Get network transfer size
   */
  private async getNetworkTransfer(_page: Page): Promise<number> {
    // This would require tracking network requests
    return 0; // MB
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      return false;
    }

    try {
      // Close browser context to stop execution
      await context.context.close();
      this.activeExecutions.delete(executionId);

      // Update database
      await supabaseAdmin
        .from(TABLES.TEST_EXECUTIONS)
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', executionId);

      return true;
    } catch (error) {
      console.error('Failed to cancel execution:', error);
      return false;
    }
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<TestExecution | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLES.TEST_EXECUTIONS)
      .select('*')
      .eq('id', executionId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as TestExecution;
  }
}

// Export singleton instance
export const testExecutionService = new TestExecutionService();
