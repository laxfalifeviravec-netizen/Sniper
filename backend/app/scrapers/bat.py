"""
Bring a Trailer (bringatrailer.com) scraper.

Strategy:
1. Fetch the BaT auctions JSON API endpoint for current listings.
2. For each listing, parse structured data from the listing card.
3. Fetch individual listing pages when needed for full details.
"""
import logging
import re
from datetime import datetime, timezone
from typing import Any

from bs4 import BeautifulSoup

from app.scrapers.base import (
    BaseScraper,
    has_stories_flag,
    normalize_transmission,
    parse_mileage,
    parse_price,
    parse_year_make_model,
)

logger = logging.getLogger(__name__)

BAT_AUCTIONS_URL = "https://bringatrailer.com/wp-json/bat/v1/auctions"
BAT_LISTINGS_PAGE = "https://bringatrailer.com/auctions/"


class BaTScraper(BaseScraper):
    source = "bat"

    async def scrape(self) -> list[dict[str, Any]]:
        listings = []

        try:
            listings = await self._fetch_via_api()
        except Exception as e:
            logger.warning("BaT API fetch failed (%s), falling back to HTML", e)
            try:
                listings = await self._fetch_via_html()
            except Exception as e2:
                logger.error("BaT HTML fetch also failed: %s", e2, exc_info=True)

        logger.info("BaT: scraped %d listings", len(listings))
        return listings

    async def _fetch_via_api(self) -> list[dict[str, Any]]:
        """Use BaT's internal WordPress REST API."""
        results = []
        page = 1
        max_pages = 5  # ~500 listings max per run

        while page <= max_pages:
            try:
                data = await self.fetch_json(
                    BAT_AUCTIONS_URL,
                    params={"page": page, "per_page": 100, "status": "live"},
                    headers={"Referer": "https://bringatrailer.com/auctions/"},
                )
            except Exception as e:
                logger.warning("BaT API page %d failed: %s", page, e)
                break

            items = data if isinstance(data, list) else data.get("listings", data.get("auctions", []))
            if not items:
                break

            for item in items:
                listing = self._parse_api_item(item)
                if listing:
                    results.append(listing)

            page += 1

        return results

    def _parse_api_item(self, item: dict) -> dict[str, Any] | None:
        try:
            listing = self._base_listing()

            title = item.get("title", "") or item.get("post_title", "")
            if not title:
                return None

            slug = item.get("slug", "") or item.get("post_name", "")
            external_id = str(item.get("id", item.get("ID", slug)))
            url = item.get("url", item.get("permalink", f"https://bringatrailer.com/listing/{slug}/"))

            year, make, model = parse_year_make_model(title)

            # Price / current bid
            price = None
            bid_val = item.get("current_bid", item.get("bid_amount"))
            if bid_val:
                price = parse_price(str(bid_val))

            # Auction end
            auction_end = None
            end_ts = item.get("deadline_ts", item.get("end_date"))
            if end_ts:
                try:
                    if isinstance(end_ts, (int, float)):
                        auction_end = datetime.fromtimestamp(end_ts, tz=timezone.utc)
                    elif isinstance(end_ts, str):
                        # Try ISO format
                        auction_end = datetime.fromisoformat(end_ts.replace("Z", "+00:00"))
                except Exception:
                    pass

            # Images
            images = []
            thumb = item.get("thumbnail_url", item.get("image_url"))
            if thumb:
                images.append(thumb)
            gallery = item.get("gallery", [])
            if isinstance(gallery, list):
                images.extend([g.get("url", g) if isinstance(g, dict) else g for g in gallery[:9]])

            # Location
            location = item.get("location", item.get("seller_location"))

            # Description for stories and details
            description = item.get("description", item.get("post_content", ""))
            notes = item.get("seller_notes", description or "")

            # Mileage from description
            mileage = parse_mileage(description) or parse_mileage(notes)

            # Transmission
            transmission = normalize_transmission(item.get("transmission"))
            if not transmission:
                transmission = normalize_transmission(description)

            stories = has_stories_flag(title + " " + (notes or "") + " " + description)

            listing.update({
                "external_id": external_id,
                "url": url,
                "title": title,
                "make": make,
                "model": model,
                "year": year,
                "mileage": mileage,
                "price": price,
                "location": location,
                "transmission": transmission,
                "seller_notes": notes[:4000] if notes else None,
                "images": images[:10],
                "auction_end": auction_end,
                "stories_flag": stories,
            })
            return listing
        except Exception as e:
            logger.warning("BaT: failed to parse API item: %s", e)
            return None

    async def _fetch_via_html(self) -> list[dict[str, Any]]:
        """Fallback: scrape the BaT auctions page HTML."""
        results = []

        for page_num in range(1, 4):  # up to 3 pages
            url = BAT_LISTINGS_PAGE if page_num == 1 else f"{BAT_LISTINGS_PAGE}page/{page_num}/"
            try:
                response = await self.fetch(url)
                soup = BeautifulSoup(response.text, "lxml")
                items = soup.select("li.auctions-item")

                if not items:
                    break

                for item in items:
                    listing = self._parse_html_item(item)
                    if listing:
                        results.append(listing)

            except Exception as e:
                logger.warning("BaT HTML page %d failed: %s", page_num, e)
                break

        return results

    def _parse_html_item(self, item) -> dict[str, Any] | None:
        try:
            listing = self._base_listing()

            link_el = item.select_one("a.auctions-item-image")
            title_el = item.select_one(".auctions-item-title")
            bid_el = item.select_one(".auctions-item-bid")
            end_el = item.select_one("[data-deadline]")
            img_el = item.select_one("img")

            if not title_el:
                return None

            title = title_el.get_text(strip=True)
            url = link_el.get("href", "") if link_el else ""
            slug = url.rstrip("/").split("/")[-1]

            year, make, model = parse_year_make_model(title)

            price = None
            if bid_el:
                price = parse_price(bid_el.get_text(strip=True))

            auction_end = None
            if end_el:
                deadline = end_el.get("data-deadline")
                if deadline:
                    try:
                        auction_end = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
                    except Exception:
                        pass

            images = []
            if img_el:
                src = img_el.get("src") or img_el.get("data-src") or img_el.get("data-lazy-src")
                if src and "placeholder" not in src.lower():
                    images.append(src)

            description = item.get_text(separator=" ", strip=True)
            mileage = parse_mileage(description)
            stories = has_stories_flag(title + " " + description)

            listing.update({
                "external_id": slug or url,
                "url": url,
                "title": title,
                "make": make,
                "model": model,
                "year": year,
                "mileage": mileage,
                "price": price,
                "images": images,
                "auction_end": auction_end,
                "stories_flag": stories,
            })
            return listing
        except Exception as e:
            logger.warning("BaT: failed to parse HTML item: %s", e)
            return None
