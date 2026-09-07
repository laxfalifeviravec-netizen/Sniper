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
├── api/book.js       # Vercel serverless function — emails booking submissions via Resend
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

## Booking emails (book.html)

Submitting the booking form calls `api/book.js` — a Vercel serverless
function that emails the submission to the business inbox via
[Resend](https://resend.com). This requires a one-time setup:

1. **Sign up at [resend.com](https://resend.com)** (free tier: 3,000 emails/month, 100/day — plenty for booking volume).
2. **Verify `bersennmarine.com`** as a sending domain in Resend's dashboard. It'll give you a few DNS records to add (SPF/DKIM-style TXT and MX records) — same process as the Google verification records already on this domain.
3. **Create an API key** in Resend and add it to this Vercel project (the one with Root Directory `boat-detailing-site`, not the other "sniper" project) as an environment variable named `RESEND_API_KEY`.
4. Optionally set two more environment variables:
   - `BOOKING_NOTIFY_TO` — the inbox that receives booking emails (defaults to `hello@bersennmarine.com` if unset)
   - `BOOKING_FROM` — the verified sender address, e.g. `Bersenn Marine Bookings <bookings@bersennmarine.com>` (defaults to Resend's shared `onboarding@resend.dev` test address if unset, which works immediately but looks less professional and has tighter sending limits)

Until `RESEND_API_KEY` is set, the booking form will show a clear error to
visitors ("Something went wrong...") instead of silently failing — check
the function's logs in the Vercel dashboard if bookings aren't arriving.

**What's still simulated:** the calendar itself (closed Sundays, fixed
8am–4pm hour slots, "already booked" slots) still runs entirely in the
browser (`js/booking.js`) — nothing checks a real shared schedule, so two
different visitors could pick the same slot with nothing to stop them.
Only the *email notification on submit* is real. If double-booking becomes
a problem, the next step is a real calendar/scheduling API (Cal.com,
Calendly's API, Google Calendar API) instead of the client-side simulation.

## Contact form (index.html) & ferrying quotes (ferrying.html)

The general contact form on `index.html` (`#contact`) is still a
**front-end-only demo** — it doesn't send email yet. The ferrying page
intentionally has no calendar of its own (deliveries are quote-based) and
routes here instead. To make this form functional too, the easiest path is
a small addition to `api/book.js`'s pattern: a new `api/contact.js`
function using the same Resend setup above.

## Deploying

Being fully static, this folder can be deployed as-is to GitHub Pages,
Netlify, Vercel, Cloudflare Pages, or any static host — no build command
needed.
