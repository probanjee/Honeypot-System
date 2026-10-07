/// <reference path="../src/types/express.d.ts" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Router } from 'express';
import { authenticate } from '../src/middleware/authenticate';
import { requireSelfOrAdmin, requireAdmin } from '../src/permissions/guards';
import { errorHandler } from '../src/middleware/errorHandler';
import { notFound } from '../src/middleware/notFound';
import { UserRole } from '../src/constants/roles';
import { supabaseAdmin } from '../src/config/supabase';

// ---------------------------------------------------------------------------
// User routes integration tests — focuses on auth guard behaviour
// ---------------------------------------------------------------------------

vi.mock('../src/services/user.service', () => ({
  userService: {
    getProfile:    vi.fn(),
    updateProfile: vi.fn(),
    deleteAccount: vi.fn(),
    listUsers:     vi.fn(),
    updateUserRole: vi.fn(),
    updateUserStatus: vi.fn(),
  },
}));

function makeUser(id: string, role: UserRole) {
  return {
    id,
    email:          `${id}@test.com`,
    role,
    email_verified: true,
    app_metadata:   { role },
    user_metadata:  {},
  };
}

function createTestApp() {
  const app = express();
  app.use(express.json());

  const apiRouter = Router();

  // GET /me
  apiRouter.get('/me', authenticate, async (req: any, res, next) => {
    try {
      const { userService } = await import('../src/services/user.service');
      const data = await userService.getProfile(req.user!.id);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  });

  // GET /:id with self-or-admin guard
  apiRouter.get('/:id', authenticate, requireSelfOrAdmin(), async (req: any, res, next) => {
    try {
      const { userService } = await import('../src/services/user.service');
      const data = await userService.getProfile(req.params['id']!);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  });

  // DELETE /:id
  apiRouter.delete('/:id', authenticate, requireSelfOrAdmin(), async (req: any, res, next) => {
    try {
      const { userService } = await import('../src/services/user.service');
      await userService.deleteAccount(req.user!.id, req.params['id']!, req.user!.role);
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  // Admin list
  apiRouter.get('/admin/users', authenticate, requireAdmin(), async (req: any, res, next) => {
    try {
      const { userService } = await import('../src/services/user.service');
      const data = await userService.listUsers({} as any);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  });

  app.use('/users', apiRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

function mockAuth(userId: string, role: UserRole) {
  vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
    data: {
      user: {
        id:                 userId,
        email:              `${userId}@test.com`,
        app_metadata:       { role },
        user_metadata:      {},
        email_confirmed_at: new Date().toISOString(),
        last_sign_in_at:    null,
      } as any,
    },
    error: null,
  });
}

const USER_ID  = '00000000-0000-0000-0000-000000000001';
const OTHER_ID = '00000000-0000-0000-0000-000000000002';

const mockProfileDto = {
  id:            USER_ID,
  email:         'test@test.com',
  first_name:    'Test',
  last_name:     'User',
  full_name:     'Test User',
  role:          UserRole.Employee,
  status:        'active',
  timezone:      'UTC',
  avatar_url:    null,
  department_id: null,
  phone:         null,
  employee_id:   null,
  designation:   null,
  email_verified:  true,
  last_sign_in_at: null,
  created_at:    new Date().toISOString(),
  updated_at:    new Date().toISOString(),
};

describe('User routes', () => {
  const app = createTestApp();

  beforeEach(() => vi.clearAllMocks());

  describe('GET /users/me', () => {
    it('should return 401 when no auth token provided', async () => {
      const res = await request(app).get('/users/me');
      expect(res.status).toBe(401);
    });

    it('should return 200 with profile for authenticated user', async () => {
      mockAuth(USER_ID, UserRole.Employee);
      const { userService } = await import('../src/services/user.service');
      vi.mocked(userService.getProfile).mockResolvedValueOnce(mockProfileDto as any);

      const res = await request(app)
        .get('/users/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('test@test.com');
    });
  });

  describe('GET /users/:id', () => {
    it('should allow users to view their own profile', async () => {
      mockAuth(USER_ID, UserRole.Employee);
      const { userService } = await import('../src/services/user.service');
      vi.mocked(userService.getProfile).mockResolvedValueOnce(mockProfileDto as any);

      const res = await request(app)
        .get(`/users/${USER_ID}`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 403 when user tries to view another user\'s profile', async () => {
      mockAuth(USER_ID, UserRole.Employee);

      const res = await request(app)
        .get(`/users/${OTHER_ID}`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
    });

    it('should allow admin to view any profile', async () => {
      mockAuth(USER_ID, UserRole.Administrator);
      const { userService } = await import('../src/services/user.service');
      vi.mocked(userService.getProfile).mockResolvedValueOnce({
        ...mockProfileDto, id: OTHER_ID,
      } as any);

      const res = await request(app)
        .get(`/users/${OTHER_ID}`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should allow self-deletion', async () => {
      mockAuth(USER_ID, UserRole.Employee);
      const { userService } = await import('../src/services/user.service');
      vi.mocked(userService.deleteAccount).mockResolvedValueOnce(undefined);

      const res = await request(app)
        .delete(`/users/${USER_ID}`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 403 when employee tries to delete another user', async () => {
      mockAuth(USER_ID, UserRole.Employee);

      const res = await request(app)
        .delete(`/users/${OTHER_ID}`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
    });
  });
});
