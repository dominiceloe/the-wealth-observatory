import { query } from '@/lib/db';
import type { UpdateMetadata } from '@/types/database';

interface LogUpdateParams {
  updateType: string;
  dataSourceId?: number;
  recordsUpdated: number;
  recordsCreated: number;
  recordsFailed: number;
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
  executionTimeMs: number;
  startedAt: Date;
  completedAt: Date;
}

/**
 * Log update metadata
 */
export async function logUpdateMetadata(params: LogUpdateParams): Promise<number> {
  const result = await query<{ id: number }>(
    `
    INSERT INTO update_metadata (
      update_type,
      data_source_id,
      records_updated,
      records_created,
      records_failed,
      status,
      error_message,
      execution_time_ms,
      started_at,
      completed_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
    `,
    [
      params.updateType,
      params.dataSourceId || null,
      params.recordsUpdated,
      params.recordsCreated,
      params.recordsFailed,
      params.status,
      params.errorMessage || null,
      params.executionTimeMs,
      params.startedAt,
      params.completedAt,
    ]
  );

  return result.rows[0].id;
}

/**
 * Get recent update metadata
 */
export async function getRecentUpdates(limit: number = 10): Promise<UpdateMetadata[]> {
  const result = await query<UpdateMetadata>(
    `
    SELECT *
    FROM update_metadata
    ORDER BY started_at DESC
    LIMIT $1
    `,
    [limit]
  );

  return result.rows;
}

/**
 * Get last successful update
 */
export async function getLastSuccessfulUpdate(): Promise<UpdateMetadata | null> {
  const result = await query<UpdateMetadata>(
    `
    SELECT *
    FROM update_metadata
    WHERE status = 'success'
    ORDER BY completed_at DESC
    LIMIT 1
    `
  );

  return result.rows[0] || null;
}
