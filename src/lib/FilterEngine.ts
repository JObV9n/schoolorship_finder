import { AmountParser } from './AmountParser';
import { DeadlineCalculator } from './DeadlineCalculator';
import { FilterState } from './FilterState';

interface AmountRangeConfig {
  min?: number;
  max?: number;
  special?: 'full' | 'none';
  label: string;
}

interface DeadlineRangeConfig {
  days: number;
  label: string;
}

interface Scholarship {
  amount?: string | null;
  deadline?: string | Date | null;
  country?: string | null;
  degree?: string | null;
  [key: string]: any;
}

export class FilterEngine {
  private amountParser: AmountParser;
  private deadlineCalculator: DeadlineCalculator;
  
  private readonly AMOUNT_RANGES: Record<string, AmountRangeConfig> = {
    'any': { min: 0, max: Infinity, label: 'Any Amount' },
    'under-5k': { min: 0, max: 5000, label: 'Under $5,000' },
    '5k-10k': { min: 5000, max: 10000, label: '$5,000 - $10,000' },
    '10k-20k': { min: 10000, max: 20000, label: '$10,000 - $20,000' },
    '20k-plus': { min: 20000, max: Infinity, label: '$20,000+' },
    'full-tuition': { special: 'full', label: 'Full Tuition' },
    'not-specified': { special: 'none', label: 'Amount Not Specified' }
  };
  
  private readonly DEADLINE_RANGES: Record<string, DeadlineRangeConfig> = {
    'any': { days: Infinity, label: 'Any Deadline' },
    'within-30': { days: 30, label: 'Due within 30 days' },
    'within-60': { days: 60, label: 'Due within 60 days' },
    'within-90': { days: 90, label: 'Due within 90 days' }
  };

  constructor(amountParser: AmountParser, deadlineCalculator: DeadlineCalculator) {
    this.amountParser = amountParser;
    this.deadlineCalculator = deadlineCalculator;
  }

  /**
   * Filter scholarships based on current filter state
   * @param scholarships - Array of scholarship objects
   * @param filterState - Current filter state
   * @returns Filtered scholarships
   */
  applyFilters(scholarships: Scholarship[], filterState: FilterState): Scholarship[] {
    if (!scholarships || !Array.isArray(scholarships)) {
      return [];
    }
    
    let filtered = scholarships;
    
    // Apply amount filter
    if (filterState.amountRange && filterState.amountRange !== 'any') {
      filtered = this.filterByAmount(filtered, filterState.amountRange);
    }
    
    // Apply deadline filter
    if (filterState.deadlineRange && filterState.deadlineRange !== 'any') {
      filtered = this.filterByDeadline(filtered, filterState.deadlineRange);
    }
    
    // Apply country filter
    if (filterState.country && filterState.country !== '') {
      filtered = this.filterByCountry(filtered, filterState.country);
    }
    
    // Apply degree filter
    if (filterState.degree && filterState.degree !== '') {
      filtered = this.filterByDegree(filtered, filterState.degree);
    }
    
    return filtered;
  }

  /**
   * Filter scholarships by amount range
   * @param scholarships - Array of scholarship objects
   * @param amountRange - Amount range key (e.g., 'under-5k', '5k-10k')
   * @returns Filtered scholarships
   */
  filterByAmount(scholarships: Scholarship[], amountRange: string): Scholarship[] {
    if (!scholarships || !Array.isArray(scholarships)) {
      return [];
    }
    
    const rangeConfig = this.AMOUNT_RANGES[amountRange];
    if (!rangeConfig) {
      console.warn(`Unknown amount range: ${amountRange}`);
      return scholarships;
    }
    
    // Handle 'any' case
    if (amountRange === 'any') {
      return scholarships;
    }
    
    return scholarships.filter(scholarship => {
      const parsed = this.amountParser.parse(scholarship.amount);
      
      // Handle special cases
      if (rangeConfig.special === 'full') {
        return parsed.isFullTuition;
      }
      
      if (rangeConfig.special === 'none') {
        return parsed.value === null && !parsed.isFullTuition;
      }
      
      // Handle numeric ranges
      if (parsed.value === null) {
        return false;
      }
      
      return parsed.value >= (rangeConfig.min || 0) && parsed.value < (rangeConfig.max || Infinity);
    });
  }

  /**
   * Filter scholarships by deadline proximity
   * @param scholarships - Array of scholarship objects
   * @param deadlineRange - Deadline range key (e.g., 'within-30', 'within-60')
   * @returns Filtered scholarships
   */
  filterByDeadline(scholarships: Scholarship[], deadlineRange: string): Scholarship[] {
    if (!scholarships || !Array.isArray(scholarships)) {
      return [];
    }
    
    const rangeConfig = this.DEADLINE_RANGES[deadlineRange];
    if (!rangeConfig) {
      console.warn(`Unknown deadline range: ${deadlineRange}`);
      return scholarships;
    }
    
    // Handle 'any' case
    if (deadlineRange === 'any') {
      return scholarships;
    }
    
    return scholarships.filter(scholarship => {
      return this.deadlineCalculator.isWithinDays(scholarship.deadline, rangeConfig.days);
    });
  }

  /**
   * Filter scholarships by country
   * @param scholarships - Array of scholarship objects
   * @param country - Country to filter by
   * @returns Filtered scholarships
   */
  filterByCountry(scholarships: Scholarship[], country: string): Scholarship[] {
    if (!scholarships || !Array.isArray(scholarships)) {
      return [];
    }
    
    if (!country || country === '') {
      return scholarships;
    }
    
    const normalizedCountry = country.toLowerCase().trim();
    
    return scholarships.filter(scholarship => {
      if (!scholarship.country) {
        return false;
      }
      
      const scholarshipCountry = scholarship.country.toLowerCase().trim();
      return scholarshipCountry === normalizedCountry;
    });
  }

  /**
   * Filter scholarships by degree level
   * @param scholarships - Array of scholarship objects
   * @param degree - Degree level to filter by
   * @returns Filtered scholarships
   */
  filterByDegree(scholarships: Scholarship[], degree: string): Scholarship[] {
    if (!scholarships || !Array.isArray(scholarships)) {
      return [];
    }
    
    if (!degree || degree === '') {
      return scholarships;
    }
    
    const normalizedDegree = degree.toLowerCase().trim();
    
    return scholarships.filter(scholarship => {
      if (!scholarship.degree) {
        return false;
      }
      
      const scholarshipDegree = scholarship.degree.toLowerCase().trim();
      return scholarshipDegree === normalizedDegree;
    });
  }
}
