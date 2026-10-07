import { Request, Response, NextFunction, RequestHandler } from 'express';
import { UserRole } from '../constants/roles';
import { AuthorizationError, AuthenticationError } from '../errors';
import { isOneOf, hasMinimumRole } from './roles';

// ---------------------------------------------------------------------------
// Permission guard factory functions.
// These return Express middleware that enforce role-based access.
//
// USAGE:
//   router.get('/admin', authenticate, requireRole(UserRole.Administrator), handler);
//   router.get('/staff', authenticate, requireAnyRole(UserRole.Manager, UserRole.HR), handler);
//   router.get('/elevated', authenticate, requireMinimumRole(UserRole.Manager), handler);
// ---------------------------------------------------------------------------

/**
 * Requires the authenticated user to have EXACTLY one of the specified roles.
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }
    if (!isOneOf(req.user.role, roles)) {
      return next(
        new AuthorizationError(
          `This action requires one of the following roles: ${roles.join(', ')}`,
        ),
      );
    }
    next();
  };
}

/**
 * Requires the authenticated user to have at least the specified role level.
 */
export function requireMinimumRole(minimumRole: UserRole): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }
    if (!hasMinimumRole(req.user.role, minimumRole)) {
      return next(
        new AuthorizationError(
          `This action requires at least the '${minimumRole}' role`,
        ),
      );
    }
    next();
  };
}

/**
 * Alias for requireRole with a more descriptive name for multi-role cases.
 */
export const requireAnyRole = (...roles: UserRole[]): RequestHandler =>
  requireRole(...roles);

/**
 * Requires the user to be authenticated (alias for the authenticate middleware).
 * Use at route level for readable route definitions.
 */
export { authenticate as requireAuth } from '../middleware/authenticate';

/**
 * Requires Administrator or SuperAdmin role.
 */
export const requireAdmin = (): RequestHandler =>
  requireAnyRole(UserRole.Administrator, UserRole.SuperAdmin);

/**
 * Requires SuperAdmin role exclusively.
 */
export const requireSuperAdmin = (): RequestHandler =>
  requireRole(UserRole.SuperAdmin);

/**
 * Allows access if the user is operating on their own resource
 * (req.user.id === req.params.id) OR if they have an admin role.
 * The :id param name defaults to 'id' but can be customised.
 */
export function requireSelfOrAdmin(paramName = 'id'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    const targetId = req.params[paramName];
    const isSelf  = req.user.id === targetId;
    const isAdmin = isOneOf(req.user.role, [UserRole.Administrator, UserRole.SuperAdmin]);

    if (!isSelf && !isAdmin) {
      return next(
        new AuthorizationError('You do not have permission to access this resource'),
      );
    }

    next();
  };
}
