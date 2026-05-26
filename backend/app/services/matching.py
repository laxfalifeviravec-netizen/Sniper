"""
Matching service: compare a listing against an alert's filter criteria.

Rules:
- makes: case-insensitive partial match on listing.make (empty = any)
- models: case-insensitive partial match on listing.model (empty = any)
- year_min / year_max: inclusive range (None = unbounded)
- mileage_max: listing.mileage <= mileage_max (None mileage on listing passes)
- price_min / price_max: inclusive range (None mileage on listing passes)
- colors: any color in alert.colors partially matches listing.color (empty = any)
- transmissions: listing.transmission in alert.transmissions (empty = any)
- exclude_stories: if True, listings with stories_flag=True are excluded
- required_options: all strings in required_options must appear in title OR seller_notes (AND logic)
- sources: listing.source in alert.sources (empty = any)
"""
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.alert import Alert
    from app.models.listing import Listing

logger = logging.getLogger(__name__)


def _partial_match(value: str | None, patterns: list[str]) -> bool:
    """Returns True if value contains any of the patterns (case-insensitive)."""
    if not patterns:
        return True
    if not value:
        return False
    value_lower = value.lower()
    return any(p.lower() in value_lower for p in patterns)


def matches_alert(alert: "Alert", listing: "Listing") -> bool:
    """
    Returns True if the listing satisfies all of the alert's filter criteria.
    """
    # Source filter
    if alert.sources and listing.source not in alert.sources:
        return False

    # Make filter (partial, case-insensitive, OR logic across makes)
    if alert.makes and not _partial_match(listing.make, alert.makes):
        return False

    # Model filter (partial, case-insensitive, OR logic across models)
    if alert.models and not _partial_match(listing.model, alert.models):
        return False

    # Year range
    if alert.year_min is not None and listing.year is not None:
        if listing.year < alert.year_min:
            return False
    if alert.year_max is not None and listing.year is not None:
        if listing.year > alert.year_max:
            return False

    # Mileage max — listings with None mileage pass through
    if alert.mileage_max is not None and listing.mileage is not None:
        if listing.mileage > alert.mileage_max:
            return False

    # Price range — listings with None price pass through
    if alert.price_min is not None and listing.price is not None:
        if listing.price < alert.price_min:
            return False
    if alert.price_max is not None and listing.price is not None:
        if listing.price > alert.price_max:
            return False

    # Color filter (partial match: "Guards Red" matches "red")
    if alert.colors:
        if not _partial_match(listing.color, alert.colors):
            return False

    # Transmission filter (exact enum value match)
    if alert.transmissions:
        if listing.transmission not in alert.transmissions:
            return False

    # Exclude stories / salvage
    if alert.exclude_stories and listing.stories_flag:
        return False

    # Required options: ALL strings must appear in title OR seller_notes (AND logic)
    if alert.required_options:
        searchable = " ".join(
            filter(None, [listing.title, listing.seller_notes])
        ).lower()
        for option in alert.required_options:
            if option.lower() not in searchable:
                return False

    return True


def find_matching_listings(alert: "Alert", listings: list["Listing"]) -> list["Listing"]:
    """Filter a list of listings down to those matching the alert."""
    return [listing for listing in listings if matches_alert(alert, listing)]
