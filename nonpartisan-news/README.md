# Fulcrum — nonpartisan news concept page

A self-contained, single-file landing page (`index.html`) for **Fulcrum**, a
proposed news-reading product aimed at people whose daily habit is a single
outlet (a "paper of record" or a cable network) and who are unlikely to
switch to something that feels preachy or unfamiliar.

## What it does

- Pitches the core idea: every story bundle ships with a visible "gauge"
  showing how its sourcing splits across left / center / right, instead of
  asking readers to just trust a label.
- Includes a worked example of three sample story bundles, each with a
  neutral facts summary, a source-count gauge, three tier framing notes,
  and a "still disputed" callout. **This bundle content is clearly marked
  as illustrative sample data** — dated placeholders, not live news — since
  this page has no backend or live feed behind it.
- An interactive "balance dial" lets a visitor set a target left/center/right
  reading mix and see it reflected back on the same gauge component used
  throughout the page.
- A "transparency ledger" section spells out, in plain language, how the
  product *would* handle source-bias rating, funding, ranking/algorithm
  behavior, and editorial disclosure if it were built for real.

## Why it's one file

`index.html` is fully self-contained (inline CSS, inline JS, fonts inlined
as base64 `@font-face` data URIs — Source Serif 4, Public Sans, JetBrains
Mono) so it can be opened directly in a browser or hosted from any static
file server with no build step and no external network requests.

## Status

This is a design/content concept, not a production news product — it does
not fetch or aggregate real news. See the "This is a concept, not a live
product" section on the page itself.
