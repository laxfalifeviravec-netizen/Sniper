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
├── ferrying.html     # Boat ferrying/delivery service — statewide, coastal + ICW
├── css/styles.css    # Styling (ocean navy/teal + sandy gold palette)
├── js/main.js        # Mobile nav toggle, scroll shadow, demo contact form
├── js/gallery.js     # Lightbox viewer for boats.html
├── js/booking.js     # Calendar, time-slot picker, and rush-fee logic for book.html
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
- **Advance-booking policy & rush fee** — the "1 day's notice / $100 rush fee" policy note (on the homepage Packages section and `book.html`) and the matching logic in `js/booking.js` reflect a real business rule the client gave; adjust the notice window, fee amount, or wording in both places (and in `RUSH_NOTICE_DAYS` / `RUSH_FEE` in `js/booking.js`) if that policy changes.
- **Photos** — `images/gallery/` holds the real boat photos used across the site. Add more the same way (resize to ~1920px max, JPEG, and reference them from `index.html`/`boats.html`).
- **Reviews** — testimonials on the homepage are placeholder quotes; replace with real customer reviews (with permission) once you have them.
- **Origin story** — `about.html`'s Mystic, CT → Miami story is a placeholder; edit or replace with the real history. It intentionally doesn't cite a specific founding year or a "boats detailed" count.
- **Social links** — the IG/FB/Google icons in the contact section point to `#`; add real profile URLs.
- **Insurance** — the site intentionally makes no claim either way about being insured. If/when that's confirmed, "Fully Insured" badges/copy can be added back in (hero badges, trust stats, About's crew card, and the Ferrying page's captain/coverage copy are the natural spots).

## Contact form & booking calendar

Both the contact form on `index.html` (`#contact`) and the booking form on
`book.html` are **front-end-only demos** — they don't send email, hit an
API, or check a real schedule yet. The calendar on `book.html`
(`js/booking.js`) simulates availability entirely in the browser (closed
Sundays, fixed 8am–4pm hour slots, no double-booking protection beyond the
current page load) — it will happily let two different visitors "book" the
same slot since nothing is persisted anywhere. It does, however, correctly
flag the $100 rush fee client-side for any same-day booking.

The ferrying page (`ferrying.html`) intentionally skips a calendar/booking
flow — deliveries are quote-based, so it routes to the general contact form
instead.

To make either functional, wire it up to one of:

- A form backend service (e.g. Formspree, Netlify Forms, Getform) for the contact form
- A real scheduling/calendar API (e.g. Cal.com, Calendly's API, Google Calendar API) for the booking page, so availability is checked and stored server-side
- Your own backend endpoint (e.g. this repo's `backend/` FastAPI service, or a small serverless function) that emails/stores submissions and enforces real availability
- An email API (e.g. SendGrid, Postmark) called from a small server function for confirmation emails

## Deploying

Being fully static, this folder can be deployed as-is to GitHub Pages,
Netlify, Vercel, Cloudflare Pages, or any static host — no build command
needed.
