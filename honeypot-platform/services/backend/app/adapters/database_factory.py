from app.core.config import settings
from app.adapters.postgres_adapter import PostgresAdapter
from app.adapters.supabase_adapter import SupabaseAdapter

class DatabaseFactory:
    @staticmethod
    def get_adapter():
        if settings.USE_SUPABASE:
            return SupabaseAdapter()
        return PostgresAdapter()
