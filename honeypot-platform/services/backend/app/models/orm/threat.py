from sqlalchemy import Column, Integer, String, DateTime, Float, JSON
from app.core.database import Base
from datetime import datetime


class ThreatIntel(Base):
    __tablename__ = "threat_intel"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String, unique=True, index=True)
    abuseipdb_score = Column(Integer, nullable=True)
    abuseipdb_reports = Column(Integer, nullable=True)
    shodan_tags = Column(JSON, nullable=True)
    shodan_ports = Column(JSON, nullable=True)
    virustotal_detections = Column(Integer, nullable=True)
    country = Column(String, nullable=True)
    isp = Column(String, nullable=True)
    is_tor = Column(Integer, default=0)
    is_proxy = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow)
