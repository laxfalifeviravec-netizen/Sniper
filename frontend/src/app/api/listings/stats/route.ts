import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      total: 0,
      by_source: { bat: 0, cnb: 0, pcarmarket: 0, ebay: 0 },
      new_today: 0,
      active_auctions: 0,
    });
  }

  try {
    await initDb();

    const [totalRows, bySourceRows, newTodayRows, activeRows] =
      await Promise.all([
        sql`SELECT COUNT(*) as total FROM listings WHERE is_active = true`,
        sql`
          SELECT source, COUNT(*) as count
          FROM listings
          WHERE is_active = true
          GROUP BY source
        `,
        sql`
          SELECT COUNT(*) as total
          FROM listings
          WHERE is_active = true
            AND created_at >= NOW() - INTERVAL '24 hours'
        `,
        sql`
          SELECT COUNT(*) as total
          FROM listings
          WHERE is_active = true
            AND auction_end > NOW()
        `,
      ]);

    const total = parseInt(String(totalRows[0]?.total ?? "0"), 10);
    const newToday = parseInt(String(newTodayRows[0]?.total ?? "0"), 10);
    const activeAuctions = parseInt(String(activeRows[0]?.total ?? "0"), 10);

    const bySource: Record<string, number> = {
      bat: 0,
      cnb: 0,
      pcarmarket: 0,
      ebay: 0,
    };
    for (const row of bySourceRows) {
      const src = String(row.source ?? "");
      if (src in bySource) {
        bySource[src] = parseInt(String(row.count ?? "0"), 10);
      }
    }

    return NextResponse.json({
      total,
      by_source: bySource,
      new_today: newToday,
      active_auctions: activeAuctions,
    });
  } catch (err) {
    console.error("[listings/stats] Error:", err);
    return NextResponse.json({
      total: 0,
      by_source: { bat: 0, cnb: 0, pcarmarket: 0, ebay: 0 },
      new_today: 0,
      active_auctions: 0,
    });
  }
}
