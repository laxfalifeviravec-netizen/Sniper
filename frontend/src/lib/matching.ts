// Types for matching (kept minimal to avoid circular deps)
export interface ListingForMatch {
  make?: string | null;
  model?: string | null;
  year?: number | null;
  mileage?: number | null;
  price?: number | null;
  color?: string | null;
  transmission?: string | null;
  stories_flag?: boolean;
  source?: string | null;
  title?: string | null;
  seller_notes?: string | null;
  options?: string[] | null;
}

export interface AlertForMatch {
  makes?: string[];
  models?: string[];
  year_min?: number | null;
  year_max?: number | null;
  mileage_max?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  colors?: string[];
  transmissions?: string[];
  exclude_stories?: boolean;
  required_options?: string[];
  sources?: string[];
}

function partialMatch(value: string | null | undefined, candidates: string[]): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  return candidates.some((c) => lower.includes(c.toLowerCase()) || c.toLowerCase().includes(lower));
}

export function matchesAlert(listing: ListingForMatch, alert: AlertForMatch): boolean {
  // Make filter
  if (alert.makes && alert.makes.length > 0) {
    if (!partialMatch(listing.make, alert.makes)) return false;
  }

  // Model filter
  if (alert.models && alert.models.length > 0) {
    if (!partialMatch(listing.model, alert.models)) return false;
  }

  // Year range
  if (alert.year_min != null && listing.year != null) {
    if (listing.year < alert.year_min) return false;
  }
  if (alert.year_max != null && listing.year != null) {
    if (listing.year > alert.year_max) return false;
  }

  // Mileage max
  if (alert.mileage_max != null && listing.mileage != null) {
    if (listing.mileage > alert.mileage_max) return false;
  }

  // Price range
  if (alert.price_min != null && listing.price != null) {
    if (listing.price < alert.price_min) return false;
  }
  if (alert.price_max != null && listing.price != null) {
    if (listing.price > alert.price_max) return false;
  }

  // Color filter
  if (alert.colors && alert.colors.length > 0) {
    if (!partialMatch(listing.color, alert.colors)) return false;
  }

  // Transmission filter (exact case-insensitive)
  if (alert.transmissions && alert.transmissions.length > 0) {
    if (!listing.transmission) return false;
    const lt = listing.transmission.toLowerCase();
    if (!alert.transmissions.some((t) => t.toLowerCase() === lt)) return false;
  }

  // Exclude stories
  if (alert.exclude_stories && listing.stories_flag) {
    return false;
  }

  // Required options — all must appear in title or seller_notes
  if (alert.required_options && alert.required_options.length > 0) {
    const searchText = [listing.title ?? "", listing.seller_notes ?? ""]
      .join(" ")
      .toLowerCase();
    for (const option of alert.required_options) {
      if (!searchText.includes(option.toLowerCase())) return false;
    }
  }

  // Source filter
  if (alert.sources && alert.sources.length > 0) {
    if (!listing.source) return false;
    if (!alert.sources.includes(listing.source)) return false;
  }

  return true;
}
