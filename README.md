# Bean Cafe

A daily margin + cash tracker for a small cafe. Set each product's buy/sell price once,
log the stock you buy each day, record dues (credit) as they happen, then **check out** to
close the day: it counts leftover stock, carries it to tomorrow, and shows profit, sales,
drawer cash, and dues owed. Syncs live across phones via Supabase.

**Fully self-contained.** `app.js` bundles React + Supabase — nothing loads from the
internet at runtime, so it works even behind ad-blockers. Just host the folder.

## Files
- `index.html` + `app.js` — the app (keep them together)
- `manifest.json`, `icon.svg` — home-screen icon + full-screen look
- `schema.sql` — full database setup for a brand-new project
- `upgrade.sql` — run this on an EXISTING project to add checkout/cash/dues/inventory
- `UPDATE.md` — how to apply this update
- `DEPLOY.md` — full first-time setup guide

## Deploy / update
See `DEPLOY.md` (fresh) or `UPDATE.md` (already running).

