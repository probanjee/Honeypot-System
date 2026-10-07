const supabase = require('../../config/supabase');
const axios = require('axios');

class SupabaseAdapter {
    async connect() {
        if (!supabase) return false;
        try {
            const res = await axios.get(process.env.SUPABASE_URL, { timeout: 3000 });
            return res.status === 200 || res.status === 404 || res.status === 401;
        } catch {
            return false;
        }
    }
    
    async status() {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            return { connected: false, status: 'unconfigured' };
        }
        if (process.env.USE_SUPABASE !== 'true') {
            return { connected: false, status: 'disabled' };
        }
        try {
            const res = await axios.get(process.env.SUPABASE_URL, { timeout: 3000 });
            if (res.status === 200 || res.status === 404 || res.status === 401) {
                return { connected: true, status: 'connected' };
            }
            return { connected: false, status: 'failed' };
        } catch (err) {
            return { connected: false, status: 'error', error: err.message };
        }
    }
}

module.exports = SupabaseAdapter;
