// Thank-you page — shown after a booking is confirmed.
//
// Reached two ways:
//   1. ?source=calendly — js/calendly.js sent the visitor here after
//      Calendly's own widget confirmed the booking. We don't have
//      field-level details in that case, so we just show a generic
//      confirmation message.
//   2. ?name=...&when=...&... — an older/manual booking flow that passed
//      full details on the URL. Kept so a future non-Calendly booking
//      form can reuse this page's detail-card rendering.
// Visiting the page directly with no params leaves the static fallback
// message in thank-you.html visible.

document.addEventListener('DOMContentLoaded', () => {
  const confirmCard = document.getElementById('confirmCard');
  const confirmFallback = document.getElementById('confirmFallback');
  const confirmList = document.getElementById('confirmList');
  const heroSub = document.getElementById('confirmHeroSub');

  const params = new URLSearchParams(window.location.search);

  if (params.get('source') === 'calendly') {
    // Calendly handled the actual booking (and its own confirmation
    // email) — we don't get field-level details back without their paid
    // API, so just show a generic confirmation instead of the detail card.
    if (heroSub) {
      heroSub.textContent = "Your appointment is on the calendar! Check your email for the confirmation and calendar invite from Calendly.";
    }
    if (confirmFallback) confirmFallback.hidden = true;
    return;
  }

  const name = params.get('name');
  const when = params.get('when');

  if (!name && !when) return; // nothing to show — leave the fallback as-is

  if (heroSub && name) {
    const firstName = name.trim().split(/\s+/)[0];
    heroSub.textContent = `Thanks, ${firstName}! Here's a summary of what you submitted — we'll confirm by phone or email within one business day.`;
  }

  const rows = [
    ['Boat', params.get('boat')],
    ['Marina / dock', params.get('location')],
    ['Requested date & time', when],
    ['Package', params.get('package')],
  ];

  if (params.get('rush') === '1') {
    rows.push(['Rush fee', '$100 (same-day booking)']);
  }

  rows.forEach(([label, value]) => {
    if (!value) return;
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    if (label === 'Rush fee') dd.classList.add('rush-fee');
    row.append(dt, dd);
    confirmList.appendChild(row);
  });

  if (confirmFallback) confirmFallback.hidden = true;
  if (confirmCard) confirmCard.hidden = false;
});
