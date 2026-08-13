// ─── Categories ──────────────────────────────────────────────────────────────

export type Category =
  | "wheels"
  | "wraps"
  | "body-kits"
  | "exhaust"
  | "suspension"
  | "lighting"
  | "interior"
  | "tuning"
  | "audio";

export interface CategoryMeta {
  id: Category;
  label: string;
  description: string;
  icon: string; // lucide icon name
}

// ─── Products (static catalog) ────────────────────────────────────────────────

export interface Product {
  id: string;
  category: Category;
  name: string;
  brand: string;
  price_cents: number;
  compare_at_cents?: number;
  description: string;
  compatibility: "universal" | string[]; // "universal" or list of makes
  rating: number;
  reviews: number;
  featured?: boolean;
  sponsored?: boolean;
  install_time_hrs?: number;
  color?: string; // accent color for placeholder art
}

export interface ProductFilters {
  q?: string;
  category?: Category;
  make?: string;
  price_min?: number;
  price_max?: number;
  sort?: "featured" | "price_asc" | "price_desc" | "rating";
}

// ─── Builds (saved configurations) ───────────────────────────────────────────

export interface BuildItem {
  product_id: string;
  name: string;
  category: Category;
  brand: string;
  price_cents: number;
  qty: number;
}

export interface Build {
  id: string;
  user_id: string;
  name: string;
  make?: string;
  model?: string;
  year?: number;
  items: BuildItem[];
  subtotal_cents: number;
  status: "draft" | "ordered";
  created_at: string;
  updated_at: string;
}

export interface BuildCreatePayload {
  name: string;
  make?: string;
  model?: string;
  year?: number;
  items?: BuildItem[];
}

export interface BuildUpdatePayload {
  name?: string;
  make?: string;
  model?: string;
  year?: number;
  items?: BuildItem[];
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled";

export interface Order {
  id: string;
  user_id: string;
  build_id?: string | null;
  items: BuildItem[];
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  status: OrderStatus;
  created_at: string;
}

// ─── Leads (installation quote requests — B2B lead-gen revenue) ──────────────

export type LeadStatus = "new" | "claimed" | "closed";

export interface Lead {
  id: string;
  user_id?: string | null;
  name: string;
  email: string;
  phone?: string;
  zip: string;
  category?: Category;
  make?: string;
  model?: string;
  year?: number;
  budget_cents?: number;
  notes?: string;
  build_id?: string | null;
  status: LeadStatus;
  claimed_by_shop_id?: string | null;
  created_at: string;
}

export interface LeadCreatePayload {
  name: string;
  email: string;
  phone?: string;
  zip: string;
  category?: Category;
  make?: string;
  model?: string;
  year?: number;
  budget_cents?: number;
  notes?: string;
  build_id?: string;
}

// ─── Shops (install partners — subscription + lead-gen revenue) ──────────────

export interface Shop {
  id: string;
  user_id: string;
  business_name: string;
  categories: Category[];
  zip: string;
  phone?: string;
  is_pro: boolean;
  created_at: string;
}

export interface ShopCreatePayload {
  business_name: string;
  categories: Category[];
  zip: string;
  phone?: string;
}

// ─── Users / Auth ─────────────────────────────────────────────────────────────

export type Plan = "free" | "pro";
export type Role = "customer" | "shop";

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  plan: Plan;
  role: Role;
  build_count: number;
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

export type BillingPlan = "pro" | "shop";

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
