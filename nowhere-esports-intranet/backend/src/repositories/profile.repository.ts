import { query } from '../database/pool';
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
// ProfileRepository — Native PostgreSQL implementation for profiles table.
// ---------------------------------------------------------------------------

export class ProfileRepository {
  /**
   * Find a profile by its user UUID.
   */
  async findById(id: string): Promise<Profile | null> {
    try {
      const res = await query<Profile>('SELECT * FROM profiles WHERE id = $1', [id]);
      return res.rows[0] ?? null;
    } catch (error: any) {
      logger.error({ err: error, userId: id }, 'ProfileRepository.findById failed');
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Find a profile by email address.
   */
  async findByEmail(email: string): Promise<Profile | null> {
    try {
      const res = await query<Profile>('SELECT * FROM profiles WHERE LOWER(email) = LOWER($1)', [email]);
      return res.rows[0] ?? null;
    } catch (error: any) {
      logger.error({ err: error, email }, 'ProfileRepository.findByEmail failed');
      throw new DatabaseError(error.message);
    }
  }

  /**
   * List profiles with pagination and optional filters.
   */
  async findAll(filters: UserListFilters = {}): Promise<{ data: Profile[]; total: number }> {
    try {
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

      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (role) {
        conditions.push(`role = $${paramIndex++}`);
        params.push(role);
      }
      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }
      if (department_id) {
        conditions.push(`department_id = $${paramIndex++}`);
        params.push(department_id);
      }
      if (q) {
        conditions.push(`(email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR employee_id ILIKE $${paramIndex})`);
        params.push(`%${q}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total
      const countRes = await query(`SELECT COUNT(*) as count FROM profiles ${whereClause}`, params);
      const total = parseInt(countRes.rows[0]?.count || '0', 10);

      // Pagination & Ordering
      const validSortColumns = ['created_at', 'email', 'first_name', 'last_name', 'role', 'status'];
      const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const safeSortDir = sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      const offset = (page - 1) * pageSize;
      const dataSql = `SELECT * FROM profiles ${whereClause} ORDER BY ${safeSortBy} ${safeSortDir} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(pageSize, offset);

      const dataRes = await query<Profile>(dataSql, params);
      return { data: dataRes.rows, total };
    } catch (error: any) {
      logger.error({ err: error, filters }, 'ProfileRepository.findAll failed');
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Create a new profile record.
   */
  async create(input: CreateProfileData): Promise<Profile> {
    try {
      const sql = `
        INSERT INTO profiles (id, email, first_name, last_name, role, status, timezone)
        VALUES ($1, LOWER($2), $3, $4, $5, 'active', 'UTC')
        RETURNING *
      `;
      const params = [
        input.id,
        input.email,
        input.first_name ?? '',
        input.last_name ?? '',
        input.role ?? UserRole.Employee,
      ];
      const res = await query<Profile>(sql, params);
      return res.rows[0];
    } catch (error: any) {
      logger.error({ err: error, input }, 'ProfileRepository.create failed');
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Update a profile by its user UUID.
   */
  async update(id: string, input: UpdateProfileData): Promise<Profile> {
    try {
      const updates: string[] = [];
      const params: any[] = [id];
      let paramIndex = 2;

      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) {
          updates.push(`${key} = $${paramIndex++}`);
          params.push(value);
        }
      }

      if (updates.length === 0) {
        const existing = await this.findById(id);
        if (!existing) throw new NotFoundError('Profile');
        return existing;
      }

      const sql = `UPDATE profiles SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`;
      const res = await query<Profile>(sql, params);

      if (res.rows.length === 0) {
        throw new NotFoundError('Profile');
      }

      return res.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundError) throw error;
      logger.error({ err: error, userId: id }, 'ProfileRepository.update failed');
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Update a profile's role.
   */
  async updateRole(id: string, role: UserRole): Promise<Profile> {
    try {
      const res = await query<Profile>(
        'UPDATE profiles SET role = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id, role]
      );
      if (res.rows.length === 0) throw new NotFoundError('Profile');
      return res.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundError) throw error;
      logger.error({ err: error, userId: id, role }, 'ProfileRepository.updateRole failed');
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Update a profile's status.
   */
  async updateStatus(id: string, status: string): Promise<Profile> {
    try {
      const res = await query<Profile>(
        'UPDATE profiles SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id, status]
      );
      if (res.rows.length === 0) throw new NotFoundError('Profile');
      return res.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundError) throw error;
      logger.error({ err: error, userId: id, status }, 'ProfileRepository.updateStatus failed');
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Soft delete — sets status to 'inactive'.
   */
  async softDelete(id: string): Promise<void> {
    try {
      await query("UPDATE profiles SET status = 'inactive', updated_at = NOW() WHERE id = $1", [id]);
    } catch (error: any) {
      logger.error({ err: error, userId: id }, 'ProfileRepository.softDelete failed');
      throw new DatabaseError(error.message);
    }
  }
}

export const profileRepository = new ProfileRepository();
