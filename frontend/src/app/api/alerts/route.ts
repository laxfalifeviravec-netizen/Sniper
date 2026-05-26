import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";

function dbRowToAlert(row: Record<string, unknown>) {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    filters: {
      make: (row.makes as string[])?.[0] ?? undefined,
      model: (row.models as string[])?.[0] ?? undefined,
      year_min: row.year_min ?? undefined,
      year_max: row.year_max ?? undefined,
      mileage_max: row.mileage_max ?? undefined,
      price_min: row.price_min ?? undefined,
      price_max: row.price_max ?? undefined,
      colors: (row.colors as string[]) ?? [],
      transmissions: (row.transmissions as string[]) ?? [],
      sources: (row.sources as string[]) ?? [],
      exclude_stories: row.exclude_stories ?? false,
      required_options: (row.required_options as string[]) ?? [],
    },
    // Also expose flat fields for the cron/matching
    makes: (row.makes as string[]) ?? [],
    models: (row.models as string[]) ?? [],
    year_min: row.year_min ?? null,
    year_max: row.year_max ?? null,
    mileage_max: row.mileage_max ?? null,
    price_min: row.price_min ?? null,
    price_max: row.price_max ?? null,
    colors: (row.colors as string[]) ?? [],
    transmissions: (row.transmissions as string[]) ?? [],
    sources: (row.sources as string[]) ?? [],
    exclude_stories: row.exclude_stories ?? false,
    required_options: (row.required_options as string[]) ?? [],
    notify_email: row.notify_email ?? true,
    notify_sms: row.notify_sms ?? false,
    active: row.is_active ?? true,
    is_active: row.is_active ?? true,
    created_at: row.created_at,
    updated_at: row.created_at,
    last_match_at: row.last_triggered_at ?? null,
  };
}

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { detail: "Database not configured." },
      { status: 503 }
    );
  }

  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  try {
    await initDb();

    const rows = await sql`
      SELECT a.*,
        (SELECT COUNT(*) FROM alert_matches am WHERE am.alert_id = a.id) as match_count
      FROM alerts a
      WHERE a.user_id = ${authUser.sub}
      ORDER BY a.created_at DESC
    `;

    return NextResponse.json(rows.map(dbRowToAlert));
  } catch (err) {
    console.error("[alerts GET] Error:", err);
    return NextResponse.json(
      { detail: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { detail: "Database not configured." },
      { status: 503 }
    );
  }

  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name?: string;
    filters?: {
      makes?: string[];
      models?: string[];
      year_min?: number;
      year_max?: number;
      mileage_max?: number;
      price_min?: number;
      price_max?: number;
      colors?: string[];
      transmissions?: string[];
      sources?: string[];
      exclude_stories?: boolean;
      required_options?: string[];
    };
    notify_email?: boolean;
    notify_sms?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name || body.name.trim().length === 0) {
    return NextResponse.json({ detail: "Alert name is required" }, { status: 422 });
  }

  try {
    await initDb();

    // Enforce tier limits
    const countRows = await sql`
      SELECT COUNT(*) as count FROM alerts WHERE user_id = ${authUser.sub} AND is_active = true
    `;
    const alertCount = parseInt(String(countRows[0]?.count ?? "0"), 10);
    const maxAlerts = authUser.tier === "pro" ? 50 : 3;

    if (alertCount >= maxAlerts) {
      return NextResponse.json(
        {
          detail:
            authUser.tier === "pro"
              ? `You have reached the maximum of ${maxAlerts} alerts`
              : `Free plan is limited to ${maxAlerts} alerts. Upgrade to Pro for up to 50 alerts.`,
        },
        { status: 403 }
      );
    }

    const f = body.filters ?? {};
    const makes = f.makes ?? [];
    const models = f.models ?? [];

    const rows = await sql`
      INSERT INTO alerts (
        user_id, name,
        makes, models,
        year_min, year_max, mileage_max, price_min, price_max,
        colors, transmissions, sources,
        exclude_stories, required_options,
        notify_email, notify_sms
      ) VALUES (
        ${authUser.sub}, ${body.name.trim()},
        ${makes}, ${models},
        ${f.year_min ?? null}, ${f.year_max ?? null},
        ${f.mileage_max ?? null},
        ${f.price_min ?? null}, ${f.price_max ?? null},
        ${f.colors ?? []}, ${f.transmissions ?? []}, ${f.sources ?? []},
        ${f.exclude_stories ?? false}, ${f.required_options ?? []},
        ${body.notify_email ?? true}, ${body.notify_sms ?? false}
      )
      RETURNING *
    `;

    return NextResponse.json(dbRowToAlert(rows[0]), { status: 201 });
  } catch (err) {
    console.error("[alerts POST] Error:", err);
    return NextResponse.json(
      { detail: "Failed to create alert" },
      { status: 500 }
    );
  }
}
