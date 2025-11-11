import { query } from '../db';
import type { SiteConfig, Disclaimer } from '../../types/database';

/**
 * Get site config value by key
 */
export async function getConfigValue(key: string): Promise<string | null> {
  const result = await query<SiteConfig>(`
    SELECT value FROM site_config WHERE key = $1 LIMIT 1
  `, [key]);

  return result.rows[0]?.value || null;
}

/**
 * Get all site config
 */
export async function getAllConfig(): Promise<Record<string, string>> {
  const result = await query<SiteConfig>(`
    SELECT key, value FROM site_config
  `);

  const config: Record<string, string> = {};
  for (const row of result.rows) {
    config[row.key] = row.value;
  }

  return config;
}

/**
 * Update site config value
 */
export async function updateConfigValue(
  key: string,
  value: string
): Promise<void> {
  await query(`
    UPDATE site_config
    SET value = $2, updated_at = CURRENT_TIMESTAMP
    WHERE key = $1
  `, [key, value]);
}

/**
 * Get all active disclaimers
 */
export async function getActiveDisclaimers(): Promise<Disclaimer[]> {
  const result = await query<Disclaimer>(`
    SELECT *
    FROM disclaimers
    WHERE active = true
    ORDER BY display_order ASC
  `);

  return result.rows;
}

/**
 * Get last update timestamp
 */
export async function getLastUpdateTimestamp(): Promise<Date | null> {
  const result = await query<{ completed_at: Date }>(`
    SELECT completed_at
    FROM update_metadata
    WHERE status = 'success'
    AND update_type IN ('daily_update', 'initial_seed')
    ORDER BY completed_at DESC
    LIMIT 1
  `);

  return result.rows[0]?.completed_at || null;
}
