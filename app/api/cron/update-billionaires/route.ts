import { NextRequest, NextResponse } from 'next/server';
import {
  upsertBillionaire,
  insertDailySnapshot,
} from '@/lib/queries/billionaires';
import { calculateAndStoreComparisons } from '@/lib/queries/comparisons';
import { logUpdateMetadata } from '@/lib/queries/metadata';
import { getDataSourceByName, updateDataSourceAccessed } from '@/lib/queries/data-sources';
import { updateConfigValue } from '@/lib/queries/config';
import { query } from '@/lib/db';

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

// Simple in-memory rate limiting (resets on server restart)
const lastRunTime = new Map<string, number>();
const MIN_INTERVAL_MS = 60000; // 1 minute between runs

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const startedAt = new Date();

  // Validate CRON_SECRET environment variable
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 32) {
    console.error('❌ CRON_SECRET is not set or is too short (minimum 32 characters required)');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  // Verify authorization with constant-time comparison
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${cronSecret}`;

  if (!authHeader || !timingSafeEqual(authHeader, expectedAuth)) {
    console.error('❌ Unauthorized cron attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Rate limiting check
  const now = Date.now();
  const lastRun = lastRunTime.get('update-billionaires') || 0;
  if (now - lastRun < MIN_INTERVAL_MS) {
    console.warn(`⚠️  Rate limit exceeded. Last run was ${Math.round((now - lastRun) / 1000)}s ago`);
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: Math.ceil((MIN_INTERVAL_MS - (now - lastRun)) / 1000) },
      { status: 429 }
    );
  }

  // Update last run time
  lastRunTime.set('update-billionaires', now);

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
        // Create slug (prefer uri for consistency with seed script)
        const slug = createSlug(person.uri || person.personName);

        // Validate and convert birthDate (Forbes API sometimes has invalid values)
        let birthDate: Date | undefined;
        if (person.birthDate && person.birthDate > 0 && person.birthDate < 4000000000) {
          // Unix timestamp in seconds, convert to Date (valid range: 1970-2096)
          birthDate = new Date(person.birthDate * 1000);
        }

        // Upsert billionaire
        const { id: billionaireId, wasCreated } = await upsertBillionaire({
          name: person.personName,
          slug,
          gender: person.gender,
          country: person.countryOfCitizenship,
          industries: person.industries,
          birthDate,
          imageUrl: normalizeImageUrl(person.squareImage),
          bio: person.bio?.[0],
          forbesUri: person.uri,
        });

        // Track created vs updated
        if (wasCreated) {
          recordsCreated++;
        } else {
          recordsUpdated++;
        }

        // Calculate daily change from yesterday's snapshot
        const currentWorthMillions = Math.round(person.finalWorth || 0);
        const yesterdaySnapshot = await query(
          `SELECT net_worth FROM daily_snapshots
           WHERE billionaire_id = $1
           AND snapshot_date = $2::date - INTERVAL '1 day'
           LIMIT 1`,
          [billionaireId, today]
        );

        // Calculate daily change (null if no yesterday data exists)
        let dailyChangeMillions: number | null = null;

        if (yesterdaySnapshot.rows.length > 0) {
          const yesterdayWorth = Number(yesterdaySnapshot.rows[0].net_worth);
          dailyChangeMillions = Math.round(currentWorthMillions - yesterdayWorth);
        } else {
          // First snapshot for this billionaire, or data gap
          console.log(`No yesterday snapshot for ${person.personName}, setting dailyChange to null`);
        }

        // Insert daily snapshot
        await insertDailySnapshot({
          billionaireId,
          snapshotDate: today,
          netWorth: currentWorthMillions,
          rank: person.rank,
          dailyChange: dailyChangeMillions,
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

    // For now, return empty array. In production, implement proper fallback
    // or alerting mechanism
    throw new Error('Forbes API is unavailable');
  }
}

/**
 * Normalize image URL (prepend https: to protocol-relative URLs)
 */
function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return `https:${url}`;
  return url;
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

// Enable Node.js runtime for database connections
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Always run dynamically
export const maxDuration = 60; // Allow up to 60 seconds (for Vercel Pro)
