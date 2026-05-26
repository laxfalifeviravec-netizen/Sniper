import * as cheerio from "cheerio";

export interface ScrapedListing {
  source: string;
  external_id: string;
  url: string;
  title: string;
  make: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  price: number | null;
  color: string | null;
  transmission: string | null;
  images: string[];
  auction_end: string | null;
  seller_notes: string | null;
  stories_flag: boolean;
  location: string | null;
}

// ─── Stories detection ────────────────────────────────────────────────────────

const STORIES_KEYWORDS = [
  "salvage",
  "rebuilt",
  "flood",
  "fire",
  "frame damage",
  "structural damage",
  "branded title",
  "lien",
  "accident",
  "junk title",
];

export function detectStories(text: string): boolean {
  const lower = text.toLowerCase();
  return STORIES_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Year/Make/Model parser ───────────────────────────────────────────────────

const COMMON_MAKES = [
  "Porsche","Ferrari","Lamborghini","McLaren","Aston Martin","Bentley","Rolls-Royce",
  "Maserati","Alfa Romeo","Bugatti","Pagani","Koenigsegg","Lotus","Morgan","Caterham",
  "TVR","Noble","Radical","Ariel","KTM","BAC","Ginetta","Donkervoort",
  "BMW","Mercedes","Mercedes-Benz","Audi","Volkswagen","VW",
  "Toyota","Honda","Nissan","Mazda","Subaru","Mitsubishi","Lexus","Acura","Infiniti",
  "Hyundai","Kia","Genesis","Suzuki","Isuzu","Daihatsu",
  "Ford","Chevrolet","Chevy","Dodge","Chrysler","Jeep","Ram","GMC","Buick","Cadillac",
  "Lincoln","Oldsmobile","Pontiac","Saturn","Hummer","Tesla","Rivian","Lucid",
  "Volvo","Saab","SAAB","Land Rover","Range Rover","Jaguar","Mini","MINI","Rolls Royce",
  "Fiat","Lancia","Citroen","Citroën","Peugeot","Renault","Skoda","SEAT","Cupra",
  "Triumph","Austin","MG","Morris","Rover","TVR","Sunbeam","Healey",
  "De Tomaso","Pantera","Vector","Mosler","Saleen","Hennessey","Shelby",
  "AC","Bristol","Jensen","Marcos","Reliant",
];

function parseTitleParts(title: string): { year: number | null; make: string | null; model: string | null } {
  const yearMatch = title.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;

  let make: string | null = null;
  let model: string | null = null;

  for (const candidate of COMMON_MAKES) {
    const re = new RegExp(`\\b${candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(title)) {
      make = candidate;
      // Try to extract model: everything after make until end or comma
      const afterMake = title.slice(title.search(re) + candidate.length).trim();
      const modelPart = afterMake.replace(/^[-–—,\s]+/, "").split(/[,(]/)[0].trim();
      // Remove year from model part
      model = modelPart.replace(/\b(19[5-9]\d|20[0-2]\d)\b/, "").trim() || null;
      if (model === "") model = null;
      break;
    }
  }

  return { year, make, model };
}

function parsePriceText(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function safeFetch(url: string, options: RequestInit = {}): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        ...options.headers,
      },
      signal: AbortSignal.timeout(15000),
      ...options,
    });
    return res;
  } catch {
    return null;
  }
}

// ─── BaT scraper ─────────────────────────────────────────────────────────────

async function scrapeBaT(): Promise<ScrapedListing[]> {
  try {
    const res = await safeFetch(
      "https://bringatrailer.com/wp-json/bat/v1/auctions?status=open&per_page=50",
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; Sniper/1.0)",
        },
      }
    );
    if (!res || !res.ok) return [];

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return [];
    }

    const items = Array.isArray(data) ? data : (data as Record<string, unknown>)?.results;
    if (!Array.isArray(items)) return [];

    return items.map((item: Record<string, unknown>) => {
      const title = String(item.title ?? item.listing_title ?? "");
      const { year, make, model } = parseTitleParts(title);
      const notes = String(item.seller_notes ?? item.description ?? "");
      const images: string[] = [];
      if (Array.isArray(item.images)) {
        for (const img of item.images as Record<string, unknown>[]) {
          const src = String(img.url ?? img.src ?? img ?? "");
          if (src.startsWith("http")) images.push(src);
        }
      } else if (typeof item.image_url === "string") {
        images.push(item.image_url);
      }

      const priceRaw = item.current_bid ?? item.reserve_price ?? item.price;
      const price = priceRaw != null ? parsePriceText(String(priceRaw)) : null;
      const auctionEnd = item.end_date ? String(item.end_date) : null;
      const externalId = String(item.id ?? item.listing_id ?? item.slug ?? title);

      return {
        source: "bat",
        external_id: externalId,
        url: String(item.url ?? item.permalink ?? `https://bringatrailer.com/?p=${externalId}`),
        title,
        make,
        model,
        year,
        mileage: null,
        price,
        color: null,
        transmission: null,
        images,
        auction_end: auctionEnd,
        seller_notes: notes || null,
        stories_flag: detectStories(title + " " + notes),
        location: item.location ? String(item.location) : null,
      };
    });
  } catch {
    return [];
  }
}

// ─── Cars & Bids scraper ──────────────────────────────────────────────────────

async function scrapeCarsAndBids(): Promise<ScrapedListing[]> {
  try {
    // Try JSON first
    const jsonRes = await safeFetch("https://carsandbids.com/auctions/", {
      headers: { Accept: "application/json" },
    });

    if (jsonRes && jsonRes.ok) {
      const contentType = jsonRes.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const data = await jsonRes.json().catch(() => null);
        if (data && Array.isArray(data.auctions)) {
          return (data.auctions as Record<string, unknown>[]).map((item) => {
            const title = String(item.title ?? "");
            const { year, make, model } = parseTitleParts(title);
            const notes = String(item.description ?? "");
            const images: string[] = [];
            if (typeof item.thumbnail === "string") images.push(item.thumbnail);

            return {
              source: "cnb",
              external_id: String(item.id ?? item.slug ?? title),
              url: item.url
                ? String(item.url)
                : `https://carsandbids.com/auctions/${item.slug ?? item.id}`,
              title,
              make,
              model,
              year,
              mileage: item.mileage ? parseInt(String(item.mileage).replace(/\D/g, ""), 10) || null : null,
              price: item.current_bid ? parsePriceText(String(item.current_bid)) : null,
              color: item.color ? String(item.color) : null,
              transmission: item.transmission ? String(item.transmission) : null,
              images,
              auction_end: item.ends_at ? String(item.ends_at) : null,
              seller_notes: notes || null,
              stories_flag: detectStories(title + " " + notes),
              location: item.location ? String(item.location) : null,
            };
          });
        }
      }
    }

    // Fall back to HTML scraping
    const htmlRes = await safeFetch("https://carsandbids.com/auctions/");
    if (!htmlRes || !htmlRes.ok) return [];
    const html = await htmlRes.text().catch(() => "");
    const $ = cheerio.load(html);
    const results: ScrapedListing[] = [];

    $(".auction-card, [data-testid='auction-card'], article.auction, .listing-card").each((_, el) => {
      const titleEl = $(el).find("h2, h3, .auction-title, .listing-title").first();
      const title = titleEl.text().trim();
      if (!title) return;

      const { year, make, model } = parseTitleParts(title);
      const href = $(el).find("a").first().attr("href") ?? "";
      const url = href.startsWith("http") ? href : `https://carsandbids.com${href}`;
      const priceText = $(el).find(".current-bid, .bid-amount, .price").first().text();
      const price = parsePriceText(priceText);
      const imgSrc = $(el).find("img").first().attr("src") ?? "";
      const images = imgSrc ? [imgSrc] : [];
      const endText = $(el).find(".time-remaining, .auction-end, [data-end]").first().text();

      results.push({
        source: "cnb",
        external_id: href.replace(/\//g, "_").replace(/^_/, "") || title,
        url,
        title,
        make,
        model,
        year,
        mileage: null,
        price,
        color: null,
        transmission: null,
        images,
        auction_end: endText || null,
        seller_notes: null,
        stories_flag: detectStories(title),
        location: null,
      });
    });

    return results;
  } catch {
    return [];
  }
}

// ─── PCarMarket scraper ───────────────────────────────────────────────────────

async function scrapePCarMarket(): Promise<ScrapedListing[]> {
  try {
    const res = await safeFetch("https://www.pcarmarket.com/auction/");
    if (!res || !res.ok) return [];
    const html = await res.text().catch(() => "");
    const $ = cheerio.load(html);
    const results: ScrapedListing[] = [];

    $(
      ".auction-item, .listing-item, article, .vehicle-card, [class*='auction'], [class*='listing']"
    ).each((_, el) => {
      const titleEl = $(el)
        .find("h2, h3, h4, .title, .vehicle-name, .listing-title")
        .first();
      const title = titleEl.text().trim();
      if (!title || title.length < 5) return;

      const href = $(el).find("a").first().attr("href") ?? "";
      if (!href) return;

      const url = href.startsWith("http")
        ? href
        : `https://www.pcarmarket.com${href}`;

      const { year, make, model } = parseTitleParts(title);
      const priceText = $(el)
        .find(".price, .bid, .current-bid, [class*='price'], [class*='bid']")
        .first()
        .text();
      const price = parsePriceText(priceText);
      const imgSrc = $(el).find("img").first().attr("src") ?? "";
      const images = imgSrc ? [imgSrc] : [];
      const notes = $(el).find(".description, p").first().text().trim();

      const externalId =
        href
          .replace("https://www.pcarmarket.com", "")
          .replace(/\//g, "_")
          .replace(/^_|_$/g, "") || title;

      results.push({
        source: "pcarmarket",
        external_id: externalId,
        url,
        title,
        make,
        model,
        year,
        mileage: null,
        price,
        color: null,
        transmission: null,
        images,
        auction_end: null,
        seller_notes: notes || null,
        stories_flag: detectStories(title + " " + notes),
        location: null,
      });
    });

    return results;
  } catch {
    return [];
  }
}

// ─── eBay Motors scraper ──────────────────────────────────────────────────────

async function scrapeEbay(): Promise<ScrapedListing[]> {
  try {
    const res = await safeFetch(
      "https://www.ebay.com/b/Cars-Trucks/6001/bn_1865117?LH_Auction=1&LH_ItemCondition=3000",
      {
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      }
    );
    if (!res || !res.ok) return [];
    const html = await res.text().catch(() => "");
    const $ = cheerio.load(html);
    const results: ScrapedListing[] = [];

    // eBay search results use s-item class
    $(".s-item, [data-viewport]").each((_, el) => {
      const titleEl = $(el).find(".s-item__title, h3").first();
      const title = titleEl.text().trim().replace(/^New Listing\s*/i, "");
      if (!title || title.length < 5) return;

      const href =
        $(el).find("a.s-item__link, a").first().attr("href") ?? "";
      if (!href || !href.includes("ebay.com")) return;

      // Extract item ID from URL
      const itemIdMatch = href.match(/\/itm\/(\d+)/);
      const externalId = itemIdMatch ? itemIdMatch[1] : href.slice(-20);

      const { year, make, model } = parseTitleParts(title);

      const priceText = $(el)
        .find(".s-item__price, .notranslate")
        .first()
        .text();
      const price = parsePriceText(priceText);

      const imgSrc = $(el).find("img.s-item__image-img, img").first().attr("src") ?? "";
      const images = imgSrc && imgSrc.startsWith("http") ? [imgSrc] : [];

      const endText = $(el)
        .find(".s-item__time-end, .s-item__time-left")
        .first()
        .text()
        .trim();

      const location = $(el)
        .find(".s-item__location, .s-item__itemLocation")
        .first()
        .text()
        .replace(/^from\s*/i, "")
        .trim();

      results.push({
        source: "ebay",
        external_id: externalId,
        url: href,
        title,
        make,
        model,
        year,
        mileage: null,
        price,
        color: null,
        transmission: null,
        images,
        auction_end: endText || null,
        seller_notes: null,
        stories_flag: detectStories(title),
        location: location || null,
      });
    });

    return results;
  } catch {
    return [];
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function scrapeAllSources(): Promise<ScrapedListing[]> {
  const [bat, cnb, pcarmarket, ebay] = await Promise.allSettled([
    scrapeBaT(),
    scrapeCarsAndBids(),
    scrapePCarMarket(),
    scrapeEbay(),
  ]);

  const all: ScrapedListing[] = [
    ...(bat.status === "fulfilled" ? bat.value : []),
    ...(cnb.status === "fulfilled" ? cnb.value : []),
    ...(pcarmarket.status === "fulfilled" ? pcarmarket.value : []),
    ...(ebay.status === "fulfilled" ? ebay.value : []),
  ];

  // Deduplicate by source + external_id
  const seen = new Set<string>();
  return all.filter((item) => {
    const key = `${item.source}::${item.external_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
