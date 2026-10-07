import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import dashboardRoutes from '../src/routes/dashboard.routes';
import { notFound } from '../src/middleware/notFound';
import { errorHandler } from '../src/middleware/errorHandler';
import { supabaseAdmin } from '../src/config/supabase';
import { UserRole } from '../src/constants/roles';

// Mock auth middleware
vi.mock('../src/middleware/authenticate', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = {
      id: req.headers['x-test-user-id'] || '00000000-0000-0000-0000-000000000001',
      email: 'test@nowhere.gg',
      role: req.headers['x-test-user-role'] || UserRole.Employee,
    };
    next();
  },
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/dashboard', dashboardRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

describe('Dashboard API Endpoints', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /dashboard', () => {
    it('should return personalized employee dashboard summary in under 200ms', async () => {
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn()
              .mockReturnValueOnce({
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValueOnce({
                  data: { id: 'user-1', department_id: 'dept-1', office_id: 'office-1', role: UserRole.Employee },
                  error: null,
                }),
              })
              .mockResolvedValueOnce({
                data: [
                  { id: 'u-1', first_name: 'John', last_name: 'Doe', birthday: '1990-07-06' }
                ],
                error: null,
              }),
          } as any;
        }
        if (table === 'team_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValueOnce({
              data: [],
              error: null,
            }),
          } as any;
        }
        if (table === 'announcements') {
          const queryMock = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: vi.fn().mockImplementation((resolve) => {
              resolve({
                data: [],
                error: null,
              });
            }),
          };
          return queryMock as any;
        }
        if (table === 'notifications') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValueOnce({
              data: [],
              error: null,
            }),
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq:     vi.fn().mockReturnThis(),
          or:     vi.fn().mockReturnThis(),
          order:  vi.fn().mockReturnThis(),
          range:  vi.fn().mockReturnThis(),
          limit:  vi.fn().mockReturnThis(),
          single:      vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any;
      });

      const startTime = Date.now();
      const res = await request(app)
        .get('/dashboard')
        .set('x-test-user-role', UserRole.Employee);

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (res.status !== 200) {
        console.error('GET /dashboard failed (Employee):', res.body);
      }

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.announcements).toBeDefined();
      expect(res.body.data.notifications).toBeDefined();
      expect(res.body.data.statistics).toBeDefined();

      // Ensure latency target check (<200ms)
      expect(duration).toBeLessThan(200);
    });

    it('should return SuperAdmin statistics and databases health', async () => {
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn()
              .mockReturnValueOnce({
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValueOnce({
                  data: { id: 'admin-1', department_id: 'dept-1', office_id: 'office-1', role: UserRole.SuperAdmin },
                  error: null,
                }),
              })
              .mockResolvedValueOnce({
                data: [],
                error: null,
              }),
          } as any;
        }
        if (table === 'team_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValueOnce({ data: [], error: null }),
          } as any;
        }
        if (table === 'announcements') {
          const queryMock = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: vi.fn().mockImplementation((resolve) => {
              resolve({
                data: [],
                error: null,
              });
            }),
          };
          return queryMock as any;
        }
        if (table === 'notifications') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValueOnce({ data: [], error: null }),
          } as any;
        }
        if (table === 'audit_events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValueOnce({ data: [], error: null }),
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq:     vi.fn().mockReturnThis(),
          or:     vi.fn().mockReturnThis(),
          order:  vi.fn().mockReturnThis(),
          range:  vi.fn().mockReturnThis(),
          limit:  vi.fn().mockReturnThis(),
          single:      vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any;
      });

      const res = await request(app)
        .get('/dashboard')
        .set('x-test-user-role', UserRole.SuperAdmin);

      if (res.status !== 200) {
        console.error('GET /dashboard failed (SuperAdmin):', res.body);
      }

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.statistics.dbHealth).toBe('Healthy');
      expect(res.body.data.statistics.storageUsage).toBe('12.4 GB');
      expect(res.body.data.statistics.realtimeConnections).toBe(45);
    });
  });

  describe('GET /dashboard/widgets', () => {
    it('should return employee dashboard widgets config array', async () => {
      const res = await request(app)
        .get('/dashboard/widgets')
        .set('x-test-user-role', UserRole.Employee);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toContain('announcements');
      expect(res.body.data).toContain('birthdays');
      expect(res.body.data).not.toContain('database_health');
    });

    it('should return SuperAdmin dashboard widgets config array including database health', async () => {
      const res = await request(app)
        .get('/dashboard/widgets')
        .set('x-test-user-role', UserRole.SuperAdmin);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toContain('database_health');
      expect(res.body.data).toContain('storage_usage');
    });
  });
});
