from sqlalchemy.sql import text
from app.core.database import engine

class PostgresAdapter:
    async def connect(self) -> bool:
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
                return True
        except Exception:
            return False

    async def status(self) -> dict:
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
                return {
                    "connected": True,
                    "status": "connected"
                }
        except Exception as e:
            return {
                "connected": False,
                "status": "error",
                "error": str(e)
            }
