import { chromium, Browser, Page } from 'playwright';
import { URL } from 'url';
import { logger, LogCategory } from './loggingService';
import fetch from 'node-fetch';
import * as xml2js from 'xml2js';

export interface SitemapUrl {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  discovered_from: 'sitemap' | 'robots' | 'crawling' | 'manual';
  depth: number;
}

export interface SitemapDiscoveryConfig {
  max_depth: number;
  max_urls: number;
  follow_external_links: boolean;
  respect_robots_txt: boolean;
  include_patterns: string[];
  exclude_patterns: string[];
  discover_sitemaps: boolean;
  crawl_internal_links: boolean;
  timeout_ms: number;
}

export interface SitemapDiscoveryResult {
  urls: SitemapUrl[];
  sitemaps_found: string[];
  robots_txt_content?: string;
  errors: string[];
  discovery_stats: {
    total_urls: number;
    sitemap_urls: number;
    crawled_urls: number;
    filtered_urls: number;
    error_urls: number;
  };
}

export class SitemapDiscoveryService {
  private defaultConfig: SitemapDiscoveryConfig = {
    max_depth: 3,
    max_urls: 1000,
    follow_external_links: false,
    respect_robots_txt: true,
    include_patterns: ['*'],
    exclude_patterns: [
      '*/admin/*', '*/wp-admin/*', '*/login/*', '*/auth/*',
      '*/logout/*', '*/register/*', '*/cart/*', '*/checkout/*',
      '*.pdf', '*.doc', '*.docx', '*.xls', '*.xlsx', '*.ppt',
      '*.zip', '*.tar', '*.gz', '*.mp3', '*.mp4', '*.avi'
    ],
    discover_sitemaps: true,
    crawl_internal_links: true,
    timeout_ms: 30000
  };

  /**
   * Discover all URLs from a website using multiple strategies
   */
  async discoverUrls(
    baseUrl: string, 
    config: Partial<SitemapDiscoveryConfig> = {}
  ): Promise<SitemapDiscoveryResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const result: SitemapDiscoveryResult = {
      urls: [],
      sitemaps_found: [],
      errors: [],
      discovery_stats: {
        total_urls: 0,
        sitemap_urls: 0,
        crawled_urls: 0,
        filtered_urls: 0,
        error_urls: 0
      }
    };

    try {
      const baseUrlObj = new URL(baseUrl);
      const discoveredUrls = new Map<string, SitemapUrl>();

      logger.info('Starting URL discovery', LogCategory.SYSTEM, {
        baseUrl,
        config: finalConfig
      });

      // 1. Check robots.txt and discover sitemaps
      if (finalConfig.discover_sitemaps || finalConfig.respect_robots_txt) {
        await this.processRobotsTxt(baseUrlObj, discoveredUrls, result, finalConfig);
      }

      // 2. Try common sitemap locations
      if (finalConfig.discover_sitemaps) {
        await this.discoverCommonSitemaps(baseUrlObj, discoveredUrls, result);
      }

      // 3. Crawl internal links if enabled
      if (finalConfig.crawl_internal_links) {
        await this.crawlInternalLinks(baseUrlObj, discoveredUrls, result, finalConfig);
      }

      // 4. Filter and validate URLs
      result.urls = Array.from(discoveredUrls.values())
        .filter(url => this.shouldIncludeUrl(url.url, finalConfig))
        .slice(0, finalConfig.max_urls);

      // Update stats
      result.discovery_stats.total_urls = result.urls.length;
      result.discovery_stats.sitemap_urls = result.urls.filter(u => u.discovered_from === 'sitemap').length;
      result.discovery_stats.crawled_urls = result.urls.filter(u => u.discovered_from === 'crawling').length;

      logger.info('URL discovery completed', LogCategory.SYSTEM, {
        baseUrl,
        stats: result.discovery_stats
      });

    } catch (error) {
      const errorMsg = `URL discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      logger.error(errorMsg, LogCategory.SYSTEM, { baseUrl, error });
    }

    return result;
  }

  /**
   * Process robots.txt file
   */
  private async processRobotsTxt(
    baseUrl: URL,
    discoveredUrls: Map<string, SitemapUrl>,
    result: SitemapDiscoveryResult,
    config: SitemapDiscoveryConfig
  ): Promise<void> {
    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();
      const response = await fetch(robotsUrl, {
        timeout: config.timeout_ms,
        headers: { 'User-Agent': 'TestBro-SitemapDiscovery/1.0' }
      });

      if (response.ok) {
        const robotsContent = await response.text();
        result.robots_txt_content = robotsContent;

        // Extract sitemap URLs from robots.txt
        const sitemapMatches = robotsContent.match(/sitemap:\s*(.+)/gi);
        if (sitemapMatches) {
          for (const match of sitemapMatches) {
            const sitemapUrl = match.replace(/sitemap:\s*/i, '').trim();
            try {
              const absoluteSitemapUrl = new URL(sitemapUrl, baseUrl).toString();
              result.sitemaps_found.push(absoluteSitemapUrl);
              await this.processSitemap(absoluteSitemapUrl, discoveredUrls, config);
            } catch (error) {
              result.errors.push(`Invalid sitemap URL in robots.txt: ${sitemapUrl}`);
            }
          }
        }

        logger.info('Processed robots.txt', LogCategory.SYSTEM, {
          robotsUrl,
          sitemapsFound: result.sitemaps_found.length
        });
      }
    } catch (error) {
      const errorMsg = `Failed to process robots.txt: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      logger.warn(errorMsg, LogCategory.SYSTEM);
    }
  }

  /**
   * Discover sitemaps from common locations
   */
  private async discoverCommonSitemaps(
    baseUrl: URL,
    discoveredUrls: Map<string, SitemapUrl>,
    result: SitemapDiscoveryResult
  ): Promise<void> {
    const commonSitemapPaths = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap.xml.gz',
      '/sitemaps.xml',
      '/wp-sitemap.xml',
      '/sitemap/sitemap.xml'
    ];

    for (const path of commonSitemapPaths) {
      try {
        const sitemapUrl = new URL(path, baseUrl).toString();
        const response = await fetch(sitemapUrl, {
          timeout: 10000,
          headers: { 'User-Agent': 'TestBro-SitemapDiscovery/1.0' }
        });

        if (response.ok && !result.sitemaps_found.includes(sitemapUrl)) {
          result.sitemaps_found.push(sitemapUrl);
          await this.processSitemap(sitemapUrl, discoveredUrls, this.defaultConfig);
        }
      } catch (error) {
        // Silently ignore errors for common sitemap discovery
      }
    }
  }

  /**
   * Process a sitemap XML file
   */
  private async processSitemap(
    sitemapUrl: string,
    discoveredUrls: Map<string, SitemapUrl>,
    config: SitemapDiscoveryConfig
  ): Promise<void> {
    try {
      const response = await fetch(sitemapUrl, {
        timeout: config.timeout_ms,
        headers: { 'User-Agent': 'TestBro-SitemapDiscovery/1.0' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let content = await response.text();

      // Handle gzipped content
      if (sitemapUrl.endsWith('.gz')) {
        const zlib = await import('zlib');
        content = zlib.gunzipSync(Buffer.from(content, 'binary')).toString();
      }

      // Parse XML
      const parser = new xml2js.Parser();
      const parsed = await parser.parseStringPromise(content);

      // Handle sitemap index
      if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
        for (const sitemap of parsed.sitemapindex.sitemap) {
          if (sitemap.loc && sitemap.loc[0]) {
            await this.processSitemap(sitemap.loc[0], discoveredUrls, config);
          }
        }
        return;
      }

      // Handle regular sitemap
      if (parsed.urlset && parsed.urlset.url) {
        for (const urlEntry of parsed.urlset.url) {
          if (urlEntry.loc && urlEntry.loc[0]) {
            const url = urlEntry.loc[0];
            const sitemapUrlObj: SitemapUrl = {
              url,
              lastmod: urlEntry.lastmod ? urlEntry.lastmod[0] : undefined,
              changefreq: urlEntry.changefreq ? urlEntry.changefreq[0] : undefined,
              priority: urlEntry.priority ? parseFloat(urlEntry.priority[0]) : undefined,
              discovered_from: 'sitemap',
              depth: 0
            };

            if (!discoveredUrls.has(url)) {
              discoveredUrls.set(url, sitemapUrlObj);
            }
          }
        }
      }

      logger.info('Processed sitemap', LogCategory.SYSTEM, {
        sitemapUrl,
        urlsFound: parsed.urlset?.url?.length || 0
      });

    } catch (error) {
      const errorMsg = `Failed to process sitemap ${sitemapUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.warn(errorMsg, LogCategory.SYSTEM);
    }
  }

  /**
   * Crawl internal links from web pages
   */
  private async crawlInternalLinks(
    baseUrl: URL,
    discoveredUrls: Map<string, SitemapUrl>,
    result: SitemapDiscoveryResult,
    config: SitemapDiscoveryConfig
  ): Promise<void> {
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: 'TestBro-SitemapDiscovery/1.0'
      });
      const page = await context.newPage();

      const crawledUrls = new Set<string>();
      const urlQueue = [{ url: baseUrl.toString(), depth: 0 }];

      while (urlQueue.length > 0 && crawledUrls.size < config.max_urls) {
        const { url, depth } = urlQueue.shift()!;

        if (crawledUrls.has(url) || depth > config.max_depth) {
          continue;
        }

        try {
          await page.goto(url, { 
            waitUntil: 'domcontentloaded', 
            timeout: config.timeout_ms 
          });

          crawledUrls.add(url);

          // Add to discovered URLs if not already present
          if (!discoveredUrls.has(url)) {
            discoveredUrls.set(url, {
              url,
              discovered_from: 'crawling',
              depth
            });
          }

          // Extract links from the page
          const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
              .map(link => (link as HTMLAnchorElement).href)
              .filter(href => href && href.startsWith('http'));
          });

          // Add internal links to queue
          for (const link of links) {
            try {
              const linkUrl = new URL(link);
              if (linkUrl.hostname === baseUrl.hostname && 
                  !crawledUrls.has(link) && 
                  this.shouldIncludeUrl(link, config)) {
                urlQueue.push({ url: link, depth: depth + 1 });
              }
            } catch (error) {
              // Invalid URL, skip
            }
          }

        } catch (error) {
          result.errors.push(`Failed to crawl ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.discovery_stats.error_urls++;
        }
      }

      logger.info('Completed internal link crawling', LogCategory.SYSTEM, {
        baseUrl: baseUrl.toString(),
        crawledPages: crawledUrls.size,
        discoveredUrls: discoveredUrls.size
      });

    } catch (error) {
      const errorMsg = `Internal link crawling failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      logger.error(errorMsg, LogCategory.SYSTEM);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Check if URL should be included based on patterns
   */
  private shouldIncludeUrl(url: string, config: SitemapDiscoveryConfig): boolean {
    // Check exclude patterns first
    for (const pattern of config.exclude_patterns) {
      if (this.matchesPattern(url, pattern)) {
        return false;
      }
    }

    // Check include patterns
    if (config.include_patterns.length === 0) {
      return true;
    }

    for (const pattern of config.include_patterns) {
      if (this.matchesPattern(url, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Simple pattern matching (supports * wildcards)
   */
  private matchesPattern(url: string, pattern: string): boolean {
    if (pattern === '*') {
      return true;
    }

    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
      .replace(/\*/g, '.*'); // Replace * with .*

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(url);
  }

  /**
   * Get sitemap URLs for a domain
   */
  async getSitemaps(baseUrl: string): Promise<string[]> {
    const result = await this.discoverUrls(baseUrl, {
      discover_sitemaps: true,
      crawl_internal_links: false,
      max_urls: 0
    });

    return result.sitemaps_found;
  }

  /**
   * Validate URLs by checking HTTP status
   */
  async validateUrls(urls: SitemapUrl[]): Promise<{ valid: SitemapUrl[], invalid: SitemapUrl[] }> {
    const valid: SitemapUrl[] = [];
    const invalid: SitemapUrl[] = [];

    const validateBatch = async (batch: SitemapUrl[]) => {
      const promises = batch.map(async (urlObj) => {
        try {
          const response = await fetch(urlObj.url, { 
            method: 'HEAD',
            timeout: 10000,
            headers: { 'User-Agent': 'TestBro-SitemapDiscovery/1.0' }
          });
          
          if (response.ok) {
            valid.push(urlObj);
          } else {
            invalid.push(urlObj);
          }
        } catch (error) {
          invalid.push(urlObj);
        }
      });

      await Promise.allSettled(promises);
    };

    // Process in batches to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      await validateBatch(batch);
      
      // Add delay between batches
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info('URL validation completed', LogCategory.SYSTEM, {
      total: urls.length,
      valid: valid.length,
      invalid: invalid.length
    });

    return { valid, invalid };
  }
}
