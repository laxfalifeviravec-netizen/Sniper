import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";

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
      SELECT id, email, name, subscription_tier, phone, created_at
      FROM users
      WHERE id = ${authUser.sub}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ detail: "User not found" }, { status: 404 });
    }

    const user = rows[0];

    const alertCountRows = await sql`
      SELECT COUNT(*) as count FROM alerts WHERE user_id = ${String(user.id)} AND is_active = true
    `;
    const alertCount = parseInt(String(alertCountRows[0]?.count ?? "0"), 10);

    return NextResponse.json({
      id: String(user.id),
      email: String(user.email),
      name: user.name != null ? String(user.name) : null,
      phone: user.phone != null ? String(user.phone) : null,
      plan: String(user.subscription_tier ?? "free"),
      alert_count: alertCount,
      created_at: user.created_at,
    });
  } catch (err) {
    console.error("[me] Error:", err);
    return NextResponse.json(
      { detail: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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

  let body: { name?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  try {
    await initDb();

    const rows = await sql`
      UPDATE users
      SET
        name = COALESCE(${body.name ?? null}, name),
        phone = COALESCE(${body.phone ?? null}, phone)
      WHERE id = ${authUser.sub}
      RETURNING id, email, name, subscription_tier, phone, created_at
    `;

    if (rows.length === 0) {
      return NextResponse.json({ detail: "User not found" }, { status: 404 });
    }

    const user = rows[0];
    const alertCountRows = await sql`
      SELECT COUNT(*) as count FROM alerts WHERE user_id = ${String(user.id)} AND is_active = true
    `;
    const alertCount = parseInt(String(alertCountRows[0]?.count ?? "0"), 10);

    return NextResponse.json({
      id: String(user.id),
      email: String(user.email),
      name: user.name != null ? String(user.name) : null,
      phone: user.phone != null ? String(user.phone) : null,
      plan: String(user.subscription_tier ?? "free"),
      alert_count: alertCount,
      created_at: user.created_at,
    });
  } catch (err) {
    console.error("[me PATCH] Error:", err);
    return NextResponse.json(
      { detail: "Failed to update user" },
      { status: 500 }
    );
  }
}
