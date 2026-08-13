import twilio from "twilio";
import type { Lead } from "@/types";

// SMS is a Shop Pro perk — instant lead alerts beat email for install
// shops that need to be first to call a customer back.
export async function sendLeadSms(to: string, lead: Lead): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn(
      "[sms] Skipping SMS — TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER not set"
    );
    return;
  }

  const carLine = [lead.year, lead.make, lead.model].filter(Boolean).join(" ") || "vehicle";
  const body = `RideForge: New lead near ${lead.zip} — ${carLine}${lead.category ? ` (${lead.category})` : ""}. Open your Shop Portal to claim it.`;

  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({ to, from: fromNumber, body });
  } catch (err) {
    console.error("[sms] Failed to send lead SMS:", err);
  }
}
