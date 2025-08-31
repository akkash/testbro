import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { 
  DomainCrawlSession, 
  DomainCrawlPage, 
  DomainCrawlQueue,
  CreateDomainCrawlRequest,
  DomainCrawlProgress,
  BrowserCommand
} from '../types';
import { supabaseAdmin } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { URL } from 'url';
import { WebSocketService } from './websocketService';
import { logger, LogCategory } from './loggingService';
import { QueueService } from './queueService';
import { VisualAIService } from './visualAiService';

export class DomainCrawlerService {
  private activeCrawlSessions = new Map<string, {
    browser: Browser;
    context: BrowserContext;
    session: DomainCrawlSession;
    crawledUrls: Set<string>;
    queuedUrls: Set<string>;
  }>();
  
  private wsService: WebSocketService;
  private queueService: QueueService;
  private visualAIService?: VisualAIService;

  constructor(wsService: WebSocketService, queueService: QueueService, visualAIService?: VisualAIService) {
    this.wsService = wsService;
    this.queueService = queueService;
    this.visualAIService = visualAIService;
  }

  /**
   * Create and start a domain crawl session
   */
  async createDomainCrawlSession(
    request: CreateDomainCrawlRequest,
    userId: string
  ): Promise<DomainCrawlSession> {
    const sessionId = uuidv4();
    
    try {
      // Validate seed URL
      const seedUrl = new URL(request.seed_url);
      
      // Create session record
      const session: DomainCrawlSession = {
        id: sessionId,
        project_id: request.project_id,
        target_id: request.target_id,
        name: request.name,
        seed_url: request.seed_url,
        status: 'pending',
        crawler_config: {
          max_depth: 3,
          max_pages: 50,
          respect_robots_txt: true,
          concurrent_crawlers: 2,
          page_timeout: 30000,
          delay_between_requests: 1000,
          exclude_patterns: [],
          include_patterns: [`${seedUrl.protocol}//${seedUrl.hostname}/*`],
          follow_external_links: false,
          crawl_javascript_pages: true,
          ...request.crawler_config
        },
        visual_ai_config: {
          enabled: true,
          checkpoint_types: ['full_page', 'viewport'],
          ai_confidence_threshold: 0.7,
          comparison_threshold: 0.95,
          auto_create_baselines: true,
          element_detection: true,
          screenshot_format: 'png',
          screenshot_quality: 90,
          ...request.visual_ai_config
        },
        pages_discovered: 0,
        pages_crawled: 0,
        pages_with_visuals: 0,
        total_visual_checkpoints: 0,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Store in database
      const { error } = await supabaseAdmin
        .from('domain_crawl_sessions')
        .insert(session);

      if (error) {
        throw new Error(`Failed to create crawl session: ${error.message}`);
      }

      // Start crawling process
      this.startCrawling(session);

      return session;

    } catch (error) {
      logger.error('Failed to create domain crawl session', LogCategory.BROWSER, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Start the crawling process
   */
  private async startCrawling(session: DomainCrawlSession): Promise<void> {
    try {
      // Launch browser
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'TestBro-Crawler/1.0'
      });

      // Store session data
      this.activeCrawlSessions.set(session.id, {
        browser,
        context,
        session,
        crawledUrls: new Set(),
        queuedUrls: new Set()
      });

      // Update session status
      await this.updateSessionStatus(session.id, 'running');

      // Add seed URL to queue
      await this.addUrlToQueue(session.id, session.seed_url, 0, 10);

      // Start crawling process
      await this.processCrawlQueue(session.id);

    } catch (error) {
      await this.updateSessionStatus(session.id, 'failed', error instanceof Error ? error.message : 'Unknown error');
      logger.error('Failed to start crawling', LogCategory.BROWSER, { sessionId: session.id, error });
    }
  }

  /**
   * Process the crawl queue
   */
  private async processCrawlQueue(sessionId: string): Promise<void> {
    const sessionData = this.activeCrawlSessions.get(sessionId);
    if (!sessionData) return;

    const { session } = sessionData;
    const maxConcurrent = session.crawler_config.concurrent_crawlers || 2;
    
    try {
      while (true) {
        // Get queued URLs
        const { data: queueItems } = await supabaseAdmin
          .from('domain_crawl_queue')
          .select('*')
          .eq('session_id', sessionId)
          .eq('status', 'queued')
          .order('priority', { ascending: false })
          .limit(maxConcurrent);

        if (!queueItems || queueItems.length === 0) {
          // No more URLs to crawl
          await this.completeCrawlSession(sessionId);
          break;
        }

        // Process URLs concurrently
        const crawlPromises = queueItems.map(item => 
          this.crawlSinglePage(sessionId, item)
        );

        await Promise.allSettled(crawlPromises);

        // Add delay between batches
        await this.delay(session.crawler_config.delay_between_requests || 1000);
      }

    } catch (error) {
      await this.updateSessionStatus(sessionId, 'failed', error instanceof Error ? error.message : 'Unknown error');
      logger.error('Failed to process crawl queue', LogCategory.BROWSER, { sessionId, error });
    }
  }

  /**
   * Crawl a single page
   */
  private async crawlSinglePage(sessionId: string, queueItem: DomainCrawlQueue): Promise<void> {
    const sessionData = this.activeCrawlSessions.get(sessionId);
    if (!sessionData) return;

    const { context, session, crawledUrls } = sessionData;
    
    try {
      // Mark as processing
      await supabaseAdmin
        .from('domain_crawl_queue')
        .update({ 
          status: 'processing', 
          started_at: new Date().toISOString() 
        })
        .eq('id', queueItem.id);

      // Skip if already crawled
      if (crawledUrls.has(queueItem.url)) {
        await supabaseAdmin
          .from('domain_crawl_queue')
          .update({ status: 'skipped' })
          .eq('id', queueItem.id);
        return;
      }

      const page = await context.newPage();
      const startTime = Date.now();

      // Navigate to page with timeout
      const response = await page.goto(queueItem.url, { 
        waitUntil: 'networkidle',
        timeout: session.crawler_config.page_timeout || 30000
      });

      const loadTime = Date.now() - startTime;
      crawledUrls.add(queueItem.url);

      // Extract page information
      const pageInfo = await this.extractPageInfo(page, queueItem.url, queueItem.depth);
      
      // Create page record
      const pageRecord: Omit<DomainCrawlPage, 'id' | 'created_at' | 'updated_at'> = {
        session_id: sessionId,
        url: queueItem.url,
        title: pageInfo.title,
        description: pageInfo.description,
        page_type: pageInfo.pageType as 'homepage' | 'category' | 'product' | 'article' | 'contact' | 'about' | 'other',
        depth: queueItem.depth,
        parent_url: queueItem.depth > 0 ? pageInfo.parentUrl : undefined,
        discovered_at: queueItem.queued_at,
        crawled_at: new Date().toISOString(),
        status: 'crawled',
        http_status_code: response?.status(),
        load_time_ms: loadTime,
        page_size_bytes: pageInfo.pageSize,
        resource_count: pageInfo.resourceCount,
        meta_tags: pageInfo.metaTags,
        headings: pageInfo.headings,
        images_count: pageInfo.imagesCount,
        links_count: pageInfo.linksCount
      };

      // Insert page record
      const { data: insertedPage } = await supabaseAdmin
        .from('domain_crawl_pages')
        .insert(pageRecord)
        .select()
        .single();

      // Create visual checkpoints if visual AI is enabled
      if (insertedPage && session.visual_ai_config.enabled && this.visualAIService) {
        try {
          const checkpoints = await this.visualAIService.createVisualCheckpoints(
            sessionId,
            insertedPage.id,
            page,
            session
          );
          
          if (checkpoints.length > 0) {
            await this.updateSessionVisualCount(sessionId, checkpoints.length);
            logger.info('Visual checkpoints created for page', LogCategory.BROWSER, {
              sessionId,
              pageId: insertedPage.id,
              checkpointCount: checkpoints.length
            });
          }
        } catch (error) {
          logger.error('Failed to create visual checkpoints', LogCategory.BROWSER, {
            sessionId,
            pageId: insertedPage.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Extract and queue new URLs
      if (queueItem.depth < (session.crawler_config.max_depth || 3)) {
        await this.extractAndQueueLinks(sessionId, page, queueItem.url, queueItem.depth + 1);
      }

      // Update queue item as completed
      await supabaseAdmin
        .from('domain_crawl_queue')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', queueItem.id);

      // Update session progress
      await this.updateSessionProgress(sessionId);

      // Emit progress event
      await this.emitCrawlProgressEvent(sessionId);

      await page.close();

      logger.info('Page crawled successfully', LogCategory.BROWSER, {
        sessionId,
        url: queueItem.url,
        loadTime,
        depth: queueItem.depth
      });

    } catch (error) {
      // Handle crawl failure
      await supabaseAdmin
        .from('domain_crawl_queue')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', queueItem.id);

      logger.error('Failed to crawl page', LogCategory.BROWSER, {
        sessionId,
        url: queueItem.url,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Extract page information
   */
  private async extractPageInfo(page: Page, url: string, depth: number) {
    const [title, description, metaTags, headings, linksInfo, imagesCount] = await Promise.all([
      page.title(),
      page.locator('meta[name=\"description\"]').getAttribute('content'),
      this.extractMetaTags(page),
      this.extractHeadings(page),
      this.extractLinks(page, url),
      page.locator('img').count()
    ]);

    return {
      title,
      description,
      pageType: this.determinePageType(title, url),
      parentUrl: depth > 0 ? url : undefined,
      pageSize: (await page.content()).length,
      resourceCount: await page.locator('script, link[rel=\"stylesheet\"], img').count(),
      metaTags,
      headings,
      imagesCount,
      linksCount: linksInfo.length,
      links: linksInfo
    };
  }

  /**
   * Extract meta tags from page
   */
  private async extractMetaTags(page: Page): Promise<Record<string, string>> {
    return await page.evaluate(() => {
      const metaTags: Record<string, string> = {};
      // @ts-ignore - document is available in browser context
      const metas = document.querySelectorAll('meta');
      metas.forEach((meta: any) => {
        const name = meta.getAttribute('name') || meta.getAttribute('property');
        const content = meta.getAttribute('content');
        if (name && content) {
          metaTags[name] = content;
        }
      });
      return metaTags;
    });
  }

  /**
   * Extract headings from page
   */
  private async extractHeadings(page: Page) {
    return await page.evaluate(() => {
      const headings: Record<string, string[]> = {
        h1: [], h2: [], h3: [], h4: [], h5: [], h6: []
      };
      
      (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).forEach(tag => {
        // @ts-ignore - document is available in browser context
        const elements = document.querySelectorAll(tag);
        headings[tag] = Array.from(elements).map((el: any) => el.textContent?.trim() || '').filter((text: string) => text);
      });
      
      return headings;
    });
  }

  /**
   * Extract links from page
   */
  private async extractLinks(page: Page, baseUrl: string): Promise<string[]> {
    const links = await page.evaluate(() => {
      // @ts-ignore - document is available in browser context
      return Array.from(document.querySelectorAll('a[href]'))
        .map((a: any) => a.href)
        .filter((href: string) => href && !href.startsWith('mailto:') && !href.startsWith('tel:'));
    });

    // Filter and normalize URLs
    return links
      .map(link => {
        try {
          const url = new URL(link, baseUrl);
          return url.href;
        } catch {
          return null;
        }
      })
      .filter((url): url is string => url !== null);
  }

  /**
   * Determine page type based on URL and title
   */
  private determinePageType(title: string, url: string): string {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    if (urlLower.includes('/product/') || urlLower.includes('/item/')) return 'product';
    if (urlLower.includes('/category/') || urlLower.includes('/shop/')) return 'category';
    if (urlLower.includes('/article/') || urlLower.includes('/blog/')) return 'article';
    if (urlLower.includes('/contact')) return 'contact';
    if (urlLower.includes('/about')) return 'about';
    if (urlLower === new URL(url).origin + '/' || titleLower.includes('home')) return 'homepage';
    
    return 'other';
  }

  /**
   * Extract and queue new links
   */
  private async extractAndQueueLinks(sessionId: string, page: Page, currentUrl: string, depth: number): Promise<void> {
    const sessionData = this.activeCrawlSessions.get(sessionId);
    if (!sessionData) return;

    const { session, crawledUrls, queuedUrls } = sessionData;
    const links = await this.extractLinks(page, currentUrl);
    const baseUrl = new URL(session.seed_url);

    for (const link of links) {
      try {
        const linkUrl = new URL(link);
        
        // Apply filtering rules
        if (!this.shouldCrawlUrl(linkUrl, session, baseUrl)) continue;
        if (crawledUrls.has(link) || queuedUrls.has(link)) continue;

        // Add to queue
        await this.addUrlToQueue(sessionId, link, depth, this.calculateUrlPriority(link, session.seed_url));
        queuedUrls.add(link);

      } catch (error) {
        // Invalid URL, skip
        continue;
      }
    }
  }

  /**
   * Check if URL should be crawled based on config
   */
  private shouldCrawlUrl(url: URL, session: DomainCrawlSession, baseUrl: URL): boolean {
    const { crawler_config } = session;
    
    // Check if external links are allowed
    if (!crawler_config.follow_external_links && url.hostname !== baseUrl.hostname) {
      return false;
    }

    // Check include patterns
    if (crawler_config.include_patterns?.length) {
      const matches = crawler_config.include_patterns.some(pattern => 
        url.href.match(new RegExp(pattern.replace('*', '.*')))
      );
      if (!matches) return false;
    }

    // Check exclude patterns
    if (crawler_config.exclude_patterns?.length) {
      const matches = crawler_config.exclude_patterns.some(pattern => 
        url.href.match(new RegExp(pattern.replace('*', '.*')))
      );
      if (matches) return false;
    }

    return true;
  }

  /**
   * Calculate URL priority for crawling
   */
  private calculateUrlPriority(url: string, seedUrl: string): number {
    let priority = 1;
    
    // Higher priority for same domain
    const urlObj = new URL(url);
    const seedObj = new URL(seedUrl);
    if (urlObj.hostname === seedObj.hostname) priority += 5;
    
    // Higher priority for common page types
    if (url.includes('/product/') || url.includes('/category/')) priority += 3;
    if (url.includes('/about') || url.includes('/contact')) priority += 2;
    
    return priority;
  }

  /**
   * Add URL to crawl queue
   */
  private async addUrlToQueue(sessionId: string, url: string, depth: number, priority: number): Promise<void> {
    const queueItem: Omit<DomainCrawlQueue, 'id' | 'created_at' | 'updated_at'> = {
      session_id: sessionId,
      url,
      depth,
      priority,
      status: 'queued',
      attempts: 0,
      max_attempts: 3,
      queued_at: new Date().toISOString()
    };

    await supabaseAdmin
      .from('domain_crawl_queue')
      .insert(queueItem);
  }

  /**
   * Update session status
   */
  private async updateSessionStatus(sessionId: string, status: DomainCrawlSession['status'], errorMessage?: string): Promise<void> {
    const updates: Partial<DomainCrawlSession> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'running' && !await this.getSession(sessionId).then(s => s?.started_at)) {
      updates.started_at = new Date().toISOString();
    }

    if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString();
      if (updates.started_at) {
        updates.duration_seconds = Math.floor(
          (new Date(updates.completed_at).getTime() - new Date(updates.started_at).getTime()) / 1000
        );
      }
    }

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    await supabaseAdmin
      .from('domain_crawl_sessions')
      .update(updates)
      .eq('id', sessionId);
  }

  /**
   * Update session progress counters
   */
  private async updateSessionProgress(sessionId: string): Promise<void> {
    const { data } = await supabaseAdmin
      .from('domain_crawl_pages')
      .select('status')
      .eq('session_id', sessionId);

    if (data) {
      const crawledCount = data.filter(p => p.status === 'crawled').length;
      
      await supabaseAdmin
        .from('domain_crawl_sessions')
        .update({ 
          pages_crawled: crawledCount,
          pages_discovered: data.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }
  }

  /**
   * Update session visual checkpoint count
   */
  private async updateSessionVisualCount(sessionId: string, additionalCheckpoints: number): Promise<void> {
    const { data: session } = await supabaseAdmin
      .from('domain_crawl_sessions')
      .select('total_visual_checkpoints, pages_with_visuals')
      .eq('id', sessionId)
      .single();

    if (session) {
      await supabaseAdmin
        .from('domain_crawl_sessions')
        .update({
          total_visual_checkpoints: (session.total_visual_checkpoints || 0) + additionalCheckpoints,
          pages_with_visuals: (session.pages_with_visuals || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }
  }

  /**
   * Complete crawl session
   */
  private async completeCrawlSession(sessionId: string): Promise<void> {
    await this.updateSessionStatus(sessionId, 'completed');
    
    // Cleanup browser session
    const sessionData = this.activeCrawlSessions.get(sessionId);
    if (sessionData) {
      await sessionData.browser.close();
      this.activeCrawlSessions.delete(sessionId);
    }

    // Emit completion event
    await this.emitCrawlCompletionEvent(sessionId);

    logger.info('Domain crawl session completed', LogCategory.BROWSER, { sessionId });
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<DomainCrawlSession | null> {
    const { data } = await supabaseAdmin
      .from('domain_crawl_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    return data;
  }

  /**
   * Get crawl progress
   */
  async getCrawlProgress(sessionId: string): Promise<DomainCrawlProgress | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    // Get progress from helper function
    const { data: progressData } = await supabaseAdmin
      .rpc('get_crawl_progress', { session_uuid: sessionId });

    const progress = progressData?.[0];
    if (!progress) return null;

    return {
      session_id: sessionId,
      status: session.status,
      total_pages: progress.total_pages,
      crawled_pages: progress.crawled_pages,
      failed_pages: progress.failed_pages,
      progress_percentage: progress.progress_percentage,
      total_checkpoints: session.total_visual_checkpoints,
      passed_checkpoints: 0, // Will be updated by visual service
      failed_checkpoints: 0,
      review_needed: 0,
      baseline_checkpoints: 0
    };
  }

  /**
   * Emit crawl progress event
   */
  private async emitCrawlProgressEvent(sessionId: string): Promise<void> {
    const progress = await this.getCrawlProgress(sessionId);
    if (progress) {
      this.wsService.emitToUser(sessionId, {
        type: 'domain_crawl',
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        data: {
          action: 'page_crawled',
          session_id: sessionId,
          progress
        }
      });
    }
  }

  /**
   * Emit crawl completion event
   */
  private async emitCrawlCompletionEvent(sessionId: string): Promise<void> {
    this.wsService.emitToUser(sessionId, {
      type: 'domain_crawl',
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      data: {
        action: 'session_completed',
        session_id: sessionId
      }
    });
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}