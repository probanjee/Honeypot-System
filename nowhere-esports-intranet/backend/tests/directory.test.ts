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

describe('Employee Directory Search API Routing & Filters', () => {
  const app = createDirectoryApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should query view with pagination and clean results', async () => {
    vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValueOnce({
        data: [
          { id: '1', full_name: 'Alex Johnson', email: 'alex@nowhere.gg', employee_id: 'NWE-2026-0001' },
        ],
        count: 1,
        error: null,
      } as any),
    } as any);

    const res = await request(app)
      .get('/directory/search')
      .query({ q: 'Alex', page: 1, limit: 10 });

    if (res.status !== 200) {
      console.error('Directory search failed:', res.body);
    }

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].full_name).toBe('Alex Johnson');
    expect(res.body.total).toBe(1);
  });

  it('should support department and office query filtering', async () => {
    const fromMock = vi.fn().mockReturnThis();
    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const orMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockReturnThis();
    const rangeMock = vi.fn().mockResolvedValueOnce({
      data: [],
      count: 0,
      error: null,
    } as any);

    vi.mocked(supabaseAdmin.from).mockImplementation(() => {
      return {
        select: selectMock,
        eq: eqMock,
        or: orMock,
        order: orderMock,
        range: rangeMock,
      } as any;
    });

    const res = await request(app)
      .get('/directory/search')
      .query({ department: 'HR', office: 'London', status: 'active' });

    expect(res.status).toBe(200);
    expect(eqMock).toHaveBeenCalledWith('employee_status', 'active');
    expect(orMock).toHaveBeenCalledWith('department_code.eq.HR,department_name.ilike.%HR%');
    expect(orMock).toHaveBeenCalledWith('office_name.ilike.%London%,office_city.ilike.%London%');
  });
});
