#!/usr/bin/env tsx
/**
 * Backfill 30 days of historical Forbes data
 * Uses the komed3/rtb-api historical endpoint
 */

import { query } from '../lib/db';

interface HistoricalPerson {
  uri: string;
  personName: string;
  squareImage?: string;
  countryOfCitizenship?: string;
  industries?: string[];
  finalWorth: number;
  rank: number;
  gender?: string;
  birthDate?: number;
}

async function fetchHistoricalData(date: string): Promise<HistoricalPerson[]> {
  const url = `https://www.komed3.com/rtb-api/rtb/${date}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.slice(0, 50); // Top 50 only
  } catch (error) {
    console.error(`   ⚠️  Failed to fetch ${date}, skipping...`);
    return [];
  }
}

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function backfillDay(date: string): Promise<void> {
  console.log(`📅 Backfilling ${date}...`);

  const data = await fetchHistoricalData(date);

  if (data.length === 0) {
    return;
  }

  let created = 0;

  for (const person of data) {
    try {
      const slug = createSlug(person.uri || person.personName);

      // Upsert billionaire
      const result = await query<{ id: number }>(`
        INSERT INTO billionaires
        (person_name, slug, gender, country_of_citizenship, industries, image_url, forbes_uri)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (slug) DO UPDATE
        SET person_name = EXCLUDED.person_name,
            gender = EXCLUDED.gender,
            country_of_citizenship = EXCLUDED.country_of_citizenship,
            industries = EXCLUDED.industries,
            image_url = EXCLUDED.image_url,
            forbes_uri = EXCLUDED.forbes_uri
        RETURNING id
      `, [
        person.personName,
        slug,
        person.gender || null,
        person.countryOfCitizenship || null,
        person.industries || [],
        person.squareImage?.startsWith('//') ? `https:${person.squareImage}` : person.squareImage || null,
        person.uri || slug,
      ]);

      const billionaireId = result.rows[0].id;

      // Insert daily snapshot
      await query(`
        INSERT INTO daily_snapshots
        (billionaire_id, snapshot_date, net_worth, rank, daily_change)
        VALUES ($1, $2, $3, $4, 0)
        ON CONFLICT (billionaire_id, snapshot_date) DO NOTHING
      `, [
        billionaireId,
        date,
        Math.round(person.finalWorth || 0),
        person.rank,
      ]);

      created++;
    } catch (error) {
      console.error(`     ❌ Failed to process ${person.personName}`);
    }
  }

  console.log(`   ✅ Processed ${created} billionaires`);
}

async function main() {
  console.log('🔄 Starting 30-day historical backfill...\n');
  const startTime = Date.now();

  // Generate dates for past 30 days
  const dates: string[] = [];
  for (let i = 30; i >= 1; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }

  for (const date of dates) {
    await backfillDay(date);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Backfill completed in ${totalTime}s`);

  // Show final counts
  const counts = await query(`
    SELECT
      (SELECT COUNT(*) FROM billionaires) as billionaires,
      (SELECT COUNT(*) FROM daily_snapshots) as snapshots
  `);

  console.log(`\n📊 Final counts:`);
  console.log(`   Billionaires: ${counts.rows[0].billionaires}`);
  console.log(`   Snapshots: ${counts.rows[0].snapshots}`);

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Backfill failed:', error);
  process.exit(1);
});
