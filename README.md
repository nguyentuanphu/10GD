# Bếp Gia Đình — review build

Vietnamese family meal planner. Static Vanilla JavaScript app; no build dependencies.

## Run
Serve `dist/` over HTTP locally or HTTPS for PWA installation. Open `index.html` at the server root. All editable data is saved in this browser's localStorage. Use Settings → Export backup to move data to another device.

## Features
- Date-based weekly lunch/dinner planning, meal locks, rule-based generation and recipe snapshots.
- 54 recipes: 30 everyday Vietnamese dishes and 24 quick weekend soups/noodle meals.
- Weekend soup picker with date/meal selection, ingredient search and 15/20/30-minute filters.
- Per-member attendance and portion weights, per-meal manual overrides.
- Pantry lots by location/expiry, shopping aggregation, package rounding, bought/skip status and storing purchases.
- Cook/undo with inventory deduction, preparation checklist, guided recipe steps and foreground timer.
- Browser-local persistence, JSON export/validated replacement import and activity log.
- Share sheet/copy for Messenger, offline app shell, installable manifest and immediate notification test.

## Netlify export

See `NETLIFY-SETUP.md` for full deployment, family storage, receipt OCR, phone note imports and validation details. Run `npm ci && npm test` for all checks. The static review does not run the Netlify backend.

## Earlier review limits (updated by Netlify package)
The ChatGPT Sites static review has no Netlify backend connection. The Netlify package includes authenticated shared-family Blobs storage and conflict detection; it requires deployment and FAMILY_PASSWORD configuration. Scheduled background push remains unconnected. Notification permission/test is distinct from scheduled push. Prices and package sizes are sample AUD estimates; they are not retailer feeds. Recipe times for quick soups assume prepared broth/other ingredients as stated in each recipe. Nutrition/allergen suitability is not certified. Offline support requires a successful first load and Service Worker installation; private hosting authentication itself may require a network connection. Fonts fall back to system fonts offline.

## Verification
Run `node tests/core.test.cjs`. Tests cover portion changes, aggregated stock subtraction, expired stock, pack rounding, cooking/undo, locked meal preservation, constraints, backup validation, date boundaries, soup grocery quantities and weekend preferences.

Browser QA exercised attendance recalculation, planner, soup search/time filter and meal replacement, grocery purchase state and custom shopping items. iPhone installation, actual push delivery and offline launch have not been device-tested.

## Multi-dish meals
Meals support up to 12 dishes and independent dish replacement. Same-category recipes share the household portion automatically unless a per-dish scale is selected. Rice can be automatic, included or omitted. Generation can use configured main/soup/vegetable counts; weekly layouts display every dish.
