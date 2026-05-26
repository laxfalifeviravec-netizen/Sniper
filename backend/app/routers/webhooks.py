import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.subscription import Subscription
from app.models.user import User

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


async def _upsert_subscription(
    db: AsyncSession,
    stripe_sub: stripe.Subscription,
    tier: str,
):
    """Upsert a Subscription record based on Stripe subscription data."""
    result = await db.execute(
        select(User).where(User.stripe_customer_id == stripe_sub.customer)
    )
    user = result.scalar_one_or_none()
    if not user:
        logger.warning("Stripe webhook: no user for customer %s", stripe_sub.customer)
        return

    sub_result = await db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    )
    subscription = sub_result.scalar_one_or_none()

    from datetime import datetime, timezone
    period_end = datetime.fromtimestamp(stripe_sub.current_period_end, tz=timezone.utc)

    if subscription:
        subscription.stripe_subscription_id = stripe_sub.id
        subscription.stripe_price_id = stripe_sub.items.data[0].price.id if stripe_sub.items.data else None
        subscription.tier = tier
        subscription.status = stripe_sub.status
        subscription.current_period_end = period_end
    else:
        subscription = Subscription(
            user_id=user.id,
            stripe_subscription_id=stripe_sub.id,
            stripe_price_id=stripe_sub.items.data[0].price.id if stripe_sub.items.data else None,
            tier=tier,
            status=stripe_sub.status,
            current_period_end=period_end,
        )
        db.add(subscription)

    # Update user tier
    user.subscription_tier = tier
    await db.flush()
    logger.info("Subscription upserted for user %s: tier=%s status=%s", user.id, tier, stripe_sub.status)


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not settings.stripe_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe webhook secret not configured",
        )

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except stripe.error.SignatureVerificationError:
        logger.warning("Invalid Stripe webhook signature")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature",
        )
    except Exception as e:
        logger.error("Stripe webhook error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload",
        )

    event_type = event["type"]
    logger.info("Stripe webhook received: %s", event_type)

    try:
        if event_type == "checkout.session.completed":
            session = event["data"]["object"]
            if session.get("mode") == "subscription" and session.get("subscription"):
                stripe.api_key = settings.stripe_secret_key
                stripe_sub = stripe.Subscription.retrieve(session["subscription"])
                await _upsert_subscription(db, stripe_sub, tier="pro")

        elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
            stripe_sub = event["data"]["object"]
            tier = "pro" if stripe_sub.status in ("active", "trialing") else "free"
            await _upsert_subscription(db, stripe_sub, tier=tier)

        elif event_type == "customer.subscription.deleted":
            stripe_sub = event["data"]["object"]
            result = await db.execute(
                select(User).where(User.stripe_customer_id == stripe_sub["customer"])
            )
            user = result.scalar_one_or_none()
            if user:
                sub_result = await db.execute(
                    select(Subscription).where(Subscription.user_id == user.id)
                )
                subscription = sub_result.scalar_one_or_none()
                if subscription:
                    subscription.status = "canceled"
                    subscription.tier = "free"
                user.subscription_tier = "free"
                await db.flush()
                logger.info("Subscription canceled for user %s", user.id)

        elif event_type == "invoice.payment_failed":
            invoice = event["data"]["object"]
            if invoice.get("subscription"):
                result = await db.execute(
                    select(User).where(User.stripe_customer_id == invoice["customer"])
                )
                user = result.scalar_one_or_none()
                if user:
                    sub_result = await db.execute(
                        select(Subscription).where(Subscription.user_id == user.id)
                    )
                    subscription = sub_result.scalar_one_or_none()
                    if subscription:
                        subscription.status = "past_due"
                        await db.flush()

    except Exception as e:
        logger.error("Error processing Stripe webhook event %s: %s", event_type, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed",
        )

    return {"received": True}
