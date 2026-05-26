import logging
from datetime import datetime, timezone

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _send_email(to_email: str, subject: str, html_content: str) -> bool:
    """Send an email via SendGrid. Returns True on success."""
    if not settings.sendgrid_api_key:
        logger.warning("SendGrid API key not configured, skipping email to %s", to_email)
        return False

    message = Mail(
        from_email=settings.from_email,
        to_emails=to_email,
        subject=subject,
        html_content=html_content,
    )
    try:
        sg = SendGridAPIClient(settings.sendgrid_api_key)
        response = sg.send(message)
        if response.status_code in (200, 202):
            logger.info("Email sent to %s: %s", to_email, subject)
            return True
        else:
            logger.error("SendGrid returned status %s for email to %s", response.status_code, to_email)
            return False
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, e, exc_info=True)
        return False


def send_verification_email(to_email: str, token: str) -> bool:
    verify_url = f"{settings.frontend_url}/verify-email?token={token}"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Verify your email</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                 background: #f4f4f5; margin: 0; padding: 40px 20px;">
      <div style="max-width: 480px; margin: 0 auto; background: #fff;
                  border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="background: #18181b; padding: 32px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Sniper</h1>
          <p style="color: #a1a1aa; margin: 8px 0 0; font-size: 14px;">Enthusiast Car Auction Alerts</p>
        </div>
        <div style="padding: 40px 32px;">
          <h2 style="color: #18181b; margin: 0 0 16px; font-size: 20px;">Verify your email address</h2>
          <p style="color: #52525b; line-height: 1.6; margin: 0 0 32px;">
            Thanks for signing up! Click the button below to verify your email address
            and start getting auction alerts.
          </p>
          <a href="{verify_url}"
             style="display: block; background: #2563eb; color: #fff; text-decoration: none;
                    padding: 14px 24px; border-radius: 8px; text-align: center;
                    font-weight: 600; font-size: 16px; margin-bottom: 24px;">
            Verify Email Address
          </a>
          <p style="color: #a1a1aa; font-size: 13px; margin: 0; text-align: center;">
            This link expires in 24 hours. If you didn't create an account, ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
    """
    return _send_email(to_email, "Verify your Sniper account", html)


def send_password_reset_email(to_email: str, token: str) -> bool:
    reset_url = f"{settings.frontend_url}/reset-password?token={token}"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Reset your password</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                 background: #f4f4f5; margin: 0; padding: 40px 20px;">
      <div style="max-width: 480px; margin: 0 auto; background: #fff;
                  border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="background: #18181b; padding: 32px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Sniper</h1>
          <p style="color: #a1a1aa; margin: 8px 0 0; font-size: 14px;">Enthusiast Car Auction Alerts</p>
        </div>
        <div style="padding: 40px 32px;">
          <h2 style="color: #18181b; margin: 0 0 16px; font-size: 20px;">Reset your password</h2>
          <p style="color: #52525b; line-height: 1.6; margin: 0 0 32px;">
            We received a request to reset your password. Click below to choose a new one.
            If you didn't request this, you can safely ignore this email.
          </p>
          <a href="{reset_url}"
             style="display: block; background: #2563eb; color: #fff; text-decoration: none;
                    padding: 14px 24px; border-radius: 8px; text-align: center;
                    font-weight: 600; font-size: 16px; margin-bottom: 24px;">
            Reset Password
          </a>
          <p style="color: #a1a1aa; font-size: 13px; margin: 0; text-align: center;">
            This link expires in 24 hours.
          </p>
        </div>
      </div>
    </body>
    </html>
    """
    return _send_email(to_email, "Reset your Sniper password", html)


def send_alert_email(to_email: str, alert_name: str, listings: list[dict]) -> bool:
    """Send a multi-listing alert digest email."""
    if not listings:
        return False

    listing_cards = ""
    for listing in listings[:10]:  # cap at 10 per email
        image_url = listing.get("images", [None])[0] or ""
        title = listing.get("title", "Unknown")
        year = listing.get("year", "")
        mileage = listing.get("mileage")
        price = listing.get("price")
        source = listing.get("source", "").replace("_", " ").title()
        url = listing.get("url", "#")
        auction_end = listing.get("auction_end")

        mileage_str = f"{mileage:,} mi" if mileage else "N/A"
        price_str = f"${price:,.0f}" if price else "No reserve / TBD"

        end_str = ""
        if auction_end:
            if isinstance(auction_end, str):
                end_str = auction_end
            elif hasattr(auction_end, "strftime"):
                end_str = auction_end.strftime("%b %d, %Y %I:%M %p UTC")

        image_html = ""
        if image_url:
            image_html = f"""
            <a href="{url}" style="display: block; margin-bottom: 16px;">
              <img src="{image_url}" alt="{title}"
                   style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;" />
            </a>
            """

        listing_cards += f"""
        <div style="background: #fff; border: 1px solid #e4e4e7; border-radius: 12px;
                    padding: 20px; margin-bottom: 20px;">
          {image_html}
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <span style="background: #18181b; color: #fff; font-size: 11px; font-weight: 600;
                         padding: 3px 8px; border-radius: 4px; text-transform: uppercase;
                         letter-spacing: 0.5px;">{source}</span>
          </div>
          <h3 style="margin: 0 0 8px; font-size: 17px; color: #18181b; line-height: 1.3;">
            <a href="{url}" style="color: #18181b; text-decoration: none;">{title}</a>
          </h3>
          <div style="color: #52525b; font-size: 14px; margin-bottom: 12px;">
            <span style="margin-right: 16px;">Year: <strong>{year}</strong></span>
            <span style="margin-right: 16px;">Mileage: <strong>{mileage_str}</strong></span>
            <span>Current bid: <strong style="color: #16a34a;">{price_str}</strong></span>
          </div>
          {"<div style='color: #dc2626; font-size: 13px; margin-bottom: 12px;'>&#9200; Ends: " + end_str + "</div>" if end_str else ""}
          <a href="{url}"
             style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none;
                    padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px;">
            View Auction &rarr;
          </a>
        </div>
        """

    manage_url = f"{settings.frontend_url}/alerts"
    count = len(listings)
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>New auction matches for "{alert_name}"</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                 background: #f4f4f5; margin: 0; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="background: #18181b; border-radius: 12px 12px 0 0; padding: 28px 32px;">
          <h1 style="color: #fff; margin: 0; font-size: 22px; letter-spacing: -0.5px;">
            Sniper <span style="color: #60a5fa;">&#x2022;</span> {count} new match{"es" if count != 1 else ""}
          </h1>
          <p style="color: #a1a1aa; margin: 6px 0 0; font-size: 14px;">
            Alert: <strong style="color: #e4e4e7;">{alert_name}</strong>
          </p>
        </div>
        <div style="background: #f9f9fb; padding: 24px 32px;">
          {listing_cards}
          <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e4e4e7;">
            <a href="{manage_url}" style="color: #71717a; font-size: 13px; text-decoration: none;">
              Manage your alerts
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
    """

    subject = f"[Sniper] {count} new match{'es' if count != 1 else ''} for \"{alert_name}\""
    return _send_email(to_email, subject, html)
