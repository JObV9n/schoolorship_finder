import fetch, { Response } from 'node-fetch';
import * as cheerio from 'cheerio';
import { ScholarshipScraper, RawScholarship, ScraperSourceConfig } from '../types/index.js';
import { RetryHandler } from '../lib/RetryHandler.js';
import { RateLimiter } from '../lib/RateLimiter.js';
import logger from '../config/logger.js';

export abstract class BaseStaticScraper implements ScholarshipScraper {
  public readonly name: string;
  protected readonly url: string;
  protected readonly config: ScraperSourceConfig;
  protected readonly retryHandler: RetryHandler;
  protected readonly rateLimiter: RateLimiter;
  protected readonly userAgent: string;

  constructor(config: ScraperSourceConfig, userAgent: string) {
    this.name = config.name;
    this.url = config.url;
    this.config = config;
    this.userAgent = userAgent;
    
    this.retryHandler = new RetryHandler({
      retries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
    });
    
    this.rateLimiter = new RateLimiter({
      requestsPerSecond: config.rateLimit,
    });
  }

  abstract scrape(): Promise<RawScholarship[]>;

  protected async fetchHTML(url: string): Promise<string> {
    return this.rateLimiter.throttle(async () => {
      return this.retryHandler.executeWithRetry(async () => {
        logger.info(`Fetching URL: ${url}`, { scraper: this.name });

        const response = await this.makeRequest(url);

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: ${response.statusText} for ${url}`
          );
        }

        const html = await response.text();
        logger.debug(`Successfully fetched ${html.length} bytes from ${url}`, {
          scraper: this.name,
        });

        return html;
      });
    });
  }

  private async makeRequest(url: string): Promise<Response> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        },
      });

      return response;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Network error fetching ${url}`, {
          scraper: this.name,
          error: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  }

  protected parseHTML(html: string): any {
    return cheerio.load(html);
  }

  protected extractText(element: any): string {
    return element.text().trim();
  }

  protected extractLink(element: any, baseUrl: string): string {
    const href = element.attr('href') || '';
    return this.normalizeUrl(href, baseUrl);
  }

  protected normalizeUrl(url: string, baseUrl: string): string {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }

      const base = new URL(baseUrl);
      const resolved = new URL(url, base);
      return resolved.toString();
    } catch (error) {
      logger.warn(`Failed to normalize URL: ${url}`, {
        scraper: this.name,
        baseUrl,
      });
      return url;
    }
  }

  protected handleError(error: Error, context: string): void {
    logger.error(`Error in ${this.name} scraper: ${context}`, {
      scraper: this.name,
      error: error.message,
      stack: error.stack,
      context,
    });
  }
}
