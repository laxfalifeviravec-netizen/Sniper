import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  try {
    await initDb();
    const shopRows = await sql`SELECT * FROM shops WHERE user_id = ${authUser.sub}`;
    if (!shopRows.length) return NextResponse.json({ detail: "No shop profile found" }, { status: 403 });
    const shop = shopRows[0];

    if (body.status === "claimed") {
      if (!shop.is_pro) {
        return NextResponse.json(
          { detail: "Upgrade to Shop Pro to claim leads and unlock contact info." },
          { status: 402 }
        );
      }
      const rows = await sql`
        UPDATE leads SET status = 'claimed', claimed_by_shop_id = ${String(shop.id)}
        WHERE id = ${params.id} AND status = 'new'
        RETURNING *
      `;
      if (!rows.length) return NextResponse.json({ detail: "Lead unavailable" }, { status: 409 });
      return NextResponse.json({
        id: String(rows[0].id),
        status: rows[0].status,
        claimed_by_shop_id: rows[0].claimed_by_shop_id,
      });
    }

    return NextResponse.json({ detail: "Unsupported status transition" }, { status: 422 });
  } catch (err) {
    console.error("[lead PATCH]", err);
    return NextResponse.json({ detail: "Failed to update lead" }, { status: 500 });
  }
}
