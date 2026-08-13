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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  try {
    await initDb();
    const rows = await sql`
      SELECT * FROM builds WHERE id = ${params.id} AND user_id = ${authUser.sub}
    `;
    if (!rows.length) return NextResponse.json({ detail: "Build not found" }, { status: 404 });
    return NextResponse.json(toBuild(rows[0]));
  } catch (err) {
    console.error("[build GET]", err);
    return NextResponse.json({ detail: "Failed to fetch build" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  try {
    await initDb();
    const existingRows = await sql`
      SELECT * FROM builds WHERE id = ${params.id} AND user_id = ${authUser.sub}
    `;
    if (!existingRows.length) return NextResponse.json({ detail: "Build not found" }, { status: 404 });

    const items = body.items ?? (existingRows[0].items as BuildItem[]) ?? [];
    const subtotal = computeSubtotal(items);

    const rows = await sql`
      UPDATE builds SET
        name = COALESCE(${body.name ?? null}, name),
        make = COALESCE(${body.make ?? null}, make),
        model = COALESCE(${body.model ?? null}, model),
        year = COALESCE(${body.year ?? null}, year),
        items = ${JSON.stringify(items)},
        subtotal_cents = ${subtotal},
        updated_at = now()
      WHERE id = ${params.id} AND user_id = ${authUser.sub}
      RETURNING *
    `;
    return NextResponse.json(toBuild(rows[0]));
  } catch (err) {
    console.error("[build PATCH]", err);
    return NextResponse.json({ detail: "Failed to update build" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  try {
    await initDb();
    await sql`DELETE FROM builds WHERE id = ${params.id} AND user_id = ${authUser.sub}`;
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[build DELETE]", err);
    return NextResponse.json({ detail: "Failed to delete build" }, { status: 500 });
  }
}
