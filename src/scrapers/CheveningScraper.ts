import { BaseStaticScraper } from './BaseStaticScraper.js';
import { RawScholarship, ScraperSourceConfig } from '../types/index.js';
import logger from '../config/logger.js';

export class CheveningScraper extends BaseStaticScraper {
  constructor(config: ScraperSourceConfig, userAgent: string) {
    super(config, userAgent);
  }

  async scrape(): Promise<RawScholarship[]> {
    try {
      logger.info(`Starting ${this.name} scraper`, { url: this.url });

      const html = await this.fetchHTML(this.url);
      const $ = this.parseHTML(html);
      const scholarships: RawScholarship[] = [];

      const scholarshipSelectors = [
        '.scholarship-card',
        '.award-item',
        '.scholarship-listing',
        'article.scholarship',
        '.programme-card',
        '.opportunity',
      ];

      let scholarshipElements: any | null = null;

      for (const selector of scholarshipSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          scholarshipElements = elements;
          logger.debug(`Found ${elements.length} scholarships using selector: ${selector}`, {
            scraper: this.name,
          });
          break;
        }
      }

      if (!scholarshipElements || scholarshipElements.length === 0) {
        logger.warn(`No scholarships found with standard selectors, trying broader approach`, {
          scraper: this.name,
        });
        scholarships.push({
          name: 'Chevening Scholarships',
          source: this.name,
          country: 'United Kingdom',
          degree: ['Masters'],
          deadline: 'Typically November',
          link: this.url,
          description: 'UK government global scholarship programme for outstanding emerging leaders to pursue one-year master\'s degrees in the UK',
          eligibility: 'Citizens of Chevening-eligible countries with undergraduate degree and work experience',
        });

        $('a').each((_: number, element: any) => {
          const $el = $(element);
          const href = $el.attr('href') || '';
          const text = this.extractText($el);
          if (
            (href.toLowerCase().includes('scholarship') || 
             href.toLowerCase().includes('award') ||
             href.toLowerCase().includes('fellowship')) &&
            text.length > 15 &&
            !text.toLowerCase().includes('apply') &&
            !text.toLowerCase().includes('login')
          ) {
            scholarships.push({
              name: text,
              source: this.name,
              country: 'United Kingdom',
              degree: ['Masters'],
              deadline: 'Typically November',
              link: this.extractLink($el, this.url),
              description: 'Chevening scholarship programme',
            });
          }
        });

        logger.info(`${this.name}: Extracted ${scholarships.length} scholarships (broad approach)`, {
          scraper: this.name,
        });
        return scholarships;
      }

      scholarshipElements.each((_: number, element: any) => {
        try {
          const $scholarship = $(element);

          const nameSelectors = ['h2', 'h3', 'h4', '.title', '.scholarship-title', '.name', 'a'];
          let name = '';
          for (const selector of nameSelectors) {
            const nameEl = $scholarship.find(selector).first();
            if (nameEl.length > 0) {
              name = this.extractText(nameEl);
              if (name) break;
            }
          }

          if (!name) {
            logger.debug(`Skipping scholarship without name`, { scraper: this.name });
            return;
          }

          const linkEl = $scholarship.find('a').first();
          const link = linkEl.length > 0 
            ? this.extractLink(linkEl, this.url)
            : this.url;

          const country = 'United Kingdom';

          const scholarshipText = this.extractText($scholarship).toLowerCase();
          const degrees: string[] = [];
          if (scholarshipText.includes('master') || scholarshipText.includes('postgraduate')) {
            degrees.push('Masters');
          }
          if (scholarshipText.includes('phd') || scholarshipText.includes('doctoral')) {
            degrees.push('PhD');
          }
          const degree = degrees.length > 0 ? degrees : ['Masters'];

          let deadline = 'Typically November';
          const deadlineSelectors = ['.deadline', '.date', '.due-date', '.closing-date', 'time'];
          for (const selector of deadlineSelectors) {
            const deadlineEl = $scholarship.find(selector);
            if (deadlineEl.length > 0) {
              const deadlineText = this.extractText(deadlineEl);
              if (deadlineText) {
                deadline = deadlineText;
                break;
              }
            }
          }

          const descriptionSelectors = ['.description', '.summary', '.excerpt', 'p'];
          let description = '';
          for (const selector of descriptionSelectors) {
            const descEl = $scholarship.find(selector).first();
            if (descEl.length > 0) {
              description = this.extractText(descEl);
              if (description && description.length > 20) break;
            }
          }

          const eligibilitySelectors = ['.eligibility', '.requirements', '.criteria'];
          let eligibility = '';
          for (const selector of eligibilitySelectors) {
            const eligEl = $scholarship.find(selector).first();
            if (eligEl.length > 0) {
              eligibility = this.extractText(eligEl);
              if (eligibility) break;
            }
          }

          if (!eligibility) {
            eligibility = 'Citizens of Chevening-eligible countries with undergraduate degree and work experience';
          }

          scholarships.push({
            name,
            source: this.name,
            country,
            degree,
            deadline,
            link,
            description: description || undefined,
            eligibility: eligibility || undefined,
          });
        } catch (error) {
          this.handleError(error as Error, 'extracting scholarship data');
        }
      });

      logger.info(`${this.name}: Successfully scraped ${scholarships.length} scholarships`, {
        scraper: this.name,
        count: scholarships.length,
      });

      return scholarships;
    } catch (error) {
      this.handleError(error as Error, 'scraping Chevening website');
      throw error;
    }
  }
}