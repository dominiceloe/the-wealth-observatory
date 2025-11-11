# Step 06: Cron API Route (Daily Updates)

## Objective
Create the API route that handles daily billionaire data updates, triggered by Vercel Cron.

## Tasks

### 1. Create Cron API Route

Create `app/api/cron/update-billionaires/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import {
  upsertBillionaire,
  insertDailySnapshot,
} from '@/lib/queries/billionaires';
import { calculateAndStoreComparisons } from '@/lib/queries/comparisons';
import { logUpdateMetadata } from '@/lib/queries/metadata';
import { getDataSourceByName, updateDataSourceAccessed } from '@/lib/queries/data-sources';
import { updateConfigValue } from '@/lib/queries/config';

interface ForbesPerson {
  uri: string;
  personName: string;
  squareImage?: string;
  countryOfCitizenship?: string;
  industries?: string[];
  finalWorth: number;
  rank: number;
  gender?: string;
  birthDate?: number;
  bio?: string[];
}

interface ForbesResponse {
  personList: {
    personsLists: ForbesPerson[];
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const startedAt = new Date();

  // Verify authorization
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedAuth) {
    console.error('❌ Unauthorized cron attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('🔄 Starting daily billionaire update...');

  let recordsUpdated = 0;
  let recordsCreated = 0;
  let recordsFailed = 0;
  let dataSourceId: number | undefined;

  try {
    // Get data source ID
    const dataSource = await getDataSourceByName('Forbes Real-Time Billionaires');
    dataSourceId = dataSource?.id;

    // Fetch Forbes data
    console.log('📥 Fetching Forbes real-time data...');
    const forbesData = await fetchForbesData();

    if (!forbesData || forbesData.length === 0) {
      throw new Error('No data received from Forbes API');
    }

    console.log(`✅ Fetched ${forbesData.length} billionaires`);

    // Update database
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight

    for (const person of forbesData.slice(0, 50)) { // Top 50 only
      try {
        // Create slug
        const slug = createSlug(person.personName);

        // Upsert billionaire
        const billionaireId = await upsertBillionaire({
          name: person.personName,
          slug,
          gender: person.gender,
          country: person.countryOfCitizenship,
          industries: person.industries,
          birthDate: person.birthDate ? new Date(person.birthDate * 1000) : undefined,
          imageUrl: person.squareImage,
          bio: person.bio?.[0],
          forbesUri: person.uri,
        });

        // Check if this is a new billionaire
        const isNew = billionaireId !== undefined;
        if (isNew) {
          recordsCreated++;
        } else {
          recordsUpdated++;
        }

        // Insert daily snapshot
        // Note: daily_change will be calculated by comparing to yesterday's snapshot
        await insertDailySnapshot({
          billionaireId,
          snapshotDate: today,
          netWorth: person.finalWorth,
          rank: person.rank,
          dailyChange: 0, // TODO: Calculate from yesterday
          dataSourceId,
        });

      } catch (error) {
        console.error(`Failed to process ${person.personName}:`, error);
        recordsFailed++;
      }
    }

    // Calculate comparisons
    console.log('🧮 Calculating comparisons...');
    const comparisonsCreated = await calculateAndStoreComparisons(today);
    console.log(`✅ Created ${comparisonsCreated} comparisons`);

    // Update last update timestamp
    await updateConfigValue('last_manual_update', new Date().toISOString());

    // Update data source last accessed
    if (dataSourceId) {
      await updateDataSourceAccessed(dataSourceId);
    }

    // Log success
    const executionTimeMs = Date.now() - startTime;
    await logUpdateMetadata({
      updateType: 'daily_update',
      dataSourceId,
      recordsUpdated,
      recordsCreated,
      recordsFailed,
      status: recordsFailed === 0 ? 'success' : 'partial',
      executionTimeMs,
      startedAt,
      completedAt: new Date(),
    });

    console.log(`✅ Update completed in ${executionTimeMs}ms`);
    console.log(`   Created: ${recordsCreated}, Updated: ${recordsUpdated}, Failed: ${recordsFailed}`);

    return NextResponse.json({
      success: true,
      recordsCreated,
      recordsUpdated,
      recordsFailed,
      comparisonsCreated,
      executionTimeMs,
    });

  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('❌ Update failed:', errorMessage);

    // Log failure
    await logUpdateMetadata({
      updateType: 'daily_update',
      dataSourceId,
      recordsUpdated,
      recordsCreated,
      recordsFailed,
      status: 'failed',
      errorMessage,
      executionTimeMs,
      startedAt,
      completedAt: new Date(),
    });

    return NextResponse.json(
      {
        error: 'Update failed',
        message: errorMessage,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch Forbes real-time billionaire data
 */
async function fetchForbesData(): Promise<ForbesPerson[]> {
  try {
    // Try official Forbes API endpoint
    const response = await fetch(
      'https://www.forbes.com/forbesapi/person/rtb/0/position/true.json',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WealthObservatory/1.0)',
        },
        next: { revalidate: 0 }, // Don't cache
      }
    );

    if (!response.ok) {
      throw new Error(`Forbes API returned ${response.status}`);
    }

    const data: ForbesResponse = await response.json();
    return data.personList?.personsLists || [];

  } catch (error) {
    console.error('Failed to fetch from Forbes API:', error);

    // Fallback to komed3 API
    console.log('🔄 Trying fallback: komed3/rtb-api...');
    const fallbackResponse = await fetch(
      'https://raw.githubusercontent.com/komed3/rtb-api/main/data/rtb.json'
    );

    if (!fallbackResponse.ok) {
      throw new Error('Both Forbes and komed3 APIs failed');
    }

    const fallbackData = await fallbackResponse.json();
    return fallbackData.rtb?.map((item: any) => ({
      uri: item.uri,
      personName: item.person?.name || 'Unknown',
      squareImage: item.person?.squareImage,
      countryOfCitizenship: item.person?.countryOfCitizenship,
      industries: item.person?.industries,
      finalWorth: item.finalWorth,
      rank: item.rank,
      gender: item.person?.gender,
      birthDate: item.person?.birthDate,
      bio: item.person?.bio,
    })) || [];
  }
}

/**
 * Create URL-safe slug from name
 */
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Enable Edge Runtime for better performance
export const runtime = 'nodejs'; // Use Node.js runtime for database connections
export const dynamic = 'force-dynamic'; // Always run dynamically
export const maxDuration = 60; // Allow up to 60 seconds (for Vercel Pro)
```

### 2. Create Vercel Cron Configuration

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-billionaires",
      "schedule": "0 14 * * *"
    }
  ]
}
```

Note: `0 14 * * *` means daily at 14:00 UTC (6:00 AM PST)

### 3. Create Manual Trigger Script (for testing)

Create `scripts/trigger-update.ts`:

```typescript
async function triggerUpdate() {
  console.log('🔄 Manually triggering update...\n');

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('❌ CRON_SECRET not set in environment');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_URL || 'http://localhost:3003';

  try {
    const response = await fetch(`${url}/api/cron/update-billionaires`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Update successful!\n');
      console.log('Results:');
      console.log(`  Created:        ${data.recordsCreated}`);
      console.log(`  Updated:        ${data.recordsUpdated}`);
      console.log(`  Failed:         ${data.recordsFailed}`);
      console.log(`  Comparisons:    ${data.comparisonsCreated}`);
      console.log(`  Execution time: ${data.executionTimeMs}ms`);
    } else {
      console.error('❌ Update failed:', data.message || data.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
    process.exit(1);
  }
}

triggerUpdate();
```

Add to `package.json`:
```json
{
  "scripts": {
    "update:manual": "tsx scripts/trigger-update.ts"
  }
}
```

### 4. Create Daily Change Calculation Enhancement

Update the snapshot insertion to calculate daily change:

Add this helper function to `app/api/cron/update-billionaires/route.ts`:

```typescript
/**
 * Calculate daily change by comparing to yesterday's snapshot
 */
async function calculateDailyChange(
  billionaireId: number,
  currentNetWorth: number
): Promise<number> {
  const { query } = await import('@/lib/db');

  const result = await query<{ net_worth: number }>(`
    SELECT net_worth
    FROM daily_snapshots
    WHERE billionaire_id = $1
    AND snapshot_date = CURRENT_DATE - INTERVAL '1 day'
    LIMIT 1
  `, [billionaireId]);

  if (result.rows.length === 0) {
    return 0; // No previous data
  }

  const previousNetWorth = result.rows[0].net_worth;
  return currentNetWorth - previousNetWorth;
}
```

Then update the snapshot insertion:

```typescript
// Calculate daily change
const dailyChange = await calculateDailyChange(billionaireId, person.finalWorth);

// Insert daily snapshot with calculated change
await insertDailySnapshot({
  billionaireId,
  snapshotDate: today,
  netWorth: person.finalWorth,
  rank: person.rank,
  dailyChange,
  dataSourceId,
});
```

### 5. Add Monthly Refresh Logic

Add monthly refresh detection to the cron route:

```typescript
// At the start of the GET function, check if it's the 1st of the month
const isFirstOfMonth = new Date().getDate() === 1;

if (isFirstOfMonth) {
  console.log('📅 First of month - running monthly refresh...');

  // Fetch komed3 data for historical accuracy
  try {
    const komed3Response = await fetch(
      'https://raw.githubusercontent.com/komed3/rtb-api/main/data/rtb.json'
    );

    if (komed3Response.ok) {
      const komed3Data = await komed3Response.json();
      console.log(`✅ Monthly refresh: ${komed3Data.rtb?.length || 0} records from komed3`);

      // Process komed3 data (same logic as Forbes data)
      // ...
    }
  } catch (error) {
    console.error('Monthly refresh failed:', error);
    // Continue with regular update
  }
}
```

## Testing

### 1. Test Locally

Start dev server:
```bash
npm run dev
```

Trigger update:
```bash
npm run update:manual
```

### 2. Test Authorization

Try without authorization (should fail):
```bash
curl http://localhost:3003/api/cron/update-billionaires
```

Should return 401 Unauthorized.

Try with authorization (should succeed):
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3003/api/cron/update-billionaires
```

### 3. Verify Database Updates

After running update, check:

```sql
-- Check latest snapshots
SELECT
  b.person_name,
  ds.snapshot_date,
  ds.net_worth,
  ds.rank,
  ds.daily_change
FROM billionaires b
JOIN daily_snapshots ds ON b.id = ds.billionaire_id
WHERE ds.snapshot_date = CURRENT_DATE
ORDER BY ds.rank
LIMIT 10;

-- Check update logs
SELECT *
FROM update_metadata
ORDER BY started_at DESC
LIMIT 5;
```

## Verification Checklist

- [ ] API route created and accessible
- [ ] Authorization check working
- [ ] Forbes API fetch working
- [ ] Fallback to komed3 working
- [ ] Billionaires upserted correctly
- [ ] Daily snapshots inserted
- [ ] Daily change calculated
- [ ] Comparisons recalculated
- [ ] Metadata logged
- [ ] Manual trigger script working
- [ ] vercel.json cron configuration added

## Deployment Notes

When deploying to Vercel:

1. Add `CRON_SECRET` to environment variables
2. Add `DATABASE_URL` to environment variables
3. Vercel will automatically register the cron job from `vercel.json`
4. First run can be triggered manually via: `https://your-domain.com/api/cron/update-billionaires` with auth header

## Next Step
Proceed to `STEP-07-FRONTEND-COMPONENTS.md` to create reusable UI components.
