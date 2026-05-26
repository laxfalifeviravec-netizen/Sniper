import logging

import stripe

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _configure_stripe():
    stripe.api_key = settings.stripe_secret_key


async def get_or_create_stripe_customer(db, user) -> str:
    """Return existing Stripe customer ID or create a new one."""
    _configure_stripe()

    if user.stripe_customer_id:
        return user.stripe_customer_id

    try:
        customer = stripe.Customer.create(
            email=user.email,
            metadata={"user_id": str(user.id)},
        )
        user.stripe_customer_id = customer.id
        await db.flush()
        logger.info("Created Stripe customer %s for user %s", customer.id, user.id)
        return customer.id
    except stripe.error.StripeError as e:
        logger.error("Failed to create Stripe customer for user %s: %s", user.id, e)
        raise


async def create_checkout_session(customer_id: str, user_email: str) -> tuple[str, str]:
    """Create a Stripe checkout session and return (url, session_id)."""
    _configure_stripe()

    if not settings.stripe_pro_price_id:
        raise ValueError("STRIPE_PRO_PRICE_ID is not configured")

    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[
                {
                    "price": settings.stripe_pro_price_id,
                    "quantity": 1,
                }
            ],
            mode="subscription",
            success_url=f"{settings.frontend_url}/settings/billing?success=true&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.frontend_url}/settings/billing?canceled=true",
            customer_email=user_email if not customer_id else None,
            allow_promotion_codes=True,
            billing_address_collection="auto",
        )
        logger.info("Created checkout session %s for customer %s", session.id, customer_id)
        return session.url, session.id
    except stripe.error.StripeError as e:
        logger.error("Failed to create checkout session: %s", e)
        raise


async def create_customer_portal_session(customer_id: str) -> str:
    """Create a Stripe billing portal session and return the URL."""
    _configure_stripe()

    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{settings.frontend_url}/settings/billing",
        )
        logger.info("Created portal session for customer %s", customer_id)
        return session.url
    except stripe.error.StripeError as e:
        logger.error("Failed to create portal session for customer %s: %s", customer_id, e)
        raise


async def cancel_stripe_subscription(subscription_id: str) -> None:
    """Cancel a Stripe subscription at period end."""
    _configure_stripe()

    try:
        stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True,
        )
        logger.info("Marked subscription %s to cancel at period end", subscription_id)
    except stripe.error.StripeError as e:
        logger.error("Failed to cancel subscription %s: %s", subscription_id, e)
        raise
