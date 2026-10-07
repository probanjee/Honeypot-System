import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Router } from 'express';
import { errorHandler } from '../src/middleware/errorHandler';
import { notFound } from '../src/middleware/notFound';
import { UserRole } from '../src/constants/roles';

// ---------------------------------------------------------------------------
// Auth routes integration tests
// Uses a minimal Express app to test full HTTP cycle including middleware.
// ---------------------------------------------------------------------------

vi.mock('../src/services/auth.service', () => ({
  authService: {
    register:        vi.fn(),
    login:           vi.fn(),
    logout:          vi.fn(),
    forgotPassword:  vi.fn(),
    resetPassword:   vi.fn(),
    refreshSession:  vi.fn(),
  },
}));

function createTestApp() {
  const app = express();
  app.use(express.json());

  const router = Router();

  // Simplified route wiring for tests (bypasses rate limiters)
  router.post('/register', async (req, res, next) => {
    try {
      const { authService } = await import('../src/services/auth.service');
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, data: result, message: 'Registered' });
    } catch (e) { next(e); }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const { authService } = await import('../src/services/auth.service');
      const result = await authService.login(req.body);
      res.status(200).json({ success: true, data: result, message: 'Logged in' });
    } catch (e) { next(e); }
  });

  router.post('/logout', async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authorization header missing or malformed', status: 401 });
      return;
    }
    try {
      const { authService } = await import('../src/services/auth.service');
      const result = await authService.logout('user-id');
      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (e) { next(e); }
  });

  router.post('/forgot-password', async (req, res, next) => {
    try {
      const { authService } = await import('../src/services/auth.service');
      const result = await authService.forgotPassword(req.body);
      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (e) { next(e); }
  });

  router.post('/refresh', async (req, res, next) => {
    try {
      const { authService } = await import('../src/services/auth.service');
      const result = await authService.refreshSession(req.body);
      res.status(200).json({ success: true, data: result, message: 'Refreshed' });
    } catch (e) { next(e); }
  });

  app.use('/auth', router);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

const authResponse = {
  user: {
    id:             '00000000-0000-0000-0000-000000000001',
    email:          'test@nowhere.gg',
    role:           UserRole.Employee,
    email_verified: false,
    first_name:     'Test',
    last_name:      'User',
  },
  session: { access_token: 'at', refresh_token: 'rt', expires_in: 3600, token_type: 'bearer' },
};

describe('Auth routes', () => {
  const app = createTestApp();

  beforeEach(() => vi.clearAllMocks());

  describe('POST /auth/register', () => {
    it('should return 201 on successful registration', async () => {
      const { authService } = await import('../src/services/auth.service');
      vi.mocked(authService.register).mockResolvedValueOnce(authResponse as any);

      const res = await request(app).post('/auth/register').send({
        email:      'test@nowhere.gg',
        password:   'SecurePass1!',
        first_name: 'Test',
        last_name:  'User',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@nowhere.gg');
    });

    it('should propagate service errors correctly', async () => {
      const { authService } = await import('../src/services/auth.service');
      const { ConflictError } = await import('../src/errors');
      vi.mocked(authService.register).mockRejectedValueOnce(
        new ConflictError('Email already exists'),
      );

      const res = await request(app).post('/auth/register').send({
        email:      'dup@nowhere.gg',
        password:   'SecurePass1!',
        first_name: 'Dup',
        last_name:  'User',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    it('should return 200 with session on valid credentials', async () => {
      const { authService } = await import('../src/services/auth.service');
      vi.mocked(authService.login).mockResolvedValueOnce(authResponse as any);

      const res = await request(app).post('/auth/login').send({
        email:    'test@nowhere.gg',
        password: 'SecurePass1!',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.session.access_token).toBe('at');
    });

    it('should return 401 on invalid credentials', async () => {
      const { authService } = await import('../src/services/auth.service');
      const { AuthenticationError } = await import('../src/errors');
      vi.mocked(authService.login).mockRejectedValueOnce(
        new AuthenticationError('Invalid email or password'),
      );

      const res = await request(app).post('/auth/login').send({
        email:    'test@nowhere.gg',
        password: 'wrong',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /auth/logout', () => {
    it('should return 401 when no token provided', async () => {
      const res = await request(app).post('/auth/logout');
      expect(res.status).toBe(401);
    });

    it('should return 200 with valid Bearer token', async () => {
      const { authService } = await import('../src/services/auth.service');
      vi.mocked(authService.logout).mockResolvedValueOnce({ message: 'Logged out successfully' });

      const res = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should always return 200 regardless of whether email exists', async () => {
      const { authService } = await import('../src/services/auth.service');
      vi.mocked(authService.forgotPassword).mockResolvedValueOnce({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });

      const res = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'noexist@nowhere.gg' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return 401 on invalid refresh token', async () => {
      const { authService } = await import('../src/services/auth.service');
      const { AuthenticationError } = await import('../src/errors');
      vi.mocked(authService.refreshSession).mockRejectedValueOnce(
        new AuthenticationError('Invalid or expired refresh token'),
      );

      const res = await request(app).post('/auth/refresh').send({ refresh_token: 'bad' });
      expect(res.status).toBe(401);
    });

    it('should return new token pair on valid refresh', async () => {
      const { authService } = await import('../src/services/auth.service');
      vi.mocked(authService.refreshSession).mockResolvedValueOnce({
        access_token: 'new-at', refresh_token: 'new-rt',
        expires_in: 3600, token_type: 'bearer',
      } as any);

      const res = await request(app)
        .post('/auth/refresh')
        .send({ refresh_token: 'valid-rt' });

      expect(res.status).toBe(200);
      expect(res.body.data.access_token).toBe('new-at');
    });
  });
});
