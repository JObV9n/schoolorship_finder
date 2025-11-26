import { Router, Request, Response } from 'express';
import { ScraperOrchestrator } from '../lib/ScraperOrchestrator.js';
import { scraperConfig } from '../config/scrapers.js';
import logger from '../config/logger.js';
import { Scholarship } from '../types/index.js';
import * as scrapers from '../scrapers/index.js';
import { GovernmentPortalConfig } from '../scrapers/GovernmentPortalScraper.js';

const scraperInstances = [
  new scrapers.FulbrightScraper(scraperConfig.sources.fulbright, scraperConfig.userAgent),
  new scrapers.CheveningScraper(scraperConfig.sources.chevening, scraperConfig.userAgent),
  new scrapers.MITScraper(scraperConfig.sources.mit, scraperConfig.userAgent),
  new scrapers.HarvardScraper(scraperConfig.sources.harvard, scraperConfig.userAgent),
  new scrapers.OxfordScraper(scraperConfig.sources.oxford, scraperConfig.userAgent),
  new scrapers.UNESCOScraper(scraperConfig.sources.unesco, scraperConfig.userAgent),
  new scrapers.UNScraper(scraperConfig.sources.un, scraperConfig.userAgent),
  new scrapers.DAADScraper(scraperConfig.sources.daad, scraperConfig.userAgent),
  new scrapers.ErasmusScraper(scraperConfig.sources.erasmus, scraperConfig.userAgent),
  new scrapers.GovernmentPortalScraper(
    { 
      ...scraperConfig.sources.govPortalAustralia, 
      country: 'Australia',
      selectors: scraperConfig.sources.govPortalAustralia.selectors!
    } as GovernmentPortalConfig,
    scraperConfig.userAgent
  ),
  new scrapers.GovernmentPortalScraper(
    { 
      ...scraperConfig.sources.govPortalCanada, 
      country: 'Canada',
      selectors: scraperConfig.sources.govPortalCanada.selectors!
    } as GovernmentPortalConfig,
    scraperConfig.userAgent
  ),
  new scrapers.GovernmentPortalScraper(
    { 
      ...scraperConfig.sources.govPortalGermany, 
      country: 'Germany',
      selectors: scraperConfig.sources.govPortalGermany.selectors!
    } as GovernmentPortalConfig,
    scraperConfig.userAgent
  ),
];

const orchestrator = new ScraperOrchestrator({
  config: scraperConfig,
  scrapers: scraperInstances,
});

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.get('/scholarships', async (req: Request, res: Response) => {
  try {
    const country = req.query.country as string | undefined;
    const degree = req.query.degree as string | undefined;
    const limitParam = req.query.limit as string | undefined;

    let limit = 50;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit)) {
        limit = Math.min(Math.max(parsedLimit, 1), 100);
      }
    }

    logger.info('Scholarship search request', { country, degree, limit });

    const summary = await orchestrator.scrapeAll();
    let scholarships = orchestrator.getScholarships(summary);

    if (country) {
      const countryLower = country.toLowerCase();
      scholarships = scholarships.filter((s: Scholarship) => {
        const scholarshipCountries = Array.isArray(s.country) ? s.country : [s.country];
        return scholarshipCountries.some(c => 
          c.toLowerCase().includes(countryLower)
        );
      });
    }

    if (degree) {
      const degreeLower = degree.toLowerCase();
      scholarships = scholarships.filter((s: Scholarship) => 
        s.degree.some(d => d.toLowerCase().includes(degreeLower))
      );
    }

    scholarships = scholarships.slice(0, limit);

    logger.info('Scholarship search completed', { 
      resultCount: scholarships.length,
      totalScraped: summary.totalScholarships 
    });

    res.json(scholarships);
  } catch (error) {
    const err = error as Error;
    logger.error('Scholarship search failed', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to search scholarships' });
  }
});

router.get('/countries', (_req: Request, res: Response) => {
  const countries = [
    "United States",
    "United Kingdom",
    "Germany",
    "Australia",
    "Canada",
    "France",
    "Netherlands",
    "Sweden",
    "Switzerland"
  ];
  
  res.json(countries);
});

router.get('/degrees', (_req: Request, res: Response) => {
  const degrees = ["Bachelors", "Masters", "PhD"];
  
  res.json(degrees);
});

export default router;
