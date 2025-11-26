import { BaseStaticScraper } from './BaseStaticScraper.js';
import { RawScholarship, ScraperSourceConfig } from '../types/index.js';
import logger from '../config/logger.js';

export class FulbrightScraper extends BaseStaticScraper {
  constructor(config: ScraperSourceConfig, userAgent: string) {
    super(config, userAgent);
  }

  async scrape(): Promise<RawScholarship[]> {
    try {
      logger.info(`Starting ${this.name} scraper`, { url: this.url });

      const html = await this.fetchHTML(this.url);
      const $ = this.parseHTML(html);
      const scholarships: RawScholarship[] = [];

      const programSelectors = [ // change hre for 
        '.program-card',
        '.scholarship-item',
        '.program-listing',
        'article.program',
        '.listing-item',
        '.opportunity-card',
      ];

      let programElements: any | null = null;

      for (const selector of programSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          programElements = elements;
          logger.debug(`Found ${elements.length} programs using selector: ${selector}`, {
            scraper: this.name,
          });
          break;
        }
      }

      if (!programElements || programElements.length === 0) {
        logger.warn(`No programs found with standard selectors, trying broader approach`, {
          scraper: this.name,
        });
        $('a').each((_: number, element: any) => {
          const $el = $(element);
          const href = $el.attr('href') || '';
          const text = this.extractText($el);
          if (
            (href.toLowerCase().includes('program') || 
             href.toLowerCase().includes('scholarship') ||
             text.toLowerCase().includes('fulbright') ||
             text.toLowerCase().includes('scholarship')) &&
            text.length > 10
          ) {
            scholarships.push({
              name: text,
              source: this.name,
              country: 'United States',
              degree: ['Masters', 'PhD'],
              deadline: 'Varies',
              link: this.extractLink($el, this.url),
              description: 'Fulbright Program - US Government scholarship for international educational exchange',
            });
          }
        });

        logger.info(`${this.name}: Extracted ${scholarships.length} scholarships (broad approach)`, {
          scraper: this.name,
        });
        return scholarships;
      }

      programElements.each((_: number, element: any) => {
        try {
          const $program = $(element);

          const nameSelectors = ['h2', 'h3', '.title', '.program-title', '.name', 'a'];
          let name = '';
          for (const selector of nameSelectors) {
            const nameEl = $program.find(selector).first();
            if (nameEl.length > 0) {
              name = this.extractText(nameEl);
              if (name) break;
            }
          }

          if (!name) {
            logger.debug(`Skipping program without name`, { scraper: this.name });
            return;
          }

          const linkEl = $program.find('a').first();
          const link = linkEl.length > 0 
            ? this.extractLink(linkEl, this.url)
            : this.url;

          let country = 'United States';
          const countryText = this.extractText($program);
          if (countryText.toLowerCase().includes('to ')) {
            const match = countryText.match(/to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
            if (match) {
              country = match[1];
            }
          }

          const programText = this.extractText($program).toLowerCase();
          const degrees: string[] = [];
          if (programText.includes('undergraduate') || programText.includes('bachelor')) {
            degrees.push('Bachelors');
          }
          if (programText.includes('graduate') || programText.includes('master')) {
            degrees.push('Masters');
          }
          if (programText.includes('phd') || programText.includes('doctoral') || programText.includes('doctorate')) {
            degrees.push('PhD');
          }
          if (programText.includes('postdoc')) {
            degrees.push('Postdoc');
          }
          const degree = degrees.length > 0 ? degrees : ['Masters', 'PhD'];

          let deadline = 'Varies';
          const deadlineSelectors = ['.deadline', '.date', '.due-date', 'time'];
          for (const selector of deadlineSelectors) {
            const deadlineEl = $program.find(selector);
            if (deadlineEl.length > 0) {
              const deadlineText = this.extractText(deadlineEl);
              if (deadlineText) {
                deadline = deadlineText;
                break;
              }
            }
          }

          const descriptionSelectors = ['.description', '.summary', 'p'];
          let description = '';
          for (const selector of descriptionSelectors) {
            const descEl = $program.find(selector).first();
            if (descEl.length > 0) {
              description = this.extractText(descEl);
              if (description) break;
            }
          }

          scholarships.push({
            name,
            source: this.name,
            country,
            degree,
            deadline,
            link,
            description: description || undefined,
          });
        } catch (error) {
          this.handleError(error as Error, 'extracting program data');
        }
      });

      logger.info(`${this.name}: Successfully scraped ${scholarships.length} scholarships`, {
        scraper: this.name,
        count: scholarships.length,
      });

      return scholarships;
    } catch (error) {
      this.handleError(error as Error, 'scraping Fulbright website');
      throw error;
    }
  }
}