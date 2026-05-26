import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      listings: [],
      items: [],
      total: 0,
      page: 1,
      per_page: 24,
      pages: 0,
    });
  }

  const { searchParams } = new URL(request.url);

  const make = searchParams.get("make") ?? null;
  const model = searchParams.get("model") ?? null;
  const yearMin = searchParams.get("year_min") ? parseInt(searchParams.get("year_min")!, 10) : null;
  const yearMax = searchParams.get("year_max") ? parseInt(searchParams.get("year_max")!, 10) : null;
  const mileageMax = searchParams.get("mileage_max")
    ? parseInt(searchParams.get("mileage_max")!, 10)
    : null;
  const priceMin = searchParams.get("price_min")
    ? parseInt(searchParams.get("price_min")!, 10)
    : null;
  const priceMax = searchParams.get("price_max")
    ? parseInt(searchParams.get("price_max")!, 10)
    : null;
  const color = searchParams.get("color") ?? null;
  const transmission = searchParams.get("transmission") ?? null;
  const source = searchParams.get("source") ?? null;
  const excludeStories = searchParams.get("exclude_stories") === "true";
  const search = searchParams.get("search") ?? searchParams.get("q") ?? null;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const perPage = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("per_page") ?? "24", 10))
  );
  const offset = (page - 1) * perPage;

  try {
    await initDb();

    // Use tagged template literals with conditional chaining via Neon
    // Build the full query with all filters applied
    const makeFilter = make ? `%${make.toLowerCase()}%` : null;
    const modelFilter = model ? `%${model.toLowerCase()}%` : null;
    const colorFilter = color ? `%${color.toLowerCase()}%` : null;
    const searchFilter = search ? `%${search.toLowerCase()}%` : null;

    const countRows = await sql`
      SELECT COUNT(*) as total
      FROM listings
      WHERE is_active = true
        AND (${makeFilter}::text IS NULL OR LOWER(make) LIKE ${makeFilter})
        AND (${modelFilter}::text IS NULL OR LOWER(model) LIKE ${modelFilter})
        AND (${yearMin}::int IS NULL OR year >= ${yearMin})
        AND (${yearMax}::int IS NULL OR year <= ${yearMax})
        AND (${mileageMax}::int IS NULL OR mileage IS NULL OR mileage <= ${mileageMax})
        AND (${priceMin}::int IS NULL OR price IS NULL OR price >= ${priceMin})
        AND (${priceMax}::int IS NULL OR price IS NULL OR price <= ${priceMax})
        AND (${colorFilter}::text IS NULL OR LOWER(color) LIKE ${colorFilter})
        AND (${transmission}::text IS NULL OR LOWER(transmission) = LOWER(${transmission}))
        AND (${source}::text IS NULL OR source = ${source})
        AND (${excludeStories} = false OR stories_flag = false)
        AND (${searchFilter}::text IS NULL
             OR LOWER(title) LIKE ${searchFilter}
             OR LOWER(COALESCE(seller_notes,'')) LIKE ${searchFilter})
    `;

    const dataRows = await sql`
      SELECT id, source, external_id, url, title, make, model, year, mileage, price,
             location, color, transmission, engine, seller_notes, images,
             auction_end, is_active, stories_flag, options, created_at, updated_at
      FROM listings
      WHERE is_active = true
        AND (${makeFilter}::text IS NULL OR LOWER(make) LIKE ${makeFilter})
        AND (${modelFilter}::text IS NULL OR LOWER(model) LIKE ${modelFilter})
        AND (${yearMin}::int IS NULL OR year >= ${yearMin})
        AND (${yearMax}::int IS NULL OR year <= ${yearMax})
        AND (${mileageMax}::int IS NULL OR mileage IS NULL OR mileage <= ${mileageMax})
        AND (${priceMin}::int IS NULL OR price IS NULL OR price >= ${priceMin})
        AND (${priceMax}::int IS NULL OR price IS NULL OR price <= ${priceMax})
        AND (${colorFilter}::text IS NULL OR LOWER(color) LIKE ${colorFilter})
        AND (${transmission}::text IS NULL OR LOWER(transmission) = LOWER(${transmission}))
        AND (${source}::text IS NULL OR source = ${source})
        AND (${excludeStories} = false OR stories_flag = false)
        AND (${searchFilter}::text IS NULL
             OR LOWER(title) LIKE ${searchFilter}
             OR LOWER(COALESCE(seller_notes,'')) LIKE ${searchFilter})
      ORDER BY created_at DESC
      LIMIT ${perPage} OFFSET ${offset}
    `;

    const total = parseInt(String(countRows[0]?.total ?? "0"), 10);
    const pages = Math.ceil(total / perPage);

    const listings = dataRows.map((row) => ({
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
    }));

    return NextResponse.json({
      items: listings,
      listings,
      total,
      page,
      per_page: perPage,
      pages,
    });
  } catch (err) {
    console.error("[listings GET] Error:", err);
    return NextResponse.json({
      items: [],
      listings: [],
      total: 0,
      page,
      per_page: perPage,
      pages: 0,
    });
  }
}
