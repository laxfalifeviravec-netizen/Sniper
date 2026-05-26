import { Resend } from "resend";

interface SendAlertEmailParams {
  to: string;
  listing: {
    id: string;
    title: string;
    url: string;
    price?: number | null;
    mileage?: number | null;
    auction_end?: string | null;
    images?: string[];
    location?: string | null;
    source: string;
  };
  alert: {
    id: string;
    name: string;
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMileage(miles: number): string {
  return new Intl.NumberFormat("en-US").format(miles) + " mi";
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return dateStr;
  }
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.warn("[email] RESEND_API_KEY not set — skipping verification email"); return; }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${appUrl}/verify-email?token=${token}`;
  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({
      from: "Sniper <noreply@sniper.app>",
      to,
      subject: "Verify your Sniper account",
      html: `
        <div style="font-family:sans-serif;background:#0a0a0a;padding:40px 20px;color:#f5f5f5;">
          <p style="font-size:22px;font-weight:700;color:#f59e0b;margin:0 0 24px;">&#9654; Sniper</p>
          <h1 style="font-size:20px;margin:0 0 12px;">Verify your email</h1>
          <p style="color:#888;margin:0 0 24px;">Click the button below to verify your email address and activate your account.</p>
          <a href="${link}" style="display:inline-block;background:#f59e0b;color:#000;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">Verify Email</a>
          <p style="color:#444;font-size:12px;margin-top:24px;">Link expires in 24 hours. If you didn't create a Sniper account, ignore this email.</p>
        </div>`,
    });
  } catch (err) { console.error("[email] Failed to send verification email:", err); }
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.warn("[email] RESEND_API_KEY not set — skipping reset email"); return; }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${appUrl}/reset-password?token=${token}`;
  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({
      from: "Sniper <noreply@sniper.app>",
      to,
      subject: "Reset your Sniper password",
      html: `
        <div style="font-family:sans-serif;background:#0a0a0a;padding:40px 20px;color:#f5f5f5;">
          <p style="font-size:22px;font-weight:700;color:#f59e0b;margin:0 0 24px;">&#9654; Sniper</p>
          <h1 style="font-size:20px;margin:0 0 12px;">Reset your password</h1>
          <p style="color:#888;margin:0 0 24px;">Click below to set a new password. This link expires in 1 hour.</p>
          <a href="${link}" style="display:inline-block;background:#f59e0b;color:#000;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">Reset Password</a>
          <p style="color:#444;font-size:12px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
        </div>`,
    });
  } catch (err) { console.error("[email] Failed to send reset email:", err); }
}

export async function sendAlertEmail({
  to,
  listing,
  alert,
}: SendAlertEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      "[email] RESEND_API_KEY is not set — skipping email for listing:",
      listing.id
    );
    return;
  }

  const resend = new Resend(apiKey);

  const imageUrl =
    Array.isArray(listing.images) && listing.images.length > 0
      ? listing.images[0]
      : null;

  const priceHtml = listing.price
    ? `<p style="margin:4px 0;color:#888;font-size:14px;">Current Bid: <strong style="color:#f5f5f5;">${formatCurrency(listing.price)}</strong></p>`
    : "";

  const mileageHtml = listing.mileage
    ? `<p style="margin:4px 0;color:#888;font-size:14px;">Mileage: <strong style="color:#f5f5f5;">${formatMileage(listing.mileage)}</strong></p>`
    : "";

  const auctionEndHtml = listing.auction_end
    ? `<p style="margin:4px 0;color:#888;font-size:14px;">Auction Ends: <strong style="color:#f5f5f5;">${formatDate(listing.auction_end)}</strong></p>`
    : "";

  const locationHtml = listing.location
    ? `<p style="margin:4px 0;color:#888;font-size:14px;">Location: <strong style="color:#f5f5f5;">${listing.location}</strong></p>`
    : "";

  const imageHtml = imageUrl
    ? `<img src="${imageUrl}" alt="${listing.title}" style="width:100%;max-width:560px;height:auto;border-radius:8px;margin-bottom:16px;" />`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#f59e0b;">
                &#9654; Sniper
              </p>
            </td>
          </tr>
          <!-- Alert name -->
          <tr>
            <td style="padding-bottom:16px;">
              <p style="margin:0;font-size:13px;color:#f59e0b;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">
                Alert: ${alert.name}
              </p>
              <h1 style="margin:4px 0 0;font-size:20px;font-weight:700;color:#f5f5f5;line-height:1.3;">
                New match found
              </h1>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#111111;border:1px solid #1a1a1a;border-radius:12px;padding:20px;">
              ${imageHtml}
              <h2 style="margin:0 0 12px;font-size:17px;font-weight:700;color:#f5f5f5;line-height:1.3;">
                ${listing.title}
              </h2>
              ${priceHtml}
              ${mileageHtml}
              ${auctionEndHtml}
              ${locationHtml}
              <p style="margin:4px 0;color:#888;font-size:14px;">
                Source: <strong style="color:#f5f5f5;">${listing.source.toUpperCase()}</strong>
              </p>
              <div style="margin-top:20px;">
                <a href="${listing.url}"
                   style="display:inline-block;background-color:#f59e0b;color:#000000;font-weight:700;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">
                  View Auction &rarr;
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#444;text-align:center;">
                You received this because you set up an alert on Sniper.<br>
                Manage your alerts at your Sniper dashboard.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    await resend.emails.send({
      from: "Sniper Alerts <alerts@sniper.app>",
      to,
      subject: `Alert match: ${listing.title}`,
      html,
    });
  } catch (err) {
    console.error("[email] Failed to send alert email:", err);
  }
}
