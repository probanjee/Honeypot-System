"""
API v1 Router Aggregator
Combines health, streaming, attack queries, and analytics routes.
Ensures specific paths (/attacks/stream) are registered before parameter paths (/attacks/{attack_id}).
"""

from fastapi import APIRouter

from .health import router as health_router
from .stream import router as stream_router
from .attacks import router as attacks_router
from .analytics import router as analytics_router

api_v1_router = APIRouter()

api_v1_router.include_router(health_router)
api_v1_router.include_router(stream_router)     # Mounted before attacks_router so /attacks/stream takes precedence
api_v1_router.include_router(attacks_router)
api_v1_router.include_router(analytics_router)
