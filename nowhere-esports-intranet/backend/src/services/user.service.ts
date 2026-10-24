import { Request } from 'express';
import { userRepository, UserRow } from '../repositories/user.repository';
import { profileRepository } from '../repositories/profile.repository';
import { supabaseAdmin } from '../config/supabase';
import { auditService } from './audit.service';
import { notificationService } from './notification.service';
import { AuditAction } from '../types/audit';
import { UserRole } from '../constants/roles';
import { UserProfileDto, UserListDto } from '../dto/user.dto';
import { UpdateProfileData, Profile } from '../types/profile';
import { UpdateProfileInput, UpdateRoleInput, UpdateStatusInput, ListUsersQueryInput } from '../validators/user.validators';
import { NotFoundError, AuthorizationError } from '../errors';
import { PaginationMeta } from '../types/api';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// UserService — profile management and admin operations via PostgreSQL.
// ---------------------------------------------------------------------------

export class UserService {
  /**
   * Get a user's profile by ID.
   */
  async getProfile(userId: string): Promise<UserProfileDto> {
    const profile = await profileRepository.findById(userId);
    if (!profile) throw new NotFoundError('User');

    const user = await userRepository.findById(userId);

    return this.toDto(profile, user);
  }

  /**
   * Update a user's own profile (non-sensitive fields only).
   */
  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
    req?: Request,
  ): Promise<UserProfileDto> {
    const updateData: UpdateProfileData = {
      first_name:  input.first_name,
      last_name:   input.last_name,
      phone:       input.phone,
      designation: input.designation,
      timezone:    input.timezone,
      avatar_url:  input.avatar_url,
    };

    // Remove undefined keys
    Object.keys(updateData).forEach((key) => {
      if ((updateData as Record<string, unknown>)[key] === undefined) {
        delete (updateData as Record<string, unknown>)[key];
      }
    });

    const updated = await profileRepository.update(userId, updateData);

    void auditService.log(AuditAction.PROFILE_UPDATED, {
      actorId:  userId,
      targetId: userId,
      metadata: { fields: Object.keys(updateData) },
      req,
    });

    void notificationService.handleEvent('profile_updated', userId);

    const user = await userRepository.findById(userId);
    return this.toDto(updated, user);
  }

  /**
   * Soft-delete an account. SuperAdmin can also hard-delete.
   */
  async deleteAccount(
    actorId: string,
    targetId: string,
    actorRole: UserRole,
    req?: Request,
  ): Promise<void> {
    const target = await profileRepository.findById(targetId);
    if (!target) throw new NotFoundError('User');

    if (
      actorId !== targetId &&
      actorRole !== UserRole.Administrator &&
      actorRole !== UserRole.SuperAdmin
    ) {
      throw new AuthorizationError('You can only delete your own account');
    }

    if (actorRole === UserRole.SuperAdmin && actorId !== targetId) {
      const deleteMock = (supabaseAdmin as any)?.auth?.admin?.deleteUser;
      if (typeof deleteMock === 'function') {
        await deleteMock(targetId);
      }
      await profileRepository.softDelete(targetId);
    } else {
      await profileRepository.softDelete(targetId);
    }

    void auditService.log(AuditAction.ACCOUNT_DELETED, {
      actorId,
      targetId,
      metadata: { deleted_by_role: actorRole },
      req,
    });

    void notificationService.handleEvent('account_deleted', targetId);
  }

  /**
   * List users with filtering and pagination. Admin-only.
   */
  async listUsers(
    query: ListUsersQueryInput,
  ): Promise<UserListDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const { data, total } = await profileRepository.findAll({
      page,
      pageSize,
      role: query.role as UserRole,
      status: query.status,
      q: query.q,
      department_id: query.department_id,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    });

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: data.map((p) => this.toDto(p, null)),
      meta: {
        total,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Alias for updateRole to support existing callers.
   */
  async updateUserRole(
    actorId: string,
    targetId: string,
    input: UpdateRoleInput,
    req?: Request,
  ): Promise<UserProfileDto> {
    return this.updateRole(actorId, targetId, input, req);
  }

  /**
   * Update a user's role. Admin-only.
   */
  async updateRole(
    actorId: string,
    targetId: string,
    input: UpdateRoleInput,
    req?: Request,
  ): Promise<UserProfileDto> {
    const target = await profileRepository.findById(targetId);
    if (!target) throw new NotFoundError('User');

    if (target.role === UserRole.SuperAdmin) {
      throw new AuthorizationError('SuperAdmin role cannot be changed via this endpoint');
    }

    const updated = await profileRepository.updateRole(targetId, input.role);

    const updateAuthMock = (supabaseAdmin as any)?.auth?.admin?.updateUserById;
    if (typeof updateAuthMock === 'function') {
      await updateAuthMock(targetId, { app_metadata: { role: input.role } });
    }

    void auditService.log(AuditAction.ROLE_CHANGED, {
      actorId,
      targetId,
      metadata: {
        old_role: target.role,
        new_role: input.role,
        reason:   input.reason,
      },
      req,
    });

    void notificationService.handleEvent('role_changed', targetId, { new_role: input.role });

    const user = await userRepository.findById(targetId);
    return this.toDto(updated, user);
  }

  /**
   * Update a user's account status. Admin-only.
   */
  async updateStatus(
    actorId: string,
    targetId: string,
    input: UpdateStatusInput,
    req?: Request,
  ): Promise<UserProfileDto> {
    const target = await profileRepository.findById(targetId);
    if (!target) throw new NotFoundError('User');

    if (target.role === UserRole.SuperAdmin) {
      throw new AuthorizationError('SuperAdmin status cannot be changed via this endpoint');
    }

    const updated = await profileRepository.updateStatus(targetId, input.status);

    void auditService.log(AuditAction.STATUS_CHANGED, {
      actorId,
      targetId,
      metadata: {
        old_status: target.status,
        new_status: input.status,
        reason: (input as { reason?: string }).reason,
      },
      req,
    });

    const user = await userRepository.findById(targetId);
    return this.toDto(updated, user);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private toDto(
    profile: Profile,
    user: UserRow | null,
  ): UserProfileDto {
    return {
      id:              profile.id,
      email:           profile.email,
      first_name:      profile.first_name,
      last_name:       profile.last_name,
      full_name:       `${profile.first_name} ${profile.last_name}`.trim(),
      avatar_url:      profile.avatar_url,
      department_id:   profile.department_id,
      role:            profile.role,
      phone:           profile.phone,
      employee_id:     profile.employee_id,
      designation:     profile.designation,
      status:          profile.status,
      timezone:        profile.timezone,
      email_verified:  true,
      last_sign_in_at: user?.created_at?.toISOString() ?? null,
      created_at:      profile.created_at,
      updated_at:      profile.updated_at,
    };
  }
}

export const userService = new UserService();
