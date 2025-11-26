import pLimit from 'p-limit';
import logger from '../config/logger.js';
import { DataNormalizer } from './DataNormalizer.js';
import { RetryHandler } from './RetryHandler.js';
import {
  ScholarshipScraper,
  Scholarship,
  ScraperResult,
  ScraperSummary,
  ScraperConfig,
} from '../types/index.js';

export interface ScraperOrchestratorOptions {
  config: ScraperConfig;
  scrapers: ScholarshipScraper[];
}

export class ScraperOrchestrator {
  private scrapers: ScholarshipScraper[];
  private config: ScraperConfig;
  private normalizer: DataNormalizer;
  private retryHandler: RetryHandler;
  private concurrencyLimit: ReturnType<typeof pLimit>;

  constructor(options: ScraperOrchestratorOptions) {
    this.scrapers = options.scrapers;
    this.config = options.config;
    this.normalizer = new DataNormalizer();
    this.retryHandler = new RetryHandler({
      retries: this.config.retry.retries,
      baseDelay: this.config.retry.baseDelay,
      maxDelay: this.config.retry.maxDelay,
    });
    
    this.concurrencyLimit = pLimit(this.config.concurrency);
  }

  async scrapeAll(): Promise<ScraperSummary> {
    const startTime = Date.now();
    const sourceNames = this.scrapers.map(s => s.name).join(', ');
    
    logger.info('Starting scholarship scraper execution', {
      timestamp: new Date().toISOString(),
      sources: sourceNames,
      sourceCount: this.scrapers.length,
      concurrency: this.config.concurrency,
    });

    const results = await Promise.all(
      this.scrapers.map(scraper =>
        this.concurrencyLimit(() => this.scrapeSource(scraper))
      )
    );

    const totalProcessingTime = Date.now() - startTime;
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    const totalScholarships = successfulResults.reduce((sum, r) => sum + r.count, 0);
    const successRate = (successfulResults.length / results.length) * 100;

    logger.info('Scholarship scraper execution completed', {
      totalScholarships,
      successfulSources: successfulResults.length,
      failedSources: failedResults.length,
      totalProcessingTime: `${totalProcessingTime}ms`,
      successRate: `${successRate.toFixed(1)}%`,
    });

    return {
      totalScholarships,
      successfulSources: successfulResults.length,
      failedSources: failedResults.length,
      totalProcessingTime,
      successRate,
      results,
    };
  }

  private async scrapeSource(scraper: ScholarshipScraper): Promise<ScraperResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting scraper: ${scraper.name}`);

      const rawScholarships = await this.retryHandler.executeWithRetry(
        () => scraper.scrape(),
        {
          retries: this.config.retry.retries,
          baseDelay: this.config.retry.baseDelay,
          maxDelay: this.config.retry.maxDelay,
          onRetry: (attempt, error) => {
            logger.warn(`Retry attempt ${attempt} for ${scraper.name}`, {
              source: scraper.name,
              attempt,
              error: error.message,
            });
          },
        }
      );

      const normalizedScholarships: Scholarship[] = rawScholarships.map(raw =>
        this.normalizer.normalize(raw)
      );

      const processingTime = Date.now() - startTime;

      logger.info(`Scraper completed successfully: ${scraper.name}`, {
        source: scraper.name,
        scholarshipCount: normalizedScholarships.length,
        processingTime: `${processingTime}ms`,
      });

      return {
        source: scraper.name,
        scholarships: normalizedScholarships,
        count: normalizedScholarships.length,
        processingTime,
        success: true,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const err = error as Error;

      logger.error(`Scraper failed: ${scraper.name}`, {
        source: scraper.name,
        errorType: err.name,
        errorMessage: err.message,
        stack: err.stack,
        processingTime: `${processingTime}ms`,
      });

      return {
        source: scraper.name,
        scholarships: [],
        count: 0,
        processingTime,
        success: false,
        error: err.message,
      };
    }
  }

  getScholarships(summary: ScraperSummary): Scholarship[] {
    return summary.results
      .filter(r => r.success)
      .flatMap(r => r.scholarships);
  }

  getScrapers(): ScholarshipScraper[] {
    return this.scrapers;
  }

  getConfig(): ScraperConfig {
    return this.config;
  }
}
