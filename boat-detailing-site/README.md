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
├── book.html         # Booking page — embeds the real Calendly calendar
├── thank-you.html    # Confirmation page shown after a successful booking
├── ferrying.html     # Boat ferrying/delivery service — statewide, coastal + ICW
├── css/styles.css    # Styling (ocean navy/teal + sandy gold palette)
├── js/main.js        # Mobile nav toggle, scroll shadow, demo contact form
├── js/gallery.js     # Lightbox viewer for boats.html
├── js/calendly.js    # Redirects to thank-you.html once Calendly confirms a booking
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
- **Pricing** — Standard/Premium per-foot rates on the homepage Packages section are illustrative starting points; ferrying/delivery pricing is intentionally left as "request a quote" since it depends on distance and route. Add matching "Package" choices as a custom question on the Calendly event type (see below) so it's still captured at booking time.
- **Advance-booking policy & rush fee** — the "1 day's notice / $100 rush fee" policy note appears on the homepage Packages section and `book.html`. It's informational text only now — Calendly doesn't calculate fees — so if the policy changes, just edit the wording in both places. Consider also adding a required same-day acknowledgment question on the Calendly event type (see below) so it isn't just fine print.
- **Photos** — `images/gallery/` holds the real boat photos used across the site. Add more the same way (resize to ~1920px max, JPEG, and reference them from `index.html`/`boats.html`).
- **Reviews** — testimonials on the homepage are placeholder quotes; replace with real customer reviews (with permission) once you have them.
- **Origin story** — `about.html`'s Mystic, CT → Miami story is a placeholder; edit or replace with the real history. It intentionally doesn't cite a specific founding year or a "boats detailed" count.
- **Social links** — the IG/FB/Google icons in the contact section point to `#`; add real profile URLs.
- **Insurance** — the site intentionally makes no claim either way about being insured. If/when that's confirmed, "Fully Insured" badges/copy can be added back in (hero badges, trust stats, About's crew card, and the Ferrying page's captain/coverage copy are the natural spots).

## Booking (book.html)

`book.html` embeds a real [Calendly](https://calendly.com) calendar
(inline widget) instead of a custom-built one. Calendly owns the actual
schedule, so a slot really disappears for every visitor the moment
someone books it — no shared database or server code needed on our end,
and Calendly automatically emails a confirmation to both the customer and
whatever inbox/calendar the Calendly account is connected to.

**One-time setup on calendly.com** (a few minutes, no code):
1. Create a free Calendly account.
2. Create one **Event Type**, e.g. "Boat Detailing Appointment" — set its
   duration and available days/hours (e.g. Mon–Sat, 8am–4pm) to match the
   business's real schedule.
3. Under that event's **Invitee Questions**, add the fields the old
   booking form used to collect, so nothing is lost: *Boat make & length*,
   *Marina / dock location*, *Package* (Standard / Premium / Not sure), and
   an optional *Notes* field. You can also add a required checkbox like "I
   understand same-day bookings include a $100 rush fee" to actually
   enforce the rush-fee policy instead of it being fine print.
4. Under **Availability**, connect a real calendar (Google/Outlook/iCloud)
   so Calendly blocks off time the business is already booked elsewhere.
5. Copy that event's scheduling link — looks like
   `https://calendly.com/your-name/boat-detailing` — and paste it into the
   `data-url` attribute of the `.calendly-inline-widget` div in `book.html`
   (it currently has a placeholder,
   `https://calendly.com/YOUR-CALENDLY-USERNAME/boat-detailing`).

That's the whole integration — no API keys, no Vercel environment
variables, nothing else to wire up.

**Confirmation page:** `js/calendly.js` listens for Calendly's
"booking confirmed" event and sends the visitor to `thank-you.html`
(`js/thank-you.js` shows a generic confirmation message in this case,
since Calendly's free tier doesn't hand back the booking's field values to
the page). Visiting `thank-you.html` directly with no params shows a
generic fallback message instead.

## Contact form (index.html) & ferrying quotes (ferrying.html)

The general contact form on `index.html` (`#contact`) is still a
**front-end-only demo** — it doesn't send email yet. The ferrying page
intentionally has no calendar of its own (deliveries are quote-based) and
routes here instead. To make this form functional, the simplest path is a
free form service like [Formspree](https://formspree.io): create a form at
formspree.io, copy its endpoint URL (`https://formspree.io/f/xxxxxxxx`),
and POST the contact form to it the same way the old booking form used to
(see git history for `js/booking.js` if you want that exact pattern back).

## Deploying

Being fully static, this folder can be deployed as-is to GitHub Pages,
Netlify, Vercel, Cloudflare Pages, or any static host — no build command
needed.
