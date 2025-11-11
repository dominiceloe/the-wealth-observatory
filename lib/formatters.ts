/**
 * Shared formatting utilities
 * Centralized location for all data formatting functions
 */

import { FORMAT_THRESHOLDS } from './constants';

/**
 * Format large numbers with appropriate scale (billion, million, thousand)
 * @param quantity - The number to format
 * @returns Formatted string (e.g., "32.5 billion", "1.2 million")
 */
export function formatQuantity(quantity: number): string {
  let formatted: string;

  if (quantity >= FORMAT_THRESHOLDS.BILLION) {
    formatted = (quantity / FORMAT_THRESHOLDS.BILLION).toFixed(1);
    formatted = formatted.replace(/\.0$/, ''); // Remove .0 if whole number
    return `${formatted} billion`;
  }
  if (quantity >= FORMAT_THRESHOLDS.MILLION) {
    formatted = (quantity / FORMAT_THRESHOLDS.MILLION).toFixed(1);
    formatted = formatted.replace(/\.0$/, '');
    return `${formatted} million`;
  }
  if (quantity >= FORMAT_THRESHOLDS.THOUSAND) {
    formatted = (quantity / FORMAT_THRESHOLDS.THOUSAND).toFixed(1);
    formatted = formatted.replace(/\.0$/, '');
    return `${formatted} thousand`;
  }
  return quantity.toLocaleString();
}

/**
 * Format net worth in millions to display format
 * @param millions - Net worth in millions (e.g., 245000 for $245B)
 * @returns Formatted string (e.g., "$245.0B", "$5.2M")
 */
export function formatNetWorth(millions: number): string {
  if (millions >= 1000) {
    return `$${(millions / 1000).toFixed(1)}B`;
  }
  return `$${millions.toFixed(1)}M`;
}

/**
 * Format daily change value with sign
 * @param millions - Change in millions (can be negative)
 * @returns Formatted string with sign (e.g., "+$2.1B", "-$500M", "No change")
 */
export function formatChange(millions: number | null): string {
  if (millions === null) return 'No change';

  const sign = millions >= 0 ? '+' : '';
  const formatted = formatNetWorth(Math.abs(millions));

  return `${sign}${formatted}`;
}

/**
 * Format currency amounts with appropriate scale
 * @param amount - Amount in full USD
 * @returns Formatted string (e.g., "$2.50M", "$150K", "$500")
 */
export function formatCurrency(amount: number): string {
  if (amount >= FORMAT_THRESHOLDS.MILLION) {
    return `$${(amount / FORMAT_THRESHOLDS.MILLION).toFixed(2)}M`;
  }
  if (amount >= FORMAT_THRESHOLDS.THOUSAND) {
    return `$${(amount / FORMAT_THRESHOLDS.THOUSAND).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

/**
 * Format and capitalize unit names
 * @param unit - Unit string (e.g., "water-well", "school")
 * @returns Capitalized formatted unit (e.g., "Water Well", "School")
 */
export function formatUnit(unit: string): string {
  // Remove hyphens and split into words
  const words = unit.split('-').join(' ').split(' ');

  // Capitalize each word
  const capitalized = words.map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );

  return capitalized.join(' ');
}

/**
 * Pluralize unit names based on quantity
 * @param unit - Unit string (e.g., "water-well", "school")
 * @param quantity - Number of units
 * @returns Pluralized unit if quantity > 1
 */
export function pluralizeUnit(unit: string, quantity: number): string {
  if (quantity <= 1) return unit;
  if (unit.endsWith('s') || unit.endsWith('ies')) return unit;
  if (unit.endsWith('y')) return unit.slice(0, -1) + 'ies';
  return unit + 's';
}

/**
 * Format category names (capitalize first letter)
 * @param category - Category string (e.g., "water", "education")
 * @returns Capitalized category (e.g., "Water", "Education")
 */
export function formatCategoryName(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Validate and safely convert BigInt values to Number
 * Warns if value exceeds MAX_SAFE_INTEGER
 * @param value - BigInt value (as string from database) or number
 * @param context - Context for error message (e.g., "net_worth", "quantity")
 * @returns Number value (or MAX_SAFE_INTEGER if too large)
 */
export function safeBigIntToNumber(value: string | number, context: string = 'value'): number {
  const num = Number(value);

  if (!Number.isFinite(num)) {
    console.error(`Invalid number for ${context}: ${value}`);
    return 0;
  }

  if (num > Number.MAX_SAFE_INTEGER) {
    console.warn(
      `Value ${value} for ${context} exceeds MAX_SAFE_INTEGER (${Number.MAX_SAFE_INTEGER}). ` +
      `Precision may be lost. Consider using BigInt throughout the application.`
    );
    // Return the number anyway, but warn about precision loss
    return num;
  }

  return num;
}
