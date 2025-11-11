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

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      lastUpdate: lastUpdateDate?.toISOString(),
      hoursSinceUpdate: hoursSinceUpdate?.toFixed(1),
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', message: 'Health check failed' },
      { status: 503 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
