"""
PCarMarket (pcarmarket.com) scraper.

PCarMarket focuses on Porsche auctions. Strategy:
1. Fetch the active listings page.
2. Parse listing cards from HTML (they do not have a public API).
3. Extract title/year/make/model, current bid, end time, images.
"""
import json
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

PCAR_BASE = "https://www.pcarmarket.com"
PCAR_AUCTIONS_URL = "https://www.pcarmarket.com/auction/"


class PCarMarketScraper(BaseScraper):
    source = "pcarmarket"

    async def scrape(self) -> list[dict[str, Any]]:
        results = []

        for page_num in range(1, 6):  # up to 5 pages
            page_results = await self._scrape_page(page_num)
            if not page_results:
                break
            results.extend(page_results)

        logger.info("PCarMarket: scraped %d listings", len(results))
        return results

    async def _scrape_page(self, page: int) -> list[dict[str, Any]]:
        url = PCAR_AUCTIONS_URL if page == 1 else f"{PCAR_AUCTIONS_URL}?page={page}"
        try:
            response = await self.fetch(url, headers={"Referer": PCAR_BASE + "/"})
        except Exception as e:
            logger.warning("PCarMarket page %d fetch failed: %s", page, e)
            return []

        soup = BeautifulSoup(response.text, "lxml")

        # Try JSON-LD
        results = self._parse_jsonld(soup)
        if results:
            return results

        # Try listing cards
        return self._parse_cards(soup)

    def _parse_jsonld(self, soup: BeautifulSoup) -> list[dict[str, Any]]:
        results = []
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
                items = data if isinstance(data, list) else [data]
                for item in items:
                    listing = self._from_jsonld(item)
                    if listing:
                        results.append(listing)
            except Exception:
                pass
        return results

    def _from_jsonld(self, data: dict) -> dict[str, Any] | None:
        try:
            if data.get("@type") not in ("Product", "Offer", "Vehicle", "Car"):
                return None

            listing = self._base_listing()
            title = data.get("name", "")
            if not title:
                return None

            year, make, model = parse_year_make_model(title)
            url = data.get("url", "")
            if url and not url.startswith("http"):
                url = PCAR_BASE + url

            slug = url.rstrip("/").split("/")[-1]

            images = []
            raw_img = data.get("image")
            if isinstance(raw_img, str):
                images = [raw_img]
            elif isinstance(raw_img, list):
                images = raw_img[:10]

            price = None
            offers = data.get("offers", {})
            if isinstance(offers, dict):
                price = parse_price(str(offers.get("price", "")))

            desc = data.get("description", "")
            mileage = parse_mileage(desc)
            transmission = normalize_transmission(desc)
            stories = has_stories_flag(title + " " + desc)

            listing.update({
                "external_id": slug or url,
                "url": url,
                "title": title,
                "make": make or "Porsche",  # PCarMarket is Porsche-focused
                "model": model,
                "year": year,
                "price": price,
                "mileage": mileage,
                "transmission": transmission,
                "images": images,
                "stories_flag": stories,
                "seller_notes": desc[:4000] or None,
            })
            return listing
        except Exception:
            return None

    def _parse_cards(self, soup: BeautifulSoup) -> list[dict[str, Any]]:
        results = []

        # PCarMarket uses various selectors for listing cards
        for selector in [
            "div.auction-item",
            "article.listing",
            "div.listing-item",
            "div.lot-item",
            "li.auction",
            ".auction-card",
        ]:
            cards = soup.select(selector)
            if cards:
                for card in cards:
                    listing = self._parse_card(card)
                    if listing:
                        results.append(listing)
                return results

        # Last resort: find all links to /auction/{slug}/
        for link in soup.find_all("a", href=re.compile(r"/auction/[^/]+/?$")):
            listing = self._parse_link_context(link)
            if listing:
                results.append(listing)

        return results

    def _parse_card(self, card) -> dict[str, Any] | None:
        try:
            listing = self._base_listing()

            link = card.select_one("a[href]")
            url = link.get("href", "") if link else ""
            if url and not url.startswith("http"):
                url = PCAR_BASE + url

            title_el = card.select_one("h1, h2, h3, .title, .listing-title, .auction-title")
            title = title_el.get_text(strip=True) if title_el else ""
            if not title and link:
                title = link.get("title", link.get_text(strip=True))
            if not title:
                return None

            slug = url.rstrip("/").split("/")[-1]
            year, make, model = parse_year_make_model(title)

            img_el = card.select_one("img")
            images = []
            if img_el:
                src = (
                    img_el.get("data-src")
                    or img_el.get("data-lazy-src")
                    or img_el.get("src")
                )
                if src and not src.startswith("data:"):
                    if not src.startswith("http"):
                        src = PCAR_BASE + src
                    images.append(src)

            price = None
            for bid_sel in [".bid-amount", ".current-bid", ".price", ".auction-price"]:
                bid_el = card.select_one(bid_sel)
                if bid_el:
                    price = parse_price(bid_el.get_text(strip=True))
                    if price:
                        break

            auction_end = None
            for time_sel in ["time[datetime]", "[data-countdown]", "[data-end]", ".ends-at"]:
                time_el = card.select_one(time_sel)
                if time_el:
                    dt_val = (
                        time_el.get("datetime")
                        or time_el.get("data-countdown")
                        or time_el.get("data-end")
                        or time_el.get_text(strip=True)
                    )
                    if dt_val:
                        try:
                            auction_end = datetime.fromisoformat(dt_val.replace("Z", "+00:00"))
                            break
                        except Exception:
                            pass

            full_text = card.get_text(separator=" ", strip=True)
            mileage = parse_mileage(full_text)
            transmission = normalize_transmission(full_text)
            color_match = re.search(r"\b(Guards Red|Speed Yellow|GT Silver|Carrera White|Black|Blue|Green|"
                                    r"Silver|Red|White|Yellow|Orange|Purple|Brown|Grey|Gray)\b",
                                    full_text, re.IGNORECASE)
            color = color_match.group(0) if color_match else None
            stories = has_stories_flag(title + " " + full_text)

            listing.update({
                "external_id": slug or url,
                "url": url,
                "title": title,
                "make": make or "Porsche",
                "model": model,
                "year": year,
                "mileage": mileage,
                "price": price,
                "color": color,
                "transmission": transmission,
                "images": images,
                "auction_end": auction_end,
                "stories_flag": stories,
            })
            return listing
        except Exception as e:
            logger.warning("PCarMarket: card parse failed: %s", e)
            return None

    def _parse_link_context(self, link) -> dict[str, Any] | None:
        """Last-resort: extract info from a listing link and its immediate context."""
        try:
            listing = self._base_listing()
            url = link.get("href", "")
            if url and not url.startswith("http"):
                url = PCAR_BASE + url

            title = link.get("title", "") or link.get_text(strip=True)
            if not title:
                parent = link.parent
                if parent:
                    title = parent.get_text(separator=" ", strip=True)[:200]
            if not title:
                return None

            slug = url.rstrip("/").split("/")[-1]
            year, make, model = parse_year_make_model(title)
            stories = has_stories_flag(title)

            listing.update({
                "external_id": slug or url,
                "url": url,
                "title": title,
                "make": make or "Porsche",
                "model": model,
                "year": year,
                "stories_flag": stories,
            })
            return listing
        except Exception:
            return None
