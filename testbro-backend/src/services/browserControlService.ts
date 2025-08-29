import { chromium, firefox, webkit, Browser, Page, BrowserContext, ElementHandle } from 'playwright';
import { 
  BrowserSession, 
  BrowserCommand, 
  LivePreviewState, 
  DOMElement, 
  ConsoleLog, 
  NetworkRequest,
  WebSocketEvent,
  BrowserControlEvent,
  LivePreviewEvent,
  ScreenshotEvent
} from '../types';
import { supabaseAdmin, TABLES } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { WebSocketService } from './websocketService';
import { logger, LogCategory } from './loggingService';

export interface BrowserControlOptions {
  headless?: boolean;
  viewport?: { width: number; height: number };
  recordVideo?: boolean;
  slowMo?: number;
  deviceScaleFactor?: number;
}

export class BrowserControlService {
  private activeSessions = new Map<string, {
    browser: Browser;
    context: BrowserContext;
    page: Page;
    session: BrowserSession;
  }>();
  
  private pendingCommands = new Map<string, BrowserCommand>();
  private wsService: WebSocketService;

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
  }

  /**
   * Create a new browser session
   */
  async createSession(
    projectId: string,
    targetId: string,
    userId: string,
    browserType: 'chromium' | 'firefox' | 'webkit' = 'chromium',
    options: BrowserControlOptions = {}
  ): Promise<BrowserSession> {
    const sessionId = uuidv4();
    
    try {
      // Default options
      const defaultOptions = {
        headless: false,
        viewport: { width: 1280, height: 720 },
        recordVideo: false,
        slowMo: 0,
        deviceScaleFactor: 1,
        ...options
      };

      // Launch browser
      const browser = await this.launchBrowser(browserType, defaultOptions);
      
      // Create context with enhanced options
      const context = await browser.newContext({
        viewport: defaultOptions.viewport,
        recordVideo: defaultOptions.recordVideo ? { 
          dir: path.join(process.cwd(), 'recordings', sessionId),
          size: defaultOptions.viewport
        } : undefined,
        deviceScaleFactor: defaultOptions.deviceScaleFactor,
      });

      // Create page with monitoring
      const page = await context.newPage();
      
      // Set up page monitoring
      await this.setupPageMonitoring(page, sessionId);

      // Create session record
      const session: BrowserSession = {
        id: sessionId,
        project_id: projectId,
        target_id: targetId,
        browser_type: browserType,
        viewport: defaultOptions.viewport,
        status: 'active',
        url: 'about:blank',
        user_id: userId,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
      };

      // Store in database
      const { error } = await supabaseAdmin
        .from('browser_sessions')
        .insert(session);

      if (error) {
        await browser.close();
        throw new Error(`Failed to create session: ${error.message}`);
      }

      // Store in memory
      this.activeSessions.set(sessionId, {
        browser,
        context,
        page,
        session
      });

      logger.info('Browser session created', LogCategory.BROWSER, {
        sessionId,
        browserType,
        projectId,
        userId
      });

      // Emit session created event
      this.emitBrowserControlEvent(sessionId, {
        action: 'pause', // Using pause as closest match for session created
        parameters: { sessionId, browserType, action: 'session_created' }
      });

      return session;

    } catch (error) {
      logger.error('Failed to create browser session', LogCategory.BROWSER, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Navigate to a URL
   */
  async navigate(sessionId: string, url: string, waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'domcontentloaded'): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      await sessionData.page.goto(url, { waitUntil });
      
      // Update session URL
      sessionData.session.url = url;
      sessionData.session.last_activity = new Date().toISOString();
      
      // Update database
      await this.updateSessionInDB(sessionId, { url, last_activity: sessionData.session.last_activity });
      
      // Emit navigation event
      this.emitBrowserControlEvent(sessionId, {
        action: 'navigate',
        parameters: { url, currentUrl: sessionData.page.url() }
      });

      // Emit live preview update
      await this.emitLivePreviewUpdate(sessionId);

      logger.info('Navigation completed', LogCategory.BROWSER, {
        sessionId,
        url,
        currentUrl: sessionData.page.url()
      });

    } catch (error) {
      logger.error('Navigation failed', LogCategory.BROWSER, {
        sessionId,
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Click on an element
   */
  async click(sessionId: string, selector: string, options: { force?: boolean; timeout?: number } = {}): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      const element = await sessionData.page.waitForSelector(selector, { timeout: options.timeout || 30000 });
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      await element.click({ force: options.force });
      
      // Update activity
      sessionData.session.last_activity = new Date().toISOString();
      await this.updateSessionInDB(sessionId, { last_activity: sessionData.session.last_activity });

      // Emit click event
      this.emitBrowserControlEvent(sessionId, {
        action: 'click',
        parameters: { selector, currentUrl: sessionData.page.url() }
      });

      // Update live preview
      await this.emitLivePreviewUpdate(sessionId);

      logger.info('Click completed', LogCategory.BROWSER, {
        sessionId,
        selector
      });

    } catch (error) {
      logger.error('Click failed', LogCategory.BROWSER, {
        sessionId,
        selector,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Type text into an element
   */
  async type(sessionId: string, selector: string, text: string, options: { delay?: number; clear?: boolean } = {}): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      const element = await sessionData.page.waitForSelector(selector, { timeout: 30000 });
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      if (options.clear) {
        await element.selectText();
        await element.press('Delete');
      }

      await element.type(text, { delay: options.delay || 0 });
      
      // Update activity
      sessionData.session.last_activity = new Date().toISOString();
      await this.updateSessionInDB(sessionId, { last_activity: sessionData.session.last_activity });

      // Emit type event
      this.emitBrowserControlEvent(sessionId, {
        action: 'type',
        parameters: { selector, text: text.substring(0, 50) + (text.length > 50 ? '...' : ''), currentUrl: sessionData.page.url() }
      });

      // Update live preview
      await this.emitLivePreviewUpdate(sessionId);

      logger.info('Type completed', LogCategory.BROWSER, {
        sessionId,
        selector,
        textLength: text.length
      });

    } catch (error) {
      logger.error('Type failed', LogCategory.BROWSER, {
        sessionId,
        selector,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Scroll on the page
   */
  async scroll(sessionId: string, x: number, y: number): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      await sessionData.page.mouse.wheel(x, y);
      
      // Update activity
      sessionData.session.last_activity = new Date().toISOString();
      await this.updateSessionInDB(sessionId, { last_activity: sessionData.session.last_activity });

      // Emit scroll event
      this.emitBrowserControlEvent(sessionId, {
        action: 'scroll',
        parameters: { x, y, currentUrl: sessionData.page.url() }
      });

      // Update live preview
      await this.emitLivePreviewUpdate(sessionId);

    } catch (error) {
      logger.error('Scroll failed', LogCategory.BROWSER, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(sessionId: string, options: { fullPage?: boolean; quality?: number } = {}): Promise<string> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      const screenshotDir = path.join(process.cwd(), 'screenshots', sessionId);
      await fs.mkdir(screenshotDir, { recursive: true });
      
      const filename = `screenshot_${Date.now()}.png`;
      const filepath = path.join(screenshotDir, filename);
      
      await sessionData.page.screenshot({
        path: filepath,
        fullPage: options.fullPage || false,
        quality: options.quality || 90
      });

      const screenshotUrl = `/screenshots/${sessionId}/${filename}`;

      // Emit screenshot event
      this.emitScreenshotEvent(sessionId, screenshotUrl);

      return screenshotUrl;

    } catch (error) {
      logger.error('Screenshot failed', LogCategory.BROWSER, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Execute JavaScript in the page
   */
  async evaluate(sessionId: string, script: string): Promise<any> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      const result = await sessionData.page.evaluate(script);
      
      // Update activity
      sessionData.session.last_activity = new Date().toISOString();
      await this.updateSessionInDB(sessionId, { last_activity: sessionData.session.last_activity });

      return result;

    } catch (error) {
      logger.error('Script evaluation failed', LogCategory.BROWSER, {
        sessionId,
        script: script.substring(0, 100),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get DOM elements for live preview
   */
  async getDOMElements(sessionId: string): Promise<DOMElement[]> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      const elements = await sessionData.page.evaluate(`
        () => {
          const allElements = Array.from(document.querySelectorAll('*'));
          const result = [];
          
          for (let i = 0; i < Math.min(allElements.length, 1000); i++) {
            const element = allElements[i];
            const rect = element.getBoundingClientRect();
            
            if (rect.width > 0 && rect.height > 0) {
              const attributes = {};
              for (const attr of Array.from(element.attributes)) {
                attributes[attr.name] = attr.value;
              }

              let selector = element.tagName.toLowerCase();
              if (element.id) {
                selector = '#' + element.id;
              } else if (element.className) {
                selector = element.tagName.toLowerCase() + '.' + element.className.split(' ').join('.');
              }

              const getXPath = (el) => {
                if (el.id) return '//*[@id="' + el.id + '"]';
                if (el === document.body) return '/html/body';
                
                let ix = 0;
                const siblings = el.parentElement?.children || [];
                for (const sibling of Array.from(siblings)) {
                  if (sibling === el) {
                    return getXPath(el.parentElement) + '/' + el.tagName.toLowerCase() + '[' + (ix + 1) + ']';
                  }
                  if (sibling.tagName === el.tagName) ix++;
                }
                return '';
              };

              result.push({
                selector,
                xpath: getXPath(element),
                tag_name: element.tagName.toLowerCase(),
                text_content: element.textContent?.substring(0, 100) || '',
                attributes,
                bounding_box: {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height
                },
                is_visible: rect.width > 0 && rect.height > 0,
                is_clickable: ['button', 'a', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase()) ||
                             element.hasAttribute('onclick') || 
                             getComputedStyle(element).cursor === 'pointer'
              });
            }
          }
          
          return result;
        }
      `) as DOMElement[];

      return elements;

    } catch (error) {
      logger.error('Failed to get DOM elements', LogCategory.BROWSER, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Close a browser session
   */
  async closeSession(sessionId: string): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      await sessionData.browser.close();
      this.activeSessions.delete(sessionId);

      // Update database
      await this.updateSessionInDB(sessionId, { 
        status: 'closed',
        last_activity: new Date().toISOString()
      });

      // Emit session closed event
      this.emitBrowserControlEvent(sessionId, {
        action: 'pause' as const, // Using pause as closest semantic match for session end
        parameters: { sessionId, status: 'closed' }
      });

      logger.info('Browser session closed', LogCategory.BROWSER, {
        sessionId
      });

    } catch (error) {
      logger.error('Failed to close session', LogCategory.BROWSER, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId: string): BrowserSession | null {
    const sessionData = this.activeSessions.get(sessionId);
    return sessionData ? sessionData.session : null;
  }

  // Private helper methods

  private async launchBrowser(browserType: 'chromium' | 'firefox' | 'webkit', options: BrowserControlOptions): Promise<Browser> {
    const launchOptions = {
      headless: options.headless || false,
      slowMo: options.slowMo || 0,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
    };

    switch (browserType) {
      case 'firefox':
        return await firefox.launch(launchOptions);
      case 'webkit':
        return await webkit.launch(launchOptions);
      default:
        return await chromium.launch(launchOptions);
    }
  }

  private async setupPageMonitoring(page: Page, sessionId: string): Promise<void> {
    const consoleLogs: ConsoleLog[] = [];
    const networkRequests: NetworkRequest[] = [];

    // Monitor console logs
    page.on('console', (msg) => {
      const log: ConsoleLog = {
        timestamp: new Date().toISOString(),
        level: msg.type() as any,
        message: msg.text(),
        args: msg.args().map(arg => arg.toString())
      };
      
      consoleLogs.push(log);
      
      // Keep only last 100 logs
      if (consoleLogs.length > 100) {
        consoleLogs.shift();
      }
    });

    // Monitor network requests
    page.on('request', (request) => {
      const networkRequest: NetworkRequest = {
        id: uuidv4(),
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString(),
        headers: request.headers()
      };
      networkRequests.push(networkRequest);
    });

    page.on('response', (response) => {
      const request = networkRequests.find(req => req.url === response.url());
      if (request) {
        request.status = response.status();
        request.response_time_ms = Date.now() - new Date(request.timestamp).getTime();
      }
    });

    // Store references for later access
    (page as any)._consoleLogs = consoleLogs;
    (page as any)._networkRequests = networkRequests;
  }

  private async updateSessionInDB(sessionId: string, updates: Partial<BrowserSession>): Promise<void> {
    const { error } = await supabaseAdmin
      .from('browser_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) {
      logger.error('Failed to update session in database', LogCategory.BROWSER, {
        sessionId,
        error: error.message
      });
    }
  }

  private emitBrowserControlEvent(sessionId: string, data: { action: 'navigate' | 'click' | 'type' | 'scroll' | 'reload' | 'back' | 'forward' | 'pause' | 'resume'; parameters?: Record<string, any> }): void {
    const event = {
      type: 'browser_control' as const,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      data
    };

    this.wsService.emitToSession(sessionId, 'browser_control', event);
  }

  private emitScreenshotEvent(sessionId: string, screenshotUrl: string): void {
    const event = {
      type: 'screenshot' as const,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      data: { screenshot_url: screenshotUrl }
    };

    this.wsService.emitToSession(sessionId, 'screenshot', event);
  }

  private async emitLivePreviewUpdate(sessionId: string): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    try {
      const [domElements, screenshotUrl] = await Promise.all([
        this.getDOMElements(sessionId),
        this.takeScreenshot(sessionId, { fullPage: false })
      ]);

      const livePreviewState: LivePreviewState = {
        session_id: sessionId,
        current_url: sessionData.page.url(),
        page_title: await sessionData.page.title(),
        screenshot_url: screenshotUrl,
        dom_elements: domElements,
        console_logs: (sessionData.page as any)._consoleLogs || [],
        network_activity: (sessionData.page as any)._networkRequests || [],
        timestamp: new Date().toISOString()
      };

      const event = {
        type: 'live_preview' as const,
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        data: livePreviewState
      };

      this.wsService.emitToSession(sessionId, 'live_preview', event);

    } catch (error) {
      logger.error('Failed to emit live preview update', LogCategory.BROWSER, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}