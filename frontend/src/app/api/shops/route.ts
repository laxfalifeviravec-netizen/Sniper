import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";

export async function POST(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  let body: { business_name?: string; categories?: string[]; zip?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.business_name || !body.zip) {
    return NextResponse.json({ detail: "Business name and ZIP code are required" }, { status: 422 });
  }

  try {
    await initDb();
    const rows = await sql`
      INSERT INTO shops (user_id, business_name, categories, zip, phone)
      VALUES (${authUser.sub}, ${body.business_name}, ${body.categories ?? []}, ${body.zip}, ${body.phone ?? null})
      ON CONFLICT (user_id) DO UPDATE SET
        business_name = EXCLUDED.business_name,
        categories = EXCLUDED.categories,
        zip = EXCLUDED.zip,
        phone = EXCLUDED.phone
      RETURNING *
    `;
    await sql`UPDATE users SET role = 'shop' WHERE id = ${authUser.sub}`;

    const shop = rows[0];
    return NextResponse.json(
      {
        id: String(shop.id),
        user_id: String(shop.user_id),
        business_name: String(shop.business_name),
        categories: shop.categories ?? [],
        zip: String(shop.zip),
        phone: shop.phone != null ? String(shop.phone) : undefined,
        is_pro: Boolean(shop.is_pro),
        created_at: shop.created_at,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[shops POST]", err);
    return NextResponse.json({ detail: "Failed to register shop" }, { status: 500 });
  }
}
