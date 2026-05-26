import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { detail: "Database not configured." },
      { status: 503 }
    );
  }

  const { id } = params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ detail: "Invalid listing ID" }, { status: 400 });
  }

  try {
    await initDb();

    const rows = await sql`
      SELECT id, source, external_id, url, title, make, model, year, mileage, price,
             location, color, transmission, engine, seller_notes, images,
             auction_end, is_active, stories_flag, options, created_at, updated_at
      FROM listings
      WHERE id = ${id}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ detail: "Listing not found" }, { status: 404 });
    }

    const row = rows[0];
    return NextResponse.json({
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
      updated_at: row.updated_at,
    });
  } catch (err) {
    console.error("[listing GET] Error:", err);
    return NextResponse.json(
      { detail: "Failed to fetch listing" },
      { status: 500 }
    );
  }
}
