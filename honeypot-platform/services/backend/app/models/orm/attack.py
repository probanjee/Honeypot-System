from sqlalchemy import Column, Integer, String, DateTime, Float, JSON
from app.core.database import Base
from datetime import datetime

class Attack(Base):
    __tablename__ = "attacks"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    source_ip = Column(String, index=True)
    source_port = Column(Integer)
    protocol = Column(String)
    attack_type = Column(String)
    payload = Column(String)
    severity = Column(Integer)
    geo_country = Column(String)
    geo_city = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    headers = Column(JSON)
    signatures = Column(JSON)
