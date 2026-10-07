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
process.env['SUPABASE_URL']             = 'https://test.supabase.co';
process.env['SUPABASE_ANON_KEY']        = 'test-anon-key';
process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key';
process.env['SUPABASE_JWT_SECRET']      = 'test-jwt-secret';
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
    auth: {
      getUser: vi.fn(),
    },
  },
}));
