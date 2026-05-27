import twilio from "twilio";

export async function sendAlertSms(
  to: string,
  listing: {
    title: string;
    url: string;
    price?: number | null;
    source: string;
  }
): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn(
      "[sms] Skipping SMS — TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER not set"
    );
    return;
  }

  const priceStr = listing.price != null ? `$${listing.price}` : "price N/A";
  const source = listing.source.toUpperCase();
  const body = `Sniper: ${listing.title} — ${priceStr} on ${source}\n${listing.url}`;

  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      to,
      from: fromNumber,
      body,
    });
  } catch (err) {
    console.error("[sms] Failed to send SMS alert:", err);
  }
}
