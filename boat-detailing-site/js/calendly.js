// book.html — Calendly owns the actual calendar now (real shared
// availability, no double-booking, automatic confirmation emails to both
// the customer and whatever inbox the Calendly account is connected to).
//
// This just listens for Calendly's "booking confirmed" postMessage event
// and sends the visitor on to our own branded thank-you.html afterward,
// instead of leaving them on Calendly's inline "You are scheduled" panel.
// See https://developer.calendly.com/api-docs/... "Advanced embed options"
// for the full postMessage event list.

window.addEventListener('message', (e) => {
  if (e.origin !== 'https://calendly.com') return;
  if (!e.data || e.data.event !== 'calendly.event_scheduled') return;

  window.location.href = 'thank-you.html?source=calendly';
});
