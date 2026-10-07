import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../src/services/auth.service';
import { profileRepository } from '../src/repositories/profile.repository';
import { UserRole } from '../src/constants/roles';
import { ConflictError, AuthenticationError, DatabaseError } from '../src/errors';

// ---------------------------------------------------------------------------
// AuthService unit tests — all Supabase calls are mocked via setup.ts
// ---------------------------------------------------------------------------

vi.mock('../src/repositories/profile.repository', () => ({
  profileRepository: {
    findByEmail: vi.fn(),
    create:      vi.fn(),
    findById:    vi.fn(),
  },
}));

vi.mock('../src/services/audit.service', () => ({
  auditService: { log: vi.fn() },
}));

const mockProfile = {
  id:          '00000000-0000-0000-0000-000000000001',
  email:       'test@nowhere.gg',
  first_name:  'Test',
  last_name:   'User',
  role:        UserRole.Employee,
  status:      'active',
  timezone:    'UTC',
  avatar_url:  null,
  department_id: null,
  phone:       null,
  employee_id: null,
  designation: null,
  created_at:  new Date().toISOString(),
  updated_at:  new Date().toISOString(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new AuthService();
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('should throw ConflictError if email already exists', async () => {
      vi.mocked(profileRepository.findByEmail).mockResolvedValueOnce(mockProfile as any);

      await expect(
        service.register({
          email:      'test@nowhere.gg',
          password:   'SecurePass1!',
          first_name: 'Test',
          last_name:  'User',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('should throw DatabaseError when Supabase createUser fails', async () => {
      vi.mocked(profileRepository.findByEmail).mockResolvedValueOnce(null);

      const { supabaseAdmin } = await import('../src/config/supabase');
      vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Auth service error', name: 'AuthApiError', status: 500 },
      } as any);

      await expect(
        service.register({
          email:      'new@nowhere.gg',
          password:   'SecurePass1!',
          first_name: 'New',
          last_name:  'User',
        }),
      ).rejects.toThrow(DatabaseError);
    });

    it('should register successfully and return AuthResponseDto', async () => {
      vi.mocked(profileRepository.findByEmail).mockResolvedValueOnce(null);
      vi.mocked(profileRepository.create).mockResolvedValueOnce(mockProfile as any);

      const { supabaseAdmin } = await import('../src/config/supabase');
      const mockUser = {
        id: mockProfile.id, email: mockProfile.email,
        app_metadata: { role: UserRole.Employee },
        email_confirmed_at: null, last_sign_in_at: null,
      };

      vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValueOnce({
        data: { user: mockUser }, error: null,
      } as any);

      vi.mocked(supabaseAdmin.auth.signInWithPassword).mockResolvedValueOnce({
        data: {
          user: mockUser,
          session: {
            access_token:  'at', refresh_token: 'rt',
            expires_in: 3600, token_type: 'bearer',
          },
        },
        error: null,
      } as any);

      const result = await service.register({
        email:      'test@nowhere.gg',
        password:   'SecurePass1!',
        first_name: 'Test',
        last_name:  'User',
      });

      expect(result.user.email).toBe('test@nowhere.gg');
      expect(result.user.role).toBe(UserRole.Employee);
      expect(result.session.access_token).toBe('at');
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should throw AuthenticationError on invalid credentials', async () => {
      const { supabaseAdmin } = await import('../src/config/supabase');
      vi.mocked(supabaseAdmin.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', name: 'AuthApiError', status: 400 },
      } as any);

      await expect(
        service.login({ email: 'test@nowhere.gg', password: 'wrong' }),
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for inactive account', async () => {
      const { supabaseAdmin } = await import('../src/config/supabase');
      vi.mocked(supabaseAdmin.auth.signInWithPassword).mockResolvedValueOnce({
        data: {
          user: { id: mockProfile.id, email: mockProfile.email, app_metadata: {} },
          session: { access_token: 'at', refresh_token: 'rt', expires_in: 3600 },
        },
        error: null,
      } as any);

      vi.mocked(profileRepository.findById).mockResolvedValueOnce({
        ...mockProfile, status: 'inactive',
      } as any);

      await expect(
        service.login({ email: 'test@nowhere.gg', password: 'SecurePass1!' }),
      ).rejects.toThrow(AuthenticationError);
    });

    it('should return AuthResponseDto on valid login', async () => {
      const { supabaseAdmin } = await import('../src/config/supabase');
      const mockUser = {
        id: mockProfile.id, email: mockProfile.email,
        app_metadata: { role: UserRole.Employee },
        email_confirmed_at: new Date().toISOString(),
      };

      vi.mocked(supabaseAdmin.auth.signInWithPassword).mockResolvedValueOnce({
        data: {
          user: mockUser,
          session: { access_token: 'at', refresh_token: 'rt', expires_in: 3600, token_type: 'bearer' },
        },
        error: null,
      } as any);

      vi.mocked(profileRepository.findById).mockResolvedValueOnce(mockProfile as any);

      const result = await service.login({ email: 'test@nowhere.gg', password: 'SecurePass1!' });
      expect(result.user.email).toBe('test@nowhere.gg');
      expect(result.session.access_token).toBe('at');
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('should always return success message (anti-enumeration)', async () => {
      const { supabaseAdmin } = await import('../src/config/supabase');
      vi.mocked(supabaseAdmin.auth.admin.generateLink).mockResolvedValueOnce({
        data: {}, error: null,
      } as any);

      const result = await service.forgotPassword({ email: 'noexist@nowhere.gg' });
      expect(result.message).toMatch(/if an account/i);
    });

    it('should return success even when generateLink fails (anti-enumeration)', async () => {
      const { supabaseAdmin } = await import('../src/config/supabase');
      vi.mocked(supabaseAdmin.auth.admin.generateLink).mockResolvedValueOnce({
        data: {}, error: { message: 'User not found', name: 'AuthApiError', status: 404 },
      } as any);

      const result = await service.forgotPassword({ email: 'noexist@nowhere.gg' });
      expect(result.message).toMatch(/if an account/i);
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should call signOut and return success message', async () => {
      const { supabaseAdmin } = await import('../src/config/supabase');
      vi.mocked(supabaseAdmin.auth.admin.signOut).mockResolvedValueOnce({ error: null } as any);

      const result = await service.logout(mockProfile.id);
      expect(result.message).toMatch(/logged out/i);
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  describe('refreshSession', () => {
    it('should throw AuthenticationError on invalid refresh token', async () => {
      const { supabaseAdmin } = await import('../src/config/supabase');
      vi.mocked(supabaseAdmin.auth.refreshSession).mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: 'Invalid refresh token', name: 'AuthApiError', status: 401 },
      } as any);

      await expect(
        service.refreshSession({ refresh_token: 'bad-token' }),
      ).rejects.toThrow(AuthenticationError);
    });

    it('should return new token pair on valid refresh', async () => {
      const { supabaseAdmin } = await import('../src/config/supabase');
      vi.mocked(supabaseAdmin.auth.refreshSession).mockResolvedValueOnce({
        data: {
          user: { id: mockProfile.id },
          session: { access_token: 'new-at', refresh_token: 'new-rt', expires_in: 3600 },
        },
        error: null,
      } as any);

      const result = await service.refreshSession({ refresh_token: 'valid-rt' });
      expect(result.access_token).toBe('new-at');
      expect(result.refresh_token).toBe('new-rt');
    });
  });
});
