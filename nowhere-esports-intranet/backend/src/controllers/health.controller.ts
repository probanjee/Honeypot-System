import { Request, Response } from 'express';
import { checkDatabaseHealth } from '../database/health';
import { checkAuthServiceHealth } from '../auth/supabaseAuth';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { HTTP_STATUS } from '../constants/http';
import { config } from '../config/app';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Health controller — system observability endpoints.
// These are public (no auth required) and excluded from rate limiting.
// ---------------------------------------------------------------------------

const startTime = Date.now();

/**
 * GET /health
 * Returns application status, version, uptime, and environment.
 */
export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  sendSuccess(res, {
    status: 'ok',
    environment: config.server.nodeEnv,
    version: process.env['npm_package_version'] ?? '1.0.0',
    uptime: {
      seconds: uptimeSeconds,
      human: formatUptime(uptimeSeconds),
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/database
 * Checks Supabase PostgreSQL connectivity.
 */
export const getDatabaseHealth = asyncHandler(async (_req: Request, res: Response) => {
  const health = await checkDatabaseHealth();

  if (health.status === 'unhealthy') {
    logger.warn({ health }, 'Health check: database is unhealthy');
    sendError(res, {
      message: 'Database connection is unhealthy',
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
    });
    return;
  }

  sendSuccess(res, health, { message: 'Database is healthy' });
});

/**
 * GET /health/auth
 * Checks Supabase Auth service reachability.
 */
export const getAuthHealth = asyncHandler(async (_req: Request, res: Response) => {
  const health = await checkAuthServiceHealth();

  if (health.status === 'unhealthy') {
    logger.warn({ health }, 'Health check: auth service is unhealthy');
    sendError(res, {
      message: 'Auth service is unhealthy',
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
    });
    return;
  }

  sendSuccess(res, health, { message: 'Auth service is healthy' });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}
