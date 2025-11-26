export const SCHOLARSHIP_SCHEMA = {
  required: ['name', 'source', 'link'] as const,
  optional: ['country', 'degree', 'deadline', 'description', 'eligibility', 'amount'] as const,
  constraints: {
    name: { minLength: 3, maxLength: 500 },
    source: { minLength: 2, maxLength: 100 },
    link: { pattern: /^https?:\/\/.+/ },
    description: { maxLength: 5000 },
    eligibility: { maxLength: 3000 },
    amount: { maxLength: 200 },
    country: { maxLength: 200 },
    degree: { maxLength: 200 },
  },
} as const;

export type RequiredField = typeof SCHOLARSHIP_SCHEMA.required[number];
export type OptionalField = typeof SCHOLARSHIP_SCHEMA.optional[number];
export type ScholarshipField = RequiredField | OptionalField;
