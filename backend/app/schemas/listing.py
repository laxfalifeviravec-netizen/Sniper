import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ListingOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    source: str
    external_id: str
    url: str
    title: str
    make: str | None
    model: str | None
    year: int | None
    mileage: int | None
    price: float | None
    location: str | None
    color: str | None
    transmission: str | None
    engine: str | None
    seller_notes: str | None
    images: list[str]
    auction_end: datetime | None
    is_active: bool
    stories_flag: bool
    options: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class ListingFilters(BaseModel):
    make: str | None = None
    model: str | None = None
    year_min: int | None = Field(default=None, ge=1900, le=2030)
    year_max: int | None = Field(default=None, ge=1900, le=2030)
    mileage_max: int | None = Field(default=None, ge=0)
    price_min: float | None = Field(default=None, ge=0)
    price_max: float | None = Field(default=None, ge=0)
    color: str | None = None
    transmission: str | None = None
    source: str | None = None
    exclude_stories: bool = False
    search: str | None = None
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)


class ListingPage(BaseModel):
    items: list[ListingOut]
    total: int
    page: int
    per_page: int
    pages: int


class SourceStat(BaseModel):
    source: str
    count: int
    active_count: int


class ListingStats(BaseModel):
    total_listings: int
    active_listings: int
    new_today: int
    ending_today: int
    by_source: list[SourceStat]
