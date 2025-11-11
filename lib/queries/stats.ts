import { query } from '../db';
import type { AggregateStatsData } from '../../types/billionaire';

/**
 * Get aggregate stats for homepage
 */
export async function getAggregateStats(): Promise<AggregateStatsData> {
  // Get total wealth of top 50
  const wealthResult = await query<{ total: number; count: number }>(`
    SELECT
      SUM(ds.net_worth) as total,
      COUNT(*) as count
    FROM daily_snapshots ds
    WHERE ds.snapshot_date = (SELECT MAX(snapshot_date) FROM daily_snapshots)
    AND ds.rank IS NOT NULL
    AND ds.rank <= 50
  `);

  const totalWealth = wealthResult.rows[0]?.total || 0;
  const billionaireCount = wealthResult.rows[0]?.count || 0;

  // Get last updated timestamp
  const lastUpdateResult = await query<{ updated_at: Date }>(`
    SELECT updated_at
    FROM site_config
    WHERE key = 'last_manual_update'
    LIMIT 1
  `);

  const lastUpdated = lastUpdateResult.rows[0]?.updated_at || new Date();

  // Get top comparisons (import from comparisons.ts)
  const { getAggregateComparisons } = await import('./comparisons');
  const topComparisons = await getAggregateComparisons(totalWealth);

  return {
    totalWealth,
    billionaireCount,
    topComparisons: topComparisons.slice(0, 6),
    lastUpdated,
  };
}
