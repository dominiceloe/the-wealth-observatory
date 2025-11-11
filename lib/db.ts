import { Pool, QueryResult, QueryResultRow } from 'pg';

// Singleton connection pool
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10, // Reduced for serverless - each function creates its own pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased to 10s to handle Neon auto-wake
      statement_timeout: 30000, // 30s query timeout
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });
  }

  return pool;
}

// Helper function for simple queries with retry logic
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  const start = Date.now();
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;

      // Log slow queries (> 1 second)
      if (duration > 1000) {
        console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
      }

      // Log retry success
      if (attempt > 0) {
        console.log(`Query succeeded on retry attempt ${attempt}`);
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      // Check if this is a connection-related error that might benefit from retry
      const isConnectionError =
        lastError.message?.includes('Connection terminated') ||
        lastError.message?.includes('connection timeout') ||
        lastError.message?.includes('ECONNREFUSED');

      // If this is the last attempt or not a connection error, give up
      if (attempt === maxRetries || !isConnectionError) {
        console.error('Database query error:', error);
        console.error('Query:', text);
        console.error('Params:', params);
        throw error;
      }

      // Wait before retrying (exponential backoff: 100ms, 200ms)
      const waitMs = 100 * Math.pow(2, attempt);
      console.warn(`Connection error on attempt ${attempt + 1}, retrying in ${waitMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError || new Error('Query failed after retries');
}

// Close pool (for graceful shutdown)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
