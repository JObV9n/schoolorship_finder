/**
 * AmountParser - Parses and normalizes scholarship amount strings
 * 
 * Handles various formats:
 * - Currency symbols: "$10,000", "£5,000", "€15,000"
 * - Ranges: "$5,000 - $10,000", "Up to $20,000"
 * - Special cases: "Full tuition", "Varies", "TBD"
 */
class AmountParser {
  constructor() {
    // Keywords that indicate full tuition/coverage
    this.fullCoverageKeywords = [
      'full tuition',
      'full coverage',
      'full funding',
      'fully funded',
      'complete funding',
      'total coverage'
    ];
    
    // Keywords that indicate variable/unspecified amounts
    this.variableKeywords = [
      'varies',
      'variable',
      'tbd',
      'to be determined',
      'not specified',
      'contact',
      'inquire'
    ];
  }

  /**
   * Parse amount string and extract structured information
   * @param {string} amountString - Raw amount text
   * @returns {ParsedAmount}
   */
  parse(amountString) {
    if (!amountString || typeof amountString !== 'string') {
      return {
        value: null,
        isRange: false,
        isFullTuition: false,
        isVariable: false,
        originalText: amountString || ''
      };
    }

    const normalizedText = amountString.toLowerCase().trim();
    
    // Check for full tuition/coverage
    const isFullTuition = this.isFullCoverage(normalizedText);
    if (isFullTuition) {
      return {
        value: null,
        isRange: false,
        isFullTuition: true,
        isVariable: false,
        originalText: amountString
      };
    }
    
    // Check for variable amounts
    const isVariable = this.variableKeywords.some(keyword => 
      normalizedText.includes(keyword)
    );
    if (isVariable) {
      return {
        value: null,
        isRange: false,
        isFullTuition: false,
        isVariable: true,
        originalText: amountString
      };
    }
    
    // Check if it's a range
    const isRange = this.isRangeFormat(amountString);
    let value = null;
    
    if (isRange) {
      value = this.extractMaxFromRange(amountString);
    } else {
      value = this.extractNumericValue(amountString);
    }
    
    return {
      value,
      isRange,
      isFullTuition: false,
      isVariable: false,
      originalText: amountString
    };
  }

  /**
   * Check if text represents a range format
   * @param {string} text
   * @returns {boolean}
   */
  isRangeFormat(text) {
    if (!text) return false;
    
    // Common range patterns: "X - Y", "X to Y", "X-Y", "up to X"
    // Need to account for comma-formatted numbers like "$5,000 - $10,000"
    const rangePatterns = [
      /\d[\d,]*\s*-\s*[\$£€¥₹]?\d/,  // Number-dash-number with optional currency (e.g., "5,000 - $10,000")
      /\d\s+to\s+\d/i,                 // "X to Y"
      /up\s+to/i,                      // "up to X"
      /between\s+/i                    // "between X and Y"
    ];
    
    return rangePatterns.some(pattern => pattern.test(text));
  }

  /**
   * Extract maximum value from range string
   * @param {string} rangeString
   * @returns {number | null}
   */
  extractMaxFromRange(rangeString) {
    if (!rangeString) return null;
    
    // Extract all numeric values from the string
    const numbers = this.extractAllNumericValues(rangeString);
    
    if (numbers.length === 0) return null;
    
    // For "up to X" format, return the single value
    if (numbers.length === 1) return numbers[0];
    
    // For ranges, return the maximum value
    return Math.max(...numbers);
  }

  /**
   * Extract all numeric values from text
   * @param {string} text
   * @returns {number[]}
   */
  extractAllNumericValues(text) {
    if (!text) return [];
    
    // Remove currency symbols and common text
    let cleaned = text.replace(/[£€$¥₹]/g, '');
    
    // Find all number patterns (including decimals and commas)
    const numberPattern = /\d+(?:,\d{3})*(?:\.\d+)?/g;
    const matches = cleaned.match(numberPattern);
    
    if (!matches) return [];
    
    return matches.map(match => {
      // Remove commas and parse
      const num = parseFloat(match.replace(/,/g, ''));
      return isNaN(num) ? null : num;
    }).filter(n => n !== null);
  }

  /**
   * Extract single numeric value from text
   * @param {string} text
   * @returns {number | null}
   */
  extractNumericValue(text) {
    if (!text) return null;
    
    const numbers = this.extractAllNumericValues(text);
    
    if (numbers.length === 0) return null;
    
    // Return the first (or only) number found
    return numbers[0];
  }

  /**
   * Detect if amount represents full tuition/coverage
   * @param {string} text
   * @returns {boolean}
   */
  isFullCoverage(text) {
    if (!text) return false;
    
    const normalizedText = text.toLowerCase().trim();
    
    return this.fullCoverageKeywords.some(keyword => 
      normalizedText.includes(keyword)
    );
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AmountParser;
}
