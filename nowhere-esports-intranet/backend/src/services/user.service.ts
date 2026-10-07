import { Request } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { profileRepository } from '../repositories/profile.repository';
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
// UserService — profile management and admin operations.
// ---------------------------------------------------------------------------

export class UserService {
  /**
   * Get a user's profile by ID.
   */
  async getProfile(userId: string): Promise<UserProfileDto> {
    const profile = await profileRepository.findById(userId);
    if (!profile) throw new NotFoundError('User');

    // Fetch email_verified and last_sign_in_at from auth
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);

    return this.toDto(profile, authData?.user ?? null);
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

    // Sync name to Supabase user_metadata
    if (input.first_name || input.last_name) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          first_name: updated.first_name,
          last_name:  updated.last_name,
        },
      });
    }

    void auditService.log(AuditAction.PROFILE_UPDATED, {
      actorId:  userId,
      targetId: userId,
      metadata: { fields: Object.keys(updateData) },
      req,
    });

    void notificationService.handleEvent('profile_updated', userId);

    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
    return this.toDto(updated, authData?.user ?? null);
  }

  /**
   * Soft-delete an account. SuperAdmin can also hard-delete from auth.
   */
  async deleteAccount(
    actorId: string,
    targetId: string,
    actorRole: UserRole,
    req?: Request,
  ): Promise<void> {
    const target = await profileRepository.findById(targetId);
    if (!target) throw new NotFoundError('User');

    // Regular users can only delete themselves
    if (
      actorId !== targetId &&
      actorRole !== UserRole.Administrator &&
      actorRole !== UserRole.SuperAdmin
    ) {
      throw new AuthorizationError('You can only delete your own account');
    }

    // Soft delete in profiles table
    await profileRepository.softDelete(targetId);

    // SuperAdmin: also remove from Supabase Auth
    if (actorRole === UserRole.SuperAdmin) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(targetId);
      if (error) {
        logger.warn({ err: error.message, targetId }, 'UserService.deleteAccount: auth delete failed');
      }
    }

    void auditService.log(AuditAction.ACCOUNT_DELETED, {
      actorId,
      targetId,
      metadata: { hard_delete: actorRole === UserRole.SuperAdmin },
      req,
    });
  }

  /**
   * List users with pagination and filters (admin operation).
   */
  async listUsers(filters: ListUsersQueryInput): Promise<UserListDto> {
    const { data, total } = await profileRepository.findAll({
      page: filters.page,
      pageSize: filters.pageSize,
      role: filters.role as UserRole | undefined,
      status: filters.status as any,
      q: filters.q,
      department_id: filters.department_id,
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
    } as any);

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const totalPages = Math.ceil(total / pageSize);

    const meta: PaginationMeta = {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return {
      data: data.map((p) => this.toDto(p, null)),
      meta,
    };
  }

  /**
   * Update a user's role (admin operation).
   * Also syncs role to Supabase app_metadata.
   */
  async updateUserRole(
    adminId: string,
    targetId: string,
    input: UpdateRoleInput,
    req?: Request,
  ): Promise<UserProfileDto> {
    const target = await profileRepository.findById(targetId);
    if (!target) throw new NotFoundError('User');

    const previousRole = target.role;
    const newRole = input.role as UserRole;

    // Prevent demoting a SuperAdmin unless the actor is also a SuperAdmin
    if (target.role === UserRole.SuperAdmin) {
      const admin = await profileRepository.findById(adminId);
      if (admin?.role !== UserRole.SuperAdmin) {
        throw new AuthorizationError('Only a Super Admin can modify another Super Admin\'s role');
      }
    }

    const updated = await profileRepository.updateRole(targetId, newRole);

    // Sync to Supabase app_metadata
    await supabaseAdmin.auth.admin.updateUserById(targetId, {
      app_metadata: { role: newRole },
    });

    void auditService.log(AuditAction.ROLE_CHANGED, {
      actorId:  adminId,
      targetId,
      metadata: { previous_role: previousRole, new_role: newRole },
      req,
    });

    void notificationService.handleEvent('role_updated', targetId, { role: newRole });

    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(targetId);
    return this.toDto(updated, authData?.user ?? null);
  }

  /**
   * Update a user's account status (admin operation).
   */
  async updateUserStatus(
    adminId: string,
    targetId: string,
    input: UpdateStatusInput,
    req?: Request,
  ): Promise<UserProfileDto> {
    const target = await profileRepository.findById(targetId);
    if (!target) throw new NotFoundError('User');

    const previousStatus = target.status;
    const updated = await profileRepository.updateStatus(targetId, input.status);

    void auditService.log(AuditAction.STATUS_CHANGED, {
      actorId:  adminId,
      targetId,
      metadata: {
        previous_status: previousStatus,
        new_status: input.status,
        reason: (input as { reason?: string }).reason,
      },
      req,
    });

    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(targetId);
    return this.toDto(updated, authData?.user ?? null);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private toDto(
    profile: Profile,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authUser: any,
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
      email_verified:  authUser ? !!authUser.email_confirmed_at : false,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
      created_at:      profile.created_at,
      updated_at:      profile.updated_at,
    };
  }
}

export const userService = new UserService();
