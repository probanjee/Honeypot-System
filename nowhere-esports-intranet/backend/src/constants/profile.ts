import { UserRole } from '../constants/roles';
import { ProfileStatus } from '../types/profile';

// ---------------------------------------------------------------------------
// Profile-related constants
// ---------------------------------------------------------------------------

export { ProfileStatus };

export const DEFAULT_ROLE: UserRole = UserRole.Employee;

export const DEFAULT_STATUS: ProfileStatus = 'active';

export const DEFAULT_TIMEZONE = 'UTC';

/** Status values allowed for admin status updates */
export const ALLOWED_STATUS_VALUES: ProfileStatus[] = ['active', 'inactive', 'suspended'];

/** Password policy requirements */
export const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireDigit: true,
  requireSpecialChar: true,
  maxLength: 128,
} as const;
