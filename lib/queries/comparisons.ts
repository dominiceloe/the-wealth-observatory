import { query } from '../db';
import type { ComparisonCost, ComparisonWithCost } from '../../types/database';

/**
 * Get all active comparison costs
 */
export async function getActiveComparisonCosts(): Promise<ComparisonCost[]> {
  const result = await query<ComparisonCost>(`
    SELECT *
    FROM comparison_costs
    WHERE active = true
    ORDER BY display_order ASC
  `);

  return result.rows;
}

/**
 * Get calculated comparisons for a billionaire
 */
export async function getCalculatedComparisons(
  billionaireId: number,
  calculationDate?: Date
): Promise<ComparisonWithCost[]> {
  const dateCondition = calculationDate
    ? 'AND cc.calculation_date = $2'
    : 'AND cc.calculation_date = (SELECT MAX(calculation_date) FROM calculated_comparisons WHERE billionaire_id = $1)';

  const params = calculationDate
    ? [billionaireId, calculationDate]
    : [billionaireId];

  const result = await query<any>(`
    SELECT
      cc.*,
      cost.display_name as cost_display_name,
      cost.unit as cost_unit,
      cost.description as cost_description,
      cost.source as cost_source,
      cost.source_url as cost_source_url,
      cost.category as cost_category,
      cost.cost as cost_per_unit
    FROM calculated_comparisons cc
    JOIN comparison_costs cost ON cc.comparison_cost_id = cost.id
    WHERE cc.billionaire_id = $1
    ${dateCondition}
    ORDER BY cost.category ASC, cost.display_order ASC
  `, params);

  return result.rows;
}

/**
 * Valid regions for comparison filtering
 */
export const VALID_REGIONS = ['Global', 'United States', 'Sub-Saharan Africa'] as const;
export type ValidRegion = typeof VALID_REGIONS[number];

/**
 * Get aggregate comparisons (for homepage stats)
 */
export async function getAggregateComparisons(
  totalWealthMillions: number,
  region: string = 'Global'
): Promise<Array<{
  displayName: string;
  quantity: number;
  unit: string;
  description: string;
  costPerUnit: number;
}>> {
  // Validate and sanitize region input
  let validatedRegion: string = region;
  if (!VALID_REGIONS.includes(region as ValidRegion)) {
    console.warn(`Invalid region "${region}" provided, falling back to Global`);
    validatedRegion = 'Global';
  }

  // Get wealth threshold from config
  const thresholdResult = await query<{ value: string }>(`
    SELECT value FROM site_config WHERE key = 'wealth_threshold' LIMIT 1
  `);

  const thresholdUSD = parseInt(thresholdResult.rows[0].value);
  const thresholdMillions = thresholdUSD / 1_000_000;
  const usableWealthMillions = Math.max(0, totalWealthMillions - thresholdMillions);
  const usableWealthUSD = usableWealthMillions * 1_000_000;

  // Get top comparison costs for display filtered by region
  let costs = await query<ComparisonCost>(`
    SELECT *
    FROM comparison_costs
    WHERE active = true AND region = $1
    ORDER BY display_order ASC
    LIMIT 6
  `, [validatedRegion]);

  // Fallback to Global region if no costs found for requested region
  if (costs.rows.length === 0 && validatedRegion !== 'Global') {
    console.warn(`No comparison costs found for region "${validatedRegion}", falling back to Global`);
    costs = await query<ComparisonCost>(`
      SELECT *
      FROM comparison_costs
      WHERE active = true AND region = 'Global'
      ORDER BY display_order ASC
      LIMIT 6
    `);
  }

  // If still no results, throw error (data integrity issue)
  if (costs.rows.length === 0) {
    throw new Error('No active comparison costs found in database. Please seed comparison_costs table.');
  }

  return costs.rows.map(cost => ({
    displayName: cost.display_name,
    quantity: Math.floor(usableWealthUSD / Number(cost.cost)),
    unit: cost.unit,
    description: cost.description,
    costPerUnit: Number(cost.cost),
  }));
}

/**
 * Calculate and store comparisons for all billionaires (for cron)
 */
export async function calculateAndStoreComparisons(
  calculationDate: Date = new Date()
): Promise<number> {
  // Get wealth threshold
  const thresholdResult = await query<{ value: string }>(`
    SELECT value FROM site_config WHERE key = 'wealth_threshold' LIMIT 1
  `);

  const thresholdUSD = parseInt(thresholdResult.rows[0].value);
  const thresholdMillions = thresholdUSD / 1_000_000;

  // Get all billionaires with latest snapshots
  const billionaires = await query<any>(`
    SELECT
      b.id,
      ds.net_worth
    FROM billionaires b
    JOIN daily_snapshots ds ON b.id = ds.billionaire_id
    WHERE ds.snapshot_date = (
      SELECT MAX(snapshot_date)
      FROM daily_snapshots
      WHERE billionaire_id = b.id
    )
  `);

  // Get all active costs
  const costs = await query<ComparisonCost>(`
    SELECT id, cost
    FROM comparison_costs
    WHERE active = true
  `);

  let comparisonsCreated = 0;

  for (const billionaire of billionaires.rows) {
    const netWorthMillions = Number(billionaire.net_worth); // Convert bigint string to number
    const usableWealthMillions = Math.max(0, netWorthMillions - thresholdMillions);
    const usableWealthUSD = usableWealthMillions * 1_000_000;

    for (const cost of costs.rows) {
      const quantity = Math.floor(usableWealthUSD / Number(cost.cost));

      if (quantity > 0) {
        await query(`
          INSERT INTO calculated_comparisons
          (billionaire_id, comparison_cost_id, calculation_date, net_worth_used, quantity)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (billionaire_id, comparison_cost_id, calculation_date)
          DO UPDATE SET quantity = EXCLUDED.quantity, net_worth_used = EXCLUDED.net_worth_used
        `, [
          billionaire.id,
          cost.id,
          calculationDate,
          usableWealthMillions,
          quantity,
        ]);
        comparisonsCreated++;
      }
    }
  }

  return comparisonsCreated;
}
