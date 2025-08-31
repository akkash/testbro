import { Page, Browser, BrowserContext } from 'playwright';
import { 
  VisualCheckpoint, 
  VisualBaseline, 
  VisualAIAnalysis,
  DomainCrawlSession,
  DomainCrawlPage
} from '../types';
import { supabaseAdmin } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { AIService } from './aiService';
import { ScreenshotService } from './screenshotService';
import { WebSocketService } from './websocketService';
import { logger, LogCategory } from './loggingService';
import crypto from 'crypto';
import sharp from 'sharp';

export class VisualAIService {
  private aiService: AIService;
  private screenshotService: ScreenshotService;
  private wsService: WebSocketService;

  constructor(aiService: AIService, screenshotService: ScreenshotService, wsService: WebSocketService) {
    this.aiService = aiService;
    this.screenshotService = screenshotService;
    this.wsService = wsService;
  }

  /**
   * Create visual checkpoints for a crawled page
   */
  async createVisualCheckpoints(
    sessionId: string,
    pageId: string,
    page: Page,
    session: DomainCrawlSession
  ): Promise<VisualCheckpoint[]> {
    const checkpoints: VisualCheckpoint[] = [];
    
    try {
      const { visual_ai_config } = session;
      const checkpointTypes = visual_ai_config.checkpoint_types || ['full_page', 'viewport'];

      for (const checkpointType of checkpointTypes) {
        const checkpoint = await this.createSingleCheckpoint(
          sessionId,
          pageId,
          page,
          checkpointType,
          session
        );
        
        if (checkpoint) {
          checkpoints.push(checkpoint);
        }
      }

      // Update session checkpoint count
      await this.updateSessionCheckpointCount(sessionId, checkpoints.length);

      logger.info('Visual checkpoints created', LogCategory.BROWSER, {
        sessionId,
        pageId,
        checkpointCount: checkpoints.length
      });

      return checkpoints;

    } catch (error) {
      logger.error('Failed to create visual checkpoints', LogCategory.BROWSER, {
        sessionId,
        pageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Create a single visual checkpoint
   */
  private async createSingleCheckpoint(
    sessionId: string,
    pageId: string,
    page: Page,
    checkpointType: 'full_page' | 'element' | 'viewport' | 'mobile' | 'tablet',
    session: DomainCrawlSession
  ): Promise<VisualCheckpoint | null> {
    try {
      // Set viewport based on checkpoint type
      const viewport = this.getViewportForCheckpoint(checkpointType);
      if (viewport) {
        await page.setViewportSize(viewport);
        // Wait for layout to settle
        await page.waitForTimeout(1000);
      }

      // Take screenshot
      const screenshotOptions = {
        fullPage: checkpointType === 'full_page',
        type: session.visual_ai_config.screenshot_format as 'png' | 'jpeg',
        quality: session.visual_ai_config.screenshot_quality
      };

      const screenshotBuffer = await page.screenshot(screenshotOptions);
      const screenshotHash = this.generateScreenshotHash(screenshotBuffer);

      // Upload screenshot
      const { url: screenshotUrl } = await this.screenshotService.takeScreenshot(
        page,
        sessionId,
        {
          format: session.visual_ai_config.screenshot_format as 'png' | 'jpeg',
          quality: session.visual_ai_config.screenshot_quality,
          fullPage: checkpointType === 'full_page'
        }
      );

      // AI analysis of the page
      const aiAnalysis = await this.performAIAnalysis(page, session);

      // Find existing baseline
      const baseline = await this.findMatchingBaseline(
        session.project_id,
        page.url(),
        checkpointType,
        viewport
      );

      // Determine comparison status
      let comparisonStatus: VisualCheckpoint['comparison_status'] = 'baseline';
      let visualDifferences = {};
      let differencePercentage = 0;
      let baselineScreenshotUrl: string | undefined;

      if (baseline) {
        const comparison = await this.compareWithBaseline(screenshotBuffer, baseline);
        comparisonStatus = comparison.status;
        visualDifferences = comparison.differences;
        differencePercentage = comparison.differencePercentage;
        baselineScreenshotUrl = baseline.baseline_screenshot_url;
      } else if (session.visual_ai_config.auto_create_baselines) {
        // Create new baseline
        await this.createBaseline(
          session.project_id,
          page.url(),
          checkpointType,
          screenshotUrl,
          screenshotHash,
          viewport,
          session.created_by
        );
      }

      // Create checkpoint record
      const checkpoint: Omit<VisualCheckpoint, 'id' | 'created_at' | 'updated_at'> = {
        session_id: sessionId,
        page_id: pageId,
        checkpoint_name: `${checkpointType}_${page.url().split('/').pop() || 'page'}`,
        checkpoint_type: checkpointType,
        screenshot_url: screenshotUrl,
        screenshot_hash: screenshotHash,
        baseline_screenshot_url: baselineScreenshotUrl,
        ai_detected_elements: aiAnalysis.detected_elements,
        ai_confidence_score: aiAnalysis.confidence_score,
        ai_suggestions: aiAnalysis.suggestions,
        comparison_status: comparisonStatus,
        visual_differences: visualDifferences,
        difference_percentage: differencePercentage,
        viewport_width: viewport?.width || 1280,
        viewport_height: viewport?.height || 720,
        device_scale_factor: 1.0,
        captured_at: new Date().toISOString()
      };

      // Insert into database
      const { data: insertedCheckpoint, error } = await supabaseAdmin
        .from('visual_checkpoints')
        .insert(checkpoint)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save checkpoint: ${error.message}`);
      }

      // Emit checkpoint event
      this.emitCheckpointEvent(sessionId, insertedCheckpoint as VisualCheckpoint);

      return insertedCheckpoint as VisualCheckpoint;

    } catch (error) {
      logger.error('Failed to create single checkpoint', LogCategory.BROWSER, {
        sessionId,
        pageId,
        checkpointType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get viewport configuration for checkpoint type
   */
  private getViewportForCheckpoint(checkpointType: string): { width: number; height: number } | null {
    switch (checkpointType) {
      case 'viewport':
      case 'full_page':
        return { width: 1280, height: 720 };
      case 'mobile':
        return { width: 375, height: 667 };
      case 'tablet':
        return { width: 768, height: 1024 };
      default:
        return null;
    }
  }

  /**
   * Generate hash for screenshot deduplication
   */
  private generateScreenshotHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Perform AI analysis on the page
   */
  private async performAIAnalysis(page: Page, session: DomainCrawlSession): Promise<{
    detected_elements: any;
    confidence_score: number;
    suggestions: string[];
  }> {
    try {
      // Get page HTML for analysis
      const html = await page.content();
      const url = page.url();

      // Use AI service to analyze page structure
      const analysis = await this.aiService.optimizeSelectors(html, url);

      // Detect interactive elements using page evaluation
      const detectedElements = await page.evaluate(() => {
        function generateSelector(element: any): string {
          if (element.id) return `#${element.id}`;
          if (element.className) return `.${element.className.split(' ')[0]}`;
          return element.tagName.toLowerCase();
        }

        // @ts-ignore - document is available in browser context
        const buttons = Array.from(document.querySelectorAll('button, input[type=\"button\"], input[type=\"submit\"]'))
          .map((el: any) => ({
            selector: generateSelector(el),
            text: el.textContent?.trim() || el.value || '',
            confidence: 0.9
          }));

        // @ts-ignore - document is available in browser context
        const forms = Array.from(document.querySelectorAll('form'))
          .map((el: any) => ({
            selector: generateSelector(el),
            type: 'form',
            confidence: 0.9
          }));

        // @ts-ignore - document is available in browser context
        const navigation = Array.from(document.querySelectorAll('nav a, .nav a, .navigation a'))
          .map((el: any) => ({
            selector: generateSelector(el),
            text: el.textContent?.trim() || '',
            confidence: 0.8
          }));

        return {
          buttons: buttons.slice(0, 10), // Limit results
          forms: forms.slice(0, 5),
          navigation: navigation.slice(0, 10)
        };
      });

      // Generate AI suggestions based on detected elements
      const suggestions = this.generateTestSuggestions(detectedElements, url);

      return {
        detected_elements: detectedElements,
        confidence_score: session.visual_ai_config.ai_confidence_threshold || 0.7,
        suggestions
      };

    } catch (error) {
      logger.error('AI analysis failed', LogCategory.BROWSER, { error });
      return {
        detected_elements: {},
        confidence_score: 0.5,
        suggestions: ['Manual review recommended due to analysis failure']
      };
    }
  }

  /**
   * Generate test suggestions based on detected elements
   */
  private generateTestSuggestions(detectedElements: any, url: string): string[] {
    const suggestions: string[] = [];

    if (detectedElements.buttons?.length > 0) {
      suggestions.push('Test button click interactions and verify expected responses');
      suggestions.push('Validate button states (enabled/disabled) under different conditions');
    }

    if (detectedElements.forms?.length > 0) {
      suggestions.push('Test form submission with valid and invalid data');
      suggestions.push('Verify form validation messages and error handling');
    }

    if (detectedElements.navigation?.length > 0) {
      suggestions.push('Test navigation links to ensure they lead to correct destinations');
      suggestions.push('Verify navigation accessibility and keyboard navigation');
    }

    // URL-based suggestions
    if (url.includes('/product/')) {
      suggestions.push('Test add to cart functionality and product image zoom');
    } else if (url.includes('/checkout/')) {
      suggestions.push('Test complete checkout flow with various payment methods');
    } else if (url.includes('/login/')) {
      suggestions.push('Test login with valid/invalid credentials and password reset');
    }

    return suggestions;
  }

  /**
   * Find matching baseline for comparison
   */
  private async findMatchingBaseline(
    projectId: string,
    url: string,
    checkpointType: string,
    viewport: { width: number; height: number } | null
  ): Promise<VisualBaseline | null> {
    const { data } = await supabaseAdmin
      .from('visual_baselines')
      .select('*')
      .eq('project_id', projectId)
      .eq('checkpoint_type', checkpointType)
      .eq('is_active', true)
      .eq('viewport_width', viewport?.width || 1280)
      .eq('viewport_height', viewport?.height || 720);

    if (!data || data.length === 0) return null;

    // Find best matching pattern
    for (const baseline of data) {
      const pattern = baseline.url_pattern.replace(/\*/g, '.*');
      const regex = new RegExp(pattern);
      if (regex.test(url)) {
        return baseline as VisualBaseline;
      }
    }

    return null;
  }

  /**
   * Compare screenshot with baseline
   */
  private async compareWithBaseline(
    screenshotBuffer: Buffer,
    baseline: VisualBaseline
  ): Promise<{
    status: VisualCheckpoint['comparison_status'];
    differences: any;
    differencePercentage: number;
  }> {
    try {
      // Download baseline image
      const baselineResponse = await fetch(baseline.baseline_screenshot_url);
      const baselineBuffer = Buffer.from(await baselineResponse.arrayBuffer());

      // Use sharp for image comparison
      const screenshot = sharp(screenshotBuffer);
      const baselineImage = sharp(baselineBuffer);

      // Get image info
      const screenshotInfo = await screenshot.metadata();
      const baselineInfo = await baselineImage.metadata();

      // Resize images to same dimensions if needed
      if (screenshotInfo.width !== baselineInfo.width || screenshotInfo.height !== baselineInfo.height) {
        const targetWidth = Math.min(screenshotInfo.width || 1280, baselineInfo.width || 1280);
        const targetHeight = Math.min(screenshotInfo.height || 720, baselineInfo.height || 720);
        
        await screenshot.resize(targetWidth, targetHeight);
        await baselineImage.resize(targetWidth, targetHeight);
      }

      // Convert to raw pixel data for comparison
      const [screenshotRaw, baselineRaw] = await Promise.all([
        screenshot.raw().toBuffer(),
        baselineImage.raw().toBuffer()
      ]);

      // Calculate pixel differences
      let diffPixels = 0;
      const totalPixels = screenshotRaw.length / 3; // RGB channels

      for (let i = 0; i < screenshotRaw.length; i += 3) {
        const rDiff = Math.abs(screenshotRaw[i] - baselineRaw[i]);
        const gDiff = Math.abs(screenshotRaw[i + 1] - baselineRaw[i + 1]);
        const bDiff = Math.abs(screenshotRaw[i + 2] - baselineRaw[i + 2]);
        
        // If any channel differs by more than threshold, count as different
        if (rDiff > 30 || gDiff > 30 || bDiff > 30) {
          diffPixels++;
        }
      }

      const differencePercentage = (diffPixels / totalPixels) * 100;
      const threshold = 5.0; // 5% difference threshold

      let status: VisualCheckpoint['comparison_status'];
      if (differencePercentage < 1.0) {
        status = 'passed';
      } else if (differencePercentage < threshold) {
        status = 'review_needed';
      } else {
        status = 'failed';
      }

      return {
        status,
        differences: {
          changed_pixels: diffPixels,
          total_pixels: totalPixels,
          difference_regions: [] // Could implement region detection here
        },
        differencePercentage: Math.round(differencePercentage * 100) / 100
      };

    } catch (error) {
      logger.error('Visual comparison failed', LogCategory.BROWSER, { error });
      return {
        status: 'review_needed',
        differences: { error: 'Comparison failed' },
        differencePercentage: 0
      };
    }
  }

  /**
   * Create new visual baseline
   */
  private async createBaseline(
    projectId: string,
    url: string,
    checkpointType: string,
    screenshotUrl: string,
    screenshotHash: string,
    viewport: { width: number; height: number } | null,
    createdBy: string
  ): Promise<VisualBaseline> {
    // Generate URL pattern (exact match for now, could be more sophisticated)
    const urlPattern = url;

    const baseline: Omit<VisualBaseline, 'id' | 'created_at' | 'updated_at'> = {
      project_id: projectId,
      url_pattern: urlPattern,
      checkpoint_type: checkpointType as any,
      baseline_screenshot_url: screenshotUrl,
      screenshot_hash: screenshotHash,
      viewport_width: viewport?.width || 1280,
      viewport_height: viewport?.height || 720,
      device_scale_factor: 1.0,
      is_active: true,
      created_by: createdBy
    };

    const { data, error } = await supabaseAdmin
      .from('visual_baselines')
      .insert(baseline)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create baseline: ${error.message}`);
    }

    logger.info('Visual baseline created', LogCategory.BROWSER, {
      projectId,
      url,
      checkpointType
    });

    return data as VisualBaseline;
  }

  /**
   * Update session checkpoint count
   */
  private async updateSessionCheckpointCount(sessionId: string, additionalCheckpoints: number): Promise<void> {
    await supabaseAdmin
      .rpc('increment_checkpoint_count', {
        session_id: sessionId,
        increment_by: additionalCheckpoints
      });
  }

  /**
   * Get visual checkpoint summary for session
   */
  async getVisualCheckpointSummary(sessionId: string): Promise<{
    total_checkpoints: number;
    passed_checkpoints: number;
    failed_checkpoints: number;
    review_needed: number;
    baseline_checkpoints: number;
  }> {
    const { data } = await supabaseAdmin
      .rpc('get_visual_checkpoint_summary', { session_uuid: sessionId });

    return data?.[0] || {
      total_checkpoints: 0,
      passed_checkpoints: 0,
      failed_checkpoints: 0,
      review_needed: 0,
      baseline_checkpoints: 0
    };
  }

  /**
   * Approve or reject visual baseline
   */
  async reviewVisualCheckpoint(
    checkpointId: string,
    action: 'approve_baseline' | 'reject_baseline' | 'update_baseline' | 'ignore_differences',
    userId: string,
    comments?: string
  ): Promise<void> {
    const { data: checkpoint } = await supabaseAdmin
      .from('visual_checkpoints')
      .select('*')
      .eq('id', checkpointId)
      .single();

    if (!checkpoint) {
      throw new Error('Checkpoint not found');
    }

    switch (action) {
      case 'approve_baseline':
        // Create new baseline from current screenshot
        if (checkpoint.screenshot_url) {
          await this.createBaselineFromCheckpoint(checkpoint, userId);
          await supabaseAdmin
            .from('visual_checkpoints')
            .update({ comparison_status: 'baseline' })
            .eq('id', checkpointId);
        }
        break;

      case 'ignore_differences':
        await supabaseAdmin
          .from('visual_checkpoints')
          .update({ comparison_status: 'passed' })
          .eq('id', checkpointId);
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    logger.info('Visual checkpoint reviewed', LogCategory.BROWSER, {
      checkpointId,
      action,
      userId
    });
  }

  /**
   * Create baseline from existing checkpoint
   */
  private async createBaselineFromCheckpoint(checkpoint: VisualCheckpoint, userId: string): Promise<void> {
    // Get project info from session
    const { data: session } = await supabaseAdmin
      .from('domain_crawl_sessions')
      .select('project_id')
      .eq('id', checkpoint.session_id)
      .single();

    if (!session) return;

    // Get page URL
    const { data: page } = await supabaseAdmin
      .from('domain_crawl_pages')
      .select('url')
      .eq('id', checkpoint.page_id)
      .single();

    if (!page) return;

    await this.createBaseline(
      session.project_id,
      page.url,
      checkpoint.checkpoint_type,
      checkpoint.screenshot_url!,
      checkpoint.screenshot_hash!,
      {
        width: checkpoint.viewport_width,
        height: checkpoint.viewport_height
      },
      userId
    );
  }

  /**
   * Emit checkpoint creation event
   */
  private emitCheckpointEvent(sessionId: string, checkpoint: VisualCheckpoint): void {
    this.wsService.emitToUser(sessionId, {
      type: 'visual_checkpoint',
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      data: {
        action: 'checkpoint_created',
        session_id: sessionId,
        checkpoint
      }
    });
  }

  /**
   * Get all checkpoints for a session
   */
  async getSessionCheckpoints(sessionId: string): Promise<VisualCheckpoint[]> {
    const { data } = await supabaseAdmin
      .from('visual_checkpoints')
      .select('*')
      .eq('session_id', sessionId)
      .order('captured_at', { ascending: true });

    return data || [];
  }

  /**
   * Get checkpoints that need review
   */
  async getCheckpointsNeedingReview(projectId: string): Promise<VisualCheckpoint[]> {
    const { data } = await supabaseAdmin
      .from('visual_checkpoints')
      .select(`
        *,
        domain_crawl_sessions!inner(project_id)
      `)
      .eq('domain_crawl_sessions.project_id', projectId)
      .in('comparison_status', ['failed', 'review_needed'])
      .order('captured_at', { ascending: false });

    return data || [];
  }
}