"""
eBay Motors scraper.

Strategy:
1. Use eBay's Finding API (findItemsAdvanced) to search for auction-format car listings.
2. Fall back to scraping the eBay Motors search results page if the API is unavailable.

eBay Finding API docs:
https://developer.ebay.com/Devzone/finding/CallRef/findItemsAdvanced.html
"""
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode

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

EBAY_FINDING_API = "https://svcs.ebay.com/services/search/FindingService/v1"
EBAY_MOTORS_SEARCH = "https://www.ebay.com/sch/i.html"

# eBay Motors category ID for Cars & Trucks
EBAY_CARS_CATEGORY_ID = "6001"


class EbayMotorsScraper(BaseScraper):
    source = "ebay"

    def __init__(self, app_id: str | None = None):
        super().__init__()
        self.app_id = app_id  # eBay developer App ID (optional)

    async def scrape(self) -> list[dict[str, Any]]:
        results = []

        if self.app_id:
            try:
                results = await self._fetch_via_api()
                if results:
                    logger.info("eBay Motors (API): scraped %d listings", len(results))
                    return results
            except Exception as e:
                logger.warning("eBay Finding API failed: %s", e)

        try:
            results = await self._fetch_via_html()
        except Exception as e:
            logger.error("eBay Motors HTML scrape failed: %s", e, exc_info=True)

        logger.info("eBay Motors: scraped %d listings", len(results))
        return results

    async def _fetch_via_api(self) -> list[dict[str, Any]]:
        """Use eBay Finding API."""
        params = {
            "OPERATION-NAME": "findItemsAdvanced",
            "SERVICE-VERSION": "1.0.0",
            "SECURITY-APPNAME": self.app_id,
            "RESPONSE-DATA-FORMAT": "JSON",
            "REST-PAYLOAD": "",
            "categoryId": EBAY_CARS_CATEGORY_ID,
            "itemFilter(0).name": "ListingType",
            "itemFilter(0).value": "Auction",
            "itemFilter(1).name": "AvailableTo",
            "itemFilter(1).value": "US",
            "paginationInput.entriesPerPage": "100",
            "paginationInput.pageNumber": "1",
            "sortOrder": "EndTimeSoonest",
        }

        results = []
        for page in range(1, 4):  # max 3 pages
            params["paginationInput.pageNumber"] = str(page)
            data = await self.fetch_json(EBAY_FINDING_API, params=params)

            response = data.get("findItemsAdvancedResponse", [{}])[0]
            search_result = response.get("searchResult", [{}])[0]
            items = search_result.get("item", [])

            if not items:
                break

            for item in items:
                listing = self._parse_api_item(item)
                if listing:
                    results.append(listing)

        return results

    def _parse_api_item(self, item: dict) -> dict[str, Any] | None:
        try:
            listing = self._base_listing()

            title = self._first(item.get("title", []))
            if not title:
                return None

            item_id = self._first(item.get("itemId", [""]))
            url = self._first(item.get("viewItemURL", [f"https://www.ebay.com/itm/{item_id}"]))

            year, make, model = parse_year_make_model(title)

            # Price
            price = None
            selling_status = item.get("sellingStatus", [{}])[0]
            current_price = selling_status.get("currentPrice", [{}])[0]
            price_val = current_price.get("__value__")
            if price_val:
                price = parse_price(str(price_val))

            # End time
            auction_end = None
            listing_info = item.get("listingInfo", [{}])[0]
            end_time_str = self._first(listing_info.get("endTime", []))
            if end_time_str:
                try:
                    auction_end = datetime.fromisoformat(end_time_str.replace("Z", "+00:00"))
                except Exception:
                    pass

            # Image
            images = []
            gallery_url = self._first(item.get("galleryURL", []))
            if gallery_url:
                # Upgrade to larger image
                large_url = gallery_url.replace("s-l140", "s-l1600").replace("s-l300", "s-l1600")
                images.append(large_url)

            # Location
            location = None
            loc_data = item.get("location", [])
            if isinstance(loc_data, list) and loc_data:
                location = self._first(loc_data)

            stories = has_stories_flag(title)

            listing.update({
                "external_id": str(item_id),
                "url": url,
                "title": title,
                "make": make,
                "model": model,
                "year": year,
                "price": price,
                "location": location,
                "images": images,
                "auction_end": auction_end,
                "stories_flag": stories,
            })
            return listing
        except Exception as e:
            logger.warning("eBay: failed to parse API item: %s", e)
            return None

    @staticmethod
    def _first(lst: list, default=None):
        """Return first element of a list or default."""
        if isinstance(lst, list) and lst:
            return lst[0]
        return default

    async def _fetch_via_html(self) -> list[dict[str, Any]]:
        """Scrape eBay Motors auction search results."""
        results = []

        for page in range(1, 4):
            params = {
                "_nkw": "car",
                "_sacat": EBAY_CARS_CATEGORY_ID,
                "LH_Auction": "1",
                "_pgn": str(page),
                "_ipg": "60",
                "LH_ItemCondition": "3000",  # used
            }
            url = EBAY_MOTORS_SEARCH + "?" + urlencode(params)

            try:
                response = await self.fetch(url, headers={"Referer": "https://www.ebay.com/"})
                soup = BeautifulSoup(response.text, "lxml")
                page_results = self._parse_search_page(soup)
                if not page_results:
                    break
                results.extend(page_results)
            except Exception as e:
                logger.warning("eBay Motors HTML page %d failed: %s", page, e)
                break

        return results

    def _parse_search_page(self, soup: BeautifulSoup) -> list[dict[str, Any]]:
        results = []

        # eBay search results use these selectors
        for selector in [
            "li.s-item",
            "div.s-item__wrapper",
            "li[data-view]",
        ]:
            items = soup.select(selector)
            if items:
                for item in items:
                    listing = self._parse_search_item(item)
                    if listing:
                        results.append(listing)
                return results

        return results

    def _parse_search_item(self, item) -> dict[str, Any] | None:
        try:
            listing = self._base_listing()

            link = item.select_one("a.s-item__link, a[href*='/itm/']")
            if not link:
                return None

            url = link.get("href", "")
            # Clean up eBay tracking parameters
            if "?" in url:
                url = url.split("?")[0]

            # Extract item ID
            item_id_match = re.search(r"/itm/(?:[^/]+/)?(\d+)", url)
            item_id = item_id_match.group(1) if item_id_match else url

            title_el = item.select_one(".s-item__title, h3.s-item__title")
            title = title_el.get_text(strip=True) if title_el else ""
            if not title or title.lower() == "shop on ebay":
                return None

            year, make, model = parse_year_make_model(title)

            img_el = item.select_one("img.s-item__image-img, img[src*='ebayimg']")
            images = []
            if img_el:
                src = img_el.get("src") or img_el.get("data-src")
                if src and not src.startswith("data:"):
                    # Get larger version
                    src = re.sub(r"s-l\d+", "s-l1600", src)
                    images.append(src)

            price = None
            price_el = item.select_one(".s-item__price, .s-item__bid-count")
            if price_el:
                price = parse_price(price_el.get_text(strip=True))

            auction_end = None
            time_el = item.select_one(".s-item__time-end, .s-item__endtime")
            if time_el:
                end_text = time_el.get_text(strip=True)
                # eBay shows relative times like "4d 12h left"
                # We can't easily convert these without the current time reference
                # so we skip setting auction_end for HTML scrapes

            location_el = item.select_one(".s-item__location")
            location = location_el.get_text(strip=True).replace("from ", "") if location_el else None

            full_text = item.get_text(separator=" ", strip=True)
            mileage = parse_mileage(full_text)
            stories = has_stories_flag(title + " " + full_text)

            listing.update({
                "external_id": item_id,
                "url": url,
                "title": title,
                "make": make,
                "model": model,
                "year": year,
                "mileage": mileage,
                "price": price,
                "location": location,
                "images": images,
                "auction_end": auction_end,
                "stories_flag": stories,
            })
            return listing
        except Exception as e:
            logger.warning("eBay: search item parse failed: %s", e)
            return None
