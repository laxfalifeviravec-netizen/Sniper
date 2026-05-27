import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(authUser.email.toLowerCase())) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { detail: "Database not configured." },
      { status: 503 }
    );
  }

  try {
    await initDb();

    const [userRows, listingRows, alertRows, matchRows] = await Promise.all([
      sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE subscription_tier = 'pro')::int AS pro,
          COUNT(*) FILTER (WHERE subscription_tier = 'free')::int AS free,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS last_7_days
        FROM users
      `,
      sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_active)::int AS active,
          MAX(created_at) AS last_scraped,
          COUNT(*) FILTER (WHERE source = 'bat')::int AS bat,
          COUNT(*) FILTER (WHERE source = 'cnb')::int AS cnb,
          COUNT(*) FILTER (WHERE source = 'pcarmarket')::int AS pcarmarket,
          COUNT(*) FILTER (WHERE source = 'ebay')::int AS ebay
        FROM listings
      `,
      sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_active)::int AS active,
          COUNT(*) FILTER (WHERE notify_sms)::int AS with_sms
        FROM alerts
      `,
      sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE notified_at > NOW() - INTERVAL '24 hours')::int AS last_24h
        FROM alert_matches
      `,
    ]);

    const u = userRows[0] ?? {};
    const l = listingRows[0] ?? {};
    const a = alertRows[0] ?? {};
    const m = matchRows[0] ?? {};

    return NextResponse.json({
      users: {
        total: Number(u.total ?? 0),
        pro: Number(u.pro ?? 0),
        free: Number(u.free ?? 0),
        last_7_days: Number(u.last_7_days ?? 0),
      },
      listings: {
        total: Number(l.total ?? 0),
        active: Number(l.active ?? 0),
        by_source: {
          bat: Number(l.bat ?? 0),
          cnb: Number(l.cnb ?? 0),
          pcarmarket: Number(l.pcarmarket ?? 0),
          ebay: Number(l.ebay ?? 0),
        },
        last_scraped: (l.last_scraped as string) ?? null,
      },
      alerts: {
        total: Number(a.total ?? 0),
        active: Number(a.active ?? 0),
        with_sms: Number(a.with_sms ?? 0),
      },
      matches: {
        total: Number(m.total ?? 0),
        last_24h: Number(m.last_24h ?? 0),
      },
    });
  } catch (err) {
    console.error("[admin/stats GET] Error:", err);
    return NextResponse.json(
      { detail: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
