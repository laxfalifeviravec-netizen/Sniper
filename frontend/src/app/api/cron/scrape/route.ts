import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { scrapeAllSources, type ScrapedListing } from "@/lib/scrapers";
import { matchesAlert, type AlertForMatch, type ListingForMatch } from "@/lib/matching";
import { sendAlertEmail } from "@/lib/email";

export const maxDuration = 300; // 5 minutes

export async function GET(request: Request) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const provided = authHeader?.replace("Bearer ", "");
    if (provided !== cronSecret) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { detail: "DATABASE_URL not set", scraped: 0, new: 0, matches: 0 },
      { status: 503 }
    );
  }

  const startTime = Date.now();
  const stats = { scraped: 0, new: 0, matches: 0, errors: [] as string[] };

  try {
    await initDb();

    // 1. Scrape all sources
    let listings: ScrapedListing[] = [];
    try {
      listings = await scrapeAllSources();
    } catch (err) {
      stats.errors.push(`Scrape error: ${String(err)}`);
    }
    stats.scraped = listings.length;

    if (listings.length === 0) {
      return NextResponse.json({
        ...stats,
        duration_ms: Date.now() - startTime,
      });
    }

    // 2. Upsert listings and track which are new
    const newListingIds: string[] = [];

    for (const item of listings) {
      try {
        const images = JSON.stringify(item.images ?? []);
        const options = JSON.stringify([]);

        // xmax = 0 means it's a new insert (not an update)
        const result = await sql`
          INSERT INTO listings (
            source, external_id, url, title, make, model, year, mileage, price,
            location, color, transmission, seller_notes, images, auction_end,
            stories_flag, options, is_active
          ) VALUES (
            ${item.source}, ${item.external_id}, ${item.url}, ${item.title},
            ${item.make ?? null}, ${item.model ?? null},
            ${item.year ?? null}, ${item.mileage ?? null}, ${item.price ?? null},
            ${item.location ?? null}, ${item.color ?? null}, ${item.transmission ?? null},
            ${item.seller_notes ?? null},
            ${images}::jsonb,
            ${item.auction_end ?? null},
            ${item.stories_flag ?? false},
            ${options}::jsonb,
            true
          )
          ON CONFLICT (source, external_id) DO UPDATE SET
            url = EXCLUDED.url,
            title = EXCLUDED.title,
            price = EXCLUDED.price,
            mileage = EXCLUDED.mileage,
            auction_end = EXCLUDED.auction_end,
            stories_flag = EXCLUDED.stories_flag,
            images = EXCLUDED.images,
            updated_at = now()
          RETURNING id, (xmax = 0) as is_insert
        `;

        if (result.length > 0 && result[0].is_insert === true) {
          newListingIds.push(String(result[0].id));
          stats.new++;
        }
      } catch (err) {
        stats.errors.push(
          `Upsert error for ${item.source}/${item.external_id}: ${String(err)}`
        );
      }
    }

    if (newListingIds.length === 0) {
      return NextResponse.json({
        ...stats,
        duration_ms: Date.now() - startTime,
      });
    }

    // 3. Fetch all active alerts with user emails
    const activeAlerts = await sql`
      SELECT a.*, u.email as user_email
      FROM alerts a
      JOIN users u ON u.id = a.user_id
      WHERE a.is_active = true
    `;

    if (activeAlerts.length === 0) {
      return NextResponse.json({
        ...stats,
        duration_ms: Date.now() - startTime,
      });
    }

    // 4. Fetch the new listings for matching
    // We use ANY() with a cast — pass as comma-separated for simplicity
    // by fetching each individually or using a subquery
    const newListings = await Promise.all(
      newListingIds.map((id) =>
        sql`
          SELECT id, source, external_id, url, title, make, model, year, mileage, price,
                 location, color, transmission, seller_notes, images, auction_end, stories_flag, options
          FROM listings
          WHERE id = ${id}
          LIMIT 1
        `.then((rows) => rows[0] ?? null)
      )
    ).then((rows) => rows.filter(Boolean) as Record<string, unknown>[]);

    // 5. For each new listing, check all alerts
    for (const listingRow of newListings) {
      const listing: ListingForMatch = {
        make: (listingRow.make as string) ?? null,
        model: (listingRow.model as string) ?? null,
        year: (listingRow.year as number) ?? null,
        mileage: (listingRow.mileage as number) ?? null,
        price: (listingRow.price as number) ?? null,
        color: (listingRow.color as string) ?? null,
        transmission: (listingRow.transmission as string) ?? null,
        stories_flag: (listingRow.stories_flag as boolean) ?? false,
        source: (listingRow.source as string) ?? null,
        title: (listingRow.title as string) ?? null,
        seller_notes: (listingRow.seller_notes as string) ?? null,
        options: Array.isArray(listingRow.options)
          ? (listingRow.options as string[])
          : [],
      };

      for (const alertRow of activeAlerts) {
        const alert: AlertForMatch = {
          makes: (alertRow.makes as string[]) ?? [],
          models: (alertRow.models as string[]) ?? [],
          year_min: (alertRow.year_min as number) ?? null,
          year_max: (alertRow.year_max as number) ?? null,
          mileage_max: (alertRow.mileage_max as number) ?? null,
          price_min: (alertRow.price_min as number) ?? null,
          price_max: (alertRow.price_max as number) ?? null,
          colors: (alertRow.colors as string[]) ?? [],
          transmissions: (alertRow.transmissions as string[]) ?? [],
          exclude_stories: (alertRow.exclude_stories as boolean) ?? false,
          required_options: (alertRow.required_options as string[]) ?? [],
          sources: (alertRow.sources as string[]) ?? [],
        };

        if (!matchesAlert(listing, alert)) continue;

        try {
          // Insert match (ignore if already exists)
          const matchResult = await sql`
            INSERT INTO alert_matches (alert_id, listing_id)
            VALUES (${alertRow.id as string}, ${listingRow.id as string})
            ON CONFLICT (alert_id, listing_id) DO NOTHING
            RETURNING id
          `;

          if (matchResult.length > 0) {
            stats.matches++;

            // Update last_triggered_at on the alert
            await sql`
              UPDATE alerts SET last_triggered_at = now() WHERE id = ${alertRow.id as string}
            `.catch(() => {});

            // Send notification email if enabled
            if (alertRow.notify_email && alertRow.user_email) {
              await sendAlertEmail({
                to: String(alertRow.user_email),
                listing: {
                  id: String(listingRow.id),
                  title: String(listingRow.title ?? ""),
                  url: String(listingRow.url ?? ""),
                  price: (listingRow.price as number) ?? null,
                  mileage: (listingRow.mileage as number) ?? null,
                  auction_end: (listingRow.auction_end as string) ?? null,
                  images: Array.isArray(listingRow.images)
                    ? (listingRow.images as string[])
                    : [],
                  location: (listingRow.location as string) ?? null,
                  source: String(listingRow.source ?? ""),
                },
                alert: {
                  id: String(alertRow.id),
                  name: String(alertRow.name ?? ""),
                },
              }).catch((err) => {
                console.error("[cron] Email send failed:", err);
              });
            }
          }
        } catch (err) {
          stats.errors.push(
            `Match error alert ${String(alertRow.id)} / listing ${String(listingRow.id)}: ${String(err)}`
          );
        }
      }
    }

    return NextResponse.json({
      ...stats,
      duration_ms: Date.now() - startTime,
    });
  } catch (err) {
    console.error("[cron/scrape] Fatal error:", err);
    return NextResponse.json(
      {
        ...stats,
        error: String(err),
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
