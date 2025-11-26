import { Scholarship, ValidationResult, ValidationError, ValidationWarning } from '../types';
import { SCHOLARSHIP_SCHEMA } from './validation-schema';

export class ScholarshipValidator {
  /**
   * Validates a single scholarship record against the schema
   */
  validate(scholarship: Scholarship): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required fields
    for (const field of SCHOLARSHIP_SCHEMA.required) {
      const value = scholarship[field];
      
      if (value === undefined || value === null || value === '') {
        errors.push({
          field,
          message: `Required field '${field}' is missing or empty`,
          severity: 'critical',
        });
        continue;
      }

      // Validate field-specific constraints
      this.validateFieldConstraints(field, value, errors, warnings);
    }

    for (const field of SCHOLARSHIP_SCHEMA.optional) {
      const value = scholarship[field];
      
      if (value !== undefined && value !== null && value !== '') {
        this.validateFieldConstraints(field, value, errors, warnings);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates a batch of scholarships
   */
  validateBatch(scholarships: Scholarship[]): Map<Scholarship, ValidationResult> {
    const results = new Map<Scholarship, ValidationResult>();
    
    for (const scholarship of scholarships) {
      results.set(scholarship, this.validate(scholarship));
    }
    
    return results;
  }

  /**
   * Returns the list of required fields
   */
  getRequiredFields(): string[] {
    return [...SCHOLARSHIP_SCHEMA.required];
  }

  /**
   * Returns the list of optional fields
   */
  getOptionalFields(): string[] {
    return [...SCHOLARSHIP_SCHEMA.optional];
  }

  /**
   * Validates field-specific constraints
   */
  private validateFieldConstraints(
    field: string,
    value: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const constraints = SCHOLARSHIP_SCHEMA.constraints[field as keyof typeof SCHOLARSHIP_SCHEMA.constraints];
    
    if (!constraints) {
      return;
    }

    const stringValue = typeof value === 'string' ? value : String(value);

    // Check minLength
    if ('minLength' in constraints && stringValue.length < constraints.minLength) {
      errors.push({
        field,
        message: `Field '${field}' must be at least ${constraints.minLength} characters`,
        severity: 'major',
      });
    }

    // Check maxLength
    if ('maxLength' in constraints && stringValue.length > constraints.maxLength) {
      warnings.push({
        field,
        message: `Field '${field}' exceeds maximum length of ${constraints.maxLength} characters`,
        suggestion: 'Value will be truncated',
      });
    }

    // Check pattern (for URLs)
    if ('pattern' in constraints && !constraints.pattern.test(stringValue)) {
      errors.push({
        field,
        message: `Field '${field}' does not match required pattern`,
        severity: 'major',
      });
    }
  }
}
