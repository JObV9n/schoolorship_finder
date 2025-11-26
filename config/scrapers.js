/**
 * Scraper Configuration
 * 
 * This file contains configuration for all scholarship scrapers including
 * rate limits, timeouts, retry settings, and source-specific configurations.
 */

export const scraperConfig = {
  // Global scraper settings
  concurrency: 3, // Maximum number of scrapers running concurrently
  timeout: 30000, // Request timeout in milliseconds (30 seconds)
  retries: 3, // Number of retry attempts for failed requests
  rateLimit: 2, // Default requests per second
  cacheEnabled: true, // Enable result caching
  cacheDuration: 3600000, // Cache duration in milliseconds (1 hour)
  
  // Retry configuration
  retry: {
    retries: 3,
    baseDelay: 1000, // Base delay in milliseconds for exponential backoff
    maxDelay: 10000, // Maximum delay between retries
  },
  
  // User Agent for HTTP requests
  userAgent: 'ScholarshipScraperBot/1.0 (Educational Purpose)',
  
  // Source-specific configurations
  sources: {
    daad: {
      enabled: true,
      name: 'DAAD',
      url: 'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/',
      type: 'dynamic',
      rateLimit: 1, 
      timeout: 45000, 
    },
    fulbright: {
      enabled: true,
      name: 'Fulbright',
      url: 'https://foreign.fulbrightonline.org/',
      type: 'static', // Static HTML content
      rateLimit: 2,
      timeout: 30000,
    },
    chevening: {
      enabled: true,
      name: 'Chevening',
      url: 'https://www.chevening.org/scholarships/',
      type: 'static',
      rateLimit: 2,
      timeout: 30000,
    },
    erasmus: {
      enabled: true,
      name: 'Erasmus+',
      url: 'https://erasmus-plus.ec.europa.eu/',
      type: 'dynamic',
      rateLimit: 1,
      timeout: 45000,
    },
    mit: {
      enabled: true,
      name: 'MIT',
      url: 'https://sfs.mit.edu/graduate-students/',
      type: 'static',
      rateLimit: 2,
      timeout: 30000,
    },
    harvard: {
      enabled: true,
      name: 'Harvard',
      url: 'https://gsas.harvard.edu/financial-support',
      type: 'static',
      rateLimit: 2,
      timeout: 30000,
    },
    oxford: {
      enabled: true,
      name: 'Oxford',
      url: 'https://www.ox.ac.uk/admissions/graduate/fees-and-funding',
      type: 'static',
      rateLimit: 2,
      timeout: 30000,
    },
    unesco: {
      enabled: true,
      name: 'UNESCO',
      url: 'https://www.unesco.org/en/fellowships',
      type: 'static',
      rateLimit: 1,
      timeout: 30000,
    },
    un: {
      enabled: true,
      name: 'UN',
      url: 'https://www.un.org/en/academic-impact/scholarships-and-contests',
      type: 'static',
      rateLimit: 1,
      timeout: 30000,
    },
  },
};
