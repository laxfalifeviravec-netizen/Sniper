import { NextRequest, NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ detail: "Missing token" }, { status: 400 });

  try {
    await initDb();
    const rows = await sql`
      UPDATE users
      SET is_verified = true, email_verification_token = NULL
      WHERE email_verification_token = ${token}
      RETURNING id
    `;
    if (!rows.length) return NextResponse.json({ detail: "Invalid or expired token" }, { status: 400 });
    return NextResponse.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("[verify-email]", err);
    return NextResponse.json({ detail: "Verification failed" }, { status: 500 });
  }
}
