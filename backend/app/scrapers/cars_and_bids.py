"""
Cars & Bids (carsandbids.com) scraper.

Strategy:
1. Fetch /auctions/live JSON endpoint (internal API).
2. Fall back to HTML parsing of the auctions page.
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

CAB_BASE = "https://carsandbids.com"
CAB_AUCTIONS_API = "https://carsandbids.com/api/auctions"
CAB_AUCTIONS_PAGE = "https://carsandbids.com/auctions/"


class CarsAndBidsScraper(BaseScraper):
    source = "cars_and_bids"

    async def scrape(self) -> list[dict[str, Any]]:
        results = []
        try:
            results = await self._fetch_via_api()
        except Exception as e:
            logger.warning("Cars & Bids API failed (%s), trying HTML", e)
            try:
                results = await self._fetch_via_html()
            except Exception as e2:
                logger.error("Cars & Bids HTML also failed: %s", e2, exc_info=True)

        logger.info("Cars & Bids: scraped %d listings", len(results))
        return results

    async def _fetch_via_api(self) -> list[dict[str, Any]]:
        """Attempt internal API endpoints."""
        results = []
        endpoints = [
            f"{CAB_AUCTIONS_API}?status=live&page=1&limit=100",
            f"{CAB_BASE}/api/v2/auctions?status=active&per_page=100",
        ]

        for url in endpoints:
            try:
                data = await self.fetch_json(url, headers={"Referer": CAB_BASE + "/"})
                auctions = data if isinstance(data, list) else data.get("auctions", data.get("results", []))
                if auctions:
                    for item in auctions:
                        listing = self._parse_api_item(item)
                        if listing:
                            results.append(listing)
                    return results
            except Exception as e:
                logger.debug("CAB endpoint %s failed: %s", url, e)
                continue

        raise RuntimeError("All Cars & Bids API endpoints failed")

    def _parse_api_item(self, item: dict) -> dict[str, Any] | None:
        try:
            listing = self._base_listing()

            title = item.get("title", "") or item.get("name", "")
            if not title:
                # Construct from parts if available
                year = item.get("year")
                make = item.get("make", "")
                model_name = item.get("model", "")
                if year and make:
                    title = f"{year} {make} {model_name}".strip()

            if not title:
                return None

            slug = item.get("slug", item.get("auction_id", str(item.get("id", ""))))
            url = item.get("url", item.get("permalink", f"{CAB_BASE}/auctions/{slug}/"))
            if url and not url.startswith("http"):
                url = CAB_BASE + url

            year = item.get("year")
            make = item.get("make")
            model = item.get("model")

            if not (year and make):
                year, make, model_parsed = parse_year_make_model(title)
                make = make or make
                model = model or model_parsed

            if isinstance(year, str):
                try:
                    year = int(year)
                except ValueError:
                    year = None

            price = None
            for key in ("current_bid", "bid_amount", "price", "current_price"):
                if item.get(key) is not None:
                    price = parse_price(str(item[key]))
                    if price:
                        break

            auction_end = None
            for key in ("ends_at", "auction_end", "end_date", "deadline"):
                val = item.get(key)
                if val:
                    try:
                        if isinstance(val, (int, float)):
                            auction_end = datetime.fromtimestamp(val, tz=timezone.utc)
                        else:
                            auction_end = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
                        break
                    except Exception:
                        pass

            images = []
            for key in ("images", "photos", "gallery"):
                raw = item.get(key)
                if isinstance(raw, list) and raw:
                    for img in raw[:10]:
                        if isinstance(img, dict):
                            src = img.get("url", img.get("src", ""))
                        else:
                            src = str(img)
                        if src:
                            images.append(src)
                    break
            thumb = item.get("thumbnail", item.get("featured_image", item.get("hero_image")))
            if thumb and thumb not in images:
                images.insert(0, thumb)

            mileage_raw = item.get("mileage")
            mileage = None
            if mileage_raw is not None:
                if isinstance(mileage_raw, int):
                    mileage = mileage_raw
                else:
                    mileage = parse_mileage(str(mileage_raw))

            transmission_raw = item.get("transmission", "")
            transmission = normalize_transmission(transmission_raw)

            color = item.get("color", item.get("exterior_color"))
            engine = item.get("engine", item.get("engine_type"))
            location = item.get("location", item.get("seller_location"))

            description = item.get("description", item.get("seller_notes", ""))
            if not mileage:
                mileage = parse_mileage(description)

            stories = has_stories_flag(title + " " + (description or ""))

            listing.update({
                "external_id": str(slug),
                "url": url,
                "title": title,
                "make": make,
                "model": model,
                "year": year,
                "mileage": mileage,
                "price": price,
                "location": location,
                "color": color,
                "transmission": transmission,
                "engine": engine,
                "seller_notes": (description or "")[:4000] or None,
                "images": images[:10],
                "auction_end": auction_end,
                "stories_flag": stories,
            })
            return listing
        except Exception as e:
            logger.warning("Cars & Bids: failed to parse API item: %s", e)
            return None

    async def _fetch_via_html(self) -> list[dict[str, Any]]:
        """HTML fallback scraper."""
        results = []

        try:
            response = await self.fetch(
                CAB_AUCTIONS_PAGE,
                headers={"Referer": CAB_BASE + "/"},
            )
            soup = BeautifulSoup(response.text, "lxml")

            # Try JSON-LD structured data first
            script_tags = soup.find_all("script", type="application/ld+json")
            for tag in script_tags:
                try:
                    import json
                    data = json.loads(tag.string or "")
                    if isinstance(data, list):
                        for item in data:
                            listing = self._parse_jsonld(item)
                            if listing:
                                results.append(listing)
                    elif isinstance(data, dict):
                        listing = self._parse_jsonld(data)
                        if listing:
                            results.append(listing)
                except Exception:
                    pass

            if results:
                return results

            # Fall back to card parsing
            for selector in [
                "article.auction-card",
                "div.auction-item",
                "li.auction",
                ".auctions-list-item",
            ]:
                cards = soup.select(selector)
                if cards:
                    for card in cards:
                        listing = self._parse_html_card(card)
                        if listing:
                            results.append(listing)
                    break

        except Exception as e:
            logger.error("Cars & Bids HTML scrape failed: %s", e, exc_info=True)

        return results

    def _parse_jsonld(self, data: dict) -> dict[str, Any] | None:
        try:
            if data.get("@type") not in ("Product", "Offer", "Car", "Vehicle"):
                return None

            listing = self._base_listing()
            title = data.get("name", "")
            if not title:
                return None

            year, make, model = parse_year_make_model(title)
            url = data.get("url", "")
            if url and not url.startswith("http"):
                url = CAB_BASE + url

            images = []
            img = data.get("image")
            if isinstance(img, list):
                images = img[:10]
            elif isinstance(img, str):
                images = [img]

            price = None
            offers = data.get("offers", {})
            if isinstance(offers, dict):
                price = parse_price(str(offers.get("price", "")))

            slug = url.rstrip("/").split("/")[-1]

            listing.update({
                "external_id": slug or url,
                "url": url,
                "title": title,
                "make": data.get("brand", {}).get("name") if isinstance(data.get("brand"), dict) else make,
                "model": model,
                "year": year,
                "price": price,
                "images": images,
            })
            return listing
        except Exception:
            return None

    def _parse_html_card(self, card) -> dict[str, Any] | None:
        try:
            listing = self._base_listing()
            link = card.select_one("a[href]")
            url = link.get("href", "") if link else ""
            if url and not url.startswith("http"):
                url = CAB_BASE + url

            title_el = card.select_one("h2, h3, .title, .auction-title")
            title = title_el.get_text(strip=True) if title_el else card.get("title", "")
            if not title:
                return None

            slug = url.rstrip("/").split("/")[-1]
            year, make, model = parse_year_make_model(title)

            img_el = card.select_one("img")
            images = []
            if img_el:
                src = img_el.get("src") or img_el.get("data-src") or img_el.get("data-lazy-src")
                if src:
                    images.append(src)

            price = None
            bid_el = card.select_one(".bid, .current-bid, .price")
            if bid_el:
                price = parse_price(bid_el.get_text(strip=True))

            auction_end = None
            time_el = card.select_one("time[datetime], [data-ends]")
            if time_el:
                dt_val = time_el.get("datetime") or time_el.get("data-ends")
                if dt_val:
                    try:
                        auction_end = datetime.fromisoformat(dt_val.replace("Z", "+00:00"))
                    except Exception:
                        pass

            full_text = card.get_text(separator=" ", strip=True)
            mileage = parse_mileage(full_text)
            stories = has_stories_flag(title + " " + full_text)

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
            logger.warning("Cars & Bids: HTML card parse failed: %s", e)
            return None
