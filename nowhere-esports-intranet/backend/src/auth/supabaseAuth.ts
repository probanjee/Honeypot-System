import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { userRepository } from '../repositories/user.repository';
import { AuthUser } from '../types/auth';
import { UserRole, isValidRole } from '../constants/roles';
import { AuthenticationError } from '../errors';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Native JWT and Database Auth helper functions.
// ---------------------------------------------------------------------------

interface DecodedToken {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Verifies a JWT token and returns the authenticated user.
 */
export async function verifyToken(token: string): Promise<AuthUser> {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as DecodedToken;

    if (!decoded || !decoded.id) {
      throw new AuthenticationError('Invalid or expired token');
    }

    const rawRole = decoded.role as unknown;
    const role: UserRole = isValidRole(rawRole) ? rawRole : UserRole.Employee;

    return {
      id: decoded.id,
      email: decoded.email,
      role,
      email_verified: true,
      app_metadata: { role },
      user_metadata: {
        first_name: decoded.first_name || '',
        last_name: decoded.last_name || '',
      },
    };
  } catch (err: any) {
    logger.warn({ error: err.message }, 'tokenAuth: token verification failed');
    throw new AuthenticationError(err.message ?? 'Invalid or expired token');
  }
}

/**
 * Retrieves a user by their UUID from PostgreSQL.
 */
export async function getUserById(id: string): Promise<AuthUser> {
  const user = await userRepository.findById(id);

  if (!user) {
    logger.warn({ userId: id }, 'tokenAuth: user lookup failed');
    throw new AuthenticationError('User not found');
  }

  const rawRole = user.role as unknown;
  const role: UserRole = isValidRole(rawRole) ? rawRole : UserRole.Employee;

  return {
    id: user.id,
    email: user.email,
    role,
    email_verified: true,
    app_metadata: { role },
    user_metadata: {
      first_name: user.first_name,
      last_name: user.last_name,
    },
    last_sign_in_at: user.updated_at?.toISOString(),
  };
}

/**
 * Checks whether the authentication service is healthy.
 */
export async function checkAuthServiceHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const { supabaseAdmin } = await import('../config/supabase');
    const listUsersMock = (supabaseAdmin as any)?.auth?.admin?.listUsers;
    if (typeof listUsersMock === 'function') {
      const { error } = await listUsersMock({ perPage: 1 });
      if (error) {
        return {
          status: 'unhealthy',
          latencyMs: Date.now() - start,
          error: error.message,
        };
      }
    }
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (err: any) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: err.message,
    };
  }
}
