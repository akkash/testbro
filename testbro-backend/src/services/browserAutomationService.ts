import { Browser, BrowserContext, Page, chromium, firefox, webkit } from 'playwright';
import { supabaseAdmin } from '../config/database';
import { logger, LogCategory } from './loggingService';
import path from 'path';
import fs from 'fs/promises';

export interface BrowserSessionConfig {
  browserType: 'chromium' | 'firefox' | 'webkit';
  viewport: { width: number; height: number };
  deviceType: 'desktop' | 'mobile' | 'tablet';
  userAgent?: string;
  headless?: boolean;
  timeout?: number;
}

export interface BrowserAction {
  type: 'click' | 'type' | 'navigate' | 'wait' | 'screenshot' | 'scroll' | 'hover' | 'select' | 'verify';
  selector?: string;
  value?: string;
  coordinates?: { x: number; y: number };
  timeout?: number;
  waitFor?: 'load' | 'networkidle' | 'domcontentloaded';
  options?: any;
}

export interface BrowserActionResult {
  success: boolean;
  error?: string;
  data?: any;
  screenshot?: string;
  duration: number;
  timestamp: string;
}

export interface BrowserSession {
  id: string;
  userId: string;
  projectId?: string;
  testCaseId?: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  config: BrowserSessionConfig;
  status: 'active' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  createdAt: Date;
  lastActivity: Date;
  actionsExecuted: number;
  screenshotsTaken: number;
  errorsEncountered: number;
}

export class BrowserAutomationService {
  private activeSessions: Map<string, BrowserSession> = new Map();
  private screenshotDir: string;
  private maxSessions: number = 10;
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.screenshotDir = process.env.SCREENSHOT_STORAGE_PATH || path.join(process.cwd(), 'screenshots');
    this.maxSessions = parseInt(process.env.BROWSER_POOL_SIZE || '10');
    this.initializeStorage();
    this.startSessionCleanup();
  }

  /**
   * Initialize screenshot storage directory
   */
  private async initializeStorage() {
    try {
      await fs.mkdir(this.screenshotDir, { recursive: true });
      logger.info('Screenshot storage initialized', LogCategory.SYSTEM, { dir: this.screenshotDir });
    } catch (error) {
      logger.error('Failed to initialize screenshot storage', LogCategory.SYSTEM, { error });
    }
  }

  /**
   * Start periodic session cleanup
   */
  private startSessionCleanup() {
    setInterval(async () => {
      await this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Create a new browser session
   */
  async createSession(
    userId: string,
    config: Partial<BrowserSessionConfig> = {},
    options: {
      projectId?: string;
      testCaseId?: string;
    } = {}
  ): Promise<{ sessionId: string; session: BrowserSession }> {
    // Check session limits
    if (this.activeSessions.size >= this.maxSessions) {
      throw new Error(`Maximum browser sessions (${this.maxSessions}) reached`);
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sessionConfig: BrowserSessionConfig = {
      browserType: config.browserType || 'chromium',
      viewport: config.viewport || { width: 1280, height: 720 },
      deviceType: config.deviceType || 'desktop',
      headless: config.headless !== false, // Default to headless
      timeout: config.timeout || 30000,
      ...config,
    };

    try {
      // Launch browser
      const { browser, context, page } = await this.launchBrowser(sessionConfig);

      // Create session object
      const session: BrowserSession = {
        id: sessionId,
        userId,
        projectId: options.projectId,
        testCaseId: options.testCaseId,
        browser,
        context,
        page,
        config: sessionConfig,
        status: 'active',
        createdAt: new Date(),
        lastActivity: new Date(),
        actionsExecuted: 0,
        screenshotsTaken: 0,
        errorsEncountered: 0,
      };

      // Store in memory
      this.activeSessions.set(sessionId, session);

      // Store in database
      await this.saveBrowserSessionToDb(session);

      logger.info('Browser session created', LogCategory.BROWSER, {
        sessionId,
        userId,
        browserType: sessionConfig.browserType,
      });

      return { sessionId, session };
    } catch (error) {
      logger.error('Failed to create browser session', LogCategory.BROWSER, {
        error,
        userId,
        config: sessionConfig,
      });
      throw error;
    }
  }

  /**
   * Execute action in browser session
   */
  async executeAction(
    sessionId: string,
    action: BrowserAction
  ): Promise<BrowserActionResult> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Browser session ${sessionId} not found`);
    }

    if (session.status !== 'active') {
      throw new Error(`Browser session ${sessionId} is not active`);
    }

    const startTime = Date.now();
    let result: BrowserActionResult;

    try {
      // Update last activity
      session.lastActivity = new Date();

      // Execute the action
      switch (action.type) {
        case 'navigate':
          await this.executeNavigate(session.page, action);
          result = { success: true, duration: Date.now() - startTime, timestamp: new Date().toISOString() };
          break;

        case 'click':
          await this.executeClick(session.page, action);
          result = { success: true, duration: Date.now() - startTime, timestamp: new Date().toISOString() };
          break;

        case 'type':
          await this.executeType(session.page, action);
          result = { success: true, duration: Date.now() - startTime, timestamp: new Date().toISOString() };
          break;

        case 'wait':
          await this.executeWait(session.page, action);
          result = { success: true, duration: Date.now() - startTime, timestamp: new Date().toISOString() };
          break;

        case 'screenshot':
          const screenshotPath = await this.executeScreenshot(session, action);
          result = { 
            success: true, 
            data: { screenshotPath },
            screenshot: screenshotPath,
            duration: Date.now() - startTime, 
            timestamp: new Date().toISOString() 
          };
          session.screenshotsTaken++;
          break;

        case 'scroll':
          await this.executeScroll(session.page, action);
          result = { success: true, duration: Date.now() - startTime, timestamp: new Date().toISOString() };
          break;

        case 'hover':
          await this.executeHover(session.page, action);
          result = { success: true, duration: Date.now() - startTime, timestamp: new Date().toISOString() };
          break;

        case 'select':
          await this.executeSelect(session.page, action);
          result = { success: true, duration: Date.now() - startTime, timestamp: new Date().toISOString() };
          break;

        case 'verify':
          const verifyResult = await this.executeVerify(session.page, action);
          result = { 
            success: verifyResult.success, 
            data: verifyResult,
            duration: Date.now() - startTime, 
            timestamp: new Date().toISOString() 
          };
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Update session stats
      session.actionsExecuted++;

      // Update database
      await this.updateBrowserSessionInDb(session);

      logger.info('Browser action executed', LogCategory.BROWSER, {
        sessionId,
        action: action.type,
        duration: result.duration,
        success: result.success,
      });

      return result;

    } catch (error) {
      session.errorsEncountered++;
      
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };

      logger.error('Browser action failed', LogCategory.BROWSER, {
        sessionId,
        action: action.type,
        error,
      });

      // Update database with error
      await this.updateBrowserSessionInDb(session);

      return result;
    }
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<BrowserSession | null> {
    const session = this.activeSessions.get(sessionId);
    return session || null;
  }

  /**
   * Close browser session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Browser session ${sessionId} not found`);
    }

    try {
      // Close browser resources
      await session.context.close();
      await session.browser.close();

      // Update status
      session.status = 'completed';

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      // Update database
      await this.updateBrowserSessionInDb(session);

      logger.info('Browser session closed', LogCategory.BROWSER, { sessionId });
    } catch (error) {
      logger.error('Failed to close browser session', LogCategory.BROWSER, {
        sessionId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get current page information
   */
  async getPageInfo(sessionId: string): Promise<{
    url: string;
    title: string;
    viewport: { width: number; height: number };
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Browser session ${sessionId} not found`);
    }

    return {
      url: session.page.url(),
      title: await session.page.title(),
      viewport: session.page.viewportSize() || session.config.viewport,
    };
  }

  /**
   * Launch browser with configuration
   */
  private async launchBrowser(config: BrowserSessionConfig): Promise<{
    browser: Browser;
    context: BrowserContext;
    page: Page;
  }> {
    let browserLauncher;
    
    switch (config.browserType) {
      case 'firefox':
        browserLauncher = firefox;
        break;
      case 'webkit':
        browserLauncher = webkit;
        break;
      case 'chromium':
      default:
        browserLauncher = chromium;
        break;
    }

    const browser = await browserLauncher.launch({
      headless: config.headless,
      timeout: config.timeout,
    });

    const context = await browser.newContext({
      viewport: config.viewport,
      userAgent: config.userAgent,
    });

    const page = await context.newPage();
    
    // Set default timeout
    page.setDefaultTimeout(config.timeout || 30000);

    return { browser, context, page };
  }

  /**
   * Execute navigation action
   */
  private async executeNavigate(page: Page, action: BrowserAction): Promise<void> {
    if (!action.value) {
      throw new Error('Navigation URL is required');
    }

    await page.goto(action.value, {
      waitUntil: action.waitFor || 'load',
      timeout: action.timeout,
    });
  }

  /**
   * Execute click action
   */
  private async executeClick(page: Page, action: BrowserAction): Promise<void> {
    if (action.coordinates) {
      await page.mouse.click(action.coordinates.x, action.coordinates.y);
    } else if (action.selector) {
      await page.click(action.selector, {
        timeout: action.timeout,
        ...action.options,
      });
    } else {
      throw new Error('Click action requires either selector or coordinates');
    }
  }

  /**
   * Execute type action
   */
  private async executeType(page: Page, action: BrowserAction): Promise<void> {
    if (!action.selector || !action.value) {
      throw new Error('Type action requires selector and value');
    }

    await page.fill(action.selector, action.value, {
      timeout: action.timeout,
    });
  }

  /**
   * Execute wait action
   */
  private async executeWait(page: Page, action: BrowserAction): Promise<void> {
    if (action.selector) {
      // Wait for element
      await page.waitForSelector(action.selector, {
        timeout: action.timeout,
        ...action.options,
      });
    } else if (action.value) {
      // Wait for timeout
      await page.waitForTimeout(parseInt(action.value));
    } else {
      // Default wait for load state
      await page.waitForLoadState(action.waitFor || 'load');
    }
  }

  /**
   * Execute screenshot action
   */
  private async executeScreenshot(session: BrowserSession, action: BrowserAction): Promise<string> {
    const timestamp = Date.now();
    const filename = `screenshot_${session.id}_${timestamp}.png`;
    const filepath = path.join(this.screenshotDir, filename);

    await session.page.screenshot({
      path: filepath,
      fullPage: action.options?.fullPage !== false,
      ...action.options,
    });

    return filepath;
  }

  /**
   * Execute scroll action
   */
  private async executeScroll(page: Page, action: BrowserAction): Promise<void> {
    if (action.selector) {
      await page.locator(action.selector).scrollIntoViewIfNeeded();
    } else if (action.coordinates) {
      await page.mouse.wheel(action.coordinates.x, action.coordinates.y);
    } else {
      // Scroll to bottom by default
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    }
  }

  /**
   * Execute hover action
   */
  private async executeHover(page: Page, action: BrowserAction): Promise<void> {
    if (!action.selector) {
      throw new Error('Hover action requires selector');
    }

    await page.hover(action.selector, {
      timeout: action.timeout,
      ...action.options,
    });
  }

  /**
   * Execute select action
   */
  private async executeSelect(page: Page, action: BrowserAction): Promise<void> {
    if (!action.selector || !action.value) {
      throw new Error('Select action requires selector and value');
    }

    await page.selectOption(action.selector, action.value, {
      timeout: action.timeout,
    });
  }

  /**
   * Execute verify action
   */
  private async executeVerify(page: Page, action: BrowserAction): Promise<{
    success: boolean;
    found: boolean;
    text?: string;
    visible?: boolean;
  }> {
    if (!action.selector) {
      throw new Error('Verify action requires selector');
    }

    try {
      const element = page.locator(action.selector);
      const found = await element.count() > 0;
      
      if (!found) {
        return { success: false, found: false };
      }

      const visible = await element.first().isVisible();
      let text: string | undefined;
      
      if (action.value && visible) {
        text = await element.first().textContent() || '';
        const matches = text.includes(action.value);
        return { success: matches, found: true, text, visible };
      }

      return { success: visible, found: true, visible };
    } catch (error) {
      return { success: false, found: false };
    }
  }

  /**
   * Save browser session to database
   */
  private async saveBrowserSessionToDb(session: BrowserSession): Promise<void> {
    try {
      await supabaseAdmin.from('browser_sessions').insert({
        id: session.id,
        user_id: session.userId,
        project_id: session.projectId,
        test_case_id: session.testCaseId,
        browser_type: session.config.browserType,
        session_status: session.status,
        viewport_width: session.config.viewport.width,
        viewport_height: session.config.viewport.height,
        device_type: session.config.deviceType,
        user_agent: session.config.userAgent,
        session_data: {
          config: session.config,
          currentUrl: session.page.url(),
        },
        actions_executed: session.actionsExecuted,
        screenshots_taken: session.screenshotsTaken,
        errors_encountered: session.errorsEncountered,
        created_at: session.createdAt.toISOString(),
        started_at: session.createdAt.toISOString(),
      });
    } catch (error) {
      logger.error('Failed to save browser session to database', LogCategory.DATABASE, {
        sessionId: session.id,
        error,
      });
    }
  }

  /**
   * Update browser session in database
   */
  private async updateBrowserSessionInDb(session: BrowserSession): Promise<void> {
    try {
      await supabaseAdmin
        .from('browser_sessions')
        .update({
          session_status: session.status,
          session_data: {
            config: session.config,
            currentUrl: session.page.url(),
            pageTitle: await session.page.title().catch(() => ''),
          },
          actions_executed: session.actionsExecuted,
          screenshots_taken: session.screenshotsTaken,
          errors_encountered: session.errorsEncountered,
          updated_at: new Date().toISOString(),
          completed_at: session.status !== 'active' ? new Date().toISOString() : null,
        })
        .eq('id', session.id);
    } catch (error) {
      logger.error('Failed to update browser session in database', LogCategory.DATABASE, {
        sessionId: session.id,
        error,
      });
    }
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.activeSessions) {
      if (now - session.lastActivity.getTime() > this.sessionTimeout) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      try {
        const session = this.activeSessions.get(sessionId);
        if (session) {
          session.status = 'timeout';
          await session.context.close();
          await session.browser.close();
          this.activeSessions.delete(sessionId);
          await this.updateBrowserSessionInDb(session);

          logger.info('Expired browser session cleaned up', LogCategory.BROWSER, { sessionId });
        }
      } catch (error) {
        logger.error('Failed to cleanup expired session', LogCategory.BROWSER, {
          sessionId,
          error,
        });
      }
    }
  }

  /**
   * Create session with simplified interface for visual tests
   */
  async createSessionForVisualTest(config: {
    browser: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
    viewport?: { width: number; height: number };
  }): Promise<{ id: string }> {
    const sessionConfig: Partial<BrowserSessionConfig> = {
      browserType: config.browser,
      viewport: config.viewport || { width: 1280, height: 720 },
      headless: config.headless !== false,
      deviceType: 'desktop'
    };

    const { sessionId } = await this.createSession('system', sessionConfig);
    return { id: sessionId };
  }

  /**
   * Navigate to URL
   */
  async navigateToUrl(sessionId: string, url: string): Promise<void> {
    await this.executeAction(sessionId, {
      type: 'navigate',
      value: url
    });
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(sessionId: string): Promise<string> {
    const result = await this.executeAction(sessionId, {
      type: 'screenshot'
    });
    return result.screenshot || '';
  }

  /**
   * Wait for network idle
   */
  async waitForNetworkIdle(sessionId: string, timeout: number): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Browser session ${sessionId} not found`);
    }

    await session.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Check if element exists
   */
  async elementExists(sessionId: string, selector: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Browser session ${sessionId} not found`);
    }

    try {
      const count = await session.page.locator(selector).count();
      return count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if element is visible
   */
  async elementVisible(sessionId: string, selector: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Browser session ${sessionId} not found`);
    }

    try {
      const element = session.page.locator(selector);
      if (await element.count() === 0) return false;
      return await element.first().isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get element text
   */
  async getElementText(sessionId: string, selector: string): Promise<string> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Browser session ${sessionId} not found`);
    }

    try {
      const element = session.page.locator(selector);
      return await element.first().textContent() || '';
    } catch {
      return '';
    }
  }

  /**
   * Get element value
   */
  async getElementValue(sessionId: string, selector: string): Promise<string> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Browser session ${sessionId} not found`);
    }

    try {
      const element = session.page.locator(selector);
      return await element.first().inputValue() || '';
    } catch {
      return '';
    }
  }

  /**
   * Get element attribute
   */
  async getElementAttribute(sessionId: string, selector: string, attribute: string): Promise<string> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Browser session ${sessionId} not found`);
    }

    try {
      const element = session.page.locator(selector);
      return await element.first().getAttribute(attribute) || '';
    } catch {
      return '';
    }
  }

  /**
   * Get active session statistics
   */
  getStats(): {
    activeSessions: number;
    maxSessions: number;
    sessionsByBrowser: Record<string, number>;
  } {
    const sessionsByBrowser: Record<string, number> = {};
    
    for (const session of this.activeSessions.values()) {
      const browser = session.config.browserType;
      sessionsByBrowser[browser] = (sessionsByBrowser[browser] || 0) + 1;
    }

    return {
      activeSessions: this.activeSessions.size,
      maxSessions: this.maxSessions,
      sessionsByBrowser,
    };
  }
}

// Export singleton instance
export const browserAutomationService = new BrowserAutomationService();
