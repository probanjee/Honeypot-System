from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.orm.session import HoneypotSession
from datetime import datetime
import uuid


class SessionRepository:
    async def create_session(self, db: AsyncSession, protocol: str, source_ip: str) -> HoneypotSession:
        session_id = str(uuid.uuid4())
        sess = HoneypotSession(
            session_id=session_id,
            protocol=protocol,
            source_ip=source_ip,
            start_time=datetime.utcnow(),
        )
        db.add(sess)
        await db.commit()
        await db.refresh(sess)
        return sess

    async def update_session(
        self,
        db: AsyncSession,
        session_id: str,
        bytes_transferred: int = 0,
        commands_executed: int = 0,
        credentials_captured: str = None,
    ):
        await db.execute(
            update(HoneypotSession)
            .where(HoneypotSession.session_id == session_id)
            .values(
                end_time=datetime.utcnow(),
                bytes_transferred=bytes_transferred,
                commands_executed=commands_executed,
                credentials_captured=credentials_captured,
            )
        )
        await db.commit()

    async def get_active_sessions(self, db: AsyncSession):
        result = await db.execute(
            select(HoneypotSession).where(HoneypotSession.end_time.is_(None))
        )
        return result.scalars().all()
