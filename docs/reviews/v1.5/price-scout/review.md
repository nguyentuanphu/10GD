# Price Scout / So giá — v1.5 first version (review record)

Status: implemented on feature branch `feat/price-scout` for preview testing. **Not deploy-approved.** Responsive QA here does not grant deployment approval (AGENTS.md rule 10).

## What it does
A collapsible **🏷️ So giá / Price Scout** panel on the Shopping screen:
- Postcode → state setup. NSW (1000–1999, 2000–2599, 2619–2899, 2921–2999) and QLD (4000–4999, 9000–9999) are supported. Other valid Australian postcodes, including the ACT ranges 0200–0299, 2600–2618 and 2900–2920, get the bilingual “Rất tiếc! Khu vực của bạn hiện chưa được hỗ trợ…” message.
- Capture: **Chụp màn hình giá** (on-device OCR of a screenshot), **Dán chữ** (paste), **Nhập tay** (manual entry), the **“Lưu giá” bookmark** with iPhone Safari and Android Chrome install steps, and **Catalogue & deal** (links to official catalogues, plus a quick deal entry with an end date: Woolworths/Coles Wed→Tue, ALDI Special Buys Wed & Sat). Every capture opens a confirm sheet, and nothing is saved until the user confirms it.
- Cards: one-stop Woolworths vs Coles total, counting only items priced at **both** (with ALDI shown for information and coverage); smart split with $ and % savings; minimum-savings fold-back (≥ $5 saved or ≥ $15 order, configurable); food-safety route order; Chợ Việt vs supermarket benchmark; Amazon AU bulk tray with per-roll and per-wash unit prices; a Chợ Việt badge on shopping-list rows.
- Persona (Convenience-First / Smart Saver / Local Fresh Lover / “Đang học thói quen” with fewer than 3 trips), worked out from the last 4 weeks of receipts. The user can override it.
- Freshness labels: specials expire at `validUntil`; regular prices are greyed after 21 days and left out of totals after 35 days. Items without a price are listed as unknown. They are never counted as $0.
- **Làm mới giá** reloads the family pool and the official cache. Offline, the panel uses the local copy and shows an offline note.

## Data sources and legal stance
- Prices come only from people in the family, recorded for personal use: screenshots and pasted text, the bookmark (which runs in the user's own browser on the page they are viewing and reads JSON-LD, meta tags or visible text), confirmed receipts (only lines with a known quantity, in AUD), catalogue entries and manual entry.
- **No server-side scraping or bot evasion.** The server never fetches retailer pages. The tests assert that the bookmarklet contains no `fetch`/XHR and that the backend contains no retailer endpoints.
- **No cross-family sharing.** Observations live under the household-scoped key `households/<id>/grocery/observations.json` (conditional writes with retry). Device-only mode stores them on the device. Device data is never merged into a family automatically, because storage scopes stay separate.
- An official feed slot exists: `bep-grocery-cache` `prices/{NSW|QLD}/{cycle Wednesday}.json` is read if present. `grocery-cron` (`30 19,20 * * 2,5` UTC, acts only at 06:xx Australia/Sydney) imports **only** from a licensed feed set in `GROCERY_FEED_URL` (+ optional `GROCERY_FEED_TOKEN`). Without one, it logs and exits.
- The master catalog (`data/master-catalog.json`, 136 staples) has no prices, SKUs or ASINs (`retailerRef` is always null).
- Retailer names appear only as store names. The UI never names the hosting or storage vendor.

## Provenance (ready for a future community phase)
Each observation now carries `visibility` ('family'; 'community' is reserved and rejected today), `evidence` {type, imageHash (SHA-256), ocrPrice, ocrMatches}, `capturedAt`, `confidence` (manual = low, OCR-matched screenshot/bookmark = medium, receipt = high; the server recomputes it) and `storeBranchId`. Only the extracted facts and the image hash are stored; the image itself never leaves the device. `priceSanity()` flags a unit price outside 40%–250% of the 35-day rolling median when there are at least 3 observations. The confirm sheet then shows “Giá này khác thường — kiểm tra lại?”, and saving is still allowed.
**Community sharing is a future phase, gated on moderation. It is not built.**

## Verification
- `npm run build && npm run check && npm test` pass. New suites: `price-scout.test.cjs` (catalog schema, postcode boundaries, unit normalisation, OCR parser samples for each retailer, bookmarklet extractor on fixture HTML, optimizer one-stop/split/threshold/route/benchmark/unknown/persona, receipts, provenance, sanity) and `grocery-api.test.mjs` (session + household gate, origin check, viewer read-only, validation, household isolation, delete, rate limit, official cache, client/server postcode mirror for 0000–9999, cron no-op/time window/licensed import).
- `npm run test:price-scout:browser` (Chromium, `reducedMotion: reduce`) produces 31 screenshots in this folder. It covers mobile 375×812, tablet 820×1100 and desktop 1280×800, in VI/EN and light/dark: setup/empty state, unsupported postcode (3000 and ACT 2600), comparison and route cards, the confirm sheet (paste flow and the unusual-price warning), bookmark landing (`?price-capture=`), bookmark help, catalogue sheet, the Amazon tray, family-account refresh/save (mocked API) and the offline state. It checks for no horizontal overflow and ≥ 44 px touch targets inside the panel, sheet and tray. Header/navigation is unchanged, so there is no 320 px narrow-phone check.
- The existing `npm run test:browser` still passes.

## Limits
- Browser viewport simulation only; no physical iPhone/Android testing. Bookmarklet install and run on real Safari/Chrome is not verified, and some retailer pages may block bookmarklets (Content-Security-Policy, or apps rather than web pages). The UI tells users to fall back to a screenshot.
- OCR uses the existing on-device Tesseract loader (CDN). It needs a connection the first time; offline, the user is asked to paste or type instead. Real-screenshot OCR accuracy has not been measured. The parser is tested on representative text only.
- When a shopping quantity cannot be converted to the item's unit basis (for example, grams of spring onion priced per bunch), the cost is estimated as one pack and marked “≈”.
- Persona uses receipts only (store names are mapped to retailers by keywords). Shopping-list history isn't used yet.
- The catalog ships inside the startup pack as `dist/master-catalog.js` so it works offline. `dist/master-catalog.json` is not copied, to keep generated files out of git.
- Sample prices in the screenshots are synthetic QA fixtures, not real prices.
