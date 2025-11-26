import { parseISO, isValid } from 'date-fns';
import { RawScholarship, Scholarship } from '../types/index.js';
import logger from '../config/logger.js';

export class DataNormalizer {
  private readonly degreeMapping: Record<string, string> = {
    'bachelor': 'Bachelors',
    'bachelors': 'Bachelors',
    'undergraduate': 'Bachelors',
    'undergrad': 'Bachelors',
    'bs': 'Bachelors',
    'ba': 'Bachelors',
    'bsc': 'Bachelors',
    'master': 'Masters',
    'masters': 'Masters',
    'graduate': 'Masters',
    'grad': 'Masters',
    'ms': 'Masters',
    'ma': 'Masters',
    'msc': 'Masters',
    'm.s.': 'Masters',
    'm.a.': 'Masters',
    'phd': 'PhD',
    'ph.d.': 'PhD',
    'ph.d': 'PhD',
    'doctorate': 'PhD',
    'doctoral': 'PhD',
    'doctor': 'PhD',
    'postdoc': 'Postdoc',
    'postdoctoral': 'Postdoc',
    'post-doctoral': 'Postdoc',
    'post-doc': 'Postdoc',
  };

  private readonly countryMapping: Record<string, string> = {
    'usa': 'United States',
    'us': 'United States',
    'united states of america': 'United States',
    'uk': 'United Kingdom',
    'britain': 'United Kingdom',
    'great britain': 'United Kingdom',
    'germany': 'Germany',
    'deutschland': 'Germany',
    'france': 'France',
    'spain': 'Spain',
    'italy': 'Italy',
    'canada': 'Canada',
    'australia': 'Australia',
    'japan': 'Japan',
    'china': 'China',
    'india': 'India',
    'brazil': 'Brazil',
    'mexico': 'Mexico',
    'netherlands': 'Netherlands',
    'sweden': 'Sweden',
    'norway': 'Norway',
    'denmark': 'Denmark',
    'finland': 'Finland',
    'switzerland': 'Switzerland',
    'austria': 'Austria',
    'belgium': 'Belgium',
    'poland': 'Poland',
    'portugal': 'Portugal',
    'greece': 'Greece',
    'ireland': 'Ireland',
    'new zealand': 'New Zealand',
    'south korea': 'South Korea',
    'singapore': 'Singapore',
  };

  normalize(raw: RawScholarship): Scholarship {
    return {
      name: this.normalizeName(raw.name),
      source: raw.source,
      country: this.normalizeCountry(raw.country),
      degree: this.normalizeDegree(raw.degree),
      deadline: this.normalizeDate(raw.deadline),
      link: this.normalizeURL(raw.link),
      description: raw.description ?? null,
      eligibility: raw.eligibility ?? null,
      amount: raw.amount ?? null,
      scrapedAt: new Date().toISOString(),
    };
  }

  private normalizeName(name: string): string {
    return name.trim();
  }

  normalizeDate(date: string | Date): string {
    try {
      if (date instanceof Date) {
        return date.toISOString();
      }

      let parsedDate = parseISO(date);
      if (isValid(parsedDate)) {
        return parsedDate.toISOString();
      }

      const formats = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      ];

      for (const formatRegex of formats) {
        const match = date.match(formatRegex);
        if (match) {
          if (date.includes('/')) {
            const [, month, day, year] = match;
            parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else if (date.includes('-') && match[1].length === 4) {
            const [, year, month, day] = match;
            parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            const [, day, month, year] = match;
            parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          }

          if (isValid(parsedDate)) {
            return parsedDate.toISOString();
          }
        }
      }

      parsedDate = new Date(date);
      if (isValid(parsedDate)) {
        return parsedDate.toISOString();
      }

      logger.warn(`Unable to parse date: ${date}`);
      return String(date);
    } catch (error) {
      logger.error(`Error normalizing date: ${date}`, { error });
      return String(date);
    }
  }

  normalizeCountry(country: string | string[]): string | string[] {
    if (Array.isArray(country)) {
      return country.map(c => this.normalizeCountryName(c));
    }
    return this.normalizeCountryName(country);
  }

  private normalizeCountryName(country: string): string {
    const normalized = country.trim().toLowerCase();
    return this.countryMapping[normalized] || this.capitalizeWords(country.trim());
  }

  private capitalizeWords(str: string): string {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  normalizeDegree(degree: string | string[]): string[] {
    const degrees = Array.isArray(degree) ? degree : [degree];
    
    const normalized = degrees
      .flatMap(d => this.splitDegrees(d))
      .map(d => this.normalizeDegreeLevel(d))
      .filter((d): d is string => d !== null);

    return [...new Set(normalized)];
  }

  private splitDegrees(degree: string): string[] {
    return degree
      .split(/[\/|&]|\band\b|\bor\b/i)
      .map(d => d.trim())
      .filter(d => d.length > 0);
  }

  private normalizeDegreeLevel(degree: string): string | null {
    const normalized = degree.trim().toLowerCase();
    
    if (this.degreeMapping[normalized]) {
      return this.degreeMapping[normalized];
    }

    for (const [key, value] of Object.entries(this.degreeMapping)) {
      if (normalized.includes(key)) {
        return value;
      }
    }

    logger.warn(`Unrecognized degree level: ${degree}`);
    return this.capitalizeWords(degree);
  }

  normalizeURL(url: string): string {
    try {
      const trimmed = url.trim();
      
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return `https://${trimmed}`;
      }

      new URL(trimmed);
      return trimmed;
    } catch (error) {
      logger.warn(`Invalid URL: ${url}`);
      return url;
    }
  }
}

export default new DataNormalizer();
