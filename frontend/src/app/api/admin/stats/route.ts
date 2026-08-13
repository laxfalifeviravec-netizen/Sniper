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
    return NextResponse.json({ detail: "Database not configured." }, { status: 503 });
  }

  try {
    await initDb();

    const [userRows, orderRows, buildRows, leadRows, shopRows] = await Promise.all([
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
          COUNT(*) FILTER (WHERE status = 'paid')::int AS paid,
          COALESCE(SUM(total_cents) FILTER (WHERE status = 'paid'), 0)::bigint AS revenue_cents,
          COALESCE(SUM(total_cents) FILTER (WHERE status = 'paid' AND created_at > NOW() - INTERVAL '30 days'), 0)::bigint AS revenue_30d_cents
        FROM orders
      `,
      sql`SELECT COUNT(*)::int AS total FROM builds`,
      sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'new')::int AS new,
          COUNT(*) FILTER (WHERE status = 'claimed')::int AS claimed
        FROM leads
      `,
      sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_pro)::int AS pro
        FROM shops
      `,
    ]);

    const u = userRows[0] ?? {};
    const o = orderRows[0] ?? {};
    const b = buildRows[0] ?? {};
    const l = leadRows[0] ?? {};
    const s = shopRows[0] ?? {};

    const proPriceCents = Number(process.env.STRIPE_PRO_PRICE_DISPLAY_CENTS ?? 1900);
    const shopPriceCents = Number(process.env.STRIPE_SHOP_PRICE_DISPLAY_CENTS ?? 9900);
    const mrrCents = Number(u.pro ?? 0) * proPriceCents + Number(s.pro ?? 0) * shopPriceCents;

    return NextResponse.json({
      users: {
        total: Number(u.total ?? 0),
        pro: Number(u.pro ?? 0),
        free: Number(u.free ?? 0),
        last_7_days: Number(u.last_7_days ?? 0),
      },
      orders: {
        total: Number(o.total ?? 0),
        paid: Number(o.paid ?? 0),
        revenue_cents: Number(o.revenue_cents ?? 0),
        revenue_30d_cents: Number(o.revenue_30d_cents ?? 0),
      },
      builds: {
        total: Number(b.total ?? 0),
      },
      leads: {
        total: Number(l.total ?? 0),
        new: Number(l.new ?? 0),
        claimed: Number(l.claimed ?? 0),
      },
      shops: {
        total: Number(s.total ?? 0),
        pro: Number(s.pro ?? 0),
      },
      mrr_cents: mrrCents,
    });
  } catch (err) {
    console.error("[admin/stats GET] Error:", err);
    return NextResponse.json({ detail: "Failed to fetch stats" }, { status: 500 });
  }
}
