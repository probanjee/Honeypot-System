from supabase import create_client, Client
from app.core.config import settings
import logging

logger = logging.getLogger("supabase-config")
supabase_client: Client | None = None

if settings.USE_SUPABASE:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.error("❌ Supabase configuration error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when USE_SUPABASE is True.")
    else:
        try:
            supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            logger.info("✅ Supabase Client Initialized successfully.")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase client: {e}")
else:
    logger.info("Supabase integration is disabled (USE_SUPABASE=false).")

def get_supabase() -> Client | None:
    return supabase_client
