import { BaseStaticScraper } from './BaseStaticScraper.js';
import { RawScholarship, ScraperSourceConfig } from '../types/index.js';
import logger from '../config/logger.js';

export class UNESCOScraper extends BaseStaticScraper {
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
        '.scholarship-item',
        '.programme-item',
        '.opportunity-card',
        'article.scholarship',
        '.funding-opportunity',
        '.partnership-item',
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
        $('h2, h3, h4').each((_: number, element: any) => {
          const $heading = $(element);
          const headingText = this.extractText($heading).toLowerCase();
          if (
            headingText.includes('scholarship') ||
            headingText.includes('fellowship') ||
            headingText.includes('programme') ||
            headingText.includes('funding')
          ) {
            const $section = $heading.parent();
            const sectionText = this.extractText($section);
            const linkEl = $section.find('a').first();
            const link = linkEl.length > 0 
              ? this.extractLink(linkEl, this.url)
              : this.url;

            const countries = this.extractCountries(sectionText);

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
              country: countries.length > 0 ? countries : 'International',
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
             text.toLowerCase().includes('fellowship') ||
             text.toLowerCase().includes('programme')) &&
            text.length > 10 &&
            !scholarships.some(s => s.name === text)
          ) {
            scholarships.push({
              name: text,
              source: this.name,
              country: 'International',
              degree: ['Masters', 'PhD'],
              deadline: 'Varies',
              link: this.extractLink($el, this.url),
              description: 'UNESCO scholarship programme',
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

          const nameSelectors = ['h2', 'h3', 'h4', '.title', '.name', '.programme-title', 'a'];
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

          const scholarshipText = this.extractText($scholarship);
          const countries = this.extractCountries(scholarshipText);
          const country = countries.length > 0 ? countries : 'International';

          const degrees: string[] = [];
          const lowerText = scholarshipText.toLowerCase();
          if (lowerText.includes('undergraduate') || lowerText.includes('bachelor')) {
            degrees.push('Bachelors');
          }
          if (lowerText.includes('graduate') || lowerText.includes('master') || lowerText.includes('postgraduate')) {
            degrees.push('Masters');
          }
          if (lowerText.includes('phd') || lowerText.includes('doctoral') || lowerText.includes('doctorate')) {
            degrees.push('PhD');
          }
          if (lowerText.includes('postdoc')) {
            degrees.push('Postdoc');
          }
          const degree = degrees.length > 0 ? degrees : ['Masters', 'PhD'];

          let deadline = 'Varies';
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
          this.handleError(error as Error, 'extracting scholarship data');
        }
      });

      logger.info(`${this.name}: Successfully scraped ${scholarships.length} scholarships`, {
        scraper: this.name,
        count: scholarships.length,
      });

      return scholarships;
    } catch (error) {
      this.handleError(error as Error, 'scraping UNESCO website');
      throw error;
    }
  }

  private extractCountries(text: string): string[] {
    const countries: string[] = [];
    const commonCountries = [
      'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria',
      'Bangladesh', 'Belgium', 'Brazil', 'Canada', 'Chile', 'China', 'Colombia',
      'Denmark', 'Egypt', 'Ethiopia', 'Finland', 'France', 'Germany', 'Ghana',
      'Greece', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
      'Japan', 'Jordan', 'Kenya', 'Korea', 'Lebanon', 'Malaysia', 'Mexico',
      'Morocco', 'Nepal', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway',
      'Pakistan', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Russia',
      'Saudi Arabia', 'Singapore', 'South Africa', 'Spain', 'Sweden', 'Switzerland',
      'Syria', 'Tanzania', 'Thailand', 'Tunisia', 'Turkey', 'Uganda', 'Ukraine',
      'United Kingdom', 'United States', 'Vietnam', 'Yemen', 'Zimbabwe'
    ];

    for (const country of commonCountries) {
      if (text.includes(country)) {
        countries.push(country);
      }
    }

    return countries;
  }
}