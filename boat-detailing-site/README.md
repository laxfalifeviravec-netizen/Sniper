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
├── js/booking.js     # Calendar, shared availability (kvdb.io), rush-fee logic, and submit handling for book.html
├── js/thank-you.js   # Reads booking details off the URL to populate thank-you.html
├── images/gallery/   # Boat photos used on the homepage teaser and boats.html
├── robots.txt        # Crawler rules — allows everything except thank-you.html
├── sitemap.xml       # Lists the 5 indexable pages for search engines
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

The calendar on `book.html` is custom-built. Once someone books a slot, it
disappears from the calendar for every visitor — not just the browser
that booked it — using [kvdb.io](https://kvdb.io), a free key-value store
with no signup and no SDK: it's just a URL you `GET` and `PUT` plain JSON
to over HTTPS.

- The list of taken slots lives at one kvdb.io URL. The page reads it when
  it loads and again each time someone picks a date, so it's always
  showing current availability.
- When someone submits the form, the browser fetches that list one more
  time, checks their slot isn't already on it, adds it, and saves the
  list back. If someone else's booking landed in the moment in between,
  the visitor gets a clear "that time was just booked" message instead of
  double-booking.
- The same booking is also emailed via Formspree, same as before — that
  still happens even if kvdb.io is unreachable for some reason.

**Worth knowing:** this check-then-save isn't a database transaction, so
it's not physically impossible for two people to submit the exact same
slot within the same second or two and both get through — just very
unlikely for a small business's booking volume. If that ever becomes a
real problem, swapping in a database with atomic writes (Firebase,
Supabase, etc.) is a bigger but drop-in replacement for `tryClaimSlot()`
and `refreshAvailability()` in `js/booking.js`; everything else on the
page stays the same.

**One-time setup** (30 seconds, no signup):
1. Go to [kvdb.io](https://kvdb.io) and click **"Create a new bucket"**.
2. Copy the bucket URL it gives you (looks like
   `https://kvdb.io/AbCd1234efGh5678/`).
3. Paste it into `KVDB_URL` near the top of `js/booking.js`, keeping the
   `/bookedSlots` on the end — e.g.
   `https://kvdb.io/AbCd1234efGh5678/bookedSlots`
   (it currently has a placeholder, `https://kvdb.io/YOUR_BUCKET_ID/bookedSlots`).

That's it — no account, no config object, no rules to write. Until it's
set, the calendar still works exactly as before, just only within one
browser tab at a time (`js/booking.js` logs a console warning as a
reminder).

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

## SEO

Every indexable page (all but `thank-you.html`, which is intentionally
`noindex`) has:

- A unique, keyword-relevant `<title>` and meta description.
- A `<link rel="canonical">` pointing at its real `bersennmarine.com` URL.
- Open Graph and Twitter Card tags, so links shared on social media or in
  texts show a proper title, description, and photo instead of a bare
  link.
- `LocalBusiness` structured data (JSON-LD) with the real phone numbers,
  service-area cities (matching the homepage's list), and business hours
  (matching the actual Mon–Sat 8am–4pm booking calendar) — this is what
  lets Google show rich info (hours, phone, service area) directly in
  search results.

Plus, at the site root:
- **`robots.txt`** — allows crawling everything except `thank-you.html`,
  and points to the sitemap.
- **`sitemap.xml`** — lists the 5 public pages so search engines discover
  them faster.

**What's intentionally NOT included:** review/rating structured data
(`AggregateRating`, `Review`). The homepage testimonials are still
placeholder quotes (see above) — marking up fake reviews as real ones
violates Google's structured data guidelines and risks a manual penalty.
Add that schema once there are real customer reviews to cite.

**One thing to double check after deploying:** all of the URLs above
assume the live domain is exactly `https://bersennmarine.com` (no `www`,
`https`). If that ever changes, the canonical/OG URLs, the JSON-LD `url`
and `image` fields, `robots.txt`, and `sitemap.xml` all need updating to
match — they're currently hardcoded to that domain since a static site
has no way to derive it automatically.

**Also worth doing once live:** submit the site to
[Google Search Console](https://search.google.com/search-console) and
[Bing Webmaster Tools](https://www.bing.com/webmasters) and manually
submit `sitemap.xml` in each — that's what actually gets Google/Bing to
notice and (re)crawl the site quickly, rather than waiting for them to
find it on their own.

## Deploying

Being fully static, this folder can be deployed as-is to GitHub Pages,
Netlify, Vercel, Cloudflare Pages, or any static host — no build command
needed.
