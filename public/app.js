let countrySelect;
let degreeSelect;
let searchBtn;
let loadingDiv;
let errorDiv;
let resultsCountDiv;
let resultsDiv;

// Store original search results for client-side filtering
let originalSearchResults = [];

// Filter system instances
let filterState;
let filterEngine;
let filterUI;

/**
 * FilterUI class manages the UI components for filter controls
 * 
 * Handles rendering filter controls, managing user interactions,
 * and displaying active filter state.
 */
class FilterUI {
  constructor(filterState, filterEngine, onFilterChange) {
    this.filterState = filterState;
    this.filterEngine = filterEngine;
    this.onFilterChange = onFilterChange; // Callback when filters change
    
    // DOM element references
    this.amountFilter = null;
    this.deadlineFilter = null;
    this.resetButton = null;
    this.activeFiltersDisplay = null;
  }
  
  /**
   * Initialize filter controls in the DOM
   * Sets up event listeners and initial state
   */
  initialize() {
    // Get references to existing DOM elements
    this.amountFilter = document.getElementById('amount-filter');
    this.deadlineFilter = document.getElementById('deadline-filter');
    this.resetButton = document.getElementById('reset-filters-btn');
    this.activeFiltersDisplay = document.getElementById('active-filters');
    
    if (!this.amountFilter || !this.deadlineFilter || !this.resetButton || !this.activeFiltersDisplay) {
      console.error('Filter UI elements not found in DOM');
      return;
    }
    
    // Set up event listeners
    this.amountFilter.addEventListener('change', (e) => {
      this.handleFilterChange('amountRange', e.target.value);
    });
    
    this.deadlineFilter.addEventListener('change', (e) => {
      this.handleFilterChange('deadlineRange', e.target.value);
    });
    
    this.resetButton.addEventListener('click', () => {
      this.handleReset();
    });
    
    // Initialize display
    this.updateActiveFiltersDisplay();
  }
  
  /**
   * Create amount filter dropdown
   * @returns {HTMLSelectElement}
   */
  createAmountFilter() {
    const select = document.createElement('select');
    select.id = 'amount-filter';
    select.className = 'filter-select';
    
    // Get amount ranges from FilterEngine
    const ranges = this.filterEngine.AMOUNT_RANGES;
    
    for (const [key, config] of Object.entries(ranges)) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = config.label;
      select.appendChild(option);
    }
    
    return select;
  }
  
  /**
   * Create deadline filter dropdown
   * @returns {HTMLSelectElement}
   */
  createDeadlineFilter() {
    const select = document.createElement('select');
    select.id = 'deadline-filter';
    select.className = 'filter-select';
    
    // Get deadline ranges from FilterEngine
    const ranges = this.filterEngine.DEADLINE_RANGES;
    
    for (const [key, config] of Object.entries(ranges)) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = config.label;
      select.appendChild(option);
    }
    
    return select;
  }
  
  /**
   * Create reset filters button
   * @returns {HTMLButtonElement}
   */
  createResetButton() {
    const button = document.createElement('button');
    button.id = 'reset-filters-btn';
    button.className = 'reset-button';
    button.textContent = 'Reset Filters';
    
    return button;
  }
  
  /**
   * Update active filter display to show current filters
   */
  updateActiveFiltersDisplay() {
    if (!this.activeFiltersDisplay) {
      return;
    }
    
    const activeFilters = this.filterState.getActiveFilters();
    
    // Hide display if no active filters
    if (!this.filterState.hasActiveFilters()) {
      this.activeFiltersDisplay.classList.add('hidden');
      this.activeFiltersDisplay.innerHTML = '';
      return;
    }
    
    // Show display and build filter tags
    this.activeFiltersDisplay.classList.remove('hidden');
    this.activeFiltersDisplay.innerHTML = '<strong>Active Filters:</strong> ';
    
    const filterTags = [];
    
    // Add amount filter tag
    if (activeFilters.amountRange) {
      const config = this.filterEngine.AMOUNT_RANGES[activeFilters.amountRange];
      if (config) {
        filterTags.push(`Amount: ${config.label}`);
      }
    }
    
    // Add deadline filter tag
    if (activeFilters.deadlineRange) {
      const config = this.filterEngine.DEADLINE_RANGES[activeFilters.deadlineRange];
      if (config) {
        filterTags.push(`Deadline: ${config.label}`);
      }
    }
    
    // Add country filter tag
    if (activeFilters.country) {
      filterTags.push(`Country: ${activeFilters.country}`);
    }
    
    // Add degree filter tag
    if (activeFilters.degree) {
      filterTags.push(`Degree: ${activeFilters.degree}`);
    }
    
    // Create filter tag elements
    filterTags.forEach(tagText => {
      const tag = document.createElement('span');
      tag.className = 'filter-tag';
      tag.textContent = tagText;
      this.activeFiltersDisplay.appendChild(tag);
    });
  }
  
  /**
   * Handle filter change event
   * @param {string} filterName - Name of the filter that changed
   * @param {string} value - New value for the filter
   */
  handleFilterChange(filterName, value) {
    // Update filter state
    this.filterState.setFilter(filterName, value);
    
    // Update active filters display
    this.updateActiveFiltersDisplay();
    
    // Trigger callback to apply filters
    if (this.onFilterChange) {
      this.onFilterChange();
    }
  }
  
  /**
   * Handle reset button click
   */
  handleReset() {
    // Reset filter state
    this.filterState.resetAll();
    
    // Reset UI controls
    if (this.amountFilter) {
      this.amountFilter.value = 'any';
    }
    if (this.deadlineFilter) {
      this.deadlineFilter.value = 'any';
    }
    
    // Update active filters display
    this.updateActiveFiltersDisplay();
    
    // Trigger callback to apply filters (which will show all results)
    if (this.onFilterChange) {
      this.onFilterChange();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  countrySelect = document.getElementById('country-select');
  degreeSelect = document.getElementById('degree-select');
  searchBtn = document.getElementById('search-btn');
  loadingDiv = document.getElementById('loading');
  errorDiv = document.getElementById('error');
  resultsCountDiv = document.getElementById('results-count');
  resultsDiv = document.getElementById('results');

  // Initialize filter system
  const amountParser = new AmountParser();
  const deadlineCalculator = new DeadlineCalculator();
  filterState = new FilterState();
  filterEngine = new FilterEngine(amountParser, deadlineCalculator);
  filterUI = new FilterUI(filterState, filterEngine, applyClientSideFilters);
  
  // Initialize filter UI
  filterUI.initialize();

  loadCountries();
  loadDegrees();

  searchBtn.addEventListener('click', searchScholarships);
  
  countrySelect.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchScholarships();
  });
  
  degreeSelect.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchScholarships();
  });
  
  // Add event listeners for country and degree selects to update filter state
  countrySelect.addEventListener('change', (e) => {
    filterState.setFilter('country', e.target.value);
    filterUI.updateActiveFiltersDisplay();
    if (originalSearchResults.length > 0) {
      applyClientSideFilters();
    }
  });
  
  degreeSelect.addEventListener('change', (e) => {
    filterState.setFilter('degree', e.target.value);
    filterUI.updateActiveFiltersDisplay();
    if (originalSearchResults.length > 0) {
      applyClientSideFilters();
    }
  });
});

async function loadCountries() {
  try {
    const response = await fetch('/api/countries');
    if (!response.ok) {
      throw new Error('Failed to load countries');
    }
    
    const countries = await response.json();
    
    countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country;
      option.textContent = country;
      countrySelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading countries:', error);
  }
}

async function loadDegrees() {
  try {
    const response = await fetch('/api/degrees');
    if (!response.ok) {
      throw new Error('Failed to load degrees');
    }
    
    const degrees = await response.json();
    
    degrees.forEach(degree => {
      const option = document.createElement('option');
      option.value = degree;
      option.textContent = degree;
      degreeSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading degrees:', error);
  }
}

function showLoading() {
  loadingDiv.classList.remove('hidden');
  errorDiv.classList.add('hidden');
  resultsCountDiv.textContent = '';
  resultsDiv.innerHTML = '';
}

function hideLoading() {
  loadingDiv.classList.add('hidden');
}

function displayError(message) {
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
  resultsCountDiv.textContent = '';
  resultsDiv.innerHTML = '';
}

function formatDate(dateString) {
  if (!dateString) return 'Not specified';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
}

function displayResults(scholarships) {
  resultsDiv.innerHTML = '';
  errorDiv.classList.add('hidden');
  
  resultsCountDiv.textContent = `Found ${scholarships.length} scholarship${scholarships.length !== 1 ? 's' : ''}`;
  
  if (scholarships.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'No scholarships found. Try adjusting your filters.';
    resultsDiv.appendChild(emptyMessage);
    return;
  }
  
  scholarships.forEach(scholarship => {
    const card = document.createElement('div');
    card.className = 'scholarship-card';
    
    const name = document.createElement('h3');
    name.className = 'scholarship-name';
    name.textContent = scholarship.name;
    card.appendChild(name);
    
    const source = document.createElement('p');
    source.className = 'scholarship-detail';
    source.innerHTML = `<strong>Source:</strong> ${scholarship.source}`;
    card.appendChild(source);
    
    const country = document.createElement('p');
    country.className = 'scholarship-detail';
    const countryValue = Array.isArray(scholarship.country) 
      ? scholarship.country.join(', ') 
      : scholarship.country;
    country.innerHTML = `<strong>Country:</strong> ${countryValue}`;
    card.appendChild(country);
    
    const degree = document.createElement('p');
    degree.className = 'scholarship-detail';
    const degreeValue = Array.isArray(scholarship.degree) 
      ? scholarship.degree.join(', ') 
      : scholarship.degree;
    degree.innerHTML = `<strong>Degree:</strong> ${degreeValue}`;
    card.appendChild(degree);
    
    const deadline = document.createElement('p');
    deadline.className = 'scholarship-detail';
    deadline.innerHTML = `<strong>Deadline:</strong> ${formatDate(scholarship.deadline)}`;
    card.appendChild(deadline);
    
    if (scholarship.link) {
      const link = document.createElement('a');
      link.href = scholarship.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'scholarship-link';
      link.textContent = 'View Details →';
      card.appendChild(link);
    }
    
    resultsDiv.appendChild(card);
  });
}

/**
 * Apply client-side filters to the stored search results
 */
function applyClientSideFilters() {
  if (!originalSearchResults || originalSearchResults.length === 0) {
    return;
  }
  
  // Apply filters using FilterEngine
  const filteredResults = filterEngine.applyFilters(originalSearchResults, filterState);
  
  // Display filtered results
  displayResults(filteredResults);
}

async function searchScholarships() {
  const country = countrySelect.value;
  const degree = degreeSelect.value;
  
  const params = new URLSearchParams();
  if (country) params.append('country', country);
  if (degree) params.append('degree', degree);
  
  showLoading();
  
  try {
    const response = await fetch(`/api/scholarships?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch scholarships');
    }
    
    const scholarships = await response.json();
    
    // Store original results for client-side filtering
    originalSearchResults = scholarships;
    
    // Update filter state with current country and degree
    filterState.setFilter('country', country);
    filterState.setFilter('degree', degree);
    
    hideLoading();
    
    // Apply any active filters before displaying
    applyClientSideFilters();
  } catch (error) {
    hideLoading();
    displayError('Failed to search scholarships. Please try again.');
    console.error('Search error:', error);
  }
}
