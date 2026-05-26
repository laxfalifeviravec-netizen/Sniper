import { getToken, clearToken } from "./auth";
import type {
  Listing,
  ListingsResponse,
  ListingFilters,
  Alert,
  AlertCreatePayload,
  AlertUpdatePayload,
  AlertMatchesResponse,
  AuthTokenResponse,
  LoginPayload,
  RegisterPayload,
  ForgotPasswordPayload,
  User,
  CheckoutSessionResponse,
  BillingPortalResponse,
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

  if (res.status === 401) {
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

// ─── Listings endpoints ───────────────────────────────────────────────────────

export const listingsApi = {
  list(filters: ListingFilters = {}): Promise<ListingsResponse> {
    const qs = buildQueryString(filters as Record<string, unknown>);
    return apiFetch<ListingsResponse>(
      `/listings${qs ? `?${qs}` : ""}`,
      {},
      false
    );
  },

  get(id: string): Promise<Listing> {
    return apiFetch<Listing>(`/listings/${id}`, {}, false);
  },

  recent(limit = 20): Promise<Listing[]> {
    return apiFetch<ListingsResponse>(`/listings?per_page=${limit}`, {}, false).then(
      (res) => res.items ?? []
    );
  },
};

// ─── Alerts endpoints ─────────────────────────────────────────────────────────

export const alertsApi = {
  list(): Promise<Alert[]> {
    return apiFetch<Alert[]>("/alerts");
  },

  get(id: string): Promise<Alert> {
    return apiFetch<Alert>(`/alerts/${id}`);
  },

  create(payload: AlertCreatePayload): Promise<Alert> {
    return apiFetch<Alert>("/alerts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: AlertUpdatePayload): Promise<Alert> {
    return apiFetch<Alert>(`/alerts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  delete(id: string): Promise<void> {
    return apiFetch<void>(`/alerts/${id}`, { method: "DELETE" });
  },

  matches(
    id: string,
    page = 1,
    per_page = 20
  ): Promise<AlertMatchesResponse> {
    return apiFetch<AlertMatchesResponse>(
      `/alerts/${id}/matches?page=${page}&per_page=${per_page}`
    );
  },

  test(
    payload: AlertCreatePayload
  ): Promise<{ count: number; items: Listing[] }> {
    return apiFetch<{ count: number; items: Listing[] }>("/alerts/test", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// ─── Billing endpoints ────────────────────────────────────────────────────────

export const billingApi = {
  createCheckoutSession(): Promise<CheckoutSessionResponse> {
    return apiFetch<CheckoutSessionResponse>("/api/billing/checkout", {
      method: "POST",
    });
  },

  createPortalSession(): Promise<BillingPortalResponse> {
    return apiFetch<BillingPortalResponse>("/api/billing/portal", {
      method: "POST",
    });
  },
};
