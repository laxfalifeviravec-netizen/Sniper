import { getToken, clearToken } from "./auth";
import type {
  Product,
  ProductFilters,
  Build,
  BuildCreatePayload,
  BuildUpdatePayload,
  Order,
  Lead,
  LeadCreatePayload,
  Shop,
  ShopCreatePayload,
  AuthTokenResponse,
  LoginPayload,
  RegisterPayload,
  ForgotPasswordPayload,
  User,
  CheckoutSessionResponse,
  BillingPortalResponse,
  BillingPlan,
} from "@/types";
import { buildQueryString } from "./utils";

// All API calls go to Next.js API routes — no separate backend needed
const API_BASE = "/api";

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && authenticated) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export const authApi = {
  login(payload: LoginPayload): Promise<AuthTokenResponse> {
    return apiFetch<AuthTokenResponse>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email: payload.email, password: payload.password }),
      },
      false
    );
  },

  register(payload: RegisterPayload): Promise<AuthTokenResponse> {
    return apiFetch<AuthTokenResponse>(
      "/auth/register",
      { method: "POST", body: JSON.stringify(payload) },
      false
    );
  },

  forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(
      "/auth/forgot-password",
      { method: "POST", body: JSON.stringify(payload) },
      false
    );
  },

  me(): Promise<User> {
    return apiFetch<User>("/auth/me");
  },

  updateProfile(payload: Partial<Pick<User, "name" | "phone">>): Promise<User> {
    return apiFetch<User>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};

// ─── Products endpoints ───────────────────────────────────────────────────────

export const productsApi = {
  list(filters: ProductFilters = {}): Promise<{ items: Product[]; total: number }> {
    const qs = buildQueryString(filters as Record<string, unknown>);
    return apiFetch<{ items: Product[]; total: number }>(
      `/products${qs ? `?${qs}` : ""}`,
      {},
      false
    );
  },

  get(id: string): Promise<Product> {
    return apiFetch<Product>(`/products/${id}`, {}, false);
  },
};

// ─── Builds endpoints ─────────────────────────────────────────────────────────

export const buildsApi = {
  list(): Promise<Build[]> {
    return apiFetch<Build[]>("/builds");
  },

  get(id: string): Promise<Build> {
    return apiFetch<Build>(`/builds/${id}`);
  },

  create(payload: BuildCreatePayload): Promise<Build> {
    return apiFetch<Build>("/builds", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: BuildUpdatePayload): Promise<Build> {
    return apiFetch<Build>(`/builds/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  delete(id: string): Promise<void> {
    return apiFetch<void>(`/builds/${id}`, { method: "DELETE" });
  },
};

// ─── Checkout / Orders ────────────────────────────────────────────────────────

export const ordersApi = {
  checkout(payload: {
    items: { product_id: string; qty: number }[];
    build_id?: string;
  }): Promise<CheckoutSessionResponse> {
    return apiFetch<CheckoutSessionResponse>("/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  list(): Promise<Order[]> {
    return apiFetch<Order[]>("/orders");
  },
};

// ─── Leads endpoints ──────────────────────────────────────────────────────────

export const leadsApi = {
  create(payload: LeadCreatePayload): Promise<Lead> {
    return apiFetch<Lead>(
      "/leads",
      { method: "POST", body: JSON.stringify(payload) },
      false
    );
  },

  list(): Promise<Lead[]> {
    return apiFetch<Lead[]>("/leads");
  },

  claim(id: string): Promise<Lead> {
    return apiFetch<Lead>(`/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "claimed" }),
    });
  },
};

// ─── Shops endpoints ──────────────────────────────────────────────────────────

export const shopsApi = {
  register(payload: ShopCreatePayload): Promise<Shop> {
    return apiFetch<Shop>("/shops", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  me(): Promise<Shop | null> {
    return apiFetch<Shop | null>("/shops/me");
  },
};

// ─── Billing endpoints ────────────────────────────────────────────────────────

export const billingApi = {
  createCheckoutSession(plan: BillingPlan = "pro"): Promise<CheckoutSessionResponse> {
    return apiFetch<CheckoutSessionResponse>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
  },

  createPortalSession(): Promise<BillingPortalResponse> {
    return apiFetch<BillingPortalResponse>("/billing/portal", {
      method: "POST",
    });
  },
};
