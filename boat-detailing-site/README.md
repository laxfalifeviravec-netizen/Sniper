# Bersenn Marine — Website

A standalone, static marketing website for a mobile boat detailing and
statewide boat ferrying business ("Bersenn Marine", based in Miami, South
Florida). No build step or dependencies required.

## Structure

```
boat-detailing-site/
├── index.html        # Homepage — hero, services, packages, gallery teaser, reviews, contact form
├── boats.html        # "Boats We've Detailed" — full photo gallery with a lightbox
├── about.html        # About page — Mystic, CT to Miami origin story
├── book.html         # Booking page — calendar + time-slot picker + booking form
├── thank-you.html    # Confirmation page shown after a successful booking
├── ferrying.html     # Boat ferrying/delivery service — statewide, coastal + ICW
├── css/styles.css    # Styling (ocean navy/teal + sandy gold palette)
├── js/main.js        # Mobile nav toggle, scroll shadow, demo contact form
├── js/gallery.js     # Lightbox viewer for boats.html
├── js/booking.js     # Calendar, live Firestore availability, rush-fee logic, and submit handling for book.html
├── js/thank-you.js   # Reads booking details off the URL to populate thank-you.html
├── images/gallery/   # Boat photos used on the homepage teaser and boats.html
└── README.md
```

## Running locally

Just open `index.html` in a browser, or serve the folder:

```bash
cd boat-detailing-site
python3 -m http.server 8000
# visit http://localhost:8000
```

## Customize before launch

Everything below is placeholder content — search-and-replace before going live:

- **Phone / email** — `(555) 123-4567` / `hello@bersennmarine.com` (header, hero badges, contact/booking sections, footer, `tel:`/`mailto:` links).
- **Service area** — South Florida cities list on the homepage; statewide route list on `ferrying.html`.
- **Pricing** — Standard/Premium per-foot rates on the homepage Packages section and the booking form's package dropdown are illustrative starting points; ferrying/delivery pricing is intentionally left as "request a quote" since it depends on distance and route.
- **Advance-booking policy & rush fee** — the "1 day's notice / $100 rush fee" policy note (on the homepage Packages section and `book.html`) and the matching logic in `js/booking.js` reflect a real business rule the client gave; adjust the notice window, fee amount, or wording in both places (and in `RUSH_NOTICE_DAYS` / `RUSH_FEE` in `js/booking.js`) if that policy changes. This one actually is enforced in code — the calendar auto-flags same-day bookings and the fee is included in both the confirmation summary and the email.
- **Photos** — `images/gallery/` holds the real boat photos used across the site. Add more the same way (resize to ~1920px max, JPEG, and reference them from `index.html`/`boats.html`).
- **Reviews** — testimonials on the homepage are placeholder quotes; replace with real customer reviews (with permission) once you have them.
- **Origin story** — `about.html`'s Mystic, CT → Miami story is a placeholder; edit or replace with the real history. It intentionally doesn't cite a specific founding year or a "boats detailed" count.
- **Social links** — the IG/FB/Google icons in the contact section point to `#`; add real profile URLs.
- **Insurance** — the site intentionally makes no claim either way about being insured. If/when that's confirmed, "Fully Insured" badges/copy can be added back in (hero badges, trust stats, About's crew card, and the Ferrying page's captain/coverage copy are the natural spots).

## Booking & shared availability (book.html)

The calendar on `book.html` is custom-built (no third-party scheduling
tool), but a booked slot is enforced as taken for *every* visitor, not
just the browser that booked it. That's backed by
[Firebase](https://firebase.google.com)'s Firestore database:

- Every visitor's page keeps a **live** connection to a `bookedSlots`
  collection, so a slot someone else just booked greys out for everyone
  else within moments — no page reload needed.
- When someone submits the form, the browser tries to *create* a document
  for that exact date+time. Firestore's security rules (below) refuse to
  let a second write overwrite an existing slot document, so if two people
  race for the same time, only the first one actually gets it — the second
  gets a clear "that time was just booked" message instead of silently
  double-booking. This is enforced by Firestore itself, not just by
  client-side JavaScript, so it holds even if someone bypasses the page's
  own UI.
- The same booking is also emailed via Formspree, same as before.

**One-time setup on firebase.google.com** (a few minutes, no server code):
1. Create a free Firebase project at
   [console.firebase.google.com](https://console.firebase.google.com).
2. In the project, go to **Build → Firestore Database → Create database**.
   Start in **production mode** and pick a region (e.g. one in the US).
3. Go to the Firestore **Rules** tab and replace the default rules with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /bookedSlots/{slotId} {
         allow read: if true;
         allow create: if request.resource.data.keys().hasAll(
                          ['name', 'phone', 'email', 'boat', 'location', 'date', 'time']
                        );
         allow update, delete: if false;
       }
     }
   }
   ```
   Click **Publish**. This is what actually enforces "first booking wins" —
   `allow update, delete: if false` means once a slot document exists,
   nothing can overwrite or remove it.
4. Go to **Project settings** (gear icon) → **Your apps** → click the web
   icon (`</>`) → register an app (any nickname, e.g. "Bersenn Marine
   Site") → **don't** check "Also set up Firebase Hosting". Copy the
   `firebaseConfig` object it shows you.
5. Paste those values into `FIREBASE_CONFIG` near the top of
   `js/booking.js` (it currently has placeholders like `'YOUR_API_KEY'`).
   This config is safe to have public in the site's source — Firebase's
   security comes from the rules in step 3, not from hiding this object.

Until that's done, the calendar still works, but `js/booking.js` logs a
console warning and falls back to tracking "taken" slots only in the
current browser tab (the original behavior) — nothing breaks, it's just
not shared until the real config is in place.

**Confirmation page:** on a successful booking, `js/booking.js` redirects
to `thank-you.html` with the booking details on the URL;
`js/thank-you.js` reads those and renders a confirmation summary.
Visiting `thank-you.html` directly (no params) shows a generic fallback
message instead.

## Contact form (index.html) & ferrying quotes (ferrying.html)

The general contact form on `index.html` (`#contact`) is still a
**front-end-only demo** — it doesn't send email yet. The ferrying page
intentionally has no calendar of its own (deliveries are quote-based) and
routes here instead. To make this form functional too, the easiest path is
the same Formspree pattern as the booking form: create a second Formspree
form (or reuse the same one) and point the contact form's submit handler
at it the same way `js/booking.js` does.

## Deploying

Being fully static, this folder can be deployed as-is to GitHub Pages,
Netlify, Vercel, Cloudflare Pages, or any static host — no build command
needed.
