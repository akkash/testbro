import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger, LogCategory } from './loggingService';
import { supabaseAdmin } from '../config/database';
import sharp from 'sharp';

export interface ScreenshotOptions {
  fullPage: boolean;
  width: number;
  height: number;
  quality: number;
  format: 'png' | 'jpeg';
  capture_mobile: boolean;
  capture_tablet: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PageScreenshotResult {
  url: string;
  screenshot_path: string;
  thumbnail_path: string;
  hash: string;
  file_size: number;
  dimensions: {
    width: number;
    height: number;
  };
  device_type: 'desktop' | 'tablet' | 'mobile';
  captured_at: string;
  load_time_ms: number;
  http_status: number;
  page_title: string;
  error?: string;
}

export interface ScreenshotComparison {
  url: string;
  baseline_screenshot: PageScreenshotResult;
  current_screenshot: PageScreenshotResult;
  difference_image_path?: string;
  similarity_score: number;
  pixel_differences: number;
  is_match: boolean;
  changes_detected: {
    added_elements: boolean;
    removed_elements: boolean;
    layout_changes: boolean;
    content_changes: boolean;
  };
  comparison_timestamp: string;
}

export interface BatchScreenshotConfig {
  urls: string[];
  session_id: string;
  options: ScreenshotOptions;
  pre_flow_steps?: any[];
  batch_size: number;
  delay_between_screenshots: number;
  timeout_per_page: number;
  retry_on_error: boolean;
  max_retries: number;
}

export class PageScreenshotService {
  private screenshotDir: string;
  private baselineDir: string;
  private diffDir: string;

  constructor() {
    this.screenshotDir = path.join(process.cwd(), 'screenshots');
    this.baselineDir = path.join(this.screenshotDir, 'baselines');
    this.diffDir = path.join(this.screenshotDir, 'diffs');
    this.ensureDirectories();
  }

  /**
   * Take screenshots of multiple pages
   */
  async capturePages(config: BatchScreenshotConfig): Promise<PageScreenshotResult[]> {
    const results: PageScreenshotResult[] = [];
    let browser: Browser | null = null;

    try {
      // Launch browser
      browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
      });

      logger.info('Starting batch screenshot capture', LogCategory.BROWSER, {
        sessionId: config.session_id,
        urlCount: config.urls.length,
        options: config.options
      });

      // Process URLs in batches
      for (let i = 0; i < config.urls.length; i += config.batch_size) {
        const batch = config.urls.slice(i, i + config.batch_size);
        const batchResults = await this.processBatch(browser, batch, config);
        results.push(...batchResults);

        // Update progress via WebSocket
        await this.notifyProgress(config.session_id, {
          completed: results.length,
          total: config.urls.length,
          current_batch: Math.floor(i / config.batch_size) + 1,
          total_batches: Math.ceil(config.urls.length / config.batch_size)
        });

        // Delay between batches
        if (i + config.batch_size < config.urls.length) {
          await this.delay(config.delay_between_screenshots);
        }
      }

      logger.info('Batch screenshot capture completed', LogCategory.BROWSER, {
        sessionId: config.session_id,
        totalCaptured: results.length,
        errors: results.filter(r => r.error).length
      });

    } catch (error) {
      logger.error('Batch screenshot capture failed', LogCategory.BROWSER, {
        sessionId: config.session_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return results;
  }

  /**
   * Process a batch of URLs
   */
  private async processBatch(
    browser: Browser,
    urls: string[],
    config: BatchScreenshotConfig
  ): Promise<PageScreenshotResult[]> {
    const results: PageScreenshotResult[] = [];
    const context = await browser.newContext({
      viewport: { 
        width: config.options.width, 
        height: config.options.height 
      },
      userAgent: 'TestBro-FullWebsiteTest/1.0'
    });

    // Execute pre-flow if configured
    if (config.pre_flow_steps && config.pre_flow_steps.length > 0) {
      await this.executePreFlow(context, config.pre_flow_steps);
    }

    // Process each URL
    for (const url of urls) {
      const page = await context.newPage();
      
      try {
        // Desktop screenshot
        const desktopResult = await this.capturePageScreenshot(
          page, 
          url, 
          config.session_id, 
          'desktop',
          config.options,
          config.timeout_per_page
        );
        results.push(desktopResult);

        // Mobile screenshot if enabled
        if (config.options.capture_mobile) {
          await page.setViewportSize({ width: 375, height: 667 });
          const mobileResult = await this.capturePageScreenshot(
            page, 
            url, 
            config.session_id, 
            'mobile',
            { ...config.options, width: 375, height: 667 },
            config.timeout_per_page
          );
          results.push(mobileResult);
        }

        // Tablet screenshot if enabled
        if (config.options.capture_tablet) {
          await page.setViewportSize({ width: 768, height: 1024 });
          const tabletResult = await this.capturePageScreenshot(
            page, 
            url, 
            config.session_id, 
            'tablet',
            { ...config.options, width: 768, height: 1024 },
            config.timeout_per_page
          );
          results.push(tabletResult);
        }

      } catch (error) {
        logger.error('Failed to capture page screenshot', LogCategory.BROWSER, {
          url,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Add error result
        results.push({
          url,
          screenshot_path: '',
          thumbnail_path: '',
          hash: '',
          file_size: 0,
          dimensions: { width: 0, height: 0 },
          device_type: 'desktop',
          captured_at: new Date().toISOString(),
          load_time_ms: 0,
          http_status: 0,
          page_title: '',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        await page.close();
      }
    }

    await context.close();
    return results;
  }

  /**
   * Capture screenshot of a single page
   */
  private async capturePageScreenshot(
    page: Page,
    url: string,
    sessionId: string,
    deviceType: 'desktop' | 'tablet' | 'mobile',
    options: ScreenshotOptions,
    timeout: number
  ): Promise<PageScreenshotResult> {
    const startTime = Date.now();
    let httpStatus = 0;
    let pageTitle = '';

    try {
      // Navigate to page
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout 
      });
      
      httpStatus = response?.status() || 0;
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      // Get page title
      pageTitle = await page.title();

      // Generate filename
      const urlHash = this.generateUrlHash(url);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${sessionId}_${urlHash}_${deviceType}_${timestamp}`;

      const screenshotPath = path.join(
        this.screenshotDir, 
        sessionId, 
        `${filename}.${options.format}`
      );
      
      const thumbnailPath = path.join(
        this.screenshotDir, 
        sessionId, 
        'thumbnails',
        `${filename}_thumb.jpeg`
      );

      // Ensure directories exist
      await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
      await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });

      // Take screenshot
      const screenshotBuffer = await page.screenshot({
        path: screenshotPath,
        fullPage: options.fullPage,
        type: options.format,
        quality: options.format === 'jpeg' ? options.quality : undefined,
        clip: options.clip
      });

      // Generate thumbnail
      await sharp(screenshotBuffer)
        .resize(300, 200, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      // Get file stats
      const stats = await fs.stat(screenshotPath);
      const imageMetadata = await sharp(screenshotBuffer).metadata();

      // Generate hash
      const hash = this.generateHash(screenshotBuffer);

      const result: PageScreenshotResult = {
        url,
        screenshot_path: screenshotPath,
        thumbnail_path: thumbnailPath,
        hash,
        file_size: stats.size,
        dimensions: {
          width: imageMetadata.width || 0,
          height: imageMetadata.height || 0
        },
        device_type: deviceType,
        captured_at: new Date().toISOString(),
        load_time_ms: Date.now() - startTime,
        http_status: httpStatus,
        page_title: pageTitle
      };

      // Store in database
      await this.storeScreenshotResult(sessionId, result);

      return result;

    } catch (error) {
      throw new Error(`Screenshot capture failed for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compare current screenshots with baselines
   */
  async compareWithBaselines(
    sessionId: string,
    currentResults: PageScreenshotResult[],
    baselineSessionId?: string
  ): Promise<ScreenshotComparison[]> {
    const comparisons: ScreenshotComparison[] = [];

    for (const current of currentResults) {
      if (current.error) continue;

      try {
        // Find baseline screenshot
        const baseline = await this.findBaselineScreenshot(
          current.url,
          current.device_type,
          baselineSessionId
        );

        if (!baseline) {
          logger.info('No baseline found, creating new baseline', LogCategory.SYSTEM, {
            url: current.url,
            deviceType: current.device_type
          });
          
          // Copy current as baseline
          await this.createBaseline(current);
          continue;
        }

        // Perform comparison
        const comparison = await this.compareScreenshots(baseline, current);
        comparisons.push(comparison);

        // Store comparison result
        await this.storeComparisonResult(sessionId, comparison);

      } catch (error) {
        logger.error('Screenshot comparison failed', LogCategory.SYSTEM, {
          url: current.url,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return comparisons;
  }

  /**
   * Compare two screenshots
   */
  private async compareScreenshots(
    baseline: PageScreenshotResult,
    current: PageScreenshotResult
  ): Promise<ScreenshotComparison> {
    const comparison: ScreenshotComparison = {
      url: current.url,
      baseline_screenshot: baseline,
      current_screenshot: current,
      similarity_score: 0,
      pixel_differences: 0,
      is_match: false,
      changes_detected: {
        added_elements: false,
        removed_elements: false,
        layout_changes: false,
        content_changes: false
      },
      comparison_timestamp: new Date().toISOString()
    };

    try {
      // Quick hash comparison
      if (baseline.hash === current.hash) {
        comparison.similarity_score = 100;
        comparison.is_match = true;
        return comparison;
      }

      // Pixel-by-pixel comparison using Sharp
      const baselineImage = sharp(baseline.screenshot_path);
      const currentImage = sharp(current.screenshot_path);

      // Ensure images are the same size
      const baselineMetadata = await baselineImage.metadata();
      const currentMetadata = await currentImage.metadata();

      if (baselineMetadata.width !== currentMetadata.width || 
          baselineMetadata.height !== currentMetadata.height) {
        // Resize current to match baseline
        await currentImage.resize(baselineMetadata.width, baselineMetadata.height);
      }

      // Create difference image
      const diffFilename = `diff_${this.generateUrlHash(current.url)}_${Date.now()}.png`;
      const diffPath = path.join(this.diffDir, diffFilename);
      
      await fs.mkdir(path.dirname(diffPath), { recursive: true });

      // Calculate pixel differences using ImageMagick-style comparison
      const { data: baselineBuffer } = await baselineImage.raw().toBuffer({ resolveWithObject: true });
      const { data: currentBuffer } = await currentImage.raw().toBuffer({ resolveWithObject: true });

      let pixelDifferences = 0;
      const totalPixels = baselineBuffer.length;

      for (let i = 0; i < totalPixels; i += 4) {
        const rDiff = Math.abs(baselineBuffer[i] - currentBuffer[i]);
        const gDiff = Math.abs(baselineBuffer[i + 1] - currentBuffer[i + 1]);
        const bDiff = Math.abs(baselineBuffer[i + 2] - currentBuffer[i + 2]);
        
        const totalDiff = rDiff + gDiff + bDiff;
        if (totalDiff > 30) { // Threshold for considering a pixel different
          pixelDifferences++;
        }
      }

      const similarityScore = Math.max(0, 100 - (pixelDifferences / (totalPixels / 4) * 100));
      
      comparison.similarity_score = Math.round(similarityScore * 100) / 100;
      comparison.pixel_differences = pixelDifferences;
      comparison.is_match = similarityScore > 95;

      // Generate difference image if significant changes detected
      if (similarityScore < 95) {
        await this.generateDifferenceImage(
          baseline.screenshot_path,
          current.screenshot_path,
          diffPath
        );
        comparison.difference_image_path = diffPath;
        
        // Analyze types of changes
        comparison.changes_detected = await this.analyzeChanges(
          baseline.screenshot_path,
          current.screenshot_path
        );
      }

    } catch (error) {
      logger.error('Screenshot comparison failed', LogCategory.SYSTEM, {
        url: current.url,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return comparison;
  }

  /**
   * Execute pre-flow steps before taking screenshots
   */
  private async executePreFlow(context: BrowserContext, preFlowSteps: any[]): Promise<void> {
    const page = await context.newPage();

    try {
      for (const step of preFlowSteps) {
        switch (step.action) {
          case 'navigate':
            await page.goto(step.url, { waitUntil: 'domcontentloaded' });
            break;
          
          case 'click':
            await page.click(step.selector);
            break;
          
          case 'type':
            await page.type(step.selector, step.value);
            break;
          
          case 'wait':
            await page.waitForTimeout(step.duration || 1000);
            break;
          
          case 'wait_for_selector':
            await page.waitForSelector(step.selector);
            break;
          
          case 'accept_cookies':
            // Common cookie banner selectors
            const cookieSelectors = [
              'button[id*="accept"]',
              'button[class*="accept"]',
              'button[aria-label*="accept"]',
              '.cookie-accept',
              '#cookie-accept',
              '[data-testid="accept-cookies"]'
            ];
            
            for (const selector of cookieSelectors) {
              try {
                await page.click(selector, { timeout: 2000 });
                break;
              } catch (error) {
                // Try next selector
              }
            }
            break;

          case 'login':
            if (step.credentials) {
              await page.type(step.email_selector || 'input[type="email"]', step.credentials.email);
              await page.type(step.password_selector || 'input[type="password"]', step.credentials.password);
              await page.click(step.submit_selector || 'button[type="submit"]');
              await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
            }
            break;
        }

        // Wait between steps
        if (step.wait_after) {
          await page.waitForTimeout(step.wait_after);
        }
      }

      logger.info('Pre-flow execution completed', LogCategory.BROWSER, {
        stepsExecuted: preFlowSteps.length
      });

    } catch (error) {
      logger.error('Pre-flow execution failed', LogCategory.BROWSER, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Generate difference image highlighting changes
   */
  private async generateDifferenceImage(
    baselinePath: string,
    currentPath: string,
    diffPath: string
  ): Promise<void> {
    try {
      const baseline = sharp(baselinePath);
      const current = sharp(currentPath);

      // Create a simple difference overlay
      const { data: baselineBuffer, info: baselineInfo } = await baseline.raw().toBuffer({ resolveWithObject: true });
      const { data: currentBuffer } = await current.raw().toBuffer({ resolveWithObject: true });

      const diffBuffer = Buffer.alloc(baselineBuffer.length);

      for (let i = 0; i < baselineBuffer.length; i += 3) {
        const rDiff = Math.abs(baselineBuffer[i] - currentBuffer[i]);
        const gDiff = Math.abs(baselineBuffer[i + 1] - currentBuffer[i + 1]);
        const bDiff = Math.abs(baselineBuffer[i + 2] - currentBuffer[i + 2]);
        
        const totalDiff = rDiff + gDiff + bDiff;
        
        if (totalDiff > 30) {
          // Highlight differences in red
          diffBuffer[i] = 255;     // R
          diffBuffer[i + 1] = 0;   // G
          diffBuffer[i + 2] = 0;   // B
        } else {
          // Keep original pixel but desaturated
          diffBuffer[i] = Math.floor(currentBuffer[i] * 0.7);
          diffBuffer[i + 1] = Math.floor(currentBuffer[i + 1] * 0.7);
          diffBuffer[i + 2] = Math.floor(currentBuffer[i + 2] * 0.7);
        }
      }

      await sharp(diffBuffer, {
        raw: {
          width: baselineInfo.width,
          height: baselineInfo.height,
          channels: baselineInfo.channels
        }
      }).png().toFile(diffPath);

    } catch (error) {
      logger.error('Failed to generate difference image', LogCategory.SYSTEM, {
        baselinePath,
        currentPath,
        diffPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Analyze types of changes between screenshots
   */
  private async analyzeChanges(baselinePath: string, currentPath: string): Promise<{
    added_elements: boolean;
    removed_elements: boolean;
    layout_changes: boolean;
    content_changes: boolean;
  }> {
    // This is a simplified change analysis
    // In a full implementation, you might use computer vision libraries
    // or AI services to detect specific types of changes
    
    try {
      const baseline = sharp(baselinePath);
      const current = sharp(currentPath);

      const baselineStats = await baseline.stats();
      const currentStats = await current.stats();

      const changes = {
        added_elements: false,
        removed_elements: false,
        layout_changes: false,
        content_changes: true // Default to content changes for now
      };

      // Simple heuristics based on image statistics
      const brightnessDiff = Math.abs(
        baselineStats.channels[0].mean - currentStats.channels[0].mean
      );
      
      if (brightnessDiff > 10) {
        changes.layout_changes = true;
      }

      return changes;

    } catch (error) {
      return {
        added_elements: false,
        removed_elements: false,
        layout_changes: false,
        content_changes: true
      };
    }
  }

  /**
   * Utility methods
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.screenshotDir, { recursive: true });
    await fs.mkdir(this.baselineDir, { recursive: true });
    await fs.mkdir(this.diffDir, { recursive: true });
  }

  private generateUrlHash(url: string): string {
    return createHash('md5').update(url).digest('hex').substring(0, 8);
  }

  private generateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async notifyProgress(sessionId: string, progress: any): Promise<void> {
    // Implementation would send WebSocket update
    logger.info('Screenshot progress update', LogCategory.SYSTEM, {
      sessionId,
      progress
    });
  }

  private async storeScreenshotResult(sessionId: string, result: PageScreenshotResult): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('website_test_screenshots')
        .insert({
          session_id: sessionId,
          url: result.url,
          screenshot_path: result.screenshot_path,
          thumbnail_path: result.thumbnail_path,
          hash: result.hash,
          file_size: result.file_size,
          width: result.dimensions.width,
          height: result.dimensions.height,
          device_type: result.device_type,
          captured_at: result.captured_at,
          load_time_ms: result.load_time_ms,
          http_status: result.http_status,
          page_title: result.page_title,
          error_message: result.error
        });

      if (error) {
        logger.error('Failed to store screenshot result', LogCategory.DATABASE, { error });
      }
    } catch (error) {
      logger.error('Failed to store screenshot result', LogCategory.DATABASE, { error });
    }
  }

  private async storeComparisonResult(sessionId: string, comparison: ScreenshotComparison): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('website_test_comparisons')
        .insert({
          session_id: sessionId,
          url: comparison.url,
          baseline_screenshot_id: comparison.baseline_screenshot.hash,
          current_screenshot_id: comparison.current_screenshot.hash,
          difference_image_path: comparison.difference_image_path,
          similarity_score: comparison.similarity_score,
          pixel_differences: comparison.pixel_differences,
          is_match: comparison.is_match,
          changes_detected: comparison.changes_detected,
          compared_at: comparison.comparison_timestamp
        });

      if (error) {
        logger.error('Failed to store comparison result', LogCategory.DATABASE, { error });
      }
    } catch (error) {
      logger.error('Failed to store comparison result', LogCategory.DATABASE, { error });
    }
  }

  private async findBaselineScreenshot(
    url: string,
    deviceType: string,
    baselineSessionId?: string
  ): Promise<PageScreenshotResult | null> {
    try {
      let query = supabaseAdmin
        .from('website_test_screenshots')
        .select('*')
        .eq('url', url)
        .eq('device_type', deviceType)
        .is('error_message', null);

      if (baselineSessionId) {
        query = query.eq('session_id', baselineSessionId);
      } else {
        query = query.order('captured_at', { ascending: false });
      }

      const { data, error } = await query.limit(1).single();

      if (error || !data) {
        return null;
      }

      return {
        url: data.url,
        screenshot_path: data.screenshot_path,
        thumbnail_path: data.thumbnail_path,
        hash: data.hash,
        file_size: data.file_size,
        dimensions: {
          width: data.width,
          height: data.height
        },
        device_type: data.device_type,
        captured_at: data.captured_at,
        load_time_ms: data.load_time_ms,
        http_status: data.http_status,
        page_title: data.page_title
      };

    } catch (error) {
      logger.error('Failed to find baseline screenshot', LogCategory.DATABASE, { error });
      return null;
    }
  }

  private async createBaseline(screenshot: PageScreenshotResult): Promise<void> {
    const baselinePath = path.join(
      this.baselineDir,
      `${this.generateUrlHash(screenshot.url)}_${screenshot.device_type}.${path.extname(screenshot.screenshot_path).slice(1)}`
    );

    try {
      await fs.copyFile(screenshot.screenshot_path, baselinePath);
      logger.info('Created new baseline screenshot', LogCategory.SYSTEM, {
        url: screenshot.url,
        deviceType: screenshot.device_type,
        baselinePath
      });
    } catch (error) {
      logger.error('Failed to create baseline screenshot', LogCategory.SYSTEM, { error });
    }
  }
}
