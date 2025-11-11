/**
 * Application-wide constants
 * Centralized location for magic numbers and configuration values
 */

/**
 * Wealth threshold for comparisons (in USD)
 * This represents the amount set aside for "comfortable living"
 * All comparisons calculate what wealth ABOVE this threshold could fund
 */
export const WEALTH_THRESHOLD_USD = 10_000_000; // $10 million

/**
 * Wealth threshold in millions (for calculations where net worth is stored in millions)
 */
export const WEALTH_THRESHOLD_MILLIONS = WEALTH_THRESHOLD_USD / 1_000_000; // 10

/**
 * Number of top billionaires to display on homepage
 */
export const TOP_BILLIONAIRES_COUNT = 50;

/**
 * Number of aggregate comparisons to show on homepage
 */
export const AGGREGATE_COMPARISON_LIMIT = 6;

/**
 * Default number of days for wealth history charts
 */
export const CHART_DAYS_DEFAULT = 30;

/**
 * Maximum number of days allowed for history queries (prevent abuse)
 */
export const CHART_DAYS_MAX = 365;

/**
 * Cache revalidation time for homepage (in seconds)
 */
export const HOMEPAGE_REVALIDATE_SECONDS = 3600; // 1 hour

/**
 * Cache revalidation time for individual pages (in seconds)
 */
export const INDIVIDUAL_PAGE_REVALIDATE_SECONDS = 3600; // 1 hour

/**
 * Cache revalidation time for about page (in seconds)
 */
export const ABOUT_PAGE_REVALIDATE_SECONDS = 86400; // 24 hours

/**
 * Site configuration keys (for site_config table queries)
 */
export const SITE_CONFIG_KEYS = {
  WEALTH_THRESHOLD: 'wealth_threshold',
  HOMEPAGE_BILLIONAIRE_LIMIT: 'homepage_billionaire_limit',
  CHART_DAYS_DEFAULT: 'chart_days_default',
  LAST_MANUAL_UPDATE: 'last_manual_update',
} as const;

/**
 * Data source names (for data_sources table queries)
 */
export const DATA_SOURCE_NAMES = {
  FORBES_REALTIME: 'Forbes Real-Time Billionaires',
  KOMED3_API: 'komed3/rtb-api',
  BLOOMBERG: 'Bloomberg Billionaires Index',
} as const;

/**
 * Valid comparison cost categories
 */
export const COMPARISON_CATEGORIES = [
  'water',
  'education',
  'food',
  'healthcare',
  'housing',
  'energy',
  'emergency-relief',
  'basic-needs',
] as const;

export type ComparisonCategory = typeof COMPARISON_CATEGORIES[number];

/**
 * Number formatting thresholds
 */
export const FORMAT_THRESHOLDS = {
  TRILLION: 1_000_000_000_000,
  BILLION: 1_000_000_000,
  MILLION: 1_000_000,
  THOUSAND: 1_000,
} as const;

/**
 * JavaScript's maximum safe integer for BigInt conversion validation
 */
export const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER; // 9,007,199,254,740,991
