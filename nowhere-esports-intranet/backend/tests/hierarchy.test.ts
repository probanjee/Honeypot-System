import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import directoryRoutes from '../src/routes/directory.routes';
import { notFound } from '../src/middleware/notFound';
import { errorHandler } from '../src/middleware/errorHandler';
import { supabaseAdmin } from '../src/config/supabase';

vi.mock('../src/middleware/authenticate', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', email: 'test@nowhere.gg', role: 'employee' };
    next();
  },
}));

function createDirectoryApp() {
  const app = express();
  app.use(express.json());
  app.use('/directory', directoryRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

describe('Hierarchy Recursive Traversal RPC Queries', () => {
  const app = createDirectoryApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should retrieve manager hierarchy tree ascending', async () => {
    const mockEmpId = '00000000-0000-0000-0000-000000000005';

    // Mock first profile check, then RPC call
    vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: { id: mockEmpId, employee_id: 'NWE-2026-0005' },
        error: null,
      }),
    } as any);

    vi.mocked(supabaseAdmin.rpc).mockResolvedValueOnce({
      data: [
        { id: 'mgr-1', employee_id: 'NWE-2026-0002', first_name: 'Manager', last_name: 'One', depth: 1 },
      ],
      error: null,
    } as any);

    const res = await request(app)
      .get(`/directory/hierarchy/${mockEmpId}/managers`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].employee_id).toBe('NWE-2026-0002');
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('get_manager_hierarchy', { emp_id: mockEmpId });
  });

  it('should retrieve subordinate reports tree descending', async () => {
    const mockEmpId = '00000000-0000-0000-0000-000000000005';

    vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: { id: mockEmpId, employee_id: 'NWE-2026-0005' },
        error: null,
      }),
    } as any);

    vi.mocked(supabaseAdmin.rpc).mockResolvedValueOnce({
      data: [
        { id: 'sub-1', employee_id: 'NWE-2026-0010', first_name: 'Report', last_name: 'One', depth: 1 },
      ],
      error: null,
    } as any);

    const res = await request(app)
      .get(`/directory/hierarchy/${mockEmpId}/reports`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].employee_id).toBe('NWE-2026-0010');
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('get_reports_hierarchy', { emp_id: mockEmpId });
  });
});
