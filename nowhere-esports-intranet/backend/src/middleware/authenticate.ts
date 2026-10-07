import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthUser } from '../types/auth';
import { AuthenticationError } from '../errors';
import { UserRole, isValidRole } from '../constants/roles';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// authenticate — mandatory JWT verification middleware.
//
// 1. Extracts Bearer token from the Authorization header.
// 2. Calls Supabase Admin auth.getUser() to verify and decode the JWT.
// 3. Attaches typed AuthUser to req.user.
// 4. Calls next() on success, next(AuthenticationError) on failure.
//
// SECURITY: Never logs the token itself — only the user ID on success.
// ---------------------------------------------------------------------------

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn({ requestId: req.requestId }, 'Auth: missing or malformed Authorization header');
    return next(new AuthenticationError('Authorization header is missing or malformed'));
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      logger.warn({ requestId: req.requestId, error: error?.message }, 'Auth: invalid token');
      return next(new AuthenticationError('Invalid or expired token'));
    }

    const supabaseUser = data.user;
    const rawRole = supabaseUser.app_metadata?.role as unknown;
    const role: UserRole = isValidRole(rawRole) ? rawRole : UserRole.Employee;

    const authUser: AuthUser = {
      id:             supabaseUser.id,
      email:          supabaseUser.email ?? '',
      role,
      email_verified: !!supabaseUser.email_confirmed_at,
      app_metadata:   supabaseUser.app_metadata ?? {},
      user_metadata:  supabaseUser.user_metadata ?? {},
      last_sign_in_at: supabaseUser.last_sign_in_at ?? undefined,
    };

    req.user = authUser;

    logger.debug(
      { requestId: req.requestId, userId: authUser.id, role: authUser.role },
      'Auth: user authenticated',
    );

    next();
  } catch (err) {
    logger.error({ requestId: req.requestId, err }, 'Auth: unexpected error during JWT verification');
    next(new AuthenticationError('Authentication failed'));
  }
}
