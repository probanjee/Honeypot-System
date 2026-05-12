from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.repositories.attack_repository import AttackRepository

router = APIRouter()
repo = AttackRepository()

@router.get("/summary")
async def get_summary(db: AsyncSession = Depends(get_db)):
    stats = await repo.get_attack_stats(db)
    return stats

@router.get("/timeseries")
async def get_timeseries(db: AsyncSession = Depends(get_db)):
    data = await repo.get_attack_stats_by_hour(db)
    return data
