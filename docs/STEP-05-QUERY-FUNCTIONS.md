# Step 05: Query Functions

## Objective
Create all database query functions needed for homepage, individual pages, about page, and cron job.

## Tasks

### 1. Create Billionaire Query Functions

Create `lib/queries/billionaires.ts`:

```typescript
import { query } from '../db';
import type {
  Billionaire,
  DailySnapshot,
  BillionaireWithSnapshot,
} from '../../types/database';
import type { BillionaireCardData, BillionaireDetailData } from '../../types/billionaire';

/**
 * Get top N billionaires with their latest snapshot data
 */
export async function getCurrentTopBillionaires(
  limit: number = 50
): Promise<BillionaireCardData[]> {
  const result = await query<any>(`
    SELECT
      b.id,
      b.person_name as name,
      b.slug,
      b.image_url,
      ds.net_worth,
      ds.rank,
      ds.daily_change,
      ds.snapshot_date
    FROM billionaires b
    JOIN daily_snapshots ds ON b.id = ds.billionaire_id
    WHERE ds.snapshot_date = (
      SELECT MAX(snapshot_date)
      FROM daily_snapshots
      WHERE billionaire_id = b.id
    )
    AND ds.rank IS NOT NULL
    ORDER BY ds.rank ASC
    LIMIT $1
  `, [limit]);

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    imageUrl: row.image_url,
    netWorth: row.net_worth,
    rank: row.rank,
    dailyChange: row.daily_change,
  }));
}

/**
 * Get billionaire by slug with latest data
 */
export async function getBillionaireBySlug(
  slug: string
): Promise<Billionaire | null> {
  const result = await query<Billionaire>(`
    SELECT * FROM billionaires
    WHERE slug = $1
    LIMIT 1
  `, [slug]);

  return result.rows[0] || null;
}

/**
 * Get billionaire's wealth history for N days
 */
export async function getBillionaireHistory(
  billionaireId: number,
  days: number = 30
): Promise<Array<{ date: string; netWorth: number }>> {
  const result = await query<DailySnapshot>(`
    SELECT
      snapshot_date,
      net_worth
    FROM daily_snapshots
    WHERE billionaire_id = $1
    AND snapshot_date >= CURRENT_DATE - INTERVAL '${days} days'
    ORDER BY snapshot_date ASC
  `, [billionaireId]);

  return result.rows.map(row => ({
    date: row.snapshot_date.toISOString().split('T')[0],
    netWorth: row.net_worth,
  }));
}

/**
 * Get billionaire's latest snapshot
 */
export async function getLatestSnapshot(
  billionaireId: number
): Promise<DailySnapshot | null> {
  const result = await query<DailySnapshot>(`
    SELECT *
    FROM daily_snapshots
    WHERE billionaire_id = $1
    ORDER BY snapshot_date DESC
    LIMIT 1
  `, [billionaireId]);

  return result.rows[0] || null;
}

/**
 * Upsert billionaire (for cron updates)
 */
export async function upsertBillionaire(data: {
  name: string;
  slug: string;
  gender?: string;
  country?: string;
  industries?: string[];
  birthDate?: Date;
  imageUrl?: string;
  bio?: string;
  forbesUri?: string;
}): Promise<number> {
  const result = await query<{ id: number }>(`
    INSERT INTO billionaires
    (person_name, slug, gender, country_of_citizenship, industries, birth_date, image_url, bio, forbes_uri)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (slug) DO UPDATE
    SET person_name = EXCLUDED.person_name,
        gender = EXCLUDED.gender,
        country_of_citizenship = EXCLUDED.country_of_citizenship,
        industries = EXCLUDED.industries,
        birth_date = EXCLUDED.birth_date,
        image_url = EXCLUDED.image_url,
        bio = EXCLUDED.bio,
        forbes_uri = EXCLUDED.forbes_uri,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `, [
    data.name,
    data.slug,
    data.gender || null,
    data.country || null,
    data.industries || [],
    data.birthDate || null,
    data.imageUrl || null,
    data.bio || null,
    data.forbesUri || null,
  ]);

  return result.rows[0].id;
}

/**
 * Insert daily snapshot (for cron updates)
 */
export async function insertDailySnapshot(data: {
  billionaireId: number;
  snapshotDate: Date;
  netWorth: number;
  rank?: number;
  dailyChange?: number;
  dataSourceId?: number;
}): Promise<void> {
  await query(`
    INSERT INTO daily_snapshots
    (billionaire_id, snapshot_date, net_worth, rank, daily_change, data_source_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (billionaire_id, snapshot_date)
    DO UPDATE SET
      net_worth = EXCLUDED.net_worth,
      rank = EXCLUDED.rank,
      daily_change = EXCLUDED.daily_change,
      data_source_id = EXCLUDED.data_source_id
  `, [
    data.billionaireId,
    data.snapshotDate,
    data.netWorth,
    data.rank || null,
    data.dailyChange || null,
    data.dataSourceId || null,
  ]);
}
```

### 2. Create Comparison Query Functions

Create `lib/queries/comparisons.ts`:

```typescript
import { query } from '../db';
import type { ComparisonCost, CalculatedComparison, ComparisonWithCost } from '../../types/database';

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
 * Get comparison costs by category
 */
export async function getComparisonCostsByCategory(): Promise<
  Record<string, ComparisonCost[]>
> {
  const result = await query<ComparisonCost>(`
    SELECT *
    FROM comparison_costs
    WHERE active = true
    ORDER BY category ASC, display_order ASC
  `);

  const grouped: Record<string, ComparisonCost[]> = {};

  for (const row of result.rows) {
    if (!grouped[row.category]) {
      grouped[row.category] = [];
    }
    grouped[row.category].push(row);
  }

  return grouped;
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
      cost.category as cost_category
    FROM calculated_comparisons cc
    JOIN comparison_costs cost ON cc.comparison_cost_id = cost.id
    WHERE cc.billionaire_id = $1
    ${dateCondition}
    ORDER BY cost.category ASC, cost.display_order ASC
  `, params);

  return result.rows;
}

/**
 * Get aggregate comparisons (for homepage stats)
 */
export async function getAggregateComparisons(
  totalWealthMillions: number
): Promise<Array<{
  displayName: string;
  quantity: number;
  unit: string;
  description: string;
}>> {
  // Get wealth threshold from config
  const thresholdResult = await query<{ value: string }>(`
    SELECT value FROM site_config WHERE key = 'wealth_threshold' LIMIT 1
  `);

  const thresholdUSD = parseInt(thresholdResult.rows[0].value);
  const thresholdMillions = thresholdUSD / 1_000_000;
  const usableWealthMillions = Math.max(0, totalWealthMillions - thresholdMillions);
  const usableWealthUSD = usableWealthMillions * 1_000_000;

  // Get top comparison costs for display
  const costs = await query<ComparisonCost>(`
    SELECT *
    FROM comparison_costs
    WHERE active = true
    ORDER BY display_order ASC
    LIMIT 6
  `);

  return costs.rows.map(cost => ({
    displayName: cost.display_name,
    quantity: Math.floor(usableWealthUSD / Number(cost.cost)),
    unit: cost.unit,
    description: cost.description,
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
    const usableWealthMillions = Math.max(0, billionaire.net_worth - thresholdMillions);
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
```

### 3. Create Luxury Purchase Query Functions

Create `lib/queries/luxury.ts`:

```typescript
import { query } from '../db';
import type { LuxuryPurchase, LuxuryComparison } from '../../types/database';

/**
 * Get luxury purchases for a billionaire
 */
export async function getLuxuryPurchases(
  billionaireId: number
): Promise<LuxuryPurchase[]> {
  const result = await query<LuxuryPurchase>(`
    SELECT *
    FROM luxury_purchases
    WHERE billionaire_id = $1
    AND verified = true
    ORDER BY cost DESC
  `, [billionaireId]);

  return result.rows;
}

/**
 * Get comparisons for a luxury purchase
 */
export async function getLuxuryComparisons(
  luxuryPurchaseId: number
): Promise<Array<LuxuryComparison & { displayName: string; unit: string }>> {
  const result = await query<any>(`
    SELECT
      lc.*,
      cost.display_name,
      cost.unit
    FROM luxury_comparisons lc
    JOIN comparison_costs cost ON lc.comparison_cost_id = cost.id
    WHERE lc.luxury_purchase_id = $1
    ORDER BY lc.quantity DESC
    LIMIT 5
  `, [luxuryPurchaseId]);

  return result.rows;
}

/**
 * Calculate and store luxury comparisons (for cron or manual)
 */
export async function calculateLuxuryComparisons(
  luxuryPurchaseId: number
): Promise<number> {
  // Get luxury purchase cost
  const purchaseResult = await query<{ cost: number }>(`
    SELECT cost FROM luxury_purchases WHERE id = $1
  `, [luxuryPurchaseId]);

  if (purchaseResult.rows.length === 0) {
    return 0;
  }

  const purchaseCost = purchaseResult.rows[0].cost;

  // Get all active comparison costs
  const costs = await query<{ id: number; cost: number }>(`
    SELECT id, cost FROM comparison_costs WHERE active = true
  `);

  let comparisonsCreated = 0;

  for (const cost of costs.rows) {
    const quantity = Math.floor(purchaseCost / Number(cost.cost));

    if (quantity > 0) {
      await query(`
        INSERT INTO luxury_comparisons
        (luxury_purchase_id, comparison_cost_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (luxury_purchase_id, comparison_cost_id)
        DO UPDATE SET quantity = EXCLUDED.quantity
      `, [luxuryPurchaseId, cost.id, quantity]);

      comparisonsCreated++;
    }
  }

  return comparisonsCreated;
}
```

### 4. Create Config Query Functions

Create `lib/queries/config.ts`:

```typescript
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
```

### 5. Create Aggregate Stats Query Function

Create `lib/queries/stats.ts`:

```typescript
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
```

### 6. Create Update Metadata Logging Function

Create `lib/queries/metadata.ts`:

```typescript
import { query } from '../db';
import type { UpdateMetadata } from '../../types/database';

/**
 * Log update metadata (for cron)
 */
export async function logUpdateMetadata(data: {
  updateType: string;
  dataSourceId?: number;
  recordsUpdated?: number;
  recordsCreated?: number;
  recordsFailed?: number;
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
  executionTimeMs?: number;
  startedAt: Date;
  completedAt?: Date;
}): Promise<void> {
  await query(`
    INSERT INTO update_metadata
    (update_type, data_source_id, records_updated, records_created, records_failed,
     status, error_message, execution_time_ms, started_at, completed_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    data.updateType,
    data.dataSourceId || null,
    data.recordsUpdated || 0,
    data.recordsCreated || 0,
    data.recordsFailed || 0,
    data.status,
    data.errorMessage || null,
    data.executionTimeMs || null,
    data.startedAt,
    data.completedAt || new Date(),
  ]);
}

/**
 * Get recent update logs
 */
export async function getRecentUpdateLogs(limit: number = 10): Promise<UpdateMetadata[]> {
  const result = await query<UpdateMetadata>(`
    SELECT *
    FROM update_metadata
    ORDER BY started_at DESC
    LIMIT $1
  `, [limit]);

  return result.rows;
}
```

### 7. Create Data Source Query Functions

Create `lib/queries/data-sources.ts`:

```typescript
import { query } from '../db';
import type { DataSource } from '../../types/database';

/**
 * Get data source by name
 */
export async function getDataSourceByName(name: string): Promise<DataSource | null> {
  const result = await query<DataSource>(`
    SELECT * FROM data_sources WHERE name = $1 LIMIT 1
  `, [name]);

  return result.rows[0] || null;
}

/**
 * Update data source last accessed timestamp
 */
export async function updateDataSourceAccessed(id: number): Promise<void> {
  await query(`
    UPDATE data_sources
    SET last_accessed = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [id]);
}
```

## Verification Checklist

- [ ] All query functions created
- [ ] TypeScript types properly imported
- [ ] Error handling in place
- [ ] Parameterized queries (no SQL injection)
- [ ] Functions exported correctly
- [ ] No compilation errors

### Test Query Functions:

Create `scripts/test-queries.ts`:
```typescript
import { closePool } from '../lib/db';
import { getCurrentTopBillionaires } from '../lib/queries/billionaires';
import { getAggregateStats } from '../lib/queries/stats';
import { getActiveDisclaimers } from '../lib/queries/config';

async function testQueries() {
  console.log('Testing query functions...\n');

  try {
    // Test top billionaires
    const billionaires = await getCurrentTopBillionaires(5);
    console.log(`✅ Top 5 billionaires: ${billionaires.length} found`);

    // Test aggregate stats
    const stats = await getAggregateStats();
    console.log(`✅ Aggregate stats: $${stats.totalWealth}M total wealth`);

    // Test disclaimers
    const disclaimers = await getActiveDisclaimers();
    console.log(`✅ Disclaimers: ${disclaimers.length} found`);

    console.log('\n✅ All query functions working!');
  } catch (error) {
    console.error('❌ Query test failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

testQueries();
```

Run test:
```bash
npm run test:queries
```

## Next Step
Proceed to `STEP-06-CRON-API-ROUTE.md` to create the daily update cron job.
