# Bếp Gia Đình · v1.4

Family meal planning, shopping and receipts, built with HTML/CSS/Vanilla JavaScript and a Netlify backend.

## What is included

- Saved retailer products with manually confirmed/receipt/CSV prices, branch, pack size, barcode and checked date. Search links to Coles, Woolworths and Chemist Warehouse; adding a product updates the family list, not a retailer account/cart. Live retailer catalog APIs are not connected.
- Cooking insights count only meals marked Cooked, exclude future dates, and update on undo. Repeat intervals, likes and paused suggestions affect recommendations and weekly generation.
- Vietnamese/English core interface, product and insights workflows, and push settings. Device-local language does not translate or replace user content or original Vietnamese recipe instructions.
- Mobile navigation keeps Today / Weekly Menu / Shopping and moves secondary tools into More.

- **Simple screens by default** for Today, Weekly Planner and Shopping, with a remembered Full view per device. Shopping uses 20–21px item names, 44–48px checkbox touch targets, collapsible tools and an optional remaining-items filter.
- **540 dishes and recipe variants:** 172 mains, 110 soups, 88 vegetable dishes and 170 noodle/soup/porridge meals. Every entry has ingredients, preparation and cooking steps. The catalog displays 24 cards per page, with search/category/time filters.
- Multi-dish family meals, individual dish replacement, portion scales, per-person attendance and optional rice. Weekend soup selector and weekday meal suggestions respect configured constraints and meal locks.
- Purchase quantity wheel with g/kg, ml/litres, pieces, slices, bunches, packs, boxes, trays, bags, bottles and custom unit names. Remember a preferred buying unit, size estimate, price and note per ingredient.
- Pantry tracks measured quantities and unweighed counts separately. Unknown weights never silently become grams. Budget estimates identify unknown prices.
- Stores with user-entered branch addresses, remembered ingredient/store choices, and shopping views by aisle or store.
- Phone Notes imports with preview, image receipt OCR, manual ingredient matching, weekly spending and unit-price history. Price per bunch is compared with bunches, not kilograms.
- Immediate **“Nhờ mua thêm”** requests containing item, quantity, store/address, sender and note. Requests remain in the shopping list even if push is unavailable.
- Authenticated Netlify Blobs family storage, receipt images and conflict detection; Web Push device registration and scheduled reminders.

## Deploy to Netlify

Use Git deployment or a CLI deployment that builds Functions. Build command: `npm run check`; publish directory: `dist`; Functions: `netlify/functions`.

Set `FAMILY_PASSWORD` (at least 12 characters) in the Netlify environment with Functions scope, then deploy. Open the app and connect family storage. Each recipient phone must independently enable push and choose its family member and reminder types. Server-only VAPID keys are created in Blobs when the first device activates push; private keys are not sent to browsers.

Full instructions are in [NETLIFY-SETUP.md](NETLIFY-SETUP.md). A drag-and-drop upload of `dist` alone does not install the backend.

## Run checks

```sh
npm ci
npm run check
npm test
```

Tests cover meal quantities, inventory and undo, recipe variants, remembered sale units, unknown weights/prices, store preferences, weekday ranking, receipt matching/prices, authentication, conditional writes, push recipients, Sydney daylight saving and reminder deduplication. Push transport is mocked in tests; delivery to real phones must be verified after Netlify deployment.

## Data and behavior

Browser-local operation remains available when disconnected. Cloud synchronization uses a shared family password and detects overlapping edits rather than silently overwriting them. Metadata backups are JSON; receipt photos are separate.

Suggested portions, recipe times and sample prices are editable. Quick noodle/porridge times assume the prepared broth or cooked ingredients stated in the recipe. A weight estimate per bunch/piece is explicitly approximate. A receipt may record actual cost per sale unit without knowing its gram weight.

Scheduled Functions check due reminders every 15 minutes. Roles and selected recipients filter delivery; each device chooses notification language, quiet hours and whether urgent requests can bypass quiet hours. Two automatic sends per device/day are enforced with conditional slot claims. Direct requests are normal by default; urgent requires an explicit choice. Ignored or capped notifications are not queued. Notification display, timing and sound depend on browser/OS permission, connectivity and Focus settings. No background push is claimed before a device has successfully registered.

## Artwork

`dist/artwork/ingredients-v1.webp` and `dist/artwork/dishes-v1.webp` are original generated illustration sprite sheets (16 cells each), integrated by `dist/artwork.js`. Remaining ingredient types use local SVG illustrations; unsupported dish types retain the existing vector artwork. All artwork is bundled for offline use. These are representative illustrations, not exact recipe photos or retailer product images. Generation prompts are recorded in `ARTWORK.md`.
