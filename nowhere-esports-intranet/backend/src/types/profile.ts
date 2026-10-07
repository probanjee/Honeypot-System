import { UserRole } from '../constants/roles';

// ---------------------------------------------------------------------------
// Profile — the public profile record stored in public.profiles
// ---------------------------------------------------------------------------

export type ProfileStatus = 'active' | 'inactive' | 'suspended';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  department_id: string | null;
  role: UserRole;
  phone: string | null;
  employee_id: string | null;
  designation: string | null;
  status: ProfileStatus;
  timezone: string;
  created_at: string;
  updated_at: string;
}

/** Profile fields safe to expose in API responses (excludes nothing sensitive here, but typed separately) */
export type PublicProfile = Omit<Profile, 'department_id'> & {
  department_id: string | null;
  full_name: string;
};

/** Data used when creating a profile record */
export interface CreateProfileData {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
}

/** Data used when updating a profile record */
export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  phone?: string | null;
  designation?: string | null;
  timezone?: string;
  department_id?: string | null;
}

/** Filters for listing users */
export interface UserListFilters {
  page?: number;
  pageSize?: number;
  role?: UserRole;
  status?: ProfileStatus;
  q?: string;
  department_id?: string;
}
