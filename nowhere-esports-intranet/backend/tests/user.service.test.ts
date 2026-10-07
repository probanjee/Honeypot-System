import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../src/services/user.service';
import { profileRepository } from '../src/repositories/profile.repository';
import { UserRole } from '../src/constants/roles';
import { NotFoundError, AuthorizationError } from '../src/errors';

// ---------------------------------------------------------------------------
// UserService unit tests
// ---------------------------------------------------------------------------

vi.mock('../src/repositories/profile.repository', () => ({
  profileRepository: {
    findById:     vi.fn(),
    findByEmail:  vi.fn(),
    findAll:      vi.fn(),
    create:       vi.fn(),
    update:       vi.fn(),
    updateRole:   vi.fn(),
    updateStatus: vi.fn(),
    softDelete:   vi.fn(),
  },
}));

vi.mock('../src/services/audit.service', () => ({
  auditService: { log: vi.fn() },
}));

const mockProfile = {
  id:            '00000000-0000-0000-0000-000000000001',
  email:         'test@nowhere.gg',
  first_name:    'Test',
  last_name:     'User',
  role:          UserRole.Employee,
  status:        'active' as const,
  timezone:      'UTC',
  avatar_url:    null,
  department_id: null,
  phone:         null,
  employee_id:   null,
  designation:   null,
  created_at:    new Date().toISOString(),
  updated_at:    new Date().toISOString(),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new UserService();
  });

  // ── getProfile ────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('should throw NotFoundError when profile does not exist', async () => {
      vi.mocked(profileRepository.findById).mockResolvedValueOnce(null);

      await expect(service.getProfile('nonexistent-id')).rejects.toThrow(NotFoundError);
    });

    it('should return a UserProfileDto when profile exists', async () => {
      vi.mocked(profileRepository.findById).mockResolvedValueOnce(mockProfile as any);
      const { supabaseAdmin } = await import('../src/config/supabase');
      vi.mocked(supabaseAdmin.auth.admin.getUserById).mockResolvedValueOnce({
        data: { user: { email_confirmed_at: new Date().toISOString(), last_sign_in_at: null } },
        error: null,
      } as any);

      const result = await service.getProfile(mockProfile.id);
      expect(result.id).toBe(mockProfile.id);
      expect(result.full_name).toBe('Test User');
      expect(result.email_verified).toBe(true);
    });
  });

  // ── updateProfile ─────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('should update profile fields and return updated DTO', async () => {
      const updated = { ...mockProfile, first_name: 'Updated', last_name: 'Name' };
      vi.mocked(profileRepository.update).mockResolvedValueOnce(updated as any);

      const { supabaseAdmin } = await import('../src/config/supabase');
      vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockResolvedValueOnce({
        data: { user: {} }, error: null,
      } as any);
      vi.mocked(supabaseAdmin.auth.admin.getUserById).mockResolvedValueOnce({
        data: { user: { email_confirmed_at: null, last_sign_in_at: null } }, error: null,
      } as any);

      const result = await service.updateProfile(mockProfile.id, {
        first_name: 'Updated',
        last_name:  'Name',
      });

      expect(result.first_name).toBe('Updated');
      expect(result.full_name).toBe('Updated Name');
    });
  });

  // ── deleteAccount ─────────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('should throw NotFoundError if target does not exist', async () => {
      vi.mocked(profileRepository.findById).mockResolvedValueOnce(null);
      await expect(
        service.deleteAccount('actor-id', 'nonexistent', UserRole.Employee),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError if non-admin tries to delete another user', async () => {
      vi.mocked(profileRepository.findById).mockResolvedValueOnce(mockProfile as any);
      await expect(
        service.deleteAccount('different-actor', mockProfile.id, UserRole.Employee),
      ).rejects.toThrow(AuthorizationError);
    });

    it('should soft-delete account for self-deletion', async () => {
      vi.mocked(profileRepository.findById).mockResolvedValueOnce(mockProfile as any);
      vi.mocked(profileRepository.softDelete).mockResolvedValueOnce(undefined);

      await service.deleteAccount(mockProfile.id, mockProfile.id, UserRole.Employee);
      expect(profileRepository.softDelete).toHaveBeenCalledWith(mockProfile.id);
    });

    it('should hard-delete from auth when actor is SuperAdmin', async () => {
      const adminId = '00000000-0000-0000-0000-000000000099';
      vi.mocked(profileRepository.findById).mockResolvedValueOnce(mockProfile as any);
      vi.mocked(profileRepository.softDelete).mockResolvedValueOnce(undefined);

      const { supabaseAdmin } = await import('../src/config/supabase');
      vi.mocked(supabaseAdmin.auth.admin.deleteUser).mockResolvedValueOnce({
        data: {}, error: null,
      } as any);

      await service.deleteAccount(adminId, mockProfile.id, UserRole.SuperAdmin);
      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith(mockProfile.id);
    });
  });

  // ── listUsers ─────────────────────────────────────────────────────────────

  describe('listUsers', () => {
    it('should return paginated user list', async () => {
      vi.mocked(profileRepository.findAll).mockResolvedValueOnce({
        data:  [mockProfile as any],
        total: 1,
      });

      const result = await service.listUsers({ page: 1, pageSize: 20, sortBy: 'created_at', sortDir: 'desc' });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.hasNextPage).toBe(false);
    });

    it('should compute pagination meta correctly', async () => {
      vi.mocked(profileRepository.findAll).mockResolvedValueOnce({
        data:  Array.from({ length: 20 }, () => mockProfile as any),
        total: 45,
      });

      const result = await service.listUsers({ page: 1, pageSize: 20, sortBy: 'created_at', sortDir: 'desc' });
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(false);
    });
  });

  // ── updateUserRole ────────────────────────────────────────────────────────

  describe('updateUserRole', () => {
    it('should update role and sync to Supabase app_metadata', async () => {
      vi.mocked(profileRepository.findById).mockResolvedValueOnce(mockProfile as any);
      vi.mocked(profileRepository.updateRole).mockResolvedValueOnce({
        ...mockProfile, role: UserRole.Manager,
      } as any);

      const { supabaseAdmin } = await import('../src/config/supabase');
      vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockResolvedValueOnce({
        data: { user: {} }, error: null,
      } as any);
      vi.mocked(supabaseAdmin.auth.admin.getUserById).mockResolvedValueOnce({
        data: { user: { email_confirmed_at: null, last_sign_in_at: null } }, error: null,
      } as any);

      const result = await service.updateUserRole('admin-id', mockProfile.id, {
        role: UserRole.Manager,
      });
      expect(result.role).toBe(UserRole.Manager);
      expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
        mockProfile.id,
        { app_metadata: { role: UserRole.Manager } },
      );
    });
  });
});
