"""
Pagination Pydantic Schemas for Keyset / Cursor Pagination
"""

from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T] = Field(description="List of records for the current page")
    next_cursor: Optional[str] = Field(
        default=None,
        description="Opaque HMAC-signed cursor to pass in subsequent query to fetch next page"
    )
    has_more: bool = Field(description="True if more records exist after this page")
    limit: int = Field(description="Effective page size limit applied to this query")
