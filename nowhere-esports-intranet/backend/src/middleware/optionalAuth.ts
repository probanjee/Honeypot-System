import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthUser } from '../types/auth';
import { UserRole, isValidRole } from '../constants/roles';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// optionalAuth — non-blocking JWT verification middleware.
//
// Attaches req.user if a valid Bearer token is present.
// If the token is absent, invalid, or expired — silently continues.
// Use on routes that serve both authenticated and public users.
// ---------------------------------------------------------------------------

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      logger.debug({ requestId: req.requestId }, 'optionalAuth: token invalid, continuing unauthenticated');
      return next();
    }

    const supabaseUser = data.user;
    const rawRole = supabaseUser.app_metadata?.role as unknown;
    const role: UserRole = isValidRole(rawRole) ? rawRole : UserRole.Employee;

    const authUser: AuthUser = {
      id: supabaseUser.id,
      email: supabaseUser.email ?? '',
      role,
      email_verified: !!supabaseUser.email_confirmed_at,
      app_metadata: supabaseUser.app_metadata ?? {},
      user_metadata: supabaseUser.user_metadata ?? {},
      last_sign_in_at: supabaseUser.last_sign_in_at ?? undefined,
    };

    req.user = authUser;
  } catch {
    // Silent failure — optional auth should never block requests
    logger.debug({ requestId: req.requestId }, 'optionalAuth: unexpected error, continuing unauthenticated');
  }

  next();
}
