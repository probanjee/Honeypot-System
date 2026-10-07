import { supabaseAdmin } from '../config/supabase';
import {
  Profile,
  CreateProfileData,
  UpdateProfileData,
  UserListFilters,
} from '../types/profile';
import { UserRole } from '../constants/roles';
import { DatabaseError, NotFoundError } from '../errors';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// ProfileRepository — all Supabase access for the profiles table.
// Uses supabaseAdmin (service role) so RLS is bypassed server-side.
// RLS is enforced for direct client access only.
// ---------------------------------------------------------------------------

const TABLE = 'profiles';

export class ProfileRepository {
  /**
   * Find a profile by its user UUID.
   */
  async findById(id: string): Promise<Profile | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, userId: id }, 'ProfileRepository.findById failed');
      throw new DatabaseError(error.message);
    }

    return data as Profile | null;
  }

  /**
   * Find a profile by email address.
   */
  async findByEmail(email: string): Promise<Profile | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      logger.error({ err: error, email }, 'ProfileRepository.findByEmail failed');
      throw new DatabaseError(error.message);
    }

    return data as Profile | null;
  }

  /**
   * List profiles with pagination and optional filters.
   */
  async findAll(filters: UserListFilters = {}): Promise<{ data: Profile[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      role,
      status,
      q,
      department_id,
      sortBy = 'created_at',
      sortDir = 'desc',
    } = filters as UserListFilters & { sortBy?: string; sortDir?: string };

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from(TABLE)
      .select('*', { count: 'exact' });

    if (role)          query = query.eq('role', role);
    if (status)        query = query.eq('status', status);
    if (department_id) query = query.eq('department_id', department_id);

    if (q) {
      query = query.or(
        `email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,employee_id.ilike.%${q}%`,
      );
    }

    query = query
      .order(sortBy ?? 'created_at', { ascending: sortDir === 'asc' })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      logger.error({ err: error, filters }, 'ProfileRepository.findAll failed');
      throw new DatabaseError(error.message);
    }

    return { data: (data ?? []) as Profile[], total: count ?? 0 };
  }

  /**
   * Create a new profile record.
   */
  async create(input: CreateProfileData): Promise<Profile> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        id:         input.id,
        email:      input.email.toLowerCase(),
        first_name: input.first_name ?? '',
        last_name:  input.last_name ?? '',
        role:       input.role ?? UserRole.Employee,
        status:     'active',
        timezone:   'UTC',
      })
      .select()
      .single();

    if (error) {
      logger.error({ err: error, input }, 'ProfileRepository.create failed');
      throw new DatabaseError(error.message);
    }

    return data as Profile;
  }

  /**
   * Update a profile by its user UUID.
   */
  async update(id: string, input: UpdateProfileData): Promise<Profile> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, userId: id }, 'ProfileRepository.update failed');
      throw new DatabaseError(error.message);
    }

    if (!data) throw new NotFoundError('Profile');

    return data as Profile;
  }

  /**
   * Update a profile's role.
   */
  async updateRole(id: string, role: UserRole): Promise<Profile> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, userId: id, role }, 'ProfileRepository.updateRole failed');
      throw new DatabaseError(error.message);
    }

    if (!data) throw new NotFoundError('Profile');

    return data as Profile;
  }

  /**
   * Update a profile's status.
   */
  async updateStatus(id: string, status: string): Promise<Profile> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, userId: id, status }, 'ProfileRepository.updateStatus failed');
      throw new DatabaseError(error.message);
    }

    if (!data) throw new NotFoundError('Profile');

    return data as Profile;
  }

  /**
   * Soft delete — sets status to 'inactive'.
   */
  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .update({ status: 'inactive' })
      .eq('id', id);

    if (error) {
      logger.error({ err: error, userId: id }, 'ProfileRepository.softDelete failed');
      throw new DatabaseError(error.message);
    }
  }
}

export const profileRepository = new ProfileRepository();
