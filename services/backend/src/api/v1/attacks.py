"""
Attack Incident REST Endpoints
Provides cursor-paginated list queries, attack detail retrieval, and signature associations.
"""

import uuid
from typing import List
from fastapi import APIRouter, Depends, Query, Path, status

from ...schemas.attacks import (
    AttackListItemResponse,
    AttackDetailResponse,
    AttackSignatureResponse,
    AttackFilterParams
)
from ...schemas.pagination import PaginatedResponse
from ...services.attack_service import AttackService
from ..dependencies import get_attack_service

router = APIRouter(prefix="/attacks", tags=["Attacks"])


@router.get(
    "",
    response_model=PaginatedResponse[AttackListItemResponse],
    summary="List Attack Incidents with Keyset Pagination",
    description="Query canonical attack incidents with composite keyset pagination, filtering, and stable sorting."
)
async def list_attacks(
    filters: AttackFilterParams = Depends(),
    service: AttackService = Depends(get_attack_service)
) -> PaginatedResponse[AttackListItemResponse]:
    return await service.list_attacks(filters)


@router.get(
    "/{attack_id}",
    response_model=AttackDetailResponse,
    summary="Get Attack Details",
    description="Retrieve full analytical detail for a specific attack, including detection summary and matched signatures."
)
async def get_attack_details(
    attack_id: uuid.UUID = Path(..., description="Unique UUIDv4 identifier of the attack incident"),
    service: AttackService = Depends(get_attack_service)
) -> AttackDetailResponse:
    return await service.get_attack_by_id(attack_id)


@router.get(
    "/{attack_id}/signatures",
    response_model=List[AttackSignatureResponse],
    summary="Get Attack Matched Signatures",
    description="Retrieve the detection rules and signatures matched by a specific attack incident."
)
async def get_attack_signatures(
    attack_id: uuid.UUID = Path(..., description="Unique UUIDv4 identifier of the attack incident"),
    service: AttackService = Depends(get_attack_service)
) -> List[AttackSignatureResponse]:
    return await service.get_attack_signatures(attack_id)
