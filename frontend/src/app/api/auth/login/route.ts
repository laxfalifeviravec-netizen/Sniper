import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { verifyPassword, signJwt } from "@/lib/auth-server";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { detail: "Database not configured. Add DATABASE_URL to Vercel environment variables." },
      { status: 503 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { detail: "Email and password are required" },
      { status: 422 }
    );
  }

  try {
    await initDb();

    const rows = await sql`
      SELECT id, email, name, hashed_password, subscription_tier, role, phone, created_at
      FROM users
      WHERE email = ${email.toLowerCase()}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { detail: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = rows[0];
    const valid = await verifyPassword(password, String(user.hashed_password));

    if (!valid) {
      return NextResponse.json(
        { detail: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Get saved build count
    const buildCountRows = await sql`
      SELECT COUNT(*) as count FROM builds WHERE user_id = ${String(user.id)}
    `;
    const buildCount = parseInt(String(buildCountRows[0]?.count ?? "0"), 10);

    const token = await signJwt({
      sub: String(user.id),
      email: String(user.email),
      tier: String(user.subscription_tier ?? "free"),
    });

    return NextResponse.json({
      access_token: token,
      token_type: "bearer",
      user: {
        id: String(user.id),
        email: String(user.email),
        name: user.name != null ? String(user.name) : null,
        phone: user.phone != null ? String(user.phone) : null,
        plan: String(user.subscription_tier ?? "free"),
        role: String(user.role ?? "customer"),
        build_count: buildCount,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error("[login] Error:", err);
    return NextResponse.json(
      { detail: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
