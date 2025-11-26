
export class FilterState {
  amountRange: string;
  deadlineRange: string;
  country: string;
  degree: string;

  constructor() {
    this.amountRange = 'any';
    this.deadlineRange = 'any';
    this.country = '';
    this.degree = '';
  }

  /**
   * Update a specific filter value
   * @param filterName - Name of the filter to update
   * @param value - New value for the filter
   */
  setFilter(filterName: string, value: string): void {
    if (this.hasOwnProperty(filterName)) {
      (this as any)[filterName] = value;
    } else {
      console.warn(`Unknown filter: ${filterName}`);
    }
  }


  resetAll(): void {
    this.amountRange = 'any';
    this.deadlineRange = 'any';
    this.country = '';
    this.degree = '';
  }

  getActiveFilters(): Record<string, string> {
    const activeFilters: Record<string, string> = {};
    
    if (this.amountRange !== 'any') {
      activeFilters.amountRange = this.amountRange;
    }
    // TODO => Exceptions Addition
    if (this.deadlineRange !== 'any') { 
      activeFilters.deadlineRange = this.deadlineRange;
    }
    
    if (this.country !== '') {
      activeFilters.country = this.country;
    }
    
    if (this.degree !== '') {
      activeFilters.degree = this.degree;
    }
    
    return activeFilters;
  }


  hasActiveFilters(): boolean {
    return this.amountRange !== 'any' ||
           this.deadlineRange !== 'any' ||
           this.country !== '' ||
           this.degree !== '';
  }
}
