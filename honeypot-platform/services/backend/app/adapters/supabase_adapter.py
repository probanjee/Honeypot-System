import httpx
from app.core.config import settings

class SupabaseAdapter:
    async def connect(self) -> bool:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            return False
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(settings.SUPABASE_URL, timeout=3.0)
                return res.status_code in (200, 404, 401)
        except Exception:
            return False

    async def status(self) -> dict:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            return {
                "connected": False,
                "status": "unconfigured"
            }
        if not settings.USE_SUPABASE:
            return {
                "connected": False,
                "status": "disabled"
            }
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(settings.SUPABASE_URL, timeout=3.0)
                if res.status_code in (200, 404, 401):
                    return {
                        "connected": True,
                        "status": "connected"
                    }
                return {
                    "connected": False,
                    "status": "failed",
                    "code": res.status_code
                }
        except Exception as e:
            return {
                "connected": False,
                "status": "error",
                "error": str(e)
            }
