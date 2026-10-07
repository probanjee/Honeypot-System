import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

// ---------------------------------------------------------------------------
// Supabase client factory.
//
// Two clients are exposed:
//   supabaseAdmin  — Service Role key. Bypasses RLS. NEVER send to frontend.
//   supabaseUser   — Anon key. Respects RLS. Safe for user-context operations.
//
// SECURITY: The SERVICE_ROLE_KEY is read directly from env here and is never
// re-exported or included in any API response.
// ---------------------------------------------------------------------------

let _adminClient: SupabaseClient | null = null;
let _userClient: SupabaseClient | null = null;

function createAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient;

  _adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'X-Client-Info': 'nowhere-esports-backend-admin' },
    },
  });

  return _adminClient;
}

function createUserClient(): SupabaseClient {
  if (_userClient) return _userClient;

  _userClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'X-Client-Info': 'nowhere-esports-backend-user' },
    },
  });

  return _userClient;
}

export const supabaseAdmin: SupabaseClient = createAdminClient();
export const supabaseUser: SupabaseClient = createUserClient();
