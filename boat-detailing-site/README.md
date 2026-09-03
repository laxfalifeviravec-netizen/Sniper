# Coastal Edge Boat Detailing — Website

A standalone, static marketing website for a mobile boat detailing business
(built with placeholder branding — "Coastal Edge Boat Detailing", South
Florida). No build step or dependencies required.

## Structure

```
boat-detailing-site/
├── index.html      # All page content/sections
├── css/styles.css  # Styling (ocean navy/teal + sandy gold palette)
├── js/main.js      # Mobile nav toggle, scroll shadow, demo contact form
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

- **Business name & logo** — currently "Coastal Edge Boat Detailing" (`index.html` header/footer, `<title>`, meta description).
- **Phone / email** — `(555) 123-4567` / `hello@coastaledgeboats.com` (header, hero badges, contact section, footer, `tel:`/`mailto:` links).
- **Service area** — South Florida cities list near the bottom of the page.
- **Pricing** — Bronze/Silver/Gold package prices in the "Packages" section are illustrative starting points.
- **Photos** — the "Before & After" gallery and hero illustration currently use CSS gradients/SVG as placeholders. Swap the `.gallery-item` blocks for real `<img>` before/after photos for the biggest conversion boost.
- **Reviews** — testimonials are placeholder quotes; replace with real customer reviews (with permission) once you have them.
- **Social links** — the IG/FB/Google icons in the contact section point to `#`; add real profile URLs.

## Contact form

The form in `#contact` is a front-end-only demo (see `js/main.js`) — it
does not send email or hit an API yet. To make it functional, wire it up
to one of:

- A form backend service (e.g. Formspree, Netlify Forms, Getform)
- Your own backend endpoint (e.g. this repo's `backend/` FastAPI service, or a small serverless function) that emails/stores submissions
- An email API (e.g. SendGrid, Postmark) called from a small server function

## Deploying

Being fully static, this folder can be deployed as-is to GitHub Pages,
Netlify, Vercel, Cloudflare Pages, or any static host — no build command
needed.
