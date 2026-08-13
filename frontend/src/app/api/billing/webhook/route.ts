import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { initDb, sql } from "@/lib/db";
import { sendOrderConfirmationEmail } from "@/lib/email";
import type { BuildItem } from "@/types";

export const runtime = "nodejs";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

async function markSubscriptionActive(customerId: string, subscriptionId: string, active: boolean) {
  const shopRows = await sql`SELECT id FROM shops WHERE stripe_customer_id = ${customerId}`;
  if (shopRows.length) {
    await sql`
      UPDATE shops SET is_pro = ${active}, stripe_subscription_id = ${active ? subscriptionId : null}
      WHERE stripe_customer_id = ${customerId}
    `;
    return;
  }
  await sql`
    UPDATE users SET
      subscription_tier = ${active ? "pro" : "free"},
      stripe_subscription_id = ${active ? subscriptionId : null}
    WHERE stripe_customer_id = ${customerId}
  `;
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

        if (session.mode === "subscription") {
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;
          await markSubscriptionActive(customerId, subscriptionId, true);
          break;
        }

        if (session.mode === "payment") {
          const orderId = session.metadata?.order_id;
          if (!orderId) break;

          const rows = await sql`
            UPDATE orders
            SET status = 'paid', stripe_payment_intent_id = ${session.payment_intent as string}
            WHERE id = ${orderId}
            RETURNING *
          `;
          if (!rows.length) break;
          const order = rows[0];

          if (order.build_id) {
            await sql`UPDATE builds SET status = 'ordered' WHERE id = ${order.build_id}`;
          }

          const customerEmail = session.customer_details?.email;
          if (customerEmail) {
            sendOrderConfirmationEmail(customerEmail, {
              id: String(order.id),
              items: (order.items as BuildItem[]) ?? [],
              subtotal_cents: Number(order.subtotal_cents ?? 0),
              shipping_cents: Number(order.shipping_cents ?? 0),
              total_cents: Number(order.total_cents ?? 0),
            }).catch(() => {});
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const isActive = sub.status === "active" || sub.status === "trialing";
        await markSubscriptionActive(customerId, sub.id, isActive);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        await markSubscriptionActive(customerId, sub.id, false);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn("Payment failed for customer:", invoice.customer);
        break;
      }
    }
  } catch (err) {
    console.error("Error handling webhook event:", event.type, err);
    return NextResponse.json({ detail: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
