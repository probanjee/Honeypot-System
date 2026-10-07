import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import employeeRoutes from '../src/routes/employee.routes';
import { notFound } from '../src/middleware/notFound';
import { errorHandler } from '../src/middleware/errorHandler';
import { supabaseAdmin } from '../src/config/supabase';
import { UserRole } from '../src/constants/roles';
import { AuditAction } from '../src/types/audit';
import { auditRepository } from '../src/repositories/audit.repository';

// Mock auth middleware to easily simulate different roles
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

// Mock audit repository to prevent database insert attempts in logs
vi.mock('../src/repositories/audit.repository', () => ({
  auditRepository: {
    log: vi.fn().mockResolvedValue({}),
  },
}));

const mockEmpId = '00000000-0000-0000-0000-000000000005';

function createEmployeeApp() {
  const app = express();
  app.use(express.json());
  app.use('/employees', employeeRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

describe('Employee Module API Routing & Service Integration', () => {
  const app = createEmployeeApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /employees/:id', () => {
    it('should allow employees to view their own file', async () => {
      // Mock repository fetches
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: { id: mockEmpId, employee_id: 'NWE-2026-0001', profiles: { id: mockEmpId, first_name: 'Alex' } },
              error: null,
            }),
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any;
      });

      const res = await request(app)
        .get(`/employees/${mockEmpId}`)
        .set('x-test-user-id', mockEmpId)
        .set('x-test-user-role', UserRole.Employee);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employee_id).toBe('NWE-2026-0001');
    });

    it('should block employees from viewing another employee file', async () => {
      const res = await request(app)
        .get(`/employees/${mockEmpId}`)
        .set('x-test-user-id', 'different-user-uuid')
        .set('x-test-user-role', UserRole.Employee);

      expect(res.status).toBe(403); // AuthorizationError maps to 403
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('should allow HR to view any employee file', async () => {
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: { id: mockEmpId, employee_id: 'NWE-2026-0001', profiles: { first_name: 'Alex' } },
              error: null,
            }),
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any;
      });

      const res = await request(app)
        .get(`/employees/${mockEmpId}`)
        .set('x-test-user-id', 'hr-user-uuid')
        .set('x-test-user-role', UserRole.HR);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /employees', () => {
    it('should allow HR to create new employee file and record audit trail', async () => {
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: { id: mockEmpId, email: 'alex@nowhere.gg', first_name: 'Alex' },
              error: null,
            }),
          } as any;
        }
        if (table === 'employees') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: { id: mockEmpId, employee_id: 'NWE-2026-0005', status: 'active' },
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

      const newEmpPayload = {
        id: mockEmpId,
        email: 'alex@nowhere.gg',
        first_name: 'Alex',
        last_name: 'Smith',
        role: UserRole.Employee,
      };

      const res = await request(app)
        .post('/employees')
        .set('x-test-user-role', UserRole.HR)
        .send(newEmpPayload);

      if (res.status !== 201) {
        console.error('POST /employees failed:', res.body);
      }

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employee_id).toBe('NWE-2026-0005');

      // Verify fire-and-forget log registered
      expect(auditRepository.log).toHaveBeenCalled();
    });

    it('should block non-HR from creating new employee file', async () => {
      const res = await request(app)
        .post('/employees')
        .set('x-test-user-role', UserRole.Employee)
        .send({ id: mockEmpId });

      expect(res.status).toBe(403); // requireMinimumRole guard checks role
    });
  });
});
