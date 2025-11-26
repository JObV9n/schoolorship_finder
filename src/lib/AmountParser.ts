export interface ParsedAmount {
  value: number | null;
  isRange: boolean;
  isFullTuition: boolean;
  isVariable: boolean;
  originalText: string;
}

export class AmountParser {
  private fullCoverageKeywords: string[];
  private variableKeywords: string[];

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


  parse(amountString: string | null | undefined): ParsedAmount {
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
    
    const isRange = this.isRangeFormat(amountString);
    let value: number | null = null;
    
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

  private isRangeFormat(text: string): boolean {
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

  extractMaxFromRange(rangeString: string | null | undefined): number | null {
    if (!rangeString) return null;
    
    const numbers = this.extractAllNumericValues(rangeString);
    
    if (numbers.length === 0) return null;
    
    if (numbers.length === 1) return numbers[0];
    
    return Math.max(...numbers);
  }

  /**
   * Extract all numeric values from text
   * @param text
   * @returns number[]
   */
  private extractAllNumericValues(text: string): number[] {
    if (!text) return [];
    
    let cleaned = text.replace(/[£€$¥₹]/g, '');
    
    const numberPattern = /\d+(?:,\d{3})*(?:\.\d+)?/g;
    const matches = cleaned.match(numberPattern);
    
    if (!matches) return [];
    
    return matches.map(match => {
      const num = parseFloat(match.replace(/,/g, ''));
      return isNaN(num) ? null : num;
    }).filter((n): n is number => n !== null);
  }

  /**
   * Extract single numeric value from text
   * @param text
   * @returns number | null
   */
  extractNumericValue(text: string | null | undefined): number | null {
    if (!text) return null;
    
    const numbers = this.extractAllNumericValues(text);
    
    if (numbers.length === 0) return null;
    
    return numbers[0];
  }

  /**
   * Detect if amount represents full tuition/coverage
   * @param text
   * @returns boolean
   */
  isFullCoverage(text: string | null | undefined): boolean {
    if (!text) return false;
    
    const normalizedText = text.toLowerCase().trim();
    
    return this.fullCoverageKeywords.some(keyword => 
      normalizedText.includes(keyword)
    );
  }
}
