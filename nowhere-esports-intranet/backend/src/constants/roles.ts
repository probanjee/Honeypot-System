// ---------------------------------------------------------------------------
// User role definitions for the Nowhere Esports Intranet.
// These roles are stored in Supabase user app_metadata.role.
// Permission enforcement is implemented in Milestone 2.
// ---------------------------------------------------------------------------

export enum UserRole {
  Employee = 'employee',
  Manager = 'manager',
  HR = 'hr',
  TournamentAdmin = 'tournament_admin',
  ITSupport = 'it_support',
  SecurityAnalyst = 'security_analyst',
  Administrator = 'administrator',
  SuperAdmin = 'super_admin',
}

/**
 * Ordered role hierarchy — higher index = greater privilege.
 * Used for hierarchical permission checks in future milestones.
 */
export const ROLE_HIERARCHY: UserRole[] = [
  UserRole.Employee,
  UserRole.Manager,
  UserRole.HR,
  UserRole.TournamentAdmin,
  UserRole.ITSupport,
  UserRole.SecurityAnalyst,
  UserRole.Administrator,
  UserRole.SuperAdmin,
];

/**
 * All valid role strings — useful for Zod enum validation.
 */
export const ALL_ROLES = Object.values(UserRole) as [string, ...string[]];

/**
 * Returns true if the given string is a valid UserRole.
 */
export function isValidRole(role: unknown): role is UserRole {
  return typeof role === 'string' && ALL_ROLES.includes(role as UserRole);
}
