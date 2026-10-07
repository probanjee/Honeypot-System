const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const useSupabase = process.env.USE_SUPABASE === 'true';

let supabase = null;

if (useSupabase) {
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌  Supabase configuration error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when USE_SUPABASE is true.');
    } else {
        try {
            const key = supabaseServiceKey;
            supabase = createClient(supabaseUrl, key, {
                auth: {
                    persistSession: false
                }
            });
            console.log('✅  Supabase Client Initialized.');
        } catch (err) {
            console.error('❌  Failed to initialize Supabase client:', err.message);
        }
    }
} else {
    console.log('ℹ️  Supabase integration is disabled (USE_SUPABASE=false).');
}

module.exports = supabase;
