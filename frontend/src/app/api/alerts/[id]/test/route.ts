import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";
import { matchesAlert, type AlertForMatch, type ListingForMatch } from "@/lib/matching";

export async function POST(
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

  try {
    await initDb();

    // Verify alert belongs to user
    const alertRows = await sql`
      SELECT * FROM alerts WHERE id = ${params.id} AND user_id = ${authUser.sub} LIMIT 1
    `;

    if (alertRows.length === 0) {
      return NextResponse.json({ detail: "Alert not found" }, { status: 404 });
    }

    const alertRow = alertRows[0];

    const alertForMatch: AlertForMatch = {
      makes: (alertRow.makes as string[]) ?? [],
      models: (alertRow.models as string[]) ?? [],
      year_min: alertRow.year_min != null ? Number(alertRow.year_min) : null,
      year_max: alertRow.year_max != null ? Number(alertRow.year_max) : null,
      mileage_max: alertRow.mileage_max != null ? Number(alertRow.mileage_max) : null,
      price_min: alertRow.price_min != null ? Number(alertRow.price_min) : null,
      price_max: alertRow.price_max != null ? Number(alertRow.price_max) : null,
      colors: (alertRow.colors as string[]) ?? [],
      transmissions: (alertRow.transmissions as string[]) ?? [],
      exclude_stories: Boolean(alertRow.exclude_stories),
      required_options: (alertRow.required_options as string[]) ?? [],
      sources: (alertRow.sources as string[]) ?? [],
    };

    // Fetch all active listings and test
    const listings = await sql`
      SELECT id, source, external_id, url, title, make, model, year, mileage, price,
             location, color, transmission, seller_notes, images, auction_end,
             stories_flag, options, created_at
      FROM listings
      WHERE is_active = true
      ORDER BY created_at DESC
    `;

    const matched = listings.filter((row) => {
      const listing: ListingForMatch = {
        make: row.make != null ? String(row.make) : null,
        model: row.model != null ? String(row.model) : null,
        year: row.year != null ? Number(row.year) : null,
        mileage: row.mileage != null ? Number(row.mileage) : null,
        price: row.price != null ? Number(row.price) : null,
        color: row.color != null ? String(row.color) : null,
        transmission: row.transmission != null ? String(row.transmission) : null,
        stories_flag: Boolean(row.stories_flag),
        source: row.source != null ? String(row.source) : null,
        title: row.title != null ? String(row.title) : null,
        seller_notes: row.seller_notes != null ? String(row.seller_notes) : null,
        options: Array.isArray(row.options) ? (row.options as string[]) : [],
      };
      return matchesAlert(listing, alertForMatch);
    });

    const sample = matched.slice(0, 10).map((row) => ({
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
      created_at: row.created_at,
    }));

    return NextResponse.json({ count: matched.length, sample });
  } catch (err) {
    console.error("[alert test] Error:", err);
    return NextResponse.json(
      { detail: "Failed to run test" },
      { status: 500 }
    );
  }
}
