import { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '../config/supabase';
import { AuthUser } from '../types/auth';
import { UserRole, isValidRole } from '../constants/roles';
import { AuthenticationError } from '../errors';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Supabase Auth helper functions.
// These wrap the Supabase Admin Auth API for use in middleware and services.
// ---------------------------------------------------------------------------

/**
 * Converts a raw Supabase User object into our typed AuthUser.
 */
function toAuthUser(supabaseUser: User): AuthUser {
  const rawRole = supabaseUser.app_metadata?.role as unknown;
  const role: UserRole = isValidRole(rawRole) ? rawRole : UserRole.Employee;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    role,
    email_verified: !!supabaseUser.email_confirmed_at,
    app_metadata: supabaseUser.app_metadata ?? {},
    user_metadata: supabaseUser.user_metadata ?? {},
    last_sign_in_at: supabaseUser.last_sign_in_at ?? undefined,
  };
}

/**
 * Verifies a Supabase JWT and returns the authenticated user.
 * Throws AuthenticationError on failure.
 */
export async function verifyToken(token: string): Promise<AuthUser> {
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    logger.warn({ error: error?.message }, 'supabaseAuth: token verification failed');
    throw new AuthenticationError(error?.message ?? 'Invalid or expired token');
  }

  return toAuthUser(data.user);
}

/**
 * Retrieves a user by their Supabase UUID via the Admin API.
 * Throws AuthenticationError if not found.
 */
export async function getUserById(id: string): Promise<AuthUser> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);

  if (error || !data.user) {
    logger.warn({ userId: id, error: error?.message }, 'supabaseAuth: user lookup failed');
    throw new AuthenticationError(error?.message ?? 'User not found');
  }

  return toAuthUser(data.user);
}

/**
 * Checks whether the Supabase Auth service is reachable.
 * Returns a status object suitable for the /health/auth endpoint.
 */
export async function checkAuthServiceHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    // List users with page size 1 — minimal overhead
    const { error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });

    if (error) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: error.message,
      };
    }

    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { status: 'unhealthy', latencyMs: Date.now() - start, error: message };
  }
}
