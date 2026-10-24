import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Global test setup — runs before every test suite.
//
// Sets up environment variables and mocks Supabase so tests never make
// real network calls to the Supabase service.
// ---------------------------------------------------------------------------

// ── Set test environment variables ────────────────────────────────────────
process.env['NODE_ENV']                 = 'test';
process.env['PORT']                     = '3099';
process.env['DATABASE_URL']             = 'postgresql://user:password@localhost:5432/honeypot';
process.env['JWT_SECRET']               = 'test-jwt-secret-at-least-32-chars-long';
process.env['ALLOWED_ORIGINS']          = 'http://localhost:5173';
process.env['LOG_LEVEL']                = 'silent';
process.env['LOG_PRETTY']               = 'false';

// ── Mock Supabase clients ─────────────────────────────────────────────────
vi.mock('../src/config/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      refreshSession: vi.fn(),
      exchangeCodeForSession: vi.fn(),
      admin: {
        createUser:     vi.fn(),
        updateUserById: vi.fn(),
        deleteUser:     vi.fn(),
        getUserById:    vi.fn(),
        listUsers:      vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
        generateLink:   vi.fn(),
        signOut:        vi.fn(),
      },
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      neq:    vi.fn().mockReturnThis(),
      is:     vi.fn().mockReturnThis(),
      in:     vi.fn().mockReturnThis(),
      gte:    vi.fn().mockReturnThis(),
      lte:    vi.fn().mockReturnThis(),
      or:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      range:  vi.fn().mockReturnThis(),
      limit:  vi.fn().mockReturnThis(),
      single:      vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    rpc: vi.fn(),
  },
  supabaseUser: {
    from: vi.fn(),
  },
}));

// ── Mock PostgreSQL pool and UserRepository ──────────────────────────────
vi.mock('../src/database/pool', () => ({
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    }),
    on: vi.fn(),
  },
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  withTransaction: vi.fn((cb: any) => cb({ query: vi.fn() })),
  checkDatabaseHealth: vi.fn().mockResolvedValue(true),
}));

vi.mock('../src/repositories/user.repository', () => ({
  userRepository: {
    findById: vi.fn().mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'test@nowhere.gg',
      password_hash: '$2a$10$eWkZ0y3qgVj1Z2rT/1W96u5Qh5xG.T0E.Rz5WjH1sL7bA1k2y3z4.',
      role: 'employee',
      first_name: 'Test',
      last_name: 'User',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    }),
    findByEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((u: any) =>
      Promise.resolve({
        id: '00000000-0000-0000-0000-000000000001',
        email: u.email,
        password_hash: u.passwordHash,
        role: u.role,
        first_name: u.firstName || '',
        last_name: u.lastName || '',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }),
    ),
    updatePassword: vi.fn().mockResolvedValue(undefined),
  },
}));

