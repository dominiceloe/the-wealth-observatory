import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/db-helpers';
import { getConfigValue } from '@/lib/queries/config';

export async function GET() {
  try {
    // Check database connection
    const dbHealthy = await healthCheck();

    if (!dbHealthy) {
      return NextResponse.json(
        { status: 'unhealthy', message: 'Database connection failed' },
        { status: 503 }
      );
    }

    // Check last update time
    const lastUpdate = await getConfigValue('last_manual_update');
    const lastUpdateDate = lastUpdate ? new Date(lastUpdate) : null;
    const hoursSinceUpdate = lastUpdateDate
      ? (Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60)
      : null;

    // The cron runs daily; anything older than 48h means updates have stalled
    // (e.g. the upstream Forbes feed changed). Surface this loudly instead of
    // letting the data silently rot — report `degraded` with a 503 so external
    // uptime monitors can alert on it.
    const STALE_THRESHOLD_HOURS = 48;
    const isStale =
      hoursSinceUpdate === null || hoursSinceUpdate > STALE_THRESHOLD_HOURS;

    return NextResponse.json(
      {
        status: isStale ? 'degraded' : 'healthy',
        database: 'connected',
        dataFresh: !isStale,
        lastUpdate: lastUpdateDate?.toISOString() ?? null,
        hoursSinceUpdate: hoursSinceUpdate?.toFixed(1) ?? null,
        ...(isStale && {
          message: `Data is stale (last updated ${
            hoursSinceUpdate?.toFixed(1) ?? 'never'
          }h ago, threshold ${STALE_THRESHOLD_HOURS}h)`,
        }),
      },
      { status: isStale ? 503 : 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', message: 'Health check failed' },
      { status: 503 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
