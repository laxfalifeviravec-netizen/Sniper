// Book page — self-contained month calendar + time-slot picker.
//
// NOTE: Availability (closed Sundays, fixed hour blocks, "already booked"
// slots) is still simulated entirely in the browser — nothing here checks
// a real shared schedule, so two different visitors could pick the same
// slot with nothing to stop them. Submitting the form, however, does send
// a real email — straight to Formspree (https://formspree.io), which
// relays it to whatever inbox the Formspree account is signed up with.
// No API keys, no Vercel environment variables, no server code required.

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

  const FORMSPREE_URL = 'https://formspree.io/f/xgaendyd';
  const HOURS = [8, 10, 12, 14, 16]; // Mon–Sat, 8am–4pm start times
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const WEEKDAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth(); // 0-indexed
  let selectedDate = null; // Date object (midnight local)
  let selectedTime = null; // e.g. "10:00 AM"

  // Bookings already taken in this demo session (branch owner can wire this
  // up to real data later) — a couple of pre-filled slots just so the UI
  // demonstrates what an unavailable time looks like.
  const takenSlots = new Set();

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

  function selectDate(d) {
    selectedDate = d;
    selectedTime = null;
    renderCalendar();
    renderTimeSlots();
    updateSummary();
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

  const PACKAGE_LABELS = {
    standard: 'Standard In-Water Detail — $20/ft',
    premium: 'Premium In-Water Detail — $32/ft',
    'not-sure': 'Not sure yet',
  };

  // ---- Form submit: sends the booking straight to Formspree, which emails it ----
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
        const message = result.errors?.map(e => e.message).join(', ') || `Request failed (${res.status})`;
        throw new Error(message);
      }

      const slotKey = `${dateKey(selectedDate)}-${HOURS.find(h => formatHour(h) === selectedTime)}`;
      takenSlots.add(slotKey);

      form.reset();
      selectedDate = null;
      selectedTime = null;
      renderCalendar();
      renderTimeSlots();
      updateSummary();

      if (formNote) {
        formNote.textContent = "Thanks! Your booking request has been sent — we'll confirm by phone or email within one business day.";
      }
    } catch (err) {
      console.error('Booking submission failed:', err);
      if (formNote) {
        formNote.textContent = "Something went wrong sending your request. Please call or text us directly instead — sorry about that.";
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
});
