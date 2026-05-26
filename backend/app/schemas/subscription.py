import uuid
from datetime import datetime

from pydantic import BaseModel


class SubscriptionOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    stripe_subscription_id: str | None
    stripe_price_id: str | None
    tier: str
    status: str
    current_period_end: datetime | None
    created_at: datetime


class CheckoutSessionOut(BaseModel):
    checkout_url: str
    session_id: str


class PortalSessionOut(BaseModel):
    portal_url: str
