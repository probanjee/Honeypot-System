"""
Pydantic Schemas for Analytical Aggregations and Dashboard Summaries
"""

from datetime import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class CategoryCount(BaseModel):
    category: str
    count: int


class SignatureCount(BaseModel):
    signature_id: str
    rule_name: str
    category: str
    count: int


class CountryCount(BaseModel):
    country_code: str
    country: str
    count: int


class TimeWindow(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    window_label: str = "custom"


class SummaryAnalyticsResponse(BaseModel):
    total_attacks: int = Field(description="Total canonical attack incidents in the time window")
    distinct_sources_count: int = Field(description="Count of distinct attacking source IP addresses")
    severity_breakdown: Dict[str, int] = Field(
        description="Incident count distributed across INFORMATIONAL, LOW, MEDIUM, HIGH, CRITICAL"
    )
    top_categories: List[CategoryCount] = Field(
        description="Top attack categories ranked by incident volume"
    )
    top_signatures: List[SignatureCount] = Field(
        description="Top matching signature rules ranked by frequency"
    )
    top_countries: List[CountryCount] = Field(
        description="Top attacker source countries (excluding unknown/internal)"
    )
    time_window: TimeWindow
