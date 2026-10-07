const MongoDBAdapter = require('./mongodb.adapter');
const SupabaseAdapter = require('./supabase.adapter');

class DatabaseFactory {
    static getAdapter() {
        const useSupabase = process.env.USE_SUPABASE === 'true';
        if (useSupabase) {
            return new SupabaseAdapter();
        }
        return new MongoDBAdapter();
    }
}

module.exports = DatabaseFactory;
