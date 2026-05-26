import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  let body: { email?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 }); }

  const email = body.email?.toLowerCase().trim();
  if (!email) return NextResponse.json({ detail: "Email is required" }, { status: 422 });

  // Always return success to prevent user enumeration
  const success = { message: "If an account exists with that email, a reset link has been sent." };

  try {
    await initDb();
    const rows = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (!rows.length) return NextResponse.json(success);

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await sql`
      UPDATE users
      SET password_reset_token = ${token}, password_reset_expires = ${expires.toISOString()}
      WHERE email = ${email}
    `;

    sendPasswordResetEmail(email, token).catch(() => {});
    return NextResponse.json(success);
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json(success); // don't leak errors
  }
}
