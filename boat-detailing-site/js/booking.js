// Book page — self-contained month calendar + time-slot picker.
//
// Availability is backed by a shared Firestore collection (`bookedSlots`),
// so once a slot is booked it disappears for every visitor, not just the
// browser tab that booked it — see FIREBASE_CONFIG below. Booking itself
// works two ways at once:
//   1. A Firestore write claims the slot for real. Firestore's security
//      rules (see README) deny overwriting a slot document that already
//      exists, so if two people race for the same time, only the first
//      write succeeds — the second gets a clear "already booked" error
//      instead of silently double-booking.
//   2. The same booking is also POSTed to Formspree (https://formspree.io)
//      so the business still gets an email, exactly as before.
// On success, the visitor is redirected to thank-you.html with the
// booking details on the URL so it can show a confirmation summary.

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

  // ---- Fill these in with your project's config (Firebase console →
  // Project settings → General → Your apps → the "</>" web app). This is
  // fine to expose publicly — Firebase's security model is enforced by
  // Firestore's security rules (see README), not by keeping this secret. ----
  const FIREBASE_CONFIG = {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
  };
  const FIREBASE_CONFIGURED = FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY';

  let db = null;
  if (FIREBASE_CONFIGURED && window.firebase) {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
  } else {
    // Setup isn't finished yet — don't break the page, just fall back to
    // "nothing is shared" so the calendar still works locally while the
    // real Firebase project gets wired up.
    console.warn('Firebase isn’t configured yet (see FIREBASE_CONFIG in js/booking.js) — availability will only be tracked in this browser tab, not shared with other visitors.');
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

  // Slot keys (`YYYY-MM-DD-H`) already booked. Kept in sync live from
  // Firestore (see startAvailabilityListener below) when configured;
  // otherwise this just stays empty (see FIREBASE_CONFIGURED above).
  let takenSlots = new Set();

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

  // ---- Live availability: keep takenSlots in sync with Firestore so a
  // slot someone else just booked greys out here without a page reload. ----
  if (db) {
    db.collection('bookedSlots')
      .where('date', '>=', dateKey(today))
      .onSnapshot(
        (snapshot) => {
          takenSlots = new Set(snapshot.docs.map((doc) => doc.id));
          renderTimeSlots();
        },
        (err) => console.error('Could not load live availability:', err)
      );
  }

  const PACKAGE_LABELS = {
    standard: 'Standard In-Water Detail — $20/ft',
    premium: 'Premium In-Water Detail — $32/ft',
    'not-sure': 'Not sure yet',
  };

  // ---- Form submit: claim the slot in Firestore, then email via Formspree ----
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

    // Step 1: claim the slot for real. If someone else's write beat us
    // here, Firestore's security rules reject ours (see README) and this
    // throws a permission-denied error instead of silently overwriting.
    if (db) {
      try {
        await db.collection('bookedSlots').doc(slotKey).set({
          name: raw.name,
          phone: raw.phone,
          email: raw.email,
          boat: raw.boat,
          location: raw.location,
          package: raw.package,
          notes: raw.notes || '',
          rush,
          date: dateKey(selectedDate),
          time: selectedTime,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error('Slot claim failed:', err);
        if (formNote) {
          formNote.textContent = err.code === 'permission-denied'
            ? "Sorry — that time was just booked by someone else. Please pick another time."
            : "Something went wrong reaching our booking calendar. Please call or text us directly instead.";
        }
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
        return;
      }
    }

    // Step 2: email notification (best-effort — the slot above is already
    // reserved either way, so a Formspree hiccup here isn't fatal).
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
