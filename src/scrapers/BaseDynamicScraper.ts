import puppeteer, { Browser, Page } from 'puppeteer';
import { ScholarshipScraper, RawScholarship, ScraperSourceConfig } from '../types/index.js';
import { RetryHandler } from '../lib/RetryHandler.js';
import { RateLimiter } from '../lib/RateLimiter.js';
import logger from '../config/logger.js';

export abstract class BaseDynamicScraper implements ScholarshipScraper {
  public readonly name: string;
  protected readonly url: string;
  protected readonly config: ScraperSourceConfig;
  protected readonly retryHandler: RetryHandler;
  protected readonly rateLimiter: RateLimiter;
  protected readonly userAgent: string;
  protected browser: Browser | null = null;

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

  protected async initBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    try {
      logger.info(`Initializing browser for ${this.name}`, { scraper: this.name });
      
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });

      logger.debug(`Browser initialized successfully for ${this.name}`, {
        scraper: this.name,
      });

      return this.browser;
    } catch (error) {
      logger.error(`Failed to initialize browser for ${this.name}`, {
        scraper: this.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  protected async createPage(): Promise<Page> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    await page.setUserAgent(this.userAgent);

    await page.setViewport({
      width: 1920,
      height: 1080,
    });

    page.setDefaultTimeout(this.config.timeout);

    logger.debug(`Created new page for ${this.name}`, { scraper: this.name });

    return page;
  }

  protected async navigateToPage(
    page: Page,
    url: string,
    waitUntil: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2' = 'networkidle2'
  ): Promise<void> {
    return this.rateLimiter.throttle(async () => {
      return this.retryHandler.executeWithRetry(async () => {
        logger.info(`Navigating to ${url}`, { scraper: this.name });

        await page.goto(url, {
          waitUntil,
          timeout: this.config.timeout,
        });

        logger.debug(`Successfully navigated to ${url}`, { scraper: this.name });
      });
    });
  }

  protected async waitForSelector(
    page: Page,
    selector: string,
    timeout?: number
  ): Promise<void> {
    try {
      logger.debug(`Waiting for selector: ${selector}`, { scraper: this.name });
      
      await page.waitForSelector(selector, {
        timeout: timeout || this.config.timeout,
      });

      logger.debug(`Selector found: ${selector}`, { scraper: this.name });
    } catch (error) {
      logger.warn(`Selector not found: ${selector}`, {
        scraper: this.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  protected async waitForJavaScript(_page: Page, delay: number = 1000): Promise<void> {
    logger.debug(`Waiting ${delay}ms for JavaScript to render`, { scraper: this.name });
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  protected async scrollToLoadContent(
    page: Page,
    maxScrolls: number = 10,
    scrollDelay: number = 1000
  ): Promise<void> {
    logger.info(`Starting infinite scroll simulation (max: ${maxScrolls})`, {
      scraper: this.name,
    });

    let previousHeight = 0;
    let scrollCount = 0;

    while (scrollCount < maxScrolls) {
      const currentHeight = await page.evaluate(() => {
        // @ts-ignore
        return document.body.scrollHeight;
      });

      if (currentHeight === previousHeight) {
        logger.debug(`Reached end of scrollable content at scroll ${scrollCount}`, {
          scraper: this.name,
        });
        break;
      }

      await page.evaluate(() => {
        // @ts-ignore
        window.scrollTo(0, document.body.scrollHeight);
      });

      logger.debug(`Scrolled to bottom (attempt ${scrollCount + 1}/${maxScrolls})`, {
        scraper: this.name,
      });

      await new Promise(resolve => setTimeout(resolve, scrollDelay));

      previousHeight = currentHeight;
      scrollCount++;
    }

    logger.info(`Completed scrolling after ${scrollCount} attempts`, {
      scraper: this.name,
    });
  }

  protected async clickElement(
    page: Page,
    selector: string,
    waitAfterClick: number = 500
  ): Promise<void> {
    try {
      logger.debug(`Clicking element: ${selector}`, { scraper: this.name });

      await page.click(selector);
      await new Promise(resolve => setTimeout(resolve, waitAfterClick));

      logger.debug(`Successfully clicked element: ${selector}`, {
        scraper: this.name,
      });
    } catch (error) {
      logger.warn(`Failed to click element: ${selector}`, {
        scraper: this.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  protected async hoverElement(
    page: Page,
    selector: string,
    waitAfterHover: number = 500
  ): Promise<void> {
    try {
      logger.debug(`Hovering over element: ${selector}`, { scraper: this.name });

      await page.hover(selector);
      await new Promise(resolve => setTimeout(resolve, waitAfterHover));

      logger.debug(`Successfully hovered over element: ${selector}`, {
        scraper: this.name,
      });
    } catch (error) {
      logger.warn(`Failed to hover over element: ${selector}`, {
        scraper: this.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  protected async extractTextFromElements(
    page: Page,
    selector: string
  ): Promise<string[]> {
    try {
      const texts = await page.$$eval(selector, (elements) =>
        elements.map((el) => el.textContent?.trim() || '')
      );

      logger.debug(`Extracted ${texts.length} text elements from ${selector}`, {
        scraper: this.name,
      });

      return texts;
    } catch (error) {
      logger.warn(`Failed to extract text from ${selector}`, {
        scraper: this.name,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  protected async extractLinksFromElements(
    page: Page,
    selector: string,
    baseUrl: string
  ): Promise<string[]> {
    try {
      const links = await page.$$eval(selector, (elements) =>
        elements.map((el) => (el as any).href || '')
      );

      const normalizedLinks = links.map((link) => this.normalizeUrl(link, baseUrl));

      logger.debug(`Extracted ${normalizedLinks.length} links from ${selector}`, {
        scraper: this.name,
      });

      return normalizedLinks;
    } catch (error) {
      logger.warn(`Failed to extract links from ${selector}`, {
        scraper: this.name,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
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

  protected async closePage(page: Page): Promise<void> {
    try {
      await page.close();
      logger.debug(`Closed page for ${this.name}`, { scraper: this.name });
    } catch (error) {
      logger.warn(`Failed to close page for ${this.name}`, {
        scraper: this.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  protected async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        logger.info(`Closed browser for ${this.name}`, { scraper: this.name });
      } catch (error) {
        logger.error(`Failed to close browser for ${this.name}`, {
          scraper: this.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
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
