from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.repositories.attack_repository import AttackRepository
from fastapi import Depends
import asyncio
import json
from datetime import datetime

router = APIRouter()

# ── WebSocket broadcast manager is imported from websocket module ─────────────
from app.api.websocket import manager


# ── GET /api/v1/logs/stream  – WebSocket alias kept for REST clients ──────────
@router.get("/stream")
async def log_stream_info():
    return {"info": "Connect via WebSocket at /ws/live for real-time log streaming"}


# ── POST /api/v1/logs/search – Full-text search over payloads ─────────────────
class SearchRequest:
    pass

from pydantic import BaseModel
from typing import Optional

class LogSearchBody(BaseModel):
    query: str
    limit: Optional[int] = 50
    severity_min: Optional[int] = None
    attack_type: Optional[str] = None


@router.post("/search")
async def search_logs(body: LogSearchBody, db: AsyncSession = Depends(get_db)):
    repo = AttackRepository()
    results = await repo.search_attacks(db, body.query, body.limit, body.severity_min, body.attack_type)
    return {"results": results, "count": len(results)}
