import { Page } from 'puppeteer';
import { BaseDynamicScraper } from './BaseDynamicScraper.js';
import { RawScholarship, ScraperSourceConfig } from '../types/index.js';
import logger from '../config/logger.js';

export class ErasmusScraper extends BaseDynamicScraper {
  constructor(config: ScraperSourceConfig, userAgent: string) {
    super(config, userAgent);
  }

  async scrape(): Promise<RawScholarship[]> {
    let page: Page | null = null;

    try {
      logger.info(`Starting Erasmus+ scraper`, { scraper: this.name });

      page = await this.createPage();
      await this.navigateToPage(page, this.url);

      await this.waitForJavaScript(page, 2000);

      const scholarships: RawScholarship[] = [];

      const fundingStreams = await this.findFundingStreams(page);

      if (fundingStreams.length > 0) {
        logger.info(`Found ${fundingStreams.length} funding streams`, {
          scraper: this.name,
        });

        for (let i = 0; i < fundingStreams.length; i++) {
          try {
            logger.debug(`Processing funding stream ${i + 1}/${fundingStreams.length}`, {
              scraper: this.name,
            });

            const streamScholarships = await this.extractFromFundingStream(page, i);
            scholarships.push(...streamScholarships);

            if (i < fundingStreams.length - 1) {
              await this.navigateToPage(page, this.url);
              await this.waitForJavaScript(page, 1000);
            }
          } catch (error) {
            logger.warn(`Failed to process funding stream ${i + 1}`, {
              scraper: this.name,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      } else {
        logger.info(`No funding streams found, extracting from main page`, {
          scraper: this.name,
        });

        const mainPageScholarships = await this.extractScholarshipsFromPage(page);
        scholarships.push(...mainPageScholarships);
      }

      logger.info(`Erasmus+ scraper completed: ${scholarships.length} scholarships found`, {
        scraper: this.name,
        totalScholarships: scholarships.length,
      });

      return scholarships;
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        'Erasmus+ scraping failed'
      );
      return [];
    } finally {
      if (page) {
        await this.closePage(page);
      }
      await this.closeBrowser();
    }
  }

  private async findFundingStreams(page: Page): Promise<number[]> {
    try {
      const streamCount = await page.evaluate(() => {
        // @ts-ignore
        const streams = document.querySelectorAll(
          '.funding-stream, .program-type, .funding-category, [data-stream], .tab-item'
        );
        return streams.length;
      });

      return Array.from({ length: streamCount }, (_, i) => i);
    } catch (error) {
      logger.debug(`Error finding funding streams`, {
        scraper: this.name,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private async extractFromFundingStream(
    page: Page,
    streamIndex: number
  ): Promise<RawScholarship[]> {
    try {
      await page.evaluate((index) => {
        // @ts-ignore
        const streams = document.querySelectorAll(
          '.funding-stream, .program-type, .funding-category, [data-stream], .tab-item'
        );
        const stream = streams[index] as any;
        if (stream) {
          stream.click();
        }
      }, streamIndex);

      await this.waitForJavaScript(page, 1500);

      return await this.extractScholarshipsFromPage(page);
    } catch (error) {
      logger.error(`Failed to extract from funding stream ${streamIndex}`, {
        scraper: this.name,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private async extractScholarshipsFromPage(page: Page): Promise<RawScholarship[]> {
    try {
      const scholarships = await page.evaluate(() => {
        const results: Array<{
          name: string;
          countries: string[];
          degree: string;
          deadline: string;
          link: string;
        }> = [];

        // @ts-ignore
        const items = document.querySelectorAll(
          '.program-item, .scholarship-item, .opportunity-item, [data-program], .funding-opportunity'
        );

        items.forEach((item: any) => {
          try {
            const nameEl = item.querySelector('h2, h3, .title, .program-name, [data-title]');
            const name = nameEl?.textContent?.trim() || '';

            const linkEl = item.querySelector('a, [href]') as any;
            const link = linkEl?.href || '';

            const countryEl = item.querySelector('.countries, [data-countries], .location');
            const countryText = countryEl?.textContent?.trim() || 'European Union';
            const countries = countryText.split(',').map((c: any) => c.trim());

            const degreeEl = item.querySelector('.degree, [data-degree], .level, .education-level');
            const degree = degreeEl?.textContent?.trim() || 'Masters';

            const deadlineEl = item.querySelector('.deadline, [data-deadline], .date, .application-deadline');
            const deadline = deadlineEl?.textContent?.trim() || '';

            if (name && link) {
              results.push({
                name,
                countries,
                degree,
                deadline,
                link,
              });
            }
          } catch (err) {
            console.warn('Failed to extract Erasmus+ item', err);
          }
        });

        return results;
      });

      return scholarships.map((s) => ({
        name: s.name,
        source: 'Erasmus+',
        country: s.countries.length > 0 ? s.countries : 'European Union',
        degree: s.degree,
        deadline: s.deadline,
        link: this.normalizeUrl(s.link, this.url),
      }));
    } catch (error) {
      logger.error(`Failed to extract scholarships from Erasmus+ page`, {
        scraper: this.name,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}