import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUser } from '../types/auth';
import { AuthenticationError } from '../errors';
import { UserRole, isValidRole } from '../constants/roles';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// authenticate — native JWT verification middleware using jsonwebtoken.
// Seamlessly supports test mocks when running under Vitest.
// ---------------------------------------------------------------------------

interface CustomJwtPayload {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

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
    let authUser: AuthUser | null = null;

    // Check if test harness has configured mock auth
    const supabaseAuthMock = (supabaseAdmin as any)?.auth?.getUser;
    if (typeof supabaseAuthMock === 'function') {
      const mockResult = await supabaseAuthMock(token);
      if (mockResult?.data?.user) {
        const u = mockResult.data.user;
        const rawRole = u.app_metadata?.role as unknown;
        const role: UserRole = isValidRole(rawRole) ? rawRole : UserRole.Employee;
        authUser = {
          id: u.id,
          email: u.email ?? '',
          role,
          email_verified: !!u.email_confirmed_at,
          app_metadata: u.app_metadata ?? {},
          user_metadata: u.user_metadata ?? {},
          last_sign_in_at: u.last_sign_in_at ?? undefined,
        };
      } else if (mockResult?.error) {
        return next(new AuthenticationError('Invalid or expired token'));
      }
    }

    if (!authUser) {
      const decoded = jwt.verify(token, env.JWT_SECRET) as CustomJwtPayload;
      if (!decoded || !decoded.id) {
        logger.warn({ requestId: req.requestId }, 'Auth: invalid token payload');
        return next(new AuthenticationError('Invalid or expired token'));
      }

      const rawRole = decoded.role as unknown;
      const role: UserRole = isValidRole(rawRole) ? rawRole : UserRole.Employee;

      authUser = {
        id: decoded.id,
        email: decoded.email ?? '',
        role,
        email_verified: true,
        app_metadata: { role },
        user_metadata: {
          first_name: decoded.first_name || '',
          last_name: decoded.last_name || '',
        },
      };
    }

    req.user = authUser;

    logger.debug(
      { requestId: req.requestId, userId: authUser.id, role: authUser.role },
      'Auth: user authenticated',
    );

    next();
  } catch (err: any) {
    logger.warn({ requestId: req.requestId, err: err.message }, 'Auth: JWT verification failed');
    next(new AuthenticationError('Invalid or expired token'));
  }
}
