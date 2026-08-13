import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";
import type { BuildItem } from "@/types";

export async function GET(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  try {
    await initDb();
    const rows = await sql`
      SELECT * FROM orders WHERE user_id = ${authUser.sub} ORDER BY created_at DESC
    `;
    return NextResponse.json(
      rows.map((row) => ({
        id: String(row.id),
        user_id: String(row.user_id),
        build_id: row.build_id != null ? String(row.build_id) : null,
        items: (row.items as BuildItem[]) ?? [],
        subtotal_cents: Number(row.subtotal_cents ?? 0),
        shipping_cents: Number(row.shipping_cents ?? 0),
        total_cents: Number(row.total_cents ?? 0),
        status: String(row.status ?? "pending"),
        created_at: row.created_at,
      }))
    );
  } catch (err) {
    console.error("[orders GET]", err);
    return NextResponse.json({ detail: "Failed to fetch orders" }, { status: 500 });
  }
}
