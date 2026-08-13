import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthUser } from "@/lib/auth-server";
import { initDb, sql } from "@/lib/db";
import { getProduct } from "@/lib/products";
import type { BuildItem } from "@/types";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

// Free shipping over $500 — a well-worn AOV lever: it nudges cart size up
// (multi-item builds) instead of leaving margin on the table via flat-rate shipping.
const FREE_SHIPPING_THRESHOLD_CENTS = 50000;
const FLAT_SHIPPING_CENTS = 2500;

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  const priceEnv = process.env.STRIPE_SECRET_KEY;
  if (!priceEnv) return NextResponse.json({ detail: "Stripe is not configured" }, { status: 503 });

  let body: { items?: { product_id: string; qty: number }[]; build_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const requested = body.items ?? [];
  if (!requested.length) {
    return NextResponse.json({ detail: "Cart is empty" }, { status: 422 });
  }

  const items: BuildItem[] = [];
  for (const line of requested) {
    const product = getProduct(line.product_id);
    if (!product) {
      return NextResponse.json({ detail: `Unknown product: ${line.product_id}` }, { status: 422 });
    }
    const qty = Math.max(1, Math.min(20, Math.floor(line.qty || 1)));
    items.push({
      product_id: product.id,
      name: product.name,
      category: product.category,
      brand: product.brand,
      price_cents: product.price_cents,
      qty,
    });
  }

  const subtotal = items.reduce((sum, it) => sum + it.price_cents * it.qty, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS;
  const total = subtotal + shipping;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    await initDb();
    const stripe = getStripe();

    const userRows = await sql`SELECT id, email, stripe_customer_id FROM users WHERE id = ${user.sub}`;
    if (!userRows.length) return NextResponse.json({ detail: "User not found" }, { status: 404 });
    const dbUser = userRows[0];

    let customerId = dbUser.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email as string,
        metadata: { user_id: user.sub },
      });
      customerId = customer.id;
      await sql`UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${user.sub}`;
    }

    const orderRows = await sql`
      INSERT INTO orders (user_id, build_id, items, subtotal_cents, shipping_cents, total_cents, status)
      VALUES (${user.sub}, ${body.build_id ?? null}, ${JSON.stringify(items)}, ${subtotal}, ${shipping}, ${total}, 'pending')
      RETURNING id
    `;
    const orderId = String(orderRows[0].id);

    const lineItems: NonNullable<Stripe.Checkout.SessionCreateParams["line_items"]> = items.map((it) => ({
      price_data: {
        currency: "usd",
        product_data: { name: `${it.brand} ${it.name}` },
        unit_amount: it.price_cents,
      },
      quantity: it.qty,
    }));

    if (shipping > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Shipping" },
          unit_amount: shipping,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: lineItems,
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cart`,
      metadata: { order_id: orderId, user_id: user.sub },
    });

    await sql`UPDATE orders SET stripe_session_id = ${session.id} WHERE id = ${orderId}`;

    return NextResponse.json({ checkout_url: session.url, session_id: session.id });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ detail: "Failed to create checkout session" }, { status: 500 });
  }
}
