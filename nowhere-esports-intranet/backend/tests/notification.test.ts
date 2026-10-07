import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import notificationRoutes from '../src/routes/notification.routes';
import { notFound } from '../src/middleware/notFound';
import { errorHandler } from '../src/middleware/errorHandler';
import { supabaseAdmin } from '../src/config/supabase';
import { notificationService } from '../src/services/notification.service';
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
  const app = reportApp();
  return app;
}

function reportApp() {
  const app = express();
  app.use(express.json());
  app.use('/notifications', notificationRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

describe('Notification API Endpoints', () => {
  const app = reportApp();
  const mockId = '00000000-0000-0000-0000-000000000088';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /notifications', () => {
    it('should list notifications for current recipient sorted by priority', async () => {
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValueOnce({
              data: [
                { id: mockId, title: 'Welcome to Intranet', type: 'info', priority: 'medium', created_at: new Date().toISOString() },
                { id: '2', title: 'System Security Alert', type: 'security', priority: 'critical', created_at: new Date().toISOString() },
              ],
              error: null,
            }),
          } as any;
        }
        return {} as any;
      });

      const res = await request(app).get('/notifications');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      // 'critical' priority notification must be sorted to the top
      expect(res.body.data[0].priority).toBe('critical');
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('should return count of unread notifications', async () => {
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockResolvedValueOnce({
              count: 5,
              error: null,
            }),
          } as any;
        }
        return {} as any;
      });

      const res = await request(app).get('/notifications/unread-count');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(5);
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: { id: mockId } }),
            update: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: { id: mockId, read_at: new Date().toISOString() },
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

      const res = await request(app).patch(`/notifications/${mockId}/read`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.read_at).toBeDefined();
    });
  });

  describe('PATCH /notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockResolvedValueOnce({
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

      const res = await request(app).patch('/notifications/read-all');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('marked as read');
    });
  });

  describe('Automatic Notifications Event Router', () => {
    it('should dispatch correct templates for system events', async () => {
      const createMock = vi.fn().mockResolvedValue({ id: 'new-notif-id' });
      vi.spyOn(notificationService, 'triggerNotification').mockImplementation(createMock);

      const recipient = '00000000-0000-0000-0000-000000000001';
      await notificationService.handleEvent('password_changed', recipient);

      expect(createMock).toHaveBeenCalledWith(
        recipient,
        null,
        'Password Updated',
        expect.stringContaining('changed successfully'),
        'security',
        'high',
        null,
        'shield-alert',
        {}
      );
    });
  });
});
