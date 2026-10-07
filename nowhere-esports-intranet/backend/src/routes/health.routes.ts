import { Router } from 'express';
import {
  getHealth,
  getDatabaseHealth,
  getAuthHealth,
} from '../controllers/health.controller';

// ---------------------------------------------------------------------------
// Health routes — public, no auth required, excluded from rate limiting.
// ---------------------------------------------------------------------------

const router = Router();

/**
 * GET /health
 * Application status, uptime, version, environment.
 */
router.get('/', getHealth);

/**
 * GET /health/database
 * Supabase PostgreSQL connectivity check.
 */
router.get('/database', getDatabaseHealth);

/**
 * GET /health/auth
 * Supabase Auth service reachability check.
 */
router.get('/auth', getAuthHealth);

export default router;
