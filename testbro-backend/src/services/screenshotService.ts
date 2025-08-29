import { Page, ElementHandle } from 'playwright';
import { logger, LogCategory } from './loggingService';
import { WebSocketService } from './websocketService';
import { ScreenshotEvent } from '../types';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

export interface ScreenshotOptions {
  fullPage?: boolean;
  quality?: number; // 1-100 for JPEG, ignored for PNG
  format?: 'png' | 'jpeg';
  width?: number;
  height?: number;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  omitBackground?: boolean;
  animations?: 'disabled' | 'allow';
  caret?: 'hide' | 'initial';
  threshold?: number; // For comparing screenshots
  stepNumber?: number;
  actionId?: string;
}

export interface ScreenshotMetadata {
  sessionId: string;
  stepNumber?: number;
  actionId?: string;
  timestamp: string;
  url: string;
  viewport: {
    width: number;
    height: number;
  };
  format: string;
  fileSize: number;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface ScreenshotComparison {
  similarity: number; // 0-1, where 1 is identical
  differenceImageUrl?: string;
  differenceCount: number;
  threshold: number;
}

export class ScreenshotService {
  private wsService: WebSocketService;
  private screenshotCache = new Map<string, ScreenshotMetadata>();

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
  }

  /**
   * Take a screenshot of the current page
   */
  async takeScreenshot(
    page: Page,
    sessionId: string,
    options: ScreenshotOptions = {}
  ): Promise<{ url: string; metadata: ScreenshotMetadata }> {
    try {
      const defaultOptions: ScreenshotOptions = {
        fullPage: false,
        quality: 90,
        format: 'png',
        omitBackground: false,
        animations: 'disabled',
        caret: 'hide',
        ...options
      };

      // Create directory for screenshots
      const screenshotDir = path.join(process.cwd(), 'screenshots', sessionId);
      await fs.mkdir(screenshotDir, { recursive: true });

      // Generate filename
      const timestamp = Date.now();
      const stepSuffix = options.stepNumber ? `_step_${options.stepNumber}` : '';
      const actionSuffix = options.actionId ? `_action_${options.actionId}` : '';
      const filename = `screenshot_${timestamp}${stepSuffix}${actionSuffix}.${defaultOptions.format}`;
      const filepath = path.join(screenshotDir, filename);

      // Get page info for metadata
      const [url, viewport] = await Promise.all([
        page.url(),
        page.viewportSize()
      ]);

      // Disable animations if requested
      if (defaultOptions.animations === 'disabled') {
        await page.addStyleTag({
          content: `
            *, *::before, *::after {
              animation-duration: 0s !important;
              animation-delay: 0s !important;
              transition-duration: 0s !important;
              transition-delay: 0s !important;
            }
          `
        });
      }

      // Take screenshot
      const screenshotBuffer = await page.screenshot({
        path: filepath,
        fullPage: defaultOptions.fullPage,
        quality: defaultOptions.format === 'jpeg' ? defaultOptions.quality : undefined,
        type: defaultOptions.format,
        clip: defaultOptions.clip,
        omitBackground: defaultOptions.omitBackground,
        animations: defaultOptions.animations,
        caret: defaultOptions.caret
      });

      // Get image dimensions and file size
      const stats = await fs.stat(filepath);
      const imageMetadata = await sharp(screenshotBuffer).metadata();

      const metadata: ScreenshotMetadata = {
        sessionId,
        stepNumber: options.stepNumber,
        actionId: options.actionId,
        timestamp: new Date().toISOString(),
        url,
        viewport: viewport || { width: 1280, height: 720 },
        format: defaultOptions.format,
        fileSize: stats.size,
        dimensions: {
          width: imageMetadata.width || 0,
          height: imageMetadata.height || 0
        }
      };

      const screenshotUrl = `/screenshots/${sessionId}/${filename}`;
      
      // Cache metadata
      this.screenshotCache.set(screenshotUrl, metadata);

      // Emit screenshot event
      this.emitScreenshotEvent(sessionId, screenshotUrl, metadata);

      logger.debug('Screenshot captured', LogCategory.BROWSER, {
        sessionId,
        filename,
        fileSize: stats.size,
        dimensions: metadata.dimensions
      });

      return { url: screenshotUrl, metadata };

    } catch (error) {
      logger.error('Failed to take screenshot', LogCategory.BROWSER, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Take a screenshot of a specific element
   */
  async takeElementScreenshot(
    page: Page,
    selector: string,
    sessionId: string,
    options: ScreenshotOptions = {}
  ): Promise<{ url: string; metadata: ScreenshotMetadata }> {
    try {
      const element = await page.waitForSelector(selector, { timeout: 5000 });
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      // Get element bounding box
      const boundingBox = await element.boundingBox();
      if (!boundingBox) {
        throw new Error(`Element has no bounding box: ${selector}`);
      }

      // Add padding around element
      const padding = 10;
      const clip = {
        x: Math.max(0, boundingBox.x - padding),
        y: Math.max(0, boundingBox.y - padding),
        width: boundingBox.width + (padding * 2),
        height: boundingBox.height + (padding * 2)
      };

      return await this.takeScreenshot(page, sessionId, { ...options, clip });

    } catch (error) {
      logger.error('Failed to take element screenshot', LogCategory.BROWSER, {
        sessionId,
        selector,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Take a full page screenshot with scroll
   */
  async takeFullPageScreenshot(
    page: Page,
    sessionId: string,
    options: ScreenshotOptions = {}
  ): Promise<{ url: string; metadata: ScreenshotMetadata }> {
    return await this.takeScreenshot(page, sessionId, { ...options, fullPage: true });
  }

  /**
   * Take multiple screenshots during an action (before, during, after)
   */
  async takeActionScreenshots(
    page: Page,
    sessionId: string,
    actionId: string,
    stepNumber: number
  ): Promise<{
    before: { url: string; metadata: ScreenshotMetadata };
    after: { url: string; metadata: ScreenshotMetadata };
  }> {
    try {
      // Take before screenshot
      const before = await this.takeScreenshot(page, sessionId, {
        stepNumber,
        actionId: `${actionId}_before`
      });

      // Wait a moment for any immediate changes
      await page.waitForTimeout(100);

      // Take after screenshot
      const after = await this.takeScreenshot(page, sessionId, {
        stepNumber,
        actionId: `${actionId}_after`
      });

      return { before, after };

    } catch (error) {
      logger.error('Failed to take action screenshots', LogCategory.BROWSER, {
        sessionId,
        actionId,
        stepNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Compare two screenshots and return similarity score
   */
  async compareScreenshots(
    screenshotUrl1: string,
    screenshotUrl2: string,
    threshold: number = 0.1
  ): Promise<ScreenshotComparison> {
    try {
      // Convert URLs to file paths
      const filepath1 = this.urlToFilePath(screenshotUrl1);
      const filepath2 = this.urlToFilePath(screenshotUrl2);

      // Read both images
      const [image1, image2] = await Promise.all([
        sharp(filepath1).raw().toBuffer({ resolveWithObject: true }),
        sharp(filepath2).raw().toBuffer({ resolveWithObject: true })
      ]);

      // Ensure both images have the same dimensions
      if (image1.info.width !== image2.info.width || image1.info.height !== image2.info.height) {
        // Resize to match the smaller dimensions
        const targetWidth = Math.min(image1.info.width, image2.info.width);
        const targetHeight = Math.min(image1.info.height, image2.info.height);

        const [resized1, resized2] = await Promise.all([
          sharp(filepath1).resize(targetWidth, targetHeight).raw().toBuffer(),
          sharp(filepath2).resize(targetWidth, targetHeight).raw().toBuffer()
        ]);

        return this.calculateSimilarity(resized1, resized2, targetWidth, targetHeight, threshold);
      }

      return this.calculateSimilarity(
        image1.data,
        image2.data,
        image1.info.width,
        image1.info.height,
        threshold
      );

    } catch (error) {
      logger.error('Failed to compare screenshots', LogCategory.BROWSER, {
        screenshotUrl1,
        screenshotUrl2,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        similarity: 0,
        differenceCount: 0,
        threshold
      };
    }
  }

  /**
   * Create a visual diff between two screenshots
   */
  async createDiffImage(
    screenshotUrl1: string,
    screenshotUrl2: string,
    outputPath?: string
  ): Promise<string> {
    try {
      const filepath1 = this.urlToFilePath(screenshotUrl1);
      const filepath2 = this.urlToFilePath(screenshotUrl2);

      // Read both images
      const [image1, image2] = await Promise.all([
        sharp(filepath1).raw().toBuffer({ resolveWithObject: true }),
        sharp(filepath2).raw().toBuffer({ resolveWithObject: true })
      ]);

      const width = Math.min(image1.info.width, image2.info.width);
      const height = Math.min(image1.info.height, image2.info.height);

      // Create diff buffer
      const diffBuffer = Buffer.alloc(width * height * 3); // RGB
      const data1 = image1.data;
      const data2 = image2.data;

      for (let i = 0; i < width * height; i++) {
        const idx = i * 3;
        const r1 = data1[idx];
        const g1 = data1[idx + 1];
        const b1 = data1[idx + 2];
        const r2 = data2[idx];
        const g2 = data2[idx + 1];
        const b2 = data2[idx + 2];

        // Calculate difference
        const dr = Math.abs(r1 - r2);
        const dg = Math.abs(g1 - g2);
        const db = Math.abs(b1 - b2);

        // Highlight differences in red
        if (dr > 10 || dg > 10 || db > 10) {
          diffBuffer[idx] = 255; // Red
          diffBuffer[idx + 1] = 0;
          diffBuffer[idx + 2] = 0;
        } else {
          // Keep original grayscale
          const gray = Math.round((r1 + g1 + b1) / 3);
          diffBuffer[idx] = gray;
          diffBuffer[idx + 1] = gray;
          diffBuffer[idx + 2] = gray;
        }
      }

      // Save diff image
      const diffPath = outputPath || path.join(
        path.dirname(filepath1),
        `diff_${Date.now()}.png`
      );

      await sharp(diffBuffer, { raw: { width, height, channels: 3 } })
        .png()
        .toFile(diffPath);

      // Convert to URL
      const diffUrl = this.filePathToUrl(diffPath);
      
      return diffUrl;

    } catch (error) {
      logger.error('Failed to create diff image', LogCategory.BROWSER, {
        screenshotUrl1,
        screenshotUrl2,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Optimize screenshot file size
   */
  async optimizeScreenshot(screenshotUrl: string, quality: number = 80): Promise<string> {
    try {
      const filepath = this.urlToFilePath(screenshotUrl);
      const optimizedPath = filepath.replace(/\.(png|jpg|jpeg)$/, '_optimized.$1');

      const image = sharp(filepath);
      const metadata = await image.metadata();

      if (metadata.format === 'png') {
        await image
          .png({ quality, compressionLevel: 9 })
          .toFile(optimizedPath);
      } else {
        await image
          .jpeg({ quality, mozjpeg: true })
          .toFile(optimizedPath);
      }

      return this.filePathToUrl(optimizedPath);

    } catch (error) {
      logger.error('Failed to optimize screenshot', LogCategory.BROWSER, {
        screenshotUrl,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create a screenshot thumbnail
   */
  async createThumbnail(
    screenshotUrl: string,
    width: number = 300,
    height: number = 200
  ): Promise<string> {
    try {
      const filepath = this.urlToFilePath(screenshotUrl);
      const thumbnailPath = filepath.replace(/\.(png|jpg|jpeg)$/, '_thumb.$1');

      await sharp(filepath)
        .resize(width, height, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      return this.filePathToUrl(thumbnailPath);

    } catch (error) {
      logger.error('Failed to create thumbnail', LogCategory.BROWSER, {
        screenshotUrl,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get screenshot metadata
   */
  getScreenshotMetadata(screenshotUrl: string): ScreenshotMetadata | null {
    return this.screenshotCache.get(screenshotUrl) || null;
  }

  /**
   * Clean up old screenshots
   */
  async cleanupOldScreenshots(sessionId: string, olderThanDays: number = 7): Promise<number> {
    try {
      const screenshotDir = path.join(process.cwd(), 'screenshots', sessionId);
      const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
      
      const files = await fs.readdir(screenshotDir);
      let deletedCount = 0;

      for (const file of files) {
        const filepath = path.join(screenshotDir, file);
        const stats = await fs.stat(filepath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filepath);
          deletedCount++;
          
          // Remove from cache
          const url = `/screenshots/${sessionId}/${file}`;
          this.screenshotCache.delete(url);
        }
      }

      logger.info('Cleaned up old screenshots', LogCategory.SYSTEM, {
        sessionId,
        deletedCount,
        olderThanDays
      });

      return deletedCount;

    } catch (error) {
      logger.error('Failed to cleanup screenshots', LogCategory.SYSTEM, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  // Private helper methods

  private calculateSimilarity(
    data1: Buffer,
    data2: Buffer,
    width: number,
    height: number,
    threshold: number
  ): ScreenshotComparison {
    const totalPixels = width * height;
    let differentPixels = 0;

    for (let i = 0; i < totalPixels * 3; i += 3) {
      const r1 = data1[i];
      const g1 = data1[i + 1];
      const b1 = data1[i + 2];
      const r2 = data2[i];
      const g2 = data2[i + 1];
      const b2 = data2[i + 2];

      const diff = Math.sqrt(
        Math.pow(r1 - r2, 2) + 
        Math.pow(g1 - g2, 2) + 
        Math.pow(b1 - b2, 2)
      ) / Math.sqrt(3 * Math.pow(255, 2));

      if (diff > threshold) {
        differentPixels++;
      }
    }

    const similarity = 1 - (differentPixels / totalPixels);
    
    return {
      similarity,
      differenceCount: differentPixels,
      threshold
    };
  }

  private urlToFilePath(url: string): string {
    // Convert URL like "/screenshots/session123/file.png" to file path
    return path.join(process.cwd(), url.substring(1));
  }

  private filePathToUrl(filepath: string): string {
    // Convert file path to URL
    const relativePath = path.relative(process.cwd(), filepath);
    return '/' + relativePath.replace(/\\/g, '/');
  }

  private emitScreenshotEvent(sessionId: string, screenshotUrl: string, metadata: ScreenshotMetadata): void {
    const event = {
      type: 'screenshot' as const,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      data: {
        screenshot_url: screenshotUrl,
        action_id: metadata.actionId,
        step_order: metadata.stepNumber
      }
    };

    this.wsService.emitToSession(sessionId, 'screenshot', event);
  }
}