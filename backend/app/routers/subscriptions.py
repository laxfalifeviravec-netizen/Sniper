import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.subscription import CheckoutSessionOut, PortalSessionOut, SubscriptionOut
from app.services.auth import get_current_user
from app.services.stripe import (
    cancel_stripe_subscription,
    create_checkout_session,
    create_customer_portal_session,
    get_or_create_stripe_customer,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("/me", response_model=SubscriptionOut | None)
async def get_my_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()
    return subscription


@router.post("/checkout", response_model=CheckoutSessionOut)
async def create_checkout(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.subscription_tier == "pro":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already subscribed to Pro",
        )

    # Get or create Stripe customer
    stripe_customer_id = await get_or_create_stripe_customer(db, current_user)

    checkout_url, session_id = await create_checkout_session(
        customer_id=stripe_customer_id,
        user_email=current_user.email,
    )

    return CheckoutSessionOut(checkout_url=checkout_url, session_id=session_id)


@router.post("/portal", response_model=PortalSessionOut)
async def customer_portal(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No billing account found",
        )

    portal_url = await create_customer_portal_session(current_user.stripe_customer_id)
    return PortalSessionOut(portal_url=portal_url)


@router.post("/cancel", status_code=status.HTTP_200_OK)
async def cancel_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription or not subscription.stripe_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription found",
        )

    if subscription.status in ("canceled", "incomplete_expired"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subscription is already canceled",
        )

    await cancel_stripe_subscription(subscription.stripe_subscription_id)
    # Actual tier downgrade happens via Stripe webhook
    return {"message": "Subscription will be canceled at the end of the billing period"}
