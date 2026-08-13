import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";

export async function GET(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  try {
    await initDb();
    const rows = await sql`SELECT * FROM shops WHERE user_id = ${authUser.sub}`;
    if (!rows.length) return NextResponse.json(null);

    const shop = rows[0];
    return NextResponse.json({
      id: String(shop.id),
      user_id: String(shop.user_id),
      business_name: String(shop.business_name),
      categories: shop.categories ?? [],
      zip: String(shop.zip),
      phone: shop.phone != null ? String(shop.phone) : undefined,
      is_pro: Boolean(shop.is_pro),
      created_at: shop.created_at,
    });
  } catch (err) {
    console.error("[shops/me GET]", err);
    return NextResponse.json({ detail: "Failed to fetch shop profile" }, { status: 500 });
  }
}
