/// <reference path="../src/types/express.d.ts" />
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express, { Router } from 'express';
import { authenticate } from '../src/middleware/authenticate';
import { errorHandler } from '../src/middleware/errorHandler';
import { notFound } from '../src/middleware/notFound';
import { UserRole } from '../src/constants/roles';

// ---------------------------------------------------------------------------
// authenticate middleware — unit + integration tests
// We build a minimal Express app instead of using createApp() so we can
// mount test routes BEFORE the notFound handler.
// ---------------------------------------------------------------------------

function createAuthTestApp() {
  const app = express();
  app.use(express.json());

  // Protected route
  const testRouter = Router();
  testRouter.get('/protected', authenticate, (req: any, res) => {
    res.json({ success: true, userId: req.user?.id });
  });

  // Role-check route
  testRouter.get('/role-check', authenticate, (req: any, res) => {
    res.json({ success: true, role: req.user?.role });
  });

  app.use('/test', testRouter);

  // 404 and error handler last
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

describe('authenticate middleware', () => {
  const app = createAuthTestApp();

  it('should return 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/test/protected');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/missing or malformed/i);
  });

  it('should return 401 when Authorization header has wrong scheme', async () => {
    const res = await request(app)
      .get('/test/protected')
      .set('Authorization', 'Basic some-token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 when token is invalid', async () => {
    const { supabaseAdmin } = await import('../src/config/supabase');

    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      // @ts-expect-error — testing error path with partial error shape
      error: { message: 'Invalid JWT', name: 'AuthApiError', status: 401 },
    });

    const res = await request(app)
      .get('/test/protected')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });

  it('should return 401 when token is expired', async () => {
    const { supabaseAdmin } = await import('../src/config/supabase');

    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      // @ts-expect-error — testing error path with partial error shape
      error: { message: 'JWT expired', name: 'AuthApiError', status: 401 },
    });

    const res = await request(app)
      .get('/test/protected')
      .set('Authorization', 'Bearer expired-token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should attach user to req and return 200 on valid token', async () => {
    const { supabaseAdmin } = await import('../src/config/supabase');

    const mockUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'test@nowhere.gg',
      app_metadata: { role: UserRole.Employee },
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
    };

    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({
      data: { user: mockUser } as any,
      error: null,
    });

    const res = await request(app)
      .get('/test/protected')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(mockUser.id);
  });

  it('should default to Employee role when app_metadata.role is invalid', async () => {
    const { supabaseAdmin } = await import('../src/config/supabase');

    const mockUser = {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'norole@nowhere.gg',
      app_metadata: { role: 'unknown_role' },
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
    };

    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({
      data: { user: mockUser } as any,
      error: null,
    });

    const res = await request(app)
      .get('/test/role-check')
      .set('Authorization', 'Bearer valid-token-no-role');

    expect(res.status).toBe(200);
    expect(res.body.role).toBe(UserRole.Employee);
  });
});
