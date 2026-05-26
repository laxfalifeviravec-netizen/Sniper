import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { hashPassword } from "@/lib/auth-server";

export async function POST(request: Request) {
  let body: { token?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 }); }

  const { token, password } = body;
  if (!token) return NextResponse.json({ detail: "Reset token is required" }, { status: 422 });
  if (!password || password.length < 8) return NextResponse.json({ detail: "Password must be at least 8 characters" }, { status: 422 });

  try {
    await initDb();
    const rows = await sql`
      SELECT id FROM users
      WHERE password_reset_token = ${token}
        AND password_reset_expires > NOW()
    `;
    if (!rows.length) return NextResponse.json({ detail: "Invalid or expired reset token" }, { status: 400 });

    const hashed = await hashPassword(password);
    await sql`
      UPDATE users
      SET hashed_password = ${hashed},
          password_reset_token = NULL,
          password_reset_expires = NULL
      WHERE id = ${rows[0].id as string}
    `;

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ detail: "Reset failed. Please try again." }, { status: 500 });
  }
}
