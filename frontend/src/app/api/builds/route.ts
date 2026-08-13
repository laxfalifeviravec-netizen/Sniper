import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";
import type { BuildItem } from "@/types";

function toBuild(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    make: row.make != null ? String(row.make) : undefined,
    model: row.model != null ? String(row.model) : undefined,
    year: row.year != null ? Number(row.year) : undefined,
    items: (row.items as BuildItem[]) ?? [],
    subtotal_cents: Number(row.subtotal_cents ?? 0),
    status: String(row.status ?? "draft"),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function computeSubtotal(items: BuildItem[]): number {
  return items.reduce((sum, it) => sum + it.price_cents * it.qty, 0);
}

export async function GET(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  try {
    await initDb();
    const rows = await sql`
      SELECT * FROM builds WHERE user_id = ${authUser.sub} ORDER BY updated_at DESC
    `;
    return NextResponse.json(rows.map(toBuild));
  } catch (err) {
    console.error("[builds GET]", err);
    return NextResponse.json({ detail: "Failed to fetch builds" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  let body: {
    name?: string;
    make?: string;
    model?: string;
    year?: number;
    items?: BuildItem[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name) {
    return NextResponse.json({ detail: "Build name is required" }, { status: 422 });
  }

  const items = body.items ?? [];
  const subtotal = computeSubtotal(items);

  try {
    await initDb();
    const rows = await sql`
      INSERT INTO builds (user_id, name, make, model, year, items, subtotal_cents)
      VALUES (
        ${authUser.sub}, ${body.name}, ${body.make ?? null}, ${body.model ?? null},
        ${body.year ?? null}, ${JSON.stringify(items)}, ${subtotal}
      )
      RETURNING *
    `;
    return NextResponse.json(toBuild(rows[0]), { status: 201 });
  } catch (err) {
    console.error("[builds POST]", err);
    return NextResponse.json({ detail: "Failed to create build" }, { status: 500 });
  }
}
