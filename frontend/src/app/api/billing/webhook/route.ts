import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { initDb, sql } from "@/lib/db";

export const runtime = "nodejs";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ detail: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ detail: "Missing stripe-signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ detail: "Invalid signature" }, { status: 400 });
  }

  await initDb();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        await sql`
          UPDATE users
          SET subscription_tier = 'pro',
              stripe_subscription_id = ${subscriptionId}
          WHERE stripe_customer_id = ${customerId}
        `;
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const isActive = sub.status === "active" || sub.status === "trialing";
        await sql`
          UPDATE users
          SET subscription_tier = ${isActive ? "pro" : "free"},
              stripe_subscription_id = ${sub.id}
          WHERE stripe_customer_id = ${customerId}
        `;
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        await sql`
          UPDATE users
          SET subscription_tier = 'free',
              stripe_subscription_id = NULL
          WHERE stripe_customer_id = ${customerId}
        `;
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        console.warn("Payment failed for customer:", customerId);
        break;
      }
    }
  } catch (err) {
    console.error("Error handling webhook event:", event.type, err);
    return NextResponse.json({ detail: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
