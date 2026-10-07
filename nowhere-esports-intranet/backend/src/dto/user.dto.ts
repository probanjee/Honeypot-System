import { UserRole } from '../constants/roles';
import { ProfileStatus } from '../types/profile';
import { PaginationMeta } from '../types/api';

// ---------------------------------------------------------------------------
// User DTOs — safe API-facing shapes for user profile data
// ---------------------------------------------------------------------------

/** Full user profile returned in API responses */
export interface UserProfileDto {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url: string | null;
  department_id: string | null;
  role: UserRole;
  phone: string | null;
  employee_id: string | null;
  designation: string | null;
  status: ProfileStatus;
  timezone: string;
  email_verified: boolean;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Paginated list of users */
export interface UserListDto {
  data: UserProfileDto[];
  meta: PaginationMeta;
}
