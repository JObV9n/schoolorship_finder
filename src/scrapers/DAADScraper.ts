import { Page } from 'puppeteer';
import { BaseDynamicScraper } from './BaseDynamicScraper.js';
import { RawScholarship, ScraperSourceConfig } from '../types/index.js';
import logger from '../config/logger.js';

export class DAADScraper extends BaseDynamicScraper {
  constructor(config: ScraperSourceConfig, userAgent: string) {
    super(config, userAgent);
  }

  async scrape(): Promise<RawScholarship[]> {
    let page: Page | null = null;

    try {
      logger.info(`Starting DAAD scraper`, { scraper: this.name });

      page = await this.createPage();
      await this.navigateToPage(page, this.url);

      await this.waitForJavaScript(page, 3000);

      const scholarships: RawScholarship[] = [];
      let currentPage = 1;
      const maxPages = 10;

      while (currentPage <= maxPages) {
        logger.info(`Processing DAAD page ${currentPage}`, {
          scraper: this.name,
          page: currentPage,
        });

        const pageScholarships = await this.extractScholarshipsFromPage(page);
        scholarships.push(...pageScholarships);

        logger.debug(`Extracted ${pageScholarships.length} scholarships from page ${currentPage}`, {
          scraper: this.name,
          page: currentPage,
          count: pageScholarships.length,
        });

        const hasNextPage = await this.hasNextPage(page);
        if (!hasNextPage) {
          logger.info(`No more pages found, stopping at page ${currentPage}`, {
            scraper: this.name,
            totalPages: currentPage,
          });
          break;
        }

        try {
          await this.navigateToNextPage(page);
          await this.waitForJavaScript(page, 2000);
          currentPage++;
        } catch (error) {
          logger.warn(`Failed to navigate to next page`, {
            scraper: this.name,
            page: currentPage + 1,
            error: error instanceof Error ? error.message : String(error),
          });
          break;
        }
      }

      logger.info(`DAAD scraper completed: ${scholarships.length} scholarships found`, {
        scraper: this.name,
        totalScholarships: scholarships.length,
        pagesProcessed: currentPage,
      });

      return scholarships;
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        'DAAD scraping failed'
      );
      return [];
    } finally {
      if (page) {
        await this.closePage(page);
      }
      await this.closeBrowser();
    }
  }

  private async extractScholarshipsFromPage(page: Page): Promise<RawScholarship[]> {
    try {
      const scholarships = await page.evaluate(() => {
        const results: Array<{
          name: string;
          country: string;
          degree: string;
          deadline: string;
          link: string;
        }> = [];

        // @ts-ignore
        const items = document.querySelectorAll(
          '.c-search-result__item, .scholarship-item, .result-item, [data-scholarship], .c-result-item'
        );

        items.forEach((item: any) => {
          try {
            const nameEl = item.querySelector('h2, h3, .c-search-result__title, .title, .scholarship-name, [data-title]');
            const name = nameEl?.textContent?.trim() || '';

            const linkEl = item.querySelector('a, [href]') as any;
            const link = linkEl?.href || '';

            const countryEl = item.querySelector('.country, [data-country], .location, .c-search-result__country');
            const country = countryEl?.textContent?.trim() || 'Germany';

            const degreeEl = item.querySelector('.degree, [data-degree], .level, .education-level, .c-search-result__degree');
            const degree = degreeEl?.textContent?.trim() || 'Masters';

            const deadlineEl = item.querySelector('.deadline, [data-deadline], .date, .application-deadline, .c-search-result__deadline');
            const deadline = deadlineEl?.textContent?.trim() || '';

            if (name && link) {
              results.push({
                name,
                country,
                degree,
                deadline,
                link,
              });
            }
          } catch (err) {
            console.warn('Failed to extract DAAD item', err);
          }
        });

        return results;
      });

      return scholarships.map((s) => ({
        name: s.name,
        source: 'DAAD',
        country: s.country,
        degree: s.degree,
        deadline: s.deadline,
        link: this.normalizeUrl(s.link, this.url),
      }));
    } catch (error) {
      logger.error(`Failed to extract scholarships from DAAD page`, {
        scraper: this.name,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private async hasNextPage(page: Page): Promise<boolean> {
    try {
      const hasNext = await page.evaluate(() => {
        // @ts-ignore
        const nextButton = document.querySelector(
          '.pagination__next, .next-page, [data-next], .c-pagination__next, a[rel="next"]'
        );
        if (!nextButton) return false;
        const isDisabled = nextButton.classList.contains('disabled') || 
                          nextButton.hasAttribute('disabled') ||
                          nextButton.classList.contains('c-pagination__next--disabled');
        return !isDisabled;
      });

      return hasNext;
    } catch (error) {
      logger.debug(`Error checking for next page`, {
        scraper: this.name,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private async navigateToNextPage(page: Page): Promise<void> {
    try {
      await page.evaluate(() => {
        // @ts-ignore
        const nextButton = document.querySelector(
          '.pagination__next, .next-page, [data-next], .c-pagination__next, a[rel="next"]'
        ) as any;
        if (nextButton) {
          nextButton.click();
        }
      });

      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
        new Promise(resolve => setTimeout(resolve, 3000)),
      ]);

      logger.debug(`Successfully navigated to next page`, {
        scraper: this.name,
      });
    } catch (error) {
      logger.error(`Failed to navigate to next page`, {
        scraper: this.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}