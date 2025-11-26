/**
 * Property-based testing generators for scholarship data sanitization
 * Uses fast-check to generate test data for various scenarios
 */
// opencoded These Texts GEnerations tewsts

import * as fc from 'fast-check';
import { Scholarship, ScraperResult, ScraperSummary } from '../types/index.js';

/**
 * Generates a valid URL string
 */
export const urlGen = fc.webUrl();

/**
 * Generates a valid scholarship name (3-500 characters)
 */
export const scholarshipNameGen = fc.string({ minLength: 3, maxLength: 500 });

/**
 * Generates a valid source name (2-100 characters)
 */
export const sourceNameGen = fc.string({ minLength: 2, maxLength: 100 });

/**
 * Generates a country name or array of country names
 */
export const countryGen = fc.oneof(
  fc.constantFrom('USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Japan'),
  fc.array(fc.constantFrom('USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Japan'), { minLength: 1, maxLength: 3 })
);

/**
 * Generates a degree level or array of degree levels
 */
export const degreeGen = fc.array(
  fc.constantFrom('Bachelor', 'Master', 'PhD', 'Postdoc', 'Undergraduate', 'Graduate'),
  { minLength: 1, maxLength: 3 }
);

/**
 * Generates various date formats (parseable and unparseable)
 */
export const dateStringGen = fc.oneof(
  // ISO dates
  fc.date().map(d => d.toISOString()),
  // Common formats
  fc.constantFrom(
    '2024-12-31',
    'December 31, 2024',
    '31/12/2024',
    '12/31/2024',
    // Relative dates
    'Varies',
    'Typically November',
    'Rolling deadline',
    'Ongoing',
    // Unparseable
    'TBD',
    'Contact institution',
    'See website',
    ''
  )
);

/**
 * Generates optional description text
 */
export const descriptionGen = fc.option(
  fc.string({ maxLength: 5000 }),
  { nil: null }
);

/**
 * Generates optional eligibility text
 */
export const eligibilityGen = fc.option(
  fc.string({ maxLength: 3000 }),
  { nil: null }
);

/**
 * Generates optional amount text
 */
export const amountGen = fc.option(
  fc.string({ maxLength: 200 }),
  { nil: null }
);

/**
 * Generates a valid Scholarship object
 */
export const validScholarshipGen: fc.Arbitrary<Scholarship> = fc.record({
  name: scholarshipNameGen,
  source: sourceNameGen,
  country: countryGen,
  degree: degreeGen,
  deadline: dateStringGen,
  link: urlGen,
  description: descriptionGen,
  eligibility: eligibilityGen,
  amount: amountGen,
  scrapedAt: fc.date().map(d => d.toISOString()),
});

/**
 * Generates a Scholarship with missing required fields
 */
export const invalidScholarshipGen = fc.record({
  name: fc.option(scholarshipNameGen, { nil: undefined as any }),
  source: fc.option(sourceNameGen, { nil: undefined as any }),
  country: countryGen,
  degree: degreeGen,
  deadline: dateStringGen,
  link: fc.option(urlGen, { nil: undefined as any }),
  description: descriptionGen,
  eligibility: eligibilityGen,
  amount: amountGen,
  scrapedAt: fc.date().map(d => d.toISOString()),
});

/**
 * Generates a Scholarship with overly long fields
 */
export const longFieldScholarshipGen: fc.Arbitrary<Scholarship> = fc.record({
  name: fc.string({ minLength: 501, maxLength: 1000 }),
  source: fc.string({ minLength: 101, maxLength: 200 }),
  country: countryGen,
  degree: degreeGen,
  deadline: dateStringGen,
  link: urlGen,
  description: fc.option(fc.string({ minLength: 5001, maxLength: 10000 }), { nil: null }),
  eligibility: fc.option(fc.string({ minLength: 3001, maxLength: 5000 }), { nil: null }),
  amount: fc.option(fc.string({ minLength: 201, maxLength: 500 }), { nil: null }),
  scrapedAt: fc.date().map(d => d.toISOString()),
});

/**
 * Generates a log message string (for testing filtering)
 */
export const logMessageGen = fc.record({
  level: fc.constantFrom('info', 'warn', 'error', 'debug'),
  message: fc.string(),
  timestamp: fc.date().map(d => d.toISOString()),
});

/**
 * Generates a ScraperResult with mixed success/failure
 */
export const scraperResultGen: fc.Arbitrary<ScraperResult> = fc.record({
  source: sourceNameGen,
  scholarships: fc.array(validScholarshipGen, { maxLength: 20 }),
  count: fc.nat({ max: 20 }),
  processingTime: fc.nat({ max: 10000 }),
  success: fc.boolean(),
  error: fc.option(fc.string(), { nil: undefined }),
}).map(result => ({
  ...result,
  count: result.scholarships.length,
}));

/**
 * Generates a failed ScraperResult
 */
export const failedScraperResultGen: fc.Arbitrary<ScraperResult> = fc.record({
  source: sourceNameGen,
  scholarships: fc.constant([]),
  count: fc.constant(0),
  processingTime: fc.nat({ max: 10000 }),
  success: fc.constant(false),
  error: fc.string(),
});

/**
 * Generates a ScraperResult with empty scholarships
 */
export const emptyScraperResultGen: fc.Arbitrary<ScraperResult> = fc.record({
  source: sourceNameGen,
  scholarships: fc.constant([]),
  count: fc.constant(0),
  processingTime: fc.nat({ max: 10000 }),
  success: fc.constant(true),
  error: fc.constant(undefined),
});

/**
 * Generates a ScraperSummary with mixed results
 */
export const scraperSummaryGen: fc.Arbitrary<ScraperSummary> = fc.array(scraperResultGen, { minLength: 1, maxLength: 10 })
  .map(results => {
    const successfulSources = results.filter(r => r.success).length;
    const failedSources = results.filter(r => !r.success).length;
    const totalScholarships = results.reduce((sum, r) => sum + r.scholarships.length, 0);
    const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    
    return {
      totalScholarships,
      successfulSources,
      failedSources,
      totalProcessingTime,
      successRate: results.length > 0 ? successfulSources / results.length : 0,
      results,
    };
  });


export const duplicateScholarshipPairGen = validScholarshipGen.chain(base =>
  fc.tuple(
    fc.constant(base),
    fc.constant(base).chain(() => 
      fc.record({
        name: fc.constantFrom(base.name, base.name + ' ', base.name.toLowerCase()),
        source: fc.constant(base.source),
        country: fc.constant(base.country),
        degree: fc.constant(base.degree),
        deadline: fc.constant(base.deadline),
        link: fc.constant(base.link),
        description: descriptionGen,
        eligibility: eligibilityGen,
        amount: amountGen,
        scrapedAt: fc.constant(base.scrapedAt),
      })
    )
  )
);

/**
 * Generates a scholarship with relative date terms
 */
export const relativeDateScholarshipGen: fc.Arbitrary<Scholarship> = validScholarshipGen.map(s => ({
  ...s,
  deadline: fc.sample(fc.constantFrom('Varies', 'Typically November', 'Rolling', 'Ongoing'), 1)[0],
}));

/**
 * Generates a scholarship with unparseable date
 */
export const unparseableDateScholarshipGen: fc.Arbitrary<Scholarship> = validScholarshipGen.map(s => ({
  ...s,
  deadline: fc.sample(fc.constantFrom('TBD', 'Contact institution', 'See website', 'N/A'), 1)[0],
}));
