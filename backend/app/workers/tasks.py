"""
Celery tasks for scraping, alert matching, and notifications.
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from celery import shared_task
from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.alert import Alert, AlertMatch
from app.models.listing import Listing
from app.models.user import User
from app.scrapers.bat import BaTScraper
from app.scrapers.cars_and_bids import CarsAndBidsScraper
from app.scrapers.ebay_motors import EbayMotorsScraper
from app.scrapers.pcarmarket import PCarMarketScraper
from app.services.email import send_alert_email
from app.services.matching import find_matching_listings
from app.services.sms import send_alert_sms
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)
settings = get_settings()


def run_async(coro):
    """Run a coroutine synchronously (for Celery tasks)."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


# ---------------------------------------------------------------------------
# Scraping tasks
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="app.workers.tasks.scrape_all_sources",
    max_retries=2,
    default_retry_delay=120,
)
def scrape_all_sources(self):
    """
    Master scrape task: runs all scrapers, upserts listings, then triggers alert checking.
    Runs every 30 minutes via Celery Beat.
    """
    logger.info("Starting scrape_all_sources")
    sources = ["bat", "cars_and_bids", "pcarmarket", "ebay"]
    all_new_ids = []

    for source in sources:
        try:
            result = scrape_source.apply_async(args=[source])
            new_ids = result.get(timeout=300)  # 5 minute timeout per source
            all_new_ids.extend(new_ids or [])
        except Exception as e:
            logger.error("Source %s scrape failed: %s", source, e, exc_info=True)

    if all_new_ids:
        check_alerts.apply_async(args=[all_new_ids])

    logger.info("scrape_all_sources done: %d new/updated listings", len(all_new_ids))
    return len(all_new_ids)


@celery_app.task(
    bind=True,
    name="app.workers.tasks.scrape_source",
    max_retries=3,
    default_retry_delay=60,
)
def scrape_source(self, source: str) -> list[str]:
    """
    Scrape a single source and upsert listings into the database.
    Returns list of new listing IDs (as strings).
    """
    logger.info("Scraping source: %s", source)

    async def _run():
        scrapers = {
            "bat": BaTScraper,
            "cars_and_bids": CarsAndBidsScraper,
            "pcarmarket": PCarMarketScraper,
            "ebay": EbayMotorsScraper,
        }
        scraper_cls = scrapers.get(source)
        if not scraper_cls:
            raise ValueError(f"Unknown source: {source}")

        async with scraper_cls() as scraper:
            raw_listings = await scraper.scrape()

        if not raw_listings:
            logger.info("%s: no listings returned", source)
            return []

        new_ids = []
        async with AsyncSessionLocal() as db:
            for raw in raw_listings:
                try:
                    listing_id = await _upsert_listing(db, raw)
                    if listing_id:
                        new_ids.append(str(listing_id))
                except Exception as e:
                    logger.error("Failed to upsert listing from %s: %s", source, e, exc_info=True)
            await db.commit()

        logger.info("%s: %d listings processed, %d new/updated", source, len(raw_listings), len(new_ids))
        return new_ids

    try:
        return run_async(_run())
    except Exception as exc:
        logger.error("scrape_source(%s) failed: %s", source, exc, exc_info=True)
        raise self.retry(exc=exc)


async def _upsert_listing(db, raw: dict[str, Any]) -> str | None:
    """
    Insert or update a listing. Returns the listing ID if new or price-updated, else None.
    """
    source = raw.get("source")
    external_id = raw.get("external_id")

    if not source or not external_id:
        return None

    stmt = select(Listing).where(
        and_(Listing.source == source, Listing.external_id == str(external_id))
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        is_new = False
        # Update price if changed
        new_price = raw.get("price")
        if new_price and existing.price != new_price:
            existing.price = new_price
            is_new = True  # Price changed = re-notify

        # Update active status and auction_end
        existing.is_active = raw.get("is_active", True)
        auction_end = raw.get("auction_end")
        if auction_end:
            existing.auction_end = auction_end

        # Update images if we got more
        new_images = raw.get("images", [])
        if new_images and len(new_images) > len(existing.images or []):
            existing.images = new_images

        return str(existing.id) if is_new else None
    else:
        # New listing
        listing = Listing(
            source=raw["source"],
            external_id=str(raw["external_id"]),
            url=raw.get("url", ""),
            title=raw.get("title", ""),
            make=raw.get("make"),
            model=raw.get("model"),
            year=raw.get("year"),
            mileage=raw.get("mileage"),
            price=raw.get("price"),
            location=raw.get("location"),
            color=raw.get("color"),
            transmission=raw.get("transmission"),
            engine=raw.get("engine"),
            seller_notes=raw.get("seller_notes"),
            images=raw.get("images", []),
            auction_end=raw.get("auction_end"),
            is_active=raw.get("is_active", True),
            stories_flag=raw.get("stories_flag", False),
            options=raw.get("options", {}),
        )
        db.add(listing)
        await db.flush()
        return str(listing.id)


# ---------------------------------------------------------------------------
# Alert checking tasks
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="app.workers.tasks.check_alerts",
    max_retries=2,
    default_retry_delay=30,
)
def check_alerts(self, listing_ids: list[str]):
    """
    For a batch of new/updated listing IDs, find matching active alerts
    and dispatch notification tasks.
    """
    if not listing_ids:
        return

    logger.info("check_alerts: checking %d listings against active alerts", len(listing_ids))

    async def _run():
        async with AsyncSessionLocal() as db:
            # Load the new listings
            listings_result = await db.execute(
                select(Listing).where(Listing.id.in_(listing_ids))
            )
            listings = listings_result.scalars().all()

            if not listings:
                return

            # Load all active alerts with their users
            alerts_result = await db.execute(
                select(Alert)
                .options(selectinload(Alert.user))
                .where(Alert.is_active == True)  # noqa: E712
            )
            alerts = alerts_result.scalars().all()

            if not alerts:
                return

            for alert in alerts:
                matched = find_matching_listings(alert, list(listings))
                if not matched:
                    continue

                # Deduplicate: check which listings haven't been matched for this alert already
                existing_result = await db.execute(
                    select(AlertMatch.listing_id).where(
                        and_(
                            AlertMatch.alert_id == alert.id,
                            AlertMatch.listing_id.in_([m.id for m in matched]),
                        )
                    )
                )
                already_matched = {str(row[0]) for row in existing_result.all()}
                new_matches = [m for m in matched if str(m.id) not in already_matched]

                if not new_matches:
                    continue

                # Record matches
                for listing in new_matches:
                    channels = {}
                    if alert.notify_email:
                        channels["email"] = True
                    if alert.notify_sms and alert.user.subscription_tier == "pro":
                        channels["sms"] = True

                    match = AlertMatch(
                        alert_id=alert.id,
                        listing_id=listing.id,
                        notification_channels=channels,
                    )
                    db.add(match)

                # Update alert's last_triggered_at
                alert.last_triggered_at = datetime.now(timezone.utc)

                await db.flush()

                # Dispatch notification tasks
                listing_dicts = [_listing_to_dict(m) for m in new_matches]
                user = alert.user

                if alert.notify_email and user.email:
                    send_alert_email_task.apply_async(
                        args=[user.email, alert.name, listing_dicts],
                        queue="notifications",
                    )

                if alert.notify_sms and user.subscription_tier == "pro" and user.phone_number:
                    send_alert_sms_task.apply_async(
                        args=[user.phone_number, alert.name, listing_dicts],
                        queue="notifications",
                    )

            await db.commit()

    try:
        run_async(_run())
    except Exception as exc:
        logger.error("check_alerts failed: %s", exc, exc_info=True)
        raise self.retry(exc=exc)


def _listing_to_dict(listing: Listing) -> dict[str, Any]:
    """Convert a Listing ORM object to a plain dict for serialization."""
    return {
        "id": str(listing.id),
        "source": listing.source,
        "external_id": listing.external_id,
        "url": listing.url,
        "title": listing.title,
        "make": listing.make,
        "model": listing.model,
        "year": listing.year,
        "mileage": listing.mileage,
        "price": listing.price,
        "location": listing.location,
        "color": listing.color,
        "transmission": listing.transmission,
        "engine": listing.engine,
        "seller_notes": listing.seller_notes,
        "images": listing.images or [],
        "auction_end": listing.auction_end.isoformat() if listing.auction_end else None,
        "stories_flag": listing.stories_flag,
        "options": listing.options or {},
    }


# ---------------------------------------------------------------------------
# Notification tasks
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="app.workers.tasks.send_alert_email",
    max_retries=3,
    default_retry_delay=60,
)
def send_alert_email_task(self, to_email: str, alert_name: str, listings: list[dict]):
    """Send an alert notification email via SendGrid."""
    try:
        success = send_alert_email(to_email, alert_name, listings)
        if not success:
            raise RuntimeError(f"send_alert_email returned False for {to_email}")
        logger.info("Alert email sent to %s for alert '%s' (%d matches)", to_email, alert_name, len(listings))
    except Exception as exc:
        logger.error("send_alert_email_task failed for %s: %s", to_email, exc, exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    name="app.workers.tasks.send_alert_sms",
    max_retries=3,
    default_retry_delay=60,
)
def send_alert_sms_task(self, to_number: str, alert_name: str, listings: list[dict]):
    """Send an alert notification SMS via Twilio (pro users only)."""
    try:
        success = send_alert_sms(to_number, alert_name, listings)
        if not success:
            raise RuntimeError(f"send_alert_sms returned False for {to_number}")
        logger.info("Alert SMS sent to %s for alert '%s'", to_number, alert_name)
    except Exception as exc:
        logger.error("send_alert_sms_task failed for %s: %s", to_number, exc, exc_info=True)
        raise self.retry(exc=exc)
