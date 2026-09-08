// Book page — self-contained month calendar + time-slot picker.
//
// Availability is backed by one shared value at kvdb.io (KVDB_URL below) —
// a free, no-signup key-value store: GET reads the list of taken slots,
// PUT saves it back. That's the whole "backend": once someone books a
// slot, it's written there, so every visitor who loads the page (or picks
// a date) afterward sees it as taken.
//
// This is best-effort, not airtight: two people submitting the exact same
// slot within the same second or two could still both get through, since
// the read-then-write isn't atomic. For a small business taking a handful
// of bookings a week, that's an acceptable trade for how simple this is —
// no account/project setup, no security rules, no SDK. If that ever stops
// being good enough, swapping in a real database with atomic writes
// (Firebase/Firestore, Supabase, etc.) is the next step; this file is
// structured so only tryClaimSlot()/refreshAvailability() would change.
//
// The booking itself is also POSTed to Formspree (https://formspree.io)
// so the business gets an email — that part is unrelated to kvdb.io and
// still happens even if kvdb.io is down. On success, the visitor is
// redirected to thank-you.html with the booking details on the URL.

document.addEventListener('DOMContentLoaded', () => {
  const calDays = document.getElementById('calDays');
  const calMonthLabel = document.getElementById('calMonthLabel');
  const calPrev = document.getElementById('calPrev');
  const calNext = document.getElementById('calNext');
  const timeSlotsHeading = document.getElementById('timeSlotsHeading');
  const timeSlotsEl = document.getElementById('timeSlots');
  const bookingSummary = document.getElementById('bookingSummary');
  const bookingSummaryText = document.getElementById('bookingSummaryText');
  const bkDateInput = document.getElementById('bkDate');
  const bkTimeInput = document.getElementById('bkTime');
  const bkRushFeeInput = document.getElementById('bkRushFee');
  const form = document.getElementById('bookingForm');
  const formNote = document.getElementById('bookingFormNote');

  if (!calDays || !form) return; // not on the book page

  // ---- Fill this in with your real bucket: go to https://kvdb.io, click
  // "Create a bucket" (no signup needed), and paste the URL it gives you
  // here, followed by /bookedSlots — e.g.
  // 'https://kvdb.io/AbCd1234efGh5678/bookedSlots' ----
  const KVDB_URL = 'https://kvdb.io/YOUR_BUCKET_ID/bookedSlots';
  const KVDB_CONFIGURED = KVDB_URL !== 'https://kvdb.io/YOUR_BUCKET_ID/bookedSlots';
  if (!KVDB_CONFIGURED) {
    console.warn('Shared availability isn’t set up yet (see KVDB_URL in js/booking.js) — booked times will only disappear in this browser tab, not for other visitors, until it is.');
  }

  const FORMSPREE_URL = 'https://formspree.io/f/xgaendyd';
  const HOURS = [8, 10, 12, 14, 16]; // Mon–Sat, 8am–4pm start times
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth(); // 0-indexed
  let selectedDate = null; // Date object (midnight local)
  let selectedTime = null; // e.g. "10:00 AM"

  // Slot keys (`YYYY-MM-DD-H`) already booked, per the last successful
  // read from kvdb.io (see refreshAvailability). Starts empty and stays
  // empty if KVDB_CONFIGURED is false or the store can't be reached.
  let takenSlots = new Set();

  async function refreshAvailability() {
    if (!KVDB_CONFIGURED) return;
    try {
      const res = await fetch(KVDB_URL, { cache: 'no-store' });
      if (res.status === 404) { takenSlots = new Set(); return; } // nobody's booked anything yet
      if (!res.ok) throw new Error(`GET failed (${res.status})`);
      const list = await res.json();
      takenSlots = new Set(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Could not load shared availability — showing the last-known state instead:', err);
    }
  }

  // Tries to add `slotKey` to the shared taken-slots list.
  // Returns 'claimed' (success), 'taken' (someone already has that slot),
  // or 'unreachable' (couldn't check/save — caller should let the booking
  // proceed anyway rather than block someone over a third-party hiccup).
  async function tryClaimSlot(slotKey) {
    if (!KVDB_CONFIGURED) return 'unreachable';

    let current;
    try {
      const res = await fetch(KVDB_URL, { cache: 'no-store' });
      if (res.status === 404) current = [];
      else if (res.ok) current = await res.json();
      else throw new Error(`GET failed (${res.status})`);
      if (!Array.isArray(current)) current = [];
    } catch (err) {
      console.warn('Could not reach shared availability — booking will proceed without the shared check:', err);
      return 'unreachable';
    }

    if (current.includes(slotKey)) return 'taken';

    try {
      const updated = [...current, slotKey];
      const putRes = await fetch(KVDB_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!putRes.ok) throw new Error(`PUT failed (${putRes.status})`);
      takenSlots = new Set(updated);
      return 'claimed';
    } catch (err) {
      console.warn('Could not save this slot to shared availability — booking will still proceed:', err);
      return 'unreachable';
    }
  }

  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatHour(hour) {
    const period = hour >= 12 ? 'PM' : 'AM';
    let h = hour % 12;
    if (h === 0) h = 12;
    return `${h}:00 ${period}`;
  }

  function isPast(d) {
    return d < today;
  }

  function isClosed(d) {
    return d.getDay() === 0; // Sunday
  }

  function renderCalendar() {
    calMonthLabel.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

    // Disable "previous month" once we're viewing the current real month
    calPrev.disabled = (viewYear === today.getFullYear() && viewMonth === today.getMonth());

    calDays.innerHTML = '';

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = firstOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let i = 0; i < startOffset; i++) {
      const filler = document.createElement('span');
      filler.className = 'cal-day is-empty';
      calDays.appendChild(filler);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-day';
      btn.textContent = String(day);

      const past = isPast(d);
      const closed = isClosed(d);
      const isToday = dateKey(d) === dateKey(today);
      const isSelected = selectedDate && dateKey(d) === dateKey(selectedDate);

      if (isToday) btn.classList.add('is-today');

      if (past || closed) {
        btn.classList.add('is-disabled');
        btn.disabled = true;
        btn.setAttribute('aria-label', `${MONTH_NAMES[viewMonth]} ${day}, ${closed ? 'closed' : 'unavailable'}`);
      } else {
        btn.classList.add('is-available');
        btn.setAttribute('aria-label', `${MONTH_NAMES[viewMonth]} ${day}, available`);
        btn.addEventListener('click', () => selectDate(d));
      }

      if (isSelected) btn.classList.add('is-selected');

      calDays.appendChild(btn);
    }
  }

  function renderTimeSlots() {
    timeSlotsEl.innerHTML = '';

    if (!selectedDate) {
      timeSlotsHeading.textContent = 'Pick a date to see available times';
      return;
    }

    const label = selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    timeSlotsHeading.textContent = `Available times for ${label}`;

    const isToday = dateKey(selectedDate) === dateKey(today);
    const now = new Date();
    let anyAvailable = false;

    HOURS.forEach((hour) => {
      const label = formatHour(hour);
      const slotKey = `${dateKey(selectedDate)}-${hour}`;
      const alreadyTaken = takenSlots.has(slotKey);
      const alreadyPassedToday = isToday && (hour <= now.getHours());

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'time-slot-btn';
      btn.textContent = label;

      if (alreadyTaken || alreadyPassedToday) {
        btn.disabled = true;
      } else {
        anyAvailable = true;
        if (selectedTime === label) btn.classList.add('is-selected');
        btn.addEventListener('click', () => selectTime(label, slotKey));
      }

      timeSlotsEl.appendChild(btn);
    });

    if (!anyAvailable) {
      const msg = document.createElement('p');
      msg.className = 'time-slots-empty';
      msg.textContent = "No times left that day — try another date.";
      timeSlotsEl.appendChild(msg);
    }
  }

  const RUSH_NOTICE_DAYS = 1; // book at least 1 day ahead to avoid the rush fee (same-day = rush)
  const RUSH_FEE = 100;

  function daysUntil(d) {
    return Math.round((d - today) / 86400000);
  }

  function isRushBooking(d) {
    return daysUntil(d) < RUSH_NOTICE_DAYS;
  }

  function updateSummary() {
    const rush = selectedDate && isRushBooking(selectedDate);
    bkRushFeeInput.value = rush ? String(RUSH_FEE) : '0';
    bookingSummary.classList.toggle('has-rush', !!rush);

    if (selectedDate && selectedTime) {
      const label = selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
      let text = `You're booking: ${label} at ${selectedTime}`;
      if (rush) text += ` — a $${RUSH_FEE} rush fee applies (same-day booking)`;
      bookingSummaryText.textContent = text;
      bookingSummary.classList.add('is-set');
      bkDateInput.value = dateKey(selectedDate);
      bkTimeInput.value = selectedTime;
    } else if (selectedDate) {
      const label = selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
      let text = `${label} selected — now pick a time below.`;
      if (rush) text += ` (same-day booking — a $${RUSH_FEE} rush fee will apply)`;
      bookingSummaryText.textContent = text;
      bookingSummary.classList.remove('is-set');
      bkDateInput.value = dateKey(selectedDate);
      bkTimeInput.value = '';
    } else {
      bookingSummaryText.textContent = 'Pick a date and time on the calendar to get started.';
      bookingSummary.classList.remove('is-set');
      bkDateInput.value = '';
      bkTimeInput.value = '';
    }
  }

  async function selectDate(d) {
    selectedDate = d;
    selectedTime = null;
    renderCalendar();
    renderTimeSlots(); // paint immediately with whatever we already know
    updateSummary();

    await refreshAvailability(); // then get this date's real, current state
    renderTimeSlots();
  }

  function selectTime(label) {
    selectedTime = label;
    renderTimeSlots();
    updateSummary();
  }

  calPrev.addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    renderCalendar();
  });

  calNext.addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    renderCalendar();
  });

  renderCalendar();
  renderTimeSlots();
  updateSummary();
  refreshAvailability().then(renderTimeSlots);

  const PACKAGE_LABELS = {
    standard: 'Standard In-Water Detail — $20/ft',
    premium: 'Premium In-Water Detail — $32/ft',
    'not-sure': 'Not sure yet',
  };

  // ---- Form submit: claim the slot (best-effort, shared), then email via Formspree ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedDate || !selectedTime) {
      bookingSummary.classList.remove('is-set');
      bookingSummaryText.textContent = 'Please pick a date and time above before booking.';
      bookingSummary.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Booking…';
    if (formNote) formNote.textContent = '';

    const raw = Object.fromEntries(new FormData(form).entries());
    const dateLabel = selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const rush = Number(raw.rush_fee) > 0;
    const hour = HOURS.find((h) => formatHour(h) === selectedTime);
    const slotKey = `${dateKey(selectedDate)}-${hour}`;

    const claimResult = await tryClaimSlot(slotKey);
    if (claimResult === 'taken') {
      if (formNote) formNote.textContent = "Sorry — that time was just booked by someone else. Please pick another time.";
      renderTimeSlots();
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
      return;
    }
    // 'claimed' or 'unreachable' — either way, proceed with the booking.

    const payload = {
      name: raw.name,
      phone: raw.phone,
      email: raw.email,
      boat: raw.boat,
      location: raw.location,
      package: PACKAGE_LABELS[raw.package] || raw.package,
      notes: raw.notes || '(none)',
      'requested date & time': `${dateLabel} at ${selectedTime}`,
      'rush fee': rush ? '$100 (same-day booking)' : 'None',
      _subject: `New booking: ${raw.name} — ${dateLabel} at ${selectedTime}`,
      _replyto: raw.email,
    };

    try {
      const res = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        const message = result.errors?.map((e) => e.message).join(', ') || `Request failed (${res.status})`;
        throw new Error(message);
      }
    } catch (err) {
      // Not fatal — the slot is booked regardless. Just note it so the
      // business knows to double-check if this ever shows up in the console.
      console.error('Email notification failed (slot is still booked):', err);
    }

    const confirmParams = new URLSearchParams({
      name: raw.name,
      boat: raw.boat,
      location: raw.location,
      package: PACKAGE_LABELS[raw.package] || raw.package,
      when: `${dateLabel} at ${selectedTime}`,
      rush: rush ? '1' : '0',
    });
    window.location.href = `thank-you.html?${confirmParams.toString()}`;
  });
});
