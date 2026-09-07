// Vercel serverless function — receives a booking submission from book.html
// and emails it to the business inbox via Resend (https://resend.com).
//
// Required setup (see README.md "Booking emails" section):
//   1. Sign up at resend.com (free tier), verify bersennmarine.com as a
//      sending domain (adds a couple of DNS records, same idea as the
//      Google verification records already on this domain).
//   2. Create an API key in Resend, add it to this Vercel project as an
//      environment variable named RESEND_API_KEY.
//   3. (Optional) Set BOOKING_NOTIFY_TO to the inbox that should receive
//      booking emails, and BOOKING_FROM to a verified sender address —
//      both default to sensible placeholders below if left unset.
//
// Until RESEND_API_KEY is set, this function responds with a clear 500 so
// the failure is obvious in Vercel's function logs instead of failing silently.

const RESEND_API_URL = 'https://api.resend.com/emails';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Strip CR/LF from anything that lands in the subject line — this is a
// public endpoint, so treat every field as untrusted input and don't let
// a crafted value smuggle extra header-like content into the subject.
function sanitizeLine(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

function formatDate(dateStr) {
  // dateStr is "YYYY-MM-DD" from the calendar's hidden input
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return dateStr || 'Not provided';
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set — cannot send booking email.');
    return res.status(500).json({
      ok: false,
      error: 'Email is not configured yet. Set RESEND_API_KEY in this Vercel project\'s environment variables.',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const {
    name = '', phone = '', email = '', boat = '', location = '',
    package: pkg = '', notes = '', date = '', time = '', rush_fee: rushFee = '0',
  } = body;

  if (!name || !phone || !email || !boat || !location || !date || !time) {
    return res.status(400).json({ ok: false, error: 'Missing required booking fields.' });
  }

  const cleanEmail = sanitizeLine(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ ok: false, error: 'Invalid email address.' });
  }

  const notifyTo = process.env.BOOKING_NOTIFY_TO || 'hello@bersennmarine.com';
  const from = process.env.BOOKING_FROM || 'Bersenn Marine Bookings <onboarding@resend.dev>';
  const rushNote = Number(rushFee) > 0
    ? `<p style="color:#b45309;font-weight:600;">⚠️ Same-day booking — $${escapeHtml(rushFee)} rush fee applies.</p>`
    : '';

  const packageLabels = {
    standard: "Standard In-Water Detail — $20/ft",
    premium: "Premium In-Water Detail — $32/ft",
    'not-sure': 'Not sure yet',
  };
  const packageLabel = packageLabels[pkg] || pkg || 'Not specified';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#0B2E4F;">New Booking Request</h2>
      ${rushNote}
      <table cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;">
        <tr><td style="font-weight:600;width:140px;">Date &amp; time</td><td>${escapeHtml(formatDate(date))} at ${escapeHtml(time)}</td></tr>
        <tr><td style="font-weight:600;">Name</td><td>${escapeHtml(name)}</td></tr>
        <tr><td style="font-weight:600;">Phone</td><td>${escapeHtml(phone)}</td></tr>
        <tr><td style="font-weight:600;">Email</td><td>${escapeHtml(cleanEmail)}</td></tr>
        <tr><td style="font-weight:600;">Boat</td><td>${escapeHtml(boat)}</td></tr>
        <tr><td style="font-weight:600;">Location</td><td>${escapeHtml(location)}</td></tr>
        <tr><td style="font-weight:600;">Package</td><td>${escapeHtml(packageLabel)}</td></tr>
        <tr><td style="font-weight:600;vertical-align:top;">Notes</td><td>${escapeHtml(notes) || '&mdash;'}</td></tr>
      </table>
      <p style="color:#4a5b6b;font-size:.85rem;margin-top:24px;">Reply directly to this email to reach the customer.</p>
    </div>
  `;

  try {
    const resendRes = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [notifyTo],
        reply_to: cleanEmail,
        subject: sanitizeLine(`New booking: ${name} — ${formatDate(date)} at ${time}`),
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend API error:', resendRes.status, errText);
      return res.status(502).json({ ok: false, error: 'Failed to send booking email.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Booking email send failed:', err);
    return res.status(500).json({ ok: false, error: 'Unexpected error sending booking email.' });
  }
};
