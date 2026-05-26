"""
Base scraper with shared HTTP client, parsing utilities, and normalization helpers.
"""
import logging
import re
from abc import ABC, abstractmethod
from typing import Any

import httpx

logger = logging.getLogger(__name__)

STORIES_KEYWORDS = [
    "salvage",
    "rebuilt title",
    "rebuilt/salvage",
    "lemon law",
    "flood",
    "frame damage",
    "structural damage",
    "reconstructed",
    "non-op",
    "non op",
    "bonded title",
    "certificate of destruction",
    "parts only",
    "insurance loss",
]

COMMON_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

JSON_HEADERS = {
    **COMMON_HEADERS,
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
}


def has_stories_flag(text: str) -> bool:
    """Return True if the text contains any damage/title issue keywords."""
    if not text:
        return False
    lower = text.lower()
    return any(keyword in lower for keyword in STORIES_KEYWORDS)


def normalize_transmission(raw: str | None) -> str | None:
    """Normalize transmission string to enum values: manual, automatic, other."""
    if not raw:
        return None
    lower = raw.lower()
    if any(w in lower for w in ["manual", "stick", "6-speed", "5-speed", "4-speed", "3-speed", "gated"]):
        return "manual"
    if any(w in lower for w in ["automatic", "auto", "dsg", "pdk", "cvt", "tiptronic", "f1 pump", "smg"]):
        return "automatic"
    return "other"


def parse_mileage(text: str | None) -> int | None:
    """Extract integer mileage from a string like '42,500 miles'."""
    if not text:
        return None
    match = re.search(r"([\d,]+)\s*(?:miles?|mi)", text, re.IGNORECASE)
    if match:
        try:
            return int(match.group(1).replace(",", ""))
        except ValueError:
            return None
    # Fallback: first numeric sequence
    match = re.search(r"[\d,]+", text)
    if match:
        try:
            return int(match.group().replace(",", ""))
        except ValueError:
            return None
    return None


def parse_price(text: str | None) -> float | None:
    """Extract a dollar amount from a string like '$42,500' or '42500'."""
    if not text:
        return None
    text = str(text).replace(",", "").replace("$", "").strip()
    # Remove any trailing non-numeric characters
    match = re.search(r"\d+(?:\.\d+)?", text)
    if match:
        try:
            return float(match.group())
        except ValueError:
            return None
    return None


def parse_year_make_model(title: str) -> tuple[int | None, str | None, str | None]:
    """
    Attempt to extract year, make, model from a listing title.
    Example: "1974 Porsche 911 Targa" -> (1974, "Porsche", "911 Targa")
    """
    if not title:
        return None, None, None

    year = None
    year_match = re.match(r"^(\d{4})\s+", title)
    if year_match:
        candidate = int(year_match.group(1))
        if 1900 <= candidate <= 2030:
            year = candidate

    remaining = re.sub(r"^\d{4}\s+", "", title).strip()

    # Known makes (partial list — extend as needed)
    makes = [
        "Alfa Romeo", "Aston Martin", "Austin-Healey", "BMW", "Bugatti",
        "Chevrolet", "Dodge", "Ferrari", "Fiat", "Ford", "Honda",
        "Jaguar", "Lamborghini", "Land Rover", "Lotus", "Maserati",
        "McLaren", "Mercedes-Benz", "Mercedes", "MG", "Mitsubishi", "Nissan",
        "Pagani", "Pontiac", "Porsche", "Rolls-Royce", "Subaru",
        "Toyota", "Triumph", "Volkswagen", "Volvo",
    ]

    make = None
    model = None
    for m in sorted(makes, key=len, reverse=True):
        if remaining.lower().startswith(m.lower()):
            make = m
            model = remaining[len(m):].strip()
            # Take first few words of model
            model_words = model.split()
            if model_words:
                model = " ".join(model_words[:3])
            else:
                model = None
            break

    if not make and remaining:
        words = remaining.split()
        make = words[0] if words else None
        model = " ".join(words[1:4]) if len(words) > 1 else None

    return year, make, model


class BaseScraper(ABC):
    """Abstract base class for all scrapers."""

    source: str  # Override in subclasses

    def __init__(self):
        self.client = httpx.AsyncClient(
            headers=COMMON_HEADERS,
            timeout=httpx.Timeout(30.0, connect=10.0),
            follow_redirects=True,
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.client.aclose()

    async def fetch(self, url: str, headers: dict | None = None) -> httpx.Response:
        """GET a URL with optional header overrides."""
        h = {**COMMON_HEADERS, **(headers or {})}
        response = await self.client.get(url, headers=h)
        response.raise_for_status()
        return response

    async def fetch_json(self, url: str, params: dict | None = None, headers: dict | None = None) -> Any:
        """GET a JSON endpoint."""
        h = {**JSON_HEADERS, **(headers or {})}
        response = await self.client.get(url, params=params, headers=h)
        response.raise_for_status()
        return response.json()

    @abstractmethod
    async def scrape(self) -> list[dict[str, Any]]:
        """
        Scrape current active listings.
        Returns a list of dicts, each matching the Listing model fields.
        """
        ...

    def _base_listing(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "external_id": "",
            "url": "",
            "title": "",
            "make": None,
            "model": None,
            "year": None,
            "mileage": None,
            "price": None,
            "location": None,
            "color": None,
            "transmission": None,
            "engine": None,
            "seller_notes": None,
            "images": [],
            "auction_end": None,
            "is_active": True,
            "stories_flag": False,
            "options": {},
        }
