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

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) return NextResponse.json({ detail: "STRIPE_PRO_PRICE_ID is not set" }, { status: 503 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    await initDb();
    const stripe = getStripe();

    const rows = await sql`SELECT id, email, name, stripe_customer_id FROM users WHERE id = ${user.sub}`;
    if (!rows.length) return NextResponse.json({ detail: "User not found" }, { status: 404 });
    const dbUser = rows[0];

    let customerId = dbUser.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email as string,
        name: (dbUser.name as string) || undefined,
        metadata: { user_id: user.sub },
      });
      customerId = customer.id;
      await sql`UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${user.sub}`;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/account`,
      subscription_data: { metadata: { user_id: user.sub } },
    });

    return NextResponse.json({ checkout_url: session.url, session_id: session.id });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ detail: "Failed to create checkout session" }, { status: 500 });
  }
}
