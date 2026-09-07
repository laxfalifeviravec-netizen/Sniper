// Thank-you page — reads the booking details booking.js put on the URL
// (after a successful Formspree submission) and displays them as a
// confirmation summary. If someone lands here directly with no query
// params, the static fallback message in thank-you.html stays visible.

document.addEventListener('DOMContentLoaded', () => {
  const confirmCard = document.getElementById('confirmCard');
  const confirmFallback = document.getElementById('confirmFallback');
  const confirmList = document.getElementById('confirmList');
  const heroSub = document.getElementById('confirmHeroSub');

  const params = new URLSearchParams(window.location.search);
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
