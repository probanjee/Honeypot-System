from sqlalchemy import Column, Integer, String, DateTime, BigInteger
from app.core.database import Base
from datetime import datetime


class HoneypotSession(Base):
    __tablename__ = "honeypot_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    protocol = Column(String)
    source_ip = Column(String, index=True)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    bytes_transferred = Column(BigInteger, default=0)
    commands_executed = Column(Integer, default=0)
    credentials_captured = Column(String, nullable=True)
