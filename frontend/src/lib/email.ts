import { Resend } from "resend";
import type { BuildItem, Lead } from "@/types";

function formatCents(cents: number): string {
  const hasCents = cents % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function wrapperHtml(inner: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#f59e0b;">
                &#9881; RideForge
              </p>
            </td>
          </tr>
          ${inner}
          <tr>
            <td style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#444;text-align:center;">
                RideForge — customize any car. Manage your account at your RideForge dashboard.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const resend = getResend();
  if (!resend) { console.warn("[email] RESEND_API_KEY not set — skipping verification email"); return; }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${appUrl}/verify-email?token=${token}`;
  try {
    await resend.emails.send({
      from: "RideForge <noreply@rideforge.app>",
      to,
      subject: "Verify your RideForge account",
      html: wrapperHtml(`
        <tr><td style="background-color:#111111;border:1px solid #1a1a1a;border-radius:12px;padding:24px;">
          <h1 style="font-size:20px;margin:0 0 12px;color:#f5f5f5;">Verify your email</h1>
          <p style="color:#888;margin:0 0 24px;">Click the button below to verify your email address and activate your account.</p>
          <a href="${link}" style="display:inline-block;background:#f59e0b;color:#000;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">Verify Email</a>
          <p style="color:#444;font-size:12px;margin-top:24px;">Link expires in 24 hours. If you didn't create a RideForge account, ignore this email.</p>
        </td></tr>`),
    });
  } catch (err) { console.error("[email] Failed to send verification email:", err); }
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resend = getResend();
  if (!resend) { console.warn("[email] RESEND_API_KEY not set — skipping reset email"); return; }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${appUrl}/reset-password?token=${token}`;
  try {
    await resend.emails.send({
      from: "RideForge <noreply@rideforge.app>",
      to,
      subject: "Reset your RideForge password",
      html: wrapperHtml(`
        <tr><td style="background-color:#111111;border:1px solid #1a1a1a;border-radius:12px;padding:24px;">
          <h1 style="font-size:20px;margin:0 0 12px;color:#f5f5f5;">Reset your password</h1>
          <p style="color:#888;margin:0 0 24px;">Click below to set a new password. This link expires in 1 hour.</p>
          <a href="${link}" style="display:inline-block;background:#f59e0b;color:#000;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">Reset Password</a>
          <p style="color:#444;font-size:12px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
        </td></tr>`),
    });
  } catch (err) { console.error("[email] Failed to send reset email:", err); }
}

export async function sendOrderConfirmationEmail(
  to: string,
  order: { id: string; items: BuildItem[]; subtotal_cents: number; shipping_cents: number; total_cents: number }
): Promise<void> {
  const resend = getResend();
  if (!resend) { console.warn("[email] RESEND_API_KEY not set — skipping order email"); return; }

  const rows = order.items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 0;color:#e4e4e7;font-size:14px;">${it.name} <span style="color:#71717a;">×${it.qty}</span></td>
        <td style="padding:8px 0;color:#e4e4e7;font-size:14px;text-align:right;">${formatCents(it.price_cents * it.qty)}</td>
      </tr>`
    )
    .join("");

  try {
    await resend.emails.send({
      from: "RideForge Orders <orders@rideforge.app>",
      to,
      subject: `Order confirmed — #${order.id.slice(0, 8).toUpperCase()}`,
      html: wrapperHtml(`
        <tr><td style="background-color:#111111;border:1px solid #1a1a1a;border-radius:12px;padding:24px;">
          <h1 style="font-size:20px;margin:0 0 4px;color:#f5f5f5;">Order confirmed 🎉</h1>
          <p style="color:#888;margin:0 0 20px;font-size:13px;">Order #${order.id.slice(0, 8).toUpperCase()}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #27272a;padding-top:12px;">
            ${rows}
            <tr><td style="padding-top:12px;color:#71717a;font-size:13px;">Subtotal</td><td style="padding-top:12px;color:#e4e4e7;font-size:13px;text-align:right;">${formatCents(order.subtotal_cents)}</td></tr>
            <tr><td style="color:#71717a;font-size:13px;">Shipping</td><td style="color:#e4e4e7;font-size:13px;text-align:right;">${order.shipping_cents === 0 ? "Free" : formatCents(order.shipping_cents)}</td></tr>
            <tr><td style="padding-top:8px;border-top:1px solid #27272a;color:#f5f5f5;font-weight:700;">Total</td><td style="padding-top:8px;border-top:1px solid #27272a;color:#f59e0b;font-weight:700;text-align:right;">${formatCents(order.total_cents)}</td></tr>
          </table>
        </td></tr>`),
    });
  } catch (err) { console.error("[email] Failed to send order confirmation:", err); }
}

export async function sendLeadNotificationEmail(to: string, lead: Lead): Promise<void> {
  const resend = getResend();
  if (!resend) { console.warn("[email] RESEND_API_KEY not set — skipping lead notification"); return; }

  const carLine = [lead.year, lead.make, lead.model].filter(Boolean).join(" ") || "Unspecified vehicle";
  const budgetLine = lead.budget_cents ? formatCents(lead.budget_cents) : "Not specified";

  try {
    await resend.emails.send({
      from: "RideForge Leads <leads@rideforge.app>",
      to,
      subject: `New install lead near ${lead.zip}${lead.category ? ` — ${lead.category}` : ""}`,
      html: wrapperHtml(`
        <tr><td style="background-color:#111111;border:1px solid #1a1a1a;border-radius:12px;padding:24px;">
          <p style="margin:0 0 12px;font-size:13px;color:#f59e0b;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">New Lead</p>
          <h1 style="font-size:20px;margin:0 0 16px;color:#f5f5f5;">${carLine}</h1>
          <p style="margin:4px 0;color:#888;font-size:14px;">ZIP: <strong style="color:#f5f5f5;">${lead.zip}</strong></p>
          <p style="margin:4px 0;color:#888;font-size:14px;">Category: <strong style="color:#f5f5f5;">${lead.category ?? "Any"}</strong></p>
          <p style="margin:4px 0;color:#888;font-size:14px;">Budget: <strong style="color:#f5f5f5;">${budgetLine}</strong></p>
          ${lead.notes ? `<p style="margin:12px 0 0;color:#a1a1aa;font-size:13px;">"${lead.notes}"</p>` : ""}
          <p style="margin-top:20px;color:#444;font-size:12px;">Sign in to your Shop Portal to claim this lead and view full contact details.</p>
        </td></tr>`),
    });
  } catch (err) { console.error("[email] Failed to send lead notification:", err); }
}
