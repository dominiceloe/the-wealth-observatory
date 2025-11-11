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
