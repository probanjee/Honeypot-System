from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.repositories.attack_repository import AttackRepository
from app.models.schemas import AttackResponse, AttackList
from typing import Optional

router = APIRouter()
repo = AttackRepository()

@router.get("/", response_model=AttackList)
async def get_attacks(
    skip: int = 0,
    limit: int = 20,
    type: Optional[str] = None,
    ip: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    attacks, total = await repo.get_attacks_with_filters(db, skip, limit, type, ip)
    return {"items": attacks, "total": total}

@router.get("/{id}", response_model=AttackResponse)
async def get_attack(id: int, db: AsyncSession = Depends(get_db)):
    attack = await repo.get_attack_by_id(db, id)
    if not attack:
        raise HTTPException(status_code=404, detail="Attack not found")
    return attack

@router.post("/mitigate")
async def mitigate_attack(ip: str):
    # Mock firewall block
    return {"status": "success", "message": f"IP {ip} blocked via firewall"}
