import { Page } from 'puppeteer';
import { BaseDynamicScraper } from './BaseDynamicScraper.js';
import { RawScholarship, ScraperSourceConfig } from '../types/index.js';
import logger from '../config/logger.js';

export interface GovernmentPortalConfig extends ScraperSourceConfig {
  country: string;
  selectors: {
    container: string;
    name: string;
    deadline?: string;
    link: string;
    degree?: string;
    description?: string;
    amount?: string;
  };
  pagination?: {
    enabled: boolean;
    nextButtonSelector?: string;
    maxPages?: number;
  };
  sections?: {
    enabled: boolean;
    sectionSelector?: string;
    maxSections?: number;
  };
}

export class GovernmentPortalScraper extends BaseDynamicScraper {
  private readonly portalConfig: GovernmentPortalConfig;

  constructor(config: GovernmentPortalConfig, userAgent: string) {
    super(config, userAgent);
    this.portalConfig = config;
  }

  async scrape(): Promise<RawScholarship[]> {
    let page: Page | null = null;

    try {
      logger.info(`Starting ${this.portalConfig.country} government portal scraper`, {
        scraper: this.name,
        country: this.portalConfig.country,
      });

      page = await this.createPage();
      await this.navigateToPage(page, this.url);

      await this.waitForJavaScript(page, 2000);

      const scholarships: RawScholarship[] = [];

      if (this.portalConfig.sections?.enabled) {
        const sectionScholarships = await this.scrapeMultipleSections(page);
        scholarships.push(...sectionScholarships);
      } else {
        const pageScholarships = await this.scrapeWithPagination(page);
        scholarships.push(...pageScholarships);
      }

      logger.info(
        `${this.portalConfig.country} government portal scraper completed: ${scholarships.length} scholarships found`,
        {
          scraper: this.name,
          country: this.portalConfig.country,
          totalScholarships: scholarships.length,
        }
      );

      return scholarships;
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        `${this.portalConfig.country} government portal scraping failed`
      );
      return [];
    } finally {
      if (page) {
        await this.closePage(page);
      }
      await this.closeBrowser();
    }
  }

  private async scrapeMultipleSections(page: Page): Promise<RawScholarship[]> {
    const scholarships: RawScholarship[] = [];
    const sectionConfig = this.portalConfig.sections;

    if (!sectionConfig?.sectionSelector) {
      logger.warn(`Section selector not configured, falling back to single page scrape`, {
        scraper: this.name,
      });
      return await this.scrapeWithPagination(page);
    }

    try {
      const sectionLinks = await page.evaluate((selector) => {
        // @ts-ignore
        const sections = document.querySelectorAll(selector);
        return Array.from(sections).map((section: any) => section.href || '').filter(Boolean);
      }, sectionConfig.sectionSelector);

      const maxSections = sectionConfig.maxSections || sectionLinks.length;
      const sectionsToProcess = sectionLinks.slice(0, maxSections);

      logger.info(`Found ${sectionLinks.length} sections, processing ${sectionsToProcess.length}`, {
        scraper: this.name,
      });

      for (let i = 0; i < sectionsToProcess.length; i++) {
        try {
          logger.debug(`Processing section ${i + 1}/${sectionsToProcess.length}`, {
            scraper: this.name,
            url: sectionsToProcess[i],
          });

          await this.navigateToPage(page, sectionsToProcess[i]);
          await this.waitForJavaScript(page, 1500);

          const sectionScholarships = await this.scrapeWithPagination(page);
          scholarships.push(...sectionScholarships);

          logger.debug(`Extracted ${sectionScholarships.length} scholarships from section ${i + 1}`, {
            scraper: this.name,
          });
        } catch (error) {
          logger.warn(`Failed to process section ${i + 1}`, {
            scraper: this.name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      logger.error(`Failed to scrape multiple sections`, {
        scraper: this.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return scholarships;
  }

  private async scrapeWithPagination(page: Page): Promise<RawScholarship[]> {
    const scholarships: RawScholarship[] = [];
    const paginationConfig = this.portalConfig.pagination;

    const firstPageScholarships = await this.extractScholarshipsFromPage(page);
    scholarships.push(...firstPageScholarships);

    if (paginationConfig?.enabled && paginationConfig.nextButtonSelector) {
      const maxPages = paginationConfig.maxPages || 10;
      let currentPage = 1;

      while (currentPage < maxPages) {
        try {
          const hasNextButton = await page.evaluate((selector) => {
            // @ts-ignore
            const button = document.querySelector(selector);
            return button !== null && !button.hasAttribute('disabled');
          }, paginationConfig.nextButtonSelector);

          if (!hasNextButton) {
            logger.debug(`No more pages available at page ${currentPage}`, {
              scraper: this.name,
            });
            break;
          }

          await this.clickElement(page, paginationConfig.nextButtonSelector, 1000);
          await this.waitForJavaScript(page, 1500);

          const pageScholarships = await this.extractScholarshipsFromPage(page);
          scholarships.push(...pageScholarships);

          logger.debug(`Extracted ${pageScholarships.length} scholarships from page ${currentPage + 1}`, {
            scraper: this.name,
          });

          currentPage++;
        } catch (error) {
          logger.warn(`Failed to navigate to page ${currentPage + 1}`, {
            scraper: this.name,
            error: error instanceof Error ? error.message : String(error),
          });
          break;
        }
      }

      logger.info(`Scraped ${currentPage} pages total`, {
        scraper: this.name,
        totalPages: currentPage,
      });
    }

    return scholarships;
  }

  private async extractScholarshipsFromPage(page: Page): Promise<RawScholarship[]> {
    try {
      const selectors = this.portalConfig.selectors;

      const scholarships = await page.evaluate(
        (config) => {
          const results: Array<{
            name: string;
            degree: string;
            deadline: string;
            link: string;
            description?: string;
            amount?: string;
          }> = [];

          // @ts-ignore
          const containers = document.querySelectorAll(config.selectors.container);

          containers.forEach((container: any) => {
            try {
              const nameEl = container.querySelector(config.selectors.name);
              const name = nameEl?.textContent?.trim() || '';

              const linkEl = container.querySelector(config.selectors.link) as any;
              const link = linkEl?.href || linkEl?.getAttribute('href') || '';

              let degree = '';
              if (config.selectors.degree) {
                const degreeEl = container.querySelector(config.selectors.degree);
                degree = degreeEl?.textContent?.trim() || '';
              }

              let deadline = '';
              if (config.selectors.deadline) {
                const deadlineEl = container.querySelector(config.selectors.deadline);
                deadline = deadlineEl?.textContent?.trim() || '';
              }

              let description = undefined;
              if (config.selectors.description) {
                const descEl = container.querySelector(config.selectors.description);
                description = descEl?.textContent?.trim() || undefined;
              }

              let amount = undefined;
              if (config.selectors.amount) {
                const amountEl = container.querySelector(config.selectors.amount);
                amount = amountEl?.textContent?.trim() || undefined;
              }

              if (name && link) {
                results.push({
                  name,
                  degree: degree || 'Not specified',
                  deadline: deadline || 'Not specified',
                  link,
                  description,
                  amount,
                });
              }
            } catch (err) {
              console.warn('Failed to extract scholarship item', err);
            }
          });

          return results;
        },
        { selectors }
      );

      return scholarships.map((s) => ({
        name: s.name,
        source: `${this.portalConfig.country} Government`,
        country: this.portalConfig.country,
        degree: s.degree,
        deadline: s.deadline,
        link: this.normalizeUrl(s.link, this.url),
        description: s.description,
        amount: s.amount,
      }));
    } catch (error) {
      logger.error(`Failed to extract scholarships from page`, {
        scraper: this.name,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}