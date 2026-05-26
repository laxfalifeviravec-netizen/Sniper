import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";

function dbRowToAlert(row: Record<string, unknown>) {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    filters: {
      makes: (row.makes as string[]) ?? [],
      models: (row.models as string[]) ?? [],
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

  try {
    await initDb();

    const rows = await sql`
      SELECT * FROM alerts WHERE id = ${params.id} AND user_id = ${authUser.sub} LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ detail: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json(dbRowToAlert(rows[0]));
  } catch (err) {
    console.error("[alert GET] Error:", err);
    return NextResponse.json({ detail: "Failed to fetch alert" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  return handleUpdate(request, params.id);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  return handleUpdate(request, params.id);
}

async function handleUpdate(request: Request, alertId: string) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ detail: "Database not configured." }, { status: 503 });
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
      year_min?: number | null;
      year_max?: number | null;
      mileage_max?: number | null;
      price_min?: number | null;
      price_max?: number | null;
      colors?: string[];
      transmissions?: string[];
      sources?: string[];
      exclude_stories?: boolean;
      required_options?: string[];
    };
    notify_email?: boolean;
    notify_sms?: boolean;
    active?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  try {
    await initDb();

    // Verify ownership
    const existing = await sql`
      SELECT id FROM alerts WHERE id = ${alertId} AND user_id = ${authUser.sub} LIMIT 1
    `;
    if (existing.length === 0) {
      return NextResponse.json({ detail: "Alert not found" }, { status: 404 });
    }

    const f = body.filters ?? {};

    const rows = await sql`
      UPDATE alerts SET
        name = COALESCE(${body.name ?? null}, name),
        makes = COALESCE(${f.makes ?? null}, makes),
        models = COALESCE(${f.models ?? null}, models),
        year_min = CASE WHEN ${f.year_min !== undefined} THEN ${f.year_min ?? null} ELSE year_min END,
        year_max = CASE WHEN ${f.year_max !== undefined} THEN ${f.year_max ?? null} ELSE year_max END,
        mileage_max = CASE WHEN ${f.mileage_max !== undefined} THEN ${f.mileage_max ?? null} ELSE mileage_max END,
        price_min = CASE WHEN ${f.price_min !== undefined} THEN ${f.price_min ?? null} ELSE price_min END,
        price_max = CASE WHEN ${f.price_max !== undefined} THEN ${f.price_max ?? null} ELSE price_max END,
        colors = COALESCE(${f.colors ?? null}, colors),
        transmissions = COALESCE(${f.transmissions ?? null}, transmissions),
        sources = COALESCE(${f.sources ?? null}, sources),
        exclude_stories = COALESCE(${f.exclude_stories ?? null}, exclude_stories),
        required_options = COALESCE(${f.required_options ?? null}, required_options),
        notify_email = COALESCE(${body.notify_email ?? null}, notify_email),
        notify_sms = COALESCE(${body.notify_sms ?? null}, notify_sms),
        is_active = COALESCE(${body.active ?? null}, is_active)
      WHERE id = ${alertId} AND user_id = ${authUser.sub}
      RETURNING *
    `;

    return NextResponse.json(dbRowToAlert(rows[0]));
  } catch (err) {
    console.error("[alert UPDATE] Error:", err);
    return NextResponse.json({ detail: "Failed to update alert" }, { status: 500 });
  }
}

export async function DELETE(
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

    const result = await sql`
      DELETE FROM alerts WHERE id = ${params.id} AND user_id = ${authUser.sub}
    `;

    if (result.length === 0 && (result as unknown as { rowCount?: number }).rowCount === 0) {
      // Still return 204 — idempotent delete
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[alert DELETE] Error:", err);
    return NextResponse.json({ detail: "Failed to delete alert" }, { status: 500 });
  }
}
