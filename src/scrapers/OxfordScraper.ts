import { BaseStaticScraper } from './BaseStaticScraper.js';
import { RawScholarship, ScraperSourceConfig } from '../types/index.js';
import logger from '../config/logger.js';

export class OxfordScraper extends BaseStaticScraper {
  constructor(config: ScraperSourceConfig, userAgent: string) {
    super(config, userAgent);
  }

  async scrape(): Promise<RawScholarship[]> {
    try {
      logger.info(`Starting ${this.name} scraper`, { url: this.url });

      const html = await this.fetchHTML(this.url);
      const $ = this.parseHTML(html);
      const scholarships: RawScholarship[] = [];

      const fundingSelectors = [
        '.funding-opportunity',
        '.scholarship-item',
        '.award-listing',
        '.fellowship-item',
        'article.funding',
        '.funding-item',
        '.scholarship-card',
      ];

      let fundingElements: any | null = null;

      for (const selector of fundingSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          fundingElements = elements;
          logger.debug(`Found ${elements.length} funding opportunities using selector: ${selector}`, {
            scraper: this.name,
          });
          break;
        }
      }

      if (!fundingElements || fundingElements.length === 0) {
        logger.warn(`No funding opportunities found with standard selectors, trying broader approach`, {
          scraper: this.name,
        });
        $('h2, h3, h4').each((_: number, element: any) => {
          const $heading = $(element);
          const headingText = this.extractText($heading).toLowerCase();
          if (
            headingText.includes('scholarship') ||
            headingText.includes('funding') ||
            headingText.includes('award') ||
            headingText.includes('grant') ||
            headingText.includes('bursary')
          ) {
            const $section = $heading.parent();
            const sectionText = this.extractText($section);
            const linkEl = $section.find('a').first();
            const link = linkEl.length > 0 
              ? this.extractLink(linkEl, this.url)
              : this.url;

            const degrees: string[] = [];
            if (sectionText.toLowerCase().includes('undergraduate') || sectionText.toLowerCase().includes('bachelor')) {
              degrees.push('Bachelors');
            }
            if (sectionText.toLowerCase().includes('graduate') || sectionText.toLowerCase().includes('master')) {
              degrees.push('Masters');
            }
            if (sectionText.toLowerCase().includes('phd') || sectionText.toLowerCase().includes('doctoral')) {
              degrees.push('PhD');
            }
            if (sectionText.toLowerCase().includes('postdoc')) {
              degrees.push('Postdoc');
            }
            const degree = degrees.length > 0 ? degrees : ['Masters', 'PhD'];

            scholarships.push({
              name: this.extractText($heading),
              source: this.name,
              country: 'United Kingdom',
              degree,
              deadline: 'Varies',
              link,
              description: sectionText.substring(0, 200),
            });
          }
        });

        $('a').each((_: number, element: any) => {
          const $el = $(element);
          const text = this.extractText($el);
          if (
            (text.toLowerCase().includes('scholarship') ||
             text.toLowerCase().includes('funding') ||
             text.toLowerCase().includes('bursary')) &&
            text.length > 10 &&
            !scholarships.some(s => s.name === text)
          ) {
            scholarships.push({
              name: text,
              source: this.name,
              country: 'United Kingdom',
              degree: ['Masters', 'PhD'],
              deadline: 'Varies',
              link: this.extractLink($el, this.url),
              description: 'Oxford University funding opportunity',
            });
          }
        });

        logger.info(`${this.name}: Extracted ${scholarships.length} funding opportunities (broad approach)`, {
          scraper: this.name,
        });
        return scholarships;
      }

      fundingElements.each((_: number, element: any) => {
        try {
          const $funding = $(element);

          const nameSelectors = ['h2', 'h3', 'h4', '.title', '.name', '.award-name', 'a'];
          let name = '';
          for (const selector of nameSelectors) {
            const nameEl = $funding.find(selector).first();
            if (nameEl.length > 0) {
              name = this.extractText(nameEl);
              if (name) break;
            }
          }

          if (!name) {
            logger.debug(`Skipping funding without name`, { scraper: this.name });
            return;
          }

          const linkEl = $funding.find('a').first();
          const link = linkEl.length > 0 
            ? this.extractLink(linkEl, this.url)
            : this.url;

          const country = 'United Kingdom';

          const fundingText = this.extractText($funding).toLowerCase();
          const degrees: string[] = [];
          if (fundingText.includes('undergraduate') || fundingText.includes('bachelor')) {
            degrees.push('Bachelors');
          }
          if (fundingText.includes('master') || fundingText.includes('graduate') || fundingText.includes('postgraduate')) {
            degrees.push('Masters');
          }
          if (fundingText.includes('phd') || fundingText.includes('doctoral') || fundingText.includes('doctorate') || fundingText.includes('dphil')) {
            degrees.push('PhD');
          }
          if (fundingText.includes('postdoc')) {
            degrees.push('Postdoc');
          }
          const degree = degrees.length > 0 ? degrees : ['Masters', 'PhD'];

          let deadline = 'Varies';
          const deadlineSelectors = ['.deadline', '.date', '.due-date', '.closing-date', 'time'];
          for (const selector of deadlineSelectors) {
            const deadlineEl = $funding.find(selector);
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
            const descEl = $funding.find(selector).first();
            if (descEl.length > 0) {
              description = this.extractText(descEl);
              if (description && description.length > 20) break;
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
          this.handleError(error as Error, 'extracting funding data');
        }
      });

      logger.info(`${this.name}: Successfully scraped ${scholarships.length} funding opportunities`, {
        scraper: this.name,
        count: scholarships.length,
      });

      return scholarships;
    } catch (error) {
      this.handleError(error as Error, 'scraping Oxford website');
      throw error;
    }
  }
}