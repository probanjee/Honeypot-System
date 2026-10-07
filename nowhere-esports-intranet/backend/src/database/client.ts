// ---------------------------------------------------------------------------
// Database client re-exports.
// All database access goes through this single module — never import
// directly from config/supabase.ts outside of this layer.
// ---------------------------------------------------------------------------

export { supabaseAdmin, supabaseUser } from '../config/supabase';
