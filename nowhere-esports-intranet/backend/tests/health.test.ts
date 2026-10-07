import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app/app';

// ---------------------------------------------------------------------------
// Health endpoints — integration tests using supertest
// ---------------------------------------------------------------------------

describe('Health Endpoints', () => {
  const app = createApp();

  describe('GET /health', () => {
    it('should return 200 with success=true', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        status: 'ok',
        environment: 'test',
      });
      expect(res.body.data).toHaveProperty('uptime');
      expect(res.body.data).toHaveProperty('timestamp');
      expect(res.body.data).toHaveProperty('version');
    });

    it('should return the standard success envelope shape', async () => {
      const res = await request(app).get('/health');

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('GET /health/database', () => {
    it('should return 200 when database is healthy', async () => {
      // setup.ts mock already returns { data: null, error: null }
      const res = await request(app).get('/health/database');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        status: 'healthy',
        provider: 'supabase',
      });
      expect(res.body.data).toHaveProperty('latencyMs');
    });

    it('should return 503 when database is unhealthy', async () => {
      const { supabaseAdmin } = await import('../src/config/supabase');

      vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: null,
              error: { message: 'Connection refused', code: '08001' },
            }),
          }),
        }),
      } as any);

      const res = await request(app).get('/health/database');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /health/auth', () => {
    it('should return 200 when auth service is healthy', async () => {
      const { supabaseAdmin } = await import('../src/config/supabase');

      vi.mocked(supabaseAdmin.auth.admin.listUsers).mockResolvedValueOnce({
        data: { users: [], aud: '' },
        error: null,
      } as any);

      const res = await request(app).get('/health/auth');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({ status: 'healthy' });
    });

    it('should return 503 when auth service is unhealthy', async () => {
      const { supabaseAdmin } = await import('../src/config/supabase');

      vi.mocked(supabaseAdmin.auth.admin.listUsers).mockResolvedValueOnce({
        data: { users: [], aud: '' },
        error: { message: 'Auth service unavailable' } as any,
      } as any);

      const res = await request(app).get('/health/auth');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
    });
  });

  describe('404 — Unknown routes', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/v1/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body).toHaveProperty('status', 404);
    });
  });
});
