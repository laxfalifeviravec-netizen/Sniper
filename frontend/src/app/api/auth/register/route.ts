import { NextResponse } from "next/server";
import { initDb, sql } from "@/lib/db";
import { hashPassword, signJwt } from "@/lib/auth-server";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { detail: "Database not configured. Add DATABASE_URL to Vercel environment variables." },
      { status: 503 }
    );
  }

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password, name } = body;

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ detail: "Invalid email address" }, { status: 422 });
  }

  // Validate password
  if (!password || password.length < 8) {
    return NextResponse.json(
      { detail: "Password must be at least 8 characters" },
      { status: 422 }
    );
  }

  try {
    await initDb();

    // Check if user already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json(
        { detail: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const verificationToken = crypto.randomUUID();

    const rows = await sql`
      INSERT INTO users (email, name, hashed_password, email_verification_token)
      VALUES (${email.toLowerCase()}, ${name ?? null}, ${hashedPassword}, ${verificationToken})
      RETURNING id, email, name, subscription_tier, role, phone, created_at
    `;

    const user = rows[0];

    // Fire-and-forget — don't block registration if email fails
    sendVerificationEmail(email.toLowerCase(), verificationToken).catch(() => {});

    const token = await signJwt({
      sub: String(user.id),
      email: String(user.email),
      tier: String(user.subscription_tier ?? "free"),
    });

    return NextResponse.json(
      {
        access_token: token,
        token_type: "bearer",
        user: {
          id: String(user.id),
          email: String(user.email),
          name: user.name != null ? String(user.name) : null,
          phone: user.phone != null ? String(user.phone) : null,
          plan: String(user.subscription_tier ?? "free"),
          role: String(user.role ?? "customer"),
          build_count: 0,
          created_at: user.created_at,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[register] Error:", err);
    return NextResponse.json(
      { detail: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
