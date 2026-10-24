import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUser } from '../types/auth';
import { UserRole, isValidRole } from '../constants/roles';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// optionalAuth — non-blocking native JWT verification middleware.
// ---------------------------------------------------------------------------

interface CustomJwtPayload {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

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
    const decoded = jwt.verify(token, env.JWT_SECRET) as CustomJwtPayload;

    if (!decoded || !decoded.id) {
      return next();
    }

    const rawRole = decoded.role as unknown;
    const role: UserRole = isValidRole(rawRole) ? rawRole : UserRole.Employee;

    const authUser: AuthUser = {
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

    req.user = authUser;
  } catch {
    logger.debug({ requestId: req.requestId }, 'optionalAuth: invalid token, continuing unauthenticated');
  }

  next();
}
