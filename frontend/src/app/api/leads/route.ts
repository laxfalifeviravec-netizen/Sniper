import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";
import { sendLeadNotificationEmail } from "@/lib/email";
import { sendLeadSms } from "@/lib/sms";
import type { Lead } from "@/types";

function toLead(row: Record<string, unknown>): Lead {
  return {
    id: String(row.id),
    user_id: row.user_id != null ? String(row.user_id) : null,
    name: String(row.name),
    email: String(row.email),
    phone: row.phone != null ? String(row.phone) : undefined,
    zip: String(row.zip),
    category: row.category != null ? (String(row.category) as Lead["category"]) : undefined,
    make: row.make != null ? String(row.make) : undefined,
    model: row.model != null ? String(row.model) : undefined,
    year: row.year != null ? Number(row.year) : undefined,
    budget_cents: row.budget_cents != null ? Number(row.budget_cents) : undefined,
    notes: row.notes != null ? String(row.notes) : undefined,
    build_id: row.build_id != null ? String(row.build_id) : null,
    status: String(row.status ?? "new") as Lead["status"],
    claimed_by_shop_id: row.claimed_by_shop_id != null ? String(row.claimed_by_shop_id) : null,
    created_at: row.created_at as string,
  };
}

// Mask contact info for shops on the free tier — full details are a
// Shop Pro perk (this is the lead-gen paywall that drives shop subscriptions).
function maskLead(lead: Lead): Lead {
  return {
    ...lead,
    name: (() => {
      const [first, last] = lead.name.split(" ");
      return last ? `${first} ${last[0]}.` : first;
    })(),
    email: "•••••@•••••.com",
    phone: lead.phone ? "(•••) •••-" + lead.phone.slice(-4) : undefined,
  };
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ detail: "Database not configured." }, { status: 503 });
  }

  let body: {
    name?: string;
    email?: string;
    phone?: string;
    zip?: string;
    category?: string;
    make?: string;
    model?: string;
    year?: number;
    budget_cents?: number;
    notes?: string;
    build_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name || !body.email || !body.zip) {
    return NextResponse.json({ detail: "Name, email, and ZIP code are required" }, { status: 422 });
  }

  try {
    await initDb();
    const authUser = await getAuthUser(request);

    const rows = await sql`
      INSERT INTO leads (user_id, name, email, phone, zip, category, make, model, year, budget_cents, notes, build_id)
      VALUES (
        ${authUser?.sub ?? null}, ${body.name}, ${body.email}, ${body.phone ?? null}, ${body.zip},
        ${body.category ?? null}, ${body.make ?? null}, ${body.model ?? null}, ${body.year ?? null},
        ${body.budget_cents ?? null}, ${body.notes ?? null}, ${body.build_id ?? null}
      )
      RETURNING *
    `;
    const lead = toLead(rows[0]);

    // Notify matching shops (fire-and-forget) — this is the core of the lead-gen funnel.
    (async () => {
      const shopRows = await sql`
        SELECT s.*, u.email AS owner_email FROM shops s
        JOIN users u ON u.id = s.user_id
        WHERE s.zip = ${lead.zip} OR ${lead.category ?? null} = ANY(s.categories)
      `;
      for (const shopRow of shopRows) {
        const email = String(shopRow.owner_email);
        sendLeadNotificationEmail(email, lead).catch(() => {});
        if (shopRow.is_pro && shopRow.phone) {
          sendLeadSms(String(shopRow.phone), lead).catch(() => {});
        }
      }
    })().catch(() => {});

    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    console.error("[leads POST]", err);
    return NextResponse.json({ detail: "Failed to submit request" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  try {
    await initDb();
    const shopRows = await sql`SELECT * FROM shops WHERE user_id = ${authUser.sub}`;
    if (!shopRows.length) {
      return NextResponse.json({ detail: "No shop profile found" }, { status: 403 });
    }
    const shop = shopRows[0];
    const categories = (shop.categories as string[]) ?? [];

    const rows = await sql`
      SELECT * FROM leads
      WHERE status = 'new'
        AND (zip = ${String(shop.zip)} OR category = ANY(${categories}))
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const leads = rows.map(toLead);
    const isPro = Boolean(shop.is_pro);
    return NextResponse.json(isPro ? leads : leads.map(maskLead));
  } catch (err) {
    console.error("[leads GET]", err);
    return NextResponse.json({ detail: "Failed to fetch leads" }, { status: 500 });
  }
}
