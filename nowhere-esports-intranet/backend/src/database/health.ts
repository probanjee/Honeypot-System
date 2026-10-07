import { supabaseAdmin } from './client';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Database health check — lightweight Supabase connectivity test.
// Used by GET /api/v1/health/database
// ---------------------------------------------------------------------------

export type DatabaseHealthStatus = {
  status: 'healthy' | 'unhealthy';
  latencyMs?: number;
  error?: string;
  provider: 'supabase';
};

export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  const start = Date.now();

  try {
    // Lightweight query — fetch a single row from a system table
    const { error } = await supabaseAdmin
      .from('_realtime')
      .select('id')
      .limit(1)
      .maybeSingle();

    // If the table doesn't exist (PGRST116), Supabase is still reachable
    const isHealthy = !error || error.code === 'PGRST116' || error.code === '42P01';

    if (!isHealthy) {
      logger.warn({ error: error?.message }, 'Database health check: connection issue');
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: error?.message,
        provider: 'supabase',
      };
    }

    return {
      status: 'healthy',
      latencyMs: Date.now() - start,
      provider: 'supabase',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ err }, 'Database health check: unexpected error');
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: message,
      provider: 'supabase',
    };
  }
}
