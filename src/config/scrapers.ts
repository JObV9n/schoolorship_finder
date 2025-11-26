import { ScraperConfig } from '../types/index.js';

export const scraperConfig: ScraperConfig = {
  concurrency: 3,
  timeout: 30000,
  retries: 3,
  rateLimit: 2,
  cacheEnabled: true,
  cacheDuration: 3600000,

  retry: {
    retries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  },

  userAgent: 'ScholarshipScraperBot/1.0 (Educational Purpose)',

  sources: {
    // ========================
    //  EXISTING SOURCES FIXED
    // ========================

    daad: {
      enabled: true,
      name: 'DAAD',
      url: 'https://www.daad.de/en/', // FIXED
      type: 'dynamic',
      rateLimit: 1,
      timeout: 45000,
    },

    fulbright: {
      enabled: true,
      name: 'Fulbright',
      url: 'https://foreign.fulbrightonline.org/',
      type: 'static',
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
      url: 'https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en', // FIXED
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
      url: 'https://www.unesco.org/en/scholarships', // FIXED (old URL gives 404)
      type: 'static',
      rateLimit: 1,
      timeout: 30000,
    },

    un: {
      enabled: true,
      name: 'United Nations Scholarships',
      url: 'https://www.un.org/en/academic-impact/scholarships',
      type: 'static',
      rateLimit: 1,
      timeout: 30000,
    },

    // ========================
    //  GOVERNMENT PORTALS
    // ========================

    govPortalAustralia: {
      enabled: true,
      name: 'Australia Government',
      url: 'https://www.dfat.gov.au/people-to-people/australia-awards',
      type: 'static',
      rateLimit: 1,
      timeout: 45000,
    },

    govPortalCanada: {
      enabled: true,
      name: 'Canada Government',
      url: 'https://www.educanada.ca/scholarships-bourses/index.aspx',
      type: 'static',
      rateLimit: 1,
      timeout: 45000,
    },

    govPortalGermany: {
      enabled: true,
      name: 'Germany Government',
      url: 'https://www.study-in-germany.de/en/plan-your-studies/requirements/proof-of-financing/',
      type: 'static',
      rateLimit: 1,
      timeout: 45000,
    },

    mext: {
      enabled: true,
      name: 'MEXT Japan Scholarship',
      url: 'https://www.studyinjapan.go.jp/en/',
      type: 'static',
      rateLimit: 1,
      timeout: 30000,
    },

    cscChina: {
      enabled: true,
      name: 'Chinese Government CSC Scholarship',
      url: 'https://www.csc.edu.cn/',
      type: 'static',
      rateLimit: 1,
      timeout: 30000,
    },

    commonwealth: {
      enabled: true,
      name: 'Commonwealth Scholarship',
      url: 'https://cscuk.fcdo.gov.uk/',
      type: 'static',
      rateLimit: 1,
      timeout: 30000,
    },

    gatesCambridge: {
      enabled: true,
      name: 'Gates Cambridge Scholarship',
      url: 'https://www.gatescambridge.org/',
      type: 'static',
      rateLimit: 1,
      timeout: 30000,
    },

    rhodes: {
      enabled: true,
      name: 'Rhodes Scholarship',
      url: 'https://www.rhodeshouse.ox.ac.uk/',
      type: 'static',
      rateLimit: 1,
      timeout: 30000,
    },

    swissExcellence: {
      enabled: true,
      name: 'Swiss Government Excellence Scholarships',
      url: 'https://www.sbfi.admin.ch/sbfi/en/home/education/scholarships-and-grants.html',
      type: 'static',
      rateLimit: 1,
      timeout: 30000,
    },
  },
};
