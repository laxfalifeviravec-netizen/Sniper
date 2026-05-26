// ─── Source / Platform ───────────────────────────────────────────────────────

export type Source = "bat" | "cnb" | "pcarmarket" | "ebay";

export const SOURCE_LABELS: Record<Source, string> = {
  bat: "BaT",
  cnb: "Cars & Bids",
  pcarmarket: "PCarMarket",
  ebay: "eBay",
};

export const SOURCE_COLORS: Record<Source, string> = {
  bat: "bg-blue-600 text-blue-50",
  cnb: "bg-green-600 text-green-50",
  pcarmarket: "bg-purple-600 text-purple-50",
  ebay: "bg-yellow-500 text-yellow-950",
};

// ─── Listings ────────────────────────────────────────────────────────────────

export type Transmission = "manual" | "automatic" | "pdk" | "dct" | "other";

export const TRANSMISSION_LABELS: Record<Transmission, string> = {
  manual: "Manual",
  automatic: "Automatic",
  pdk: "PDK",
  dct: "DCT",
  other: "Other",
};

export interface Listing {
  id: string;
  source: Source;
  external_id: string;
  url: string;
  title: string;
  year: number;
  make: string;
  model: string;
  mileage?: number;
  color?: string;
  transmission?: Transmission;
  current_bid?: number;
  buy_now_price?: number;
  auction_end: string; // ISO date string
  image_url?: string;
  stories_flag: boolean; // true = has salvage/rebuilt/stories
  options?: string[];
  location?: string;
  created_at: string;
}

export interface ListingsResponse {
  items: Listing[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ListingFilters {
  q?: string;
  make?: string;
  model?: string;
  year_min?: number;
  year_max?: number;
  mileage_max?: number;
  price_min?: number;
  price_max?: number;
  colors?: string[];
  transmissions?: Transmission[];
  sources?: Source[];
  exclude_stories?: boolean;
  page?: number;
  per_page?: number;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export interface AlertFilters {
  make?: string;
  model?: string;
  year_min?: number;
  year_max?: number;
  mileage_max?: number;
  price_min?: number;
  price_max?: number;
  colors?: string[];
  transmissions?: Transmission[];
  sources?: Source[];
  exclude_stories?: boolean;
  required_options?: string[];
}

export interface Alert {
  id: string;
  user_id: string;
  name: string;
  filters: AlertFilters;
  notify_email: boolean;
  notify_sms: boolean;
  active: boolean;
  match_count?: number;
  last_match_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AlertCreatePayload {
  name: string;
  filters: AlertFilters;
  notify_email: boolean;
  notify_sms: boolean;
}

export interface AlertUpdatePayload {
  name?: string;
  filters?: AlertFilters;
  notify_email?: boolean;
  notify_sms?: boolean;
  active?: boolean;
}

export interface AlertMatchesResponse {
  alert: Alert;
  items: Listing[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// ─── Users / Auth ─────────────────────────────────────────────────────────────

export type Plan = "free" | "pro";

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  plan: Plan;
  alert_count: number;
  created_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

// ─── Billing ─────────────────────────────────────────────────────────────────

export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

export interface BillingPortalResponse {
  portal_url: string;
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string;
  status: number;
}
