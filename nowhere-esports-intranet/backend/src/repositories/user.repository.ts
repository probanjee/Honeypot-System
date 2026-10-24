import { query } from '../database/pool';
import { DatabaseError, NotFoundError } from '../errors';
import { logger } from '../utils/logger';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class UserRepository {
  async findById(id: string): Promise<UserRow | null> {
    try {
      const res = await query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
      return res.rows[0] ?? null;
    } catch (err: any) {
      logger.error({ err, userId: id }, 'UserRepository.findById failed');
      throw new DatabaseError(err.message);
    }
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    try {
      const res = await query<UserRow>('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      return res.rows[0] ?? null;
    } catch (err: any) {
      logger.error({ err, email }, 'UserRepository.findByEmail failed');
      throw new DatabaseError(err.message);
    }
  }

  async create(user: {
    email: string;
    passwordHash: string;
    role: string;
    firstName?: string;
    lastName?: string;
  }): Promise<UserRow> {
    try {
      const sql = `
        INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
        VALUES (LOWER($1), $2, $3, $4, $5, TRUE)
        RETURNING *
      `;
      const res = await query<UserRow>(sql, [
        user.email,
        user.passwordHash,
        user.role,
        user.firstName || '',
        user.lastName || '',
      ]);
      return res.rows[0];
    } catch (err: any) {
      logger.error({ err, email: user.email }, 'UserRepository.create failed');
      throw new DatabaseError(err.message);
    }
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    try {
      await query('UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1', [id, passwordHash]);
    } catch (err: any) {
      logger.error({ err, userId: id }, 'UserRepository.updatePassword failed');
      throw new DatabaseError(err.message);
    }
  }
}

export const userRepository = new UserRepository();
