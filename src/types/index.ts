export interface RawScholarship {
  name: string;
  source: string;
  country: string | string[];
  degree: string | string[];
  deadline: string | Date;
  link: string;
  description?: string;
  eligibility?: string;
  amount?: string;
}

export interface Scholarship {
  name: string;
  source: string;
  country: string | string[];
  degree: string[];
  deadline: string;
  link: string;
  description: string | null;
  eligibility: string | null;
  amount: string | null;
  scrapedAt: string;
}

export interface ScholarshipScraper {
  name: string;
  scrape(): Promise<RawScholarship[]>;
}

export interface ScraperSourceConfig {
  enabled: boolean;
  name: string;
  url: string;
  type: 'static' | 'dynamic';
  rateLimit: number;
  timeout: number;
  selectors?: {
    container?: string;
    name?: string;
    deadline?: string;
    link?: string;
    country?: string;
    degree?: string;
    description?: string;
    eligibility?: string;
    amount?: string;
  };
}

export interface ScraperConfig {
  concurrency: number;
  timeout: number;
  retries: number;
  rateLimit: number;
  cacheEnabled: boolean;
  cacheDuration: number;
  retry: {
    retries: number;
    baseDelay: number;
    maxDelay: number;
  };
  userAgent: string;
  sources: {
    [key: string]: ScraperSourceConfig;
  };
}

export interface RetryOptions {
  retries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RateLimiterOptions {
  requestsPerSecond: number;
  maxConcurrent?: number;
}

export interface ScholarshipSearchParams {
  country?: string;
  degree?: string;
  limit?: number;
}

export interface ScraperResult {
  source: string;
  scholarships: Scholarship[];
  count: number;
  processingTime: number;
  success: boolean;
  error?: string;
}

export interface ScraperSummary {
  totalScholarships: number;
  successfulSources: number;
  failedSources: number;
  totalProcessingTime: number;
  successRate: number;
  results: ScraperResult[];
}

// Data Sanitization Types

export interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface NormalizedDate {
  isoDate: string | null;
  originalValue: string;
  confidence: 'high' | 'medium' | 'low';
  metadata: {
    isRelative: boolean;
    isTBD: boolean;
    isRecurring: boolean;
    notes?: string;
  };
}

export interface DuplicateGroup {
  canonical: Scholarship;
  duplicates: Scholarship[];
  similarityScore: number;
  mergeStrategy: 'keep-first' | 'merge-all' | 'keep-most-complete'; // not required maybe requried khoi??
}

export interface DeduplicationConfig {
  titleSimilarityThreshold: number; // 0.0 to 1.0
  institutionWeight: number;
  urlWeight: number;
  fuzzyMatchingEnabled: boolean;
}

export interface SourceQualityMetrics {
  source: string;
  totalRecords: number;
  validRecords: number;
  rejectedRecords: number;
  rejectionReasons: Map<string, number>;
  dateParsingIssues: Map<string, number>;
  duplicatesFound: number;
  averageCompleteness: number; // 0.0 to 1.0
}

export interface QualityReport {
  timestamp: string;
  overallMetrics: {
    totalRecords: number;
    validRecords: number;
    rejectionRate: number;
    deduplicationRate: number;
  };
  sourceMetrics: SourceQualityMetrics[];
  topIssues: Array<{ issue: string; count: number }>;
}

export interface SanitizationOptions {
  strictValidation: boolean;
  enableDeduplication: boolean;
  deduplicationConfig: DeduplicationConfig;
  maxFieldLength: number;
  collectMetrics: boolean;
}

export interface SanitizedResult {
  scholarships: SanitizedScholarship[];
  qualityReport: QualityReport;
  processingTime: number;
}

export interface SanitizedScholarship extends Scholarship {
  validationStatus: 'valid' | 'warning' | 'partial';
  completeness: number; // 0.0 to 1.0
  dateMetadata?: {
    confidence: 'high' | 'medium' | 'low';
    isRelative: boolean;
    isTBD: boolean;
    originalValue: string;
  };
  sources: string[]; // Multiple sources if merged from duplicates
  mergedFrom?: string[]; // IDs of merged scholarships
}
