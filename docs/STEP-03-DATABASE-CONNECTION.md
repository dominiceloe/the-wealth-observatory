# Step 03: Database Connection & Utilities

## Objective
Create database connection pool, helper utilities, and TypeScript type definitions.

## Tasks

### 1. Create Database Connection Pool

Create `lib/db.ts`:

```typescript
import { Pool, QueryResult } from 'pg';

// Singleton connection pool
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // maximum number of clients
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });
  }

  return pool;
}

// Helper function for simple queries
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    // Log slow queries (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }

    return result;
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  }
}

// Close pool (for graceful shutdown)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
```

### 2. Create TypeScript Type Definitions

Create `types/database.ts`:

```typescript
// Core database table types

export interface Billionaire {
  id: number;
  person_name: string;
  slug: string;
  gender: string | null;
  country_of_citizenship: string | null;
  industries: string[];
  birth_date: Date | null;
  image_url: string | null;
  bio: string | null;
  forbes_uri: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DailySnapshot {
  id: number;
  billionaire_id: number;
  snapshot_date: Date;
  net_worth: number; // in millions USD
  rank: number | null;
  daily_change: number | null; // in millions USD
  data_source_id: number | null;
  created_at: Date;
}

export interface ComparisonCost {
  id: number;
  name: string;
  display_name: string;
  cost: number; // in USD
  unit: string;
  description: string;
  source: string;
  source_url: string;
  region: string | null;
  category: string;
  active: boolean;
  display_order: number;
  last_verified: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CalculatedComparison {
  id: number;
  billionaire_id: number;
  comparison_cost_id: number;
  calculation_date: Date;
  net_worth_used: number; // in millions USD
  quantity: number;
  created_at: Date;
}

export interface LuxuryPurchase {
  id: number;
  billionaire_id: number;
  item_name: string;
  category: string;
  cost: number; // in USD
  purchase_date: Date | null;
  description: string | null;
  source: string;
  source_url: string;
  image_url: string | null;
  verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LuxuryComparison {
  id: number;
  luxury_purchase_id: number;
  comparison_cost_id: number;
  quantity: number;
  created_at: Date;
}

export interface DataSource {
  id: number;
  name: string;
  url: string | null;
  description: string | null;
  api_endpoint: string | null;
  last_accessed: Date | null;
  status: 'active' | 'deprecated' | 'failed';
  created_at: Date;
}

export interface UpdateMetadata {
  id: number;
  update_type: string;
  data_source_id: number | null;
  records_updated: number;
  records_created: number;
  records_failed: number;
  status: 'success' | 'partial' | 'failed';
  error_message: string | null;
  execution_time_ms: number | null;
  started_at: Date;
  completed_at: Date | null;
  created_at: Date;
}

export interface Disclaimer {
  id: number;
  key: string;
  title: string;
  content: string;
  display_order: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SiteConfig {
  id: number;
  key: string;
  value: string;
  description: string | null;
  updated_at: Date;
}

// Joined/composite types for frontend use

export interface BillionaireWithSnapshot extends Billionaire {
  latest_net_worth: number;
  latest_rank: number | null;
  latest_daily_change: number | null;
  latest_snapshot_date: Date;
}

export interface ComparisonWithCost extends CalculatedComparison {
  cost_display_name: string;
  cost_unit: string;
  cost_description: string;
  cost_source: string;
  cost_source_url: string;
  cost_category: string;
}

export interface LuxuryWithComparisons extends LuxuryPurchase {
  comparisons: Array<LuxuryComparison & ComparisonCost>;
}
```

Create `types/billionaire.ts` for frontend-specific types:

```typescript
// Frontend display types (derived from database types)

export interface BillionaireCardData {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  netWorth: number; // in millions
  rank: number | null;
  dailyChange: number | null; // in millions
  sampleComparison?: {
    quantity: number;
    unit: string;
    displayName: string;
  };
}

export interface BillionaireDetailData {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  netWorth: number;
  rank: number | null;
  country: string | null;
  industries: string[];
  bio: string | null;
  forbesUrl: string | null;
  history: Array<{
    date: string;
    netWorth: number;
  }>;
  comparisons: Array<{
    category: string;
    items: Array<{
      displayName: string;
      quantity: number;
      unit: string;
      description: string;
      source: string;
      sourceUrl: string;
    }>;
  }>;
  luxuryPurchases?: Array<{
    itemName: string;
    cost: number;
    description: string | null;
    comparisons: Array<{
      quantity: number;
      unit: string;
      displayName: string;
    }>;
  }>;
}

export interface AggregateStatsData {
  totalWealth: number; // in millions
  billionaireCount: number;
  topComparisons: Array<{
    displayName: string;
    quantity: number;
    unit: string;
    description: string;
  }>;
  lastUpdated: Date;
}
```

### 3. Create Database Utility Helpers

Create `lib/db-helpers.ts`:

```typescript
import { query } from './db';

/**
 * Format SQL IN clause with proper parameterization
 */
export function createInClause(values: (string | number)[]): {
  placeholders: string;
  params: (string | number)[];
} {
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  return { placeholders, params: values };
}

/**
 * Build WHERE clause dynamically
 */
export function buildWhereClause(
  conditions: Record<string, any>,
  startIndex = 1
): { clause: string; params: any[] } {
  const entries = Object.entries(conditions).filter(([_, v]) => v !== undefined);

  if (entries.length === 0) {
    return { clause: '', params: [] };
  }

  const clauses = entries.map(([key], i) => `${key} = $${startIndex + i}`);
  const params = entries.map(([_, value]) => value);

  return {
    clause: `WHERE ${clauses.join(' AND ')}`,
    params,
  };
}

/**
 * Transaction wrapper
 */
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const pool = (await import('./db')).getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if database connection is healthy
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health');
    return result.rows[0]?.health === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
```

### 4. Test Database Connection

Create `scripts/test-db-connection.ts`:

```typescript
import { query, closePool } from '../lib/db';

async function testConnection() {
  console.log('Testing database connection...');

  try {
    // Test basic query
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Connection successful!');
    console.log('Current database time:', result.rows[0].current_time);

    // Test table existence
    const tables = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`\n✅ Found ${tables.rows.length} tables:`);
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

testConnection();
```

Add script to `package.json`:
```json
{
  "scripts": {
    "test:db": "tsx scripts/test-db-connection.ts"
  }
}
```

Install tsx for running TypeScript scripts:
```bash
npm install --save-dev tsx
```

### 5. Run Connection Test

```bash
npm run test:db
```

Should output:
```
Testing database connection...
✅ Connection successful!
Current database time: [timestamp]

✅ Found 10 tables:
  - billionaires
  - calculated_comparisons
  - comparison_costs
  - data_sources
  - daily_snapshots
  - disclaimers
  - luxury_comparisons
  - luxury_purchases
  - site_config
  - update_metadata
```

## Verification Checklist

- [ ] Connection pool created and configured
- [ ] All TypeScript types defined
- [ ] Helper utilities created
- [ ] Connection test passes
- [ ] All 10 tables detected
- [ ] No connection errors

## Next Step
Proceed to `STEP-04-INITIAL-SEED.md` to populate the database with initial data.
