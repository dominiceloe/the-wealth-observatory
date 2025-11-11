import { query } from '../db';
import type { Billionaire, DailySnapshot } from '../../types/database';
import type { BillionaireCardData } from '../../types/billionaire';

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
    netWorth: Number(row.net_worth),
    rank: row.rank,
    dailyChange: row.daily_change !== null ? Number(row.daily_change) : null,
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
): Promise<Array<{ snapshot_date: Date; net_worth: number; rank: number | null }>> {
  // Validate days parameter to prevent SQL injection
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new Error(`Invalid days parameter: ${days}. Must be an integer between 1 and 365.`);
  }

  const result = await query<DailySnapshot>(`
    SELECT
      snapshot_date,
      net_worth,
      rank
    FROM daily_snapshots
    WHERE billionaire_id = $1
    AND snapshot_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
    ORDER BY snapshot_date ASC
  `, [billionaireId, days]);

  return result.rows;
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
 * Returns { id, wasCreated } where wasCreated indicates if this was a new record
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
}): Promise<{ id: number; wasCreated: boolean }> {
  // Check if billionaire already exists
  const existingResult = await query<{ id: number }>(`
    SELECT id FROM billionaires WHERE slug = $1 LIMIT 1
  `, [data.slug]);

  const wasCreated = existingResult.rows.length === 0;

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

  return { id: result.rows[0].id, wasCreated };
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
