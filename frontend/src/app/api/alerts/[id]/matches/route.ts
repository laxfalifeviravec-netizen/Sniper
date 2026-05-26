import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ detail: "Database not configured." }, { status: 503 });
  }

  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get("per_page") ?? "20", 10)));
  const offset = (page - 1) * perPage;

  try {
    await initDb();

    // Verify the alert belongs to the current user
    const alertRows = await sql`
      SELECT * FROM alerts WHERE id = ${params.id} AND user_id = ${authUser.sub} LIMIT 1
    `;

    if (alertRows.length === 0) {
      return NextResponse.json({ detail: "Alert not found" }, { status: 404 });
    }

    const alert = alertRows[0];

    const [countRows, matchRows] = await Promise.all([
      sql`
        SELECT COUNT(*) as total
        FROM alert_matches am
        JOIN listings l ON l.id = am.listing_id
        WHERE am.alert_id = ${params.id}
      `,
      sql`
        SELECT l.*, am.notified_at
        FROM alert_matches am
        JOIN listings l ON l.id = am.listing_id
        WHERE am.alert_id = ${params.id}
        ORDER BY am.notified_at DESC
        LIMIT ${perPage} OFFSET ${offset}
      `,
    ]);

    const total = parseInt(String(countRows[0]?.total ?? "0"), 10);
    const pages = Math.ceil(total / perPage);

    const listings = matchRows.map((row: Record<string, unknown>) => ({
      id: row.id,
      source: row.source,
      external_id: row.external_id,
      url: row.url,
      title: row.title,
      make: row.make ?? null,
      model: row.model ?? null,
      year: row.year ?? null,
      mileage: row.mileage ?? null,
      price: row.price ?? null,
      location: row.location ?? null,
      color: row.color ?? null,
      transmission: row.transmission ?? null,
      images: Array.isArray(row.images) ? row.images : [],
      auction_end: row.auction_end ?? null,
      stories_flag: row.stories_flag ?? false,
      options: Array.isArray(row.options) ? row.options : [],
      created_at: row.created_at,
    }));

    return NextResponse.json({
      alert: {
        id: alert.id,
        user_id: alert.user_id,
        name: alert.name,
        notify_email: alert.notify_email,
        notify_sms: alert.notify_sms,
        active: alert.is_active,
        created_at: alert.created_at,
      },
      items: listings,
      total,
      page,
      per_page: perPage,
      pages,
    });
  } catch (err) {
    console.error("[alert matches GET] Error:", err);
    return NextResponse.json(
      { detail: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}
