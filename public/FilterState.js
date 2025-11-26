/**
 * FilterState class manages the current state of all active filters
 * for the scholarship search interface.
 */
class FilterState {
  constructor() {
    // Initialize with default filter values
    this.amountRange = 'any';
    this.deadlineRange = 'any';
    this.country = '';
    this.degree = '';
  }

  /**
   * Update a specific filter value
   * @param {string} filterName - Name of the filter to update
   * @param {string} value - New value for the filter
   */
  setFilter(filterName, value) {
    if (this.hasOwnProperty(filterName)) {
      this[filterName] = value;
    } else {
      console.warn(`Unknown filter: ${filterName}`);
    }
  }

  /**
   * Reset all filters to their default values
   */
  resetAll() {
    this.amountRange = 'any';
    this.deadlineRange = 'any';
    this.country = '';
    this.degree = '';
  }

  /**
   * Get all active filters (filters with non-default values)
   * @returns {Object} Object containing only active filters
   */
  getActiveFilters() {
    const activeFilters = {};
    
    if (this.amountRange !== 'any') {
      activeFilters.amountRange = this.amountRange;
    }
    
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

  /**
   * Check if any filters are currently active
   * @returns {boolean} True if any filters have non-default values
   */
  hasActiveFilters() {
    return this.amountRange !== 'any' ||
           this.deadlineRange !== 'any' ||
           this.country !== '' ||
           this.degree !== '';
  }
}
