import { UserRole, ROLE_HIERARCHY } from '../constants/roles';

// ---------------------------------------------------------------------------
// Role hierarchy definitions.
// Milestone 2 will wire these into permission guards.
// ---------------------------------------------------------------------------

/**
 * Returns the numeric rank of a role (higher = more privileged).
 */
export function getRoleRank(role: UserRole): number {
  return ROLE_HIERARCHY.indexOf(role);
}

/**
 * Returns true if `userRole` has at least the privilege level of `requiredRole`.
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return getRoleRank(userRole) >= getRoleRank(requiredRole);
}

/**
 * Returns true if `userRole` is one of the `allowedRoles`.
 */
export function isOneOf(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Administrative roles — shortcut for permission checks.
 */
export const ADMIN_ROLES: UserRole[] = [UserRole.Administrator, UserRole.SuperAdmin];

/**
 * Privileged roles that can access sensitive operations.
 */
export const PRIVILEGED_ROLES: UserRole[] = [
  UserRole.HR,
  UserRole.SecurityAnalyst,
  UserRole.ITSupport,
  UserRole.Administrator,
  UserRole.SuperAdmin,
];
