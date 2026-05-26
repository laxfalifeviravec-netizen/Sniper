import logging

from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_client() -> Client | None:
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.warning("Twilio credentials not configured")
        return None
    return Client(settings.twilio_account_sid, settings.twilio_auth_token)


def send_alert_sms(to_number: str, alert_name: str, listings: list[dict]) -> bool:
    """Send an SMS alert for new auction matches (pro users only)."""
    client = _get_client()
    if not client:
        return False

    if not listings:
        return False

    count = len(listings)
    first = listings[0]
    title = first.get("title", "Unknown listing")
    url = first.get("url", "")

    if count == 1:
        body = (
            f"[Sniper] Alert \"{alert_name}\": New match!\n"
            f"{title}\n"
            f"{url}"
        )
    else:
        body = (
            f"[Sniper] Alert \"{alert_name}\": {count} new matches!\n"
            f"Top: {title}\n"
            f"{url}"
        )

    # Truncate to 160 chars (one SMS segment)
    if len(body) > 160:
        body = body[:157] + "..."

    try:
        message = client.messages.create(
            body=body,
            from_=settings.twilio_from_number,
            to=to_number,
        )
        logger.info("SMS sent to %s: SID=%s", to_number, message.sid)
        return True
    except TwilioRestException as e:
        logger.error("Twilio error sending SMS to %s: %s", to_number, e, exc_info=True)
        return False
    except Exception as e:
        logger.error("Unexpected error sending SMS to %s: %s", to_number, e, exc_info=True)
        return False


def send_verification_sms(to_number: str, code: str) -> bool:
    """Send a phone verification code."""
    client = _get_client()
    if not client:
        return False

    body = f"[Sniper] Your verification code is: {code}. Valid for 10 minutes."
    try:
        message = client.messages.create(
            body=body,
            from_=settings.twilio_from_number,
            to=to_number,
        )
        logger.info("Verification SMS sent to %s: SID=%s", to_number, message.sid)
        return True
    except TwilioRestException as e:
        logger.error("Twilio error sending verification SMS to %s: %s", to_number, e, exc_info=True)
        return False
