import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import announcementRoutes from '../src/routes/announcement.routes';
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
  app.use('/announcements', announcementRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

describe('Announcement API Endpoints', () => {
  const app = createApp();
  const mockId = '00000000-0000-0000-0000-000000000099';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /announcements', () => {
    it('should allow employees to fetch visible announcements', async () => {
      // Mock profiles selection
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: { id: 'user-1', department_id: 'dept-1', office_id: 'office-1', role: UserRole.Employee },
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
                data: [
                  {
                    id: mockId,
                    title: 'Welcome to Esports',
                    slug: 'welcome-to-esports-123',
                    content: 'Test content',
                    visibility: 'company',
                    status: 'published',
                    expire_at: null,
                  },
                ],
                error: null,
              });
            }),
          };
          return queryMock as any;
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
        .get('/announcements')
        .set('x-test-user-role', UserRole.Employee);

      if (res.status !== 200) {
        console.error('GET /announcements failed:', res.body);
      }

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Welcome to Esports');
    });
  });

  describe('POST /announcements', () => {
    it('should block employees from creating announcements', async () => {
      const res = await request(app)
        .post('/announcements')
        .set('x-test-user-role', UserRole.Employee)
        .send({
          title: 'New Announcement',
          slug: 'new-announcement',
          content: 'Important info',
        });

      expect(res.status).toBe(403);
    });

    it('should allow HR to create announcements', async () => {
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'announcements') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: { id: mockId, title: 'New HR Policy', slug: 'new-hr-policy-xyz', content: 'Testing content' },
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

      const res = await request(app)
        .post('/announcements')
        .set('x-test-user-role', UserRole.HR)
        .send({
          title: 'New HR Policy',
          slug: 'new-hr-policy',
          content: 'Testing content',
          category: 'hr',
          priority: 'high',
          visibility: 'company',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('New HR Policy');
    });
  });

  describe('POST /announcements/:id/pin', () => {
    it('should allow HR to pin an announcement', async () => {
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'announcements') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: { id: mockId, title: 'HR Policy' },
              error: null,
            }),
            update: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: { id: mockId, pinned: true },
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

      const res = await request(app)
        .post(`/announcements/${mockId}/pin`)
        .set('x-test-user-role', UserRole.HR)
        .send({ pinned: true });

      expect(res.status).toBe(200);
      expect(res.body.data.pinned).toBe(true);
    });
  });

  describe('POST /announcements/:id/read', () => {
    it('should track announcement reads', async () => {
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'announcement_reads') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
            insert: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: { announcement_id: mockId, profile_id: 'user-1', opened: true },
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

      const res = await request(app)
        .post(`/announcements/${mockId}/read`)
        .send({ opened: true, read_time: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.opened).toBe(true);
    });
  });
});
