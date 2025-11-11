import { query } from '@/lib/db';
import type { DataSource } from '@/types/database';

/**
 * Get data source by name
 */
export async function getDataSourceByName(name: string): Promise<DataSource | null> {
  const result = await query<DataSource>(
    `
    SELECT *
    FROM data_sources
    WHERE name = $1
    `,
    [name]
  );

  return result.rows[0] || null;
}

/**
 * Update data source last accessed timestamp
 */
export async function updateDataSourceAccessed(dataSourceId: number): Promise<void> {
  await query(
    `
    UPDATE data_sources
    SET last_accessed = CURRENT_TIMESTAMP
    WHERE id = $1
    `,
    [dataSourceId]
  );
}

/**
 * Get all data sources
 */
export async function getAllDataSources(): Promise<DataSource[]> {
  const result = await query<DataSource>(
    `
    SELECT *
    FROM data_sources
    ORDER BY name ASC
    `
  );

  return result.rows;
}
