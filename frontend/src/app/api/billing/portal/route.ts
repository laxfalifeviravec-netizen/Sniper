import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthUser } from "@/lib/auth-server";
import { initDb, sql } from "@/lib/db";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    await initDb();
    const shopRows = await sql`SELECT stripe_customer_id FROM shops WHERE user_id = ${user.sub}`;
    const userRows = await sql`SELECT stripe_customer_id FROM users WHERE id = ${user.sub}`;
    const customerId =
      (shopRows[0]?.stripe_customer_id as string | null) ??
      (userRows[0]?.stripe_customer_id as string | null);

    if (!customerId) {
      return NextResponse.json({ detail: "No billing account found. Upgrade to Pro first." }, { status: 404 });
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/account`,
    });

    return NextResponse.json({ portal_url: session.url });
  } catch (err) {
    console.error("Stripe portal error:", err);
    return NextResponse.json({ detail: "Failed to create billing portal session" }, { status: 500 });
  }
}
