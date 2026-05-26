import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNowStrict, format, differenceInSeconds } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatMileage(miles: number): string {
  return new Intl.NumberFormat("en-US").format(miles) + " mi";
}

export function formatTimeRemaining(endDate: string): {
  display: string;
  urgency: "normal" | "warning" | "critical";
  seconds: number;
} {
  const end = new Date(endDate);
  const now = new Date();
  const seconds = differenceInSeconds(end, now);

  if (seconds <= 0) {
    return { display: "Ended", urgency: "critical", seconds: 0 };
  }

  const hours = seconds / 3600;

  let urgency: "normal" | "warning" | "critical" = "normal";
  if (hours < 1) urgency = "critical";
  else if (hours < 4) urgency = "warning";

  const display = formatDistanceToNowStrict(end, { addSuffix: false });
  return { display, urgency, seconds };
}

export function formatDate(date: string): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: string): string {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

export function buildQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      value.forEach((v) => query.append(key, String(v)));
    } else {
      query.set(key, String(value));
    }
  }
  return query.toString();
}

export const COLORS = [
  "Red",
  "Blue",
  "Silver",
  "Black",
  "White",
  "Yellow",
  "Green",
  "Orange",
  "Grey",
  "Other",
] as const;

export type CarColor = (typeof COLORS)[number];
