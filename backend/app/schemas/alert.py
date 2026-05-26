import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.listing import ListingOut

VALID_SOURCES = {"bat", "cars_and_bids", "pcarmarket", "ebay"}
VALID_TRANSMISSIONS = {"manual", "automatic", "other"}


class AlertBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    makes: list[str] = Field(default_factory=list)
    models: list[str] = Field(default_factory=list)
    year_min: int | None = Field(default=None, ge=1900, le=2030)
    year_max: int | None = Field(default=None, ge=1900, le=2030)
    mileage_max: int | None = Field(default=None, ge=0)
    price_min: float | None = Field(default=None, ge=0)
    price_max: float | None = Field(default=None, ge=0)
    colors: list[str] = Field(default_factory=list)
    transmissions: list[str] = Field(default_factory=list)
    exclude_stories: bool = False
    required_options: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)
    notify_email: bool = True
    notify_sms: bool = False

    @model_validator(mode="after")
    def validate_year_range(self) -> "AlertBase":
        if self.year_min and self.year_max and self.year_min > self.year_max:
            raise ValueError("year_min must be <= year_max")
        if self.price_min and self.price_max and self.price_min > self.price_max:
            raise ValueError("price_min must be <= price_max")
        if self.transmissions:
            invalid = set(self.transmissions) - VALID_TRANSMISSIONS
            if invalid:
                raise ValueError(f"Invalid transmissions: {invalid}")
        if self.sources:
            invalid = set(self.sources) - VALID_SOURCES
            if invalid:
                raise ValueError(f"Invalid sources: {invalid}")
        return self


class AlertCreate(AlertBase):
    pass


class AlertUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    makes: list[str] | None = None
    models: list[str] | None = None
    year_min: int | None = Field(default=None, ge=1900, le=2030)
    year_max: int | None = Field(default=None, ge=1900, le=2030)
    mileage_max: int | None = Field(default=None, ge=0)
    price_min: float | None = Field(default=None, ge=0)
    price_max: float | None = Field(default=None, ge=0)
    colors: list[str] | None = None
    transmissions: list[str] | None = None
    exclude_stories: bool | None = None
    required_options: list[str] | None = None
    sources: list[str] | None = None
    notify_email: bool | None = None
    notify_sms: bool | None = None
    is_active: bool | None = None


class AlertOut(AlertBase):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_triggered_at: datetime | None
    match_count: int = 0


class AlertMatchOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    alert_id: uuid.UUID
    listing_id: uuid.UUID
    notified_at: datetime
    notification_channels: dict
    listing: ListingOut


class AlertMatchPage(BaseModel):
    items: list[AlertMatchOut]
    total: int
    page: int
    per_page: int
    pages: int


class AlertTestResult(BaseModel):
    alert_id: uuid.UUID
    matched_count: int
    listings: list[ListingOut]
