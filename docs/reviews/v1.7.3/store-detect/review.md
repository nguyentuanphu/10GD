# v1.7.3 · So Giá store detection, manual store entry, online retailers, signed-in warnings

Branch `agent-pp/store-detect` (from `origin/main` 4aa46fb, v1.7.2). Not merged, not deployed, no preview build.

## Owner reports (extension 1.7.2)
- No store detected on any retailer → step ④ never done; popup "no store chosen on the site".
- Could not type and save "Wolli Creek" in Settings → Stores.
- False "signed in on Chemist Warehouse" (header shows "My Account · Login or Sign up"), and that warning shown on the Amazon tab.

## Root causes found
1. **Manual entry (Settings):** `options.ts` bound the theme handler with `document.querySelectorAll('[data-theme]')`. `<html>` carries `data-theme` (set by the theme code), so **every click anywhere** ran `rerender()`. Clicking the text box re-drew the page → the box lost focus, typing went nowhere, and "Save stores" read an empty box. Reproduced in Chromium with real clicks + keyboard (the old e2e used `fill()`, which never clicks the box, so it passed). Fixed by scoping to `#app button[data-theme]`; render() now also keeps typed text, focus and caret.
2. **Detection:** 1.7.2 only had guessed CSS selectors, and the content script did not read the page again when only the header changed (it re-reported only when the price count changed) — single-page apps render the fulfilment bar after the prices.
3. **CW false positive:** the marker list contained "My Account", which CW shows when signed out.
4. **Wrong-tab warning:** the popup listed every retailer's warnings.

## What changed
- **Parser config (data, version `2026-11-02.2`)** based on Henry's real page structure (2 Nov 2026, redacted):
  - Woolworths `storeMethod`: ribbon `[class*='fms-type']` → method `[class*='fms-method-text']` + value `[class*='fms-value']`; value accepted only for Direct to boot / Pick up / Click & Collect. Delivery → no store at all (the value is the home address). `[class*=…]` survives CSS-module hash changes. Text-pattern fallback (`storeText`) if classes change.
  - Coles `[data-testid=where-link] .coles-targeting-WhereAndWhenInfo`; a delivery-labelled button disables store reading on that page; store id from `script#__NEXT_DATA__` `trolley.storeId` (read as JSON data); tolerant fallbacks (chip before "When", "Your store:", aria-label).
  - ALDI `button.select-merchant-feature-bar__service-address` ("2205, Wolli Creek" → "Wolli Creek"); ALDI is never "signed in" (no accounts).
  - Chemist Warehouse / Amazon AU: `online: true` → store "Online", nothing read from "Deliver to …".
  - Signed-in: strong text ("Sign out"), Woolworths quick-links `h2` "Hello, …", header greetings only when the header has no "Log in / Sign up / Login or Sign up / Hello, sign in".
  - Price fields: Woolworths `wc-product-tile` shadow fields, Coles tiles (ad tiles skipped via `tile.require`, unit text cut before "|"), Coles PDP scoped to the first `[data-testid=product_price]`, ALDI tiles/PDP, CW category tiles + PDP, Amazon tiles (sponsored skipped via `tile.skip`, unit = non-struck text price, was = struck price only).
  - Comma selector lists are now tried in order (live selector first, older guesses after).
- **Parser (`scout-parse.ts`):** element-segmented visible text (light DOM + open shadow roots; hidden/form elements skipped), `storeText` patterns (`segments`/`text`/`label`), delivery guard (context "deliver…", names with digits rejected, nav words rejected), `storeMethod`, `signedIn.greet`, `storeIdJson`, store hints in "Send this page's structure" (short segments near store words; greetings/account/delivery/digits dropped).
- **Content script:** reports again when the store label or signed-in state changes (and one more retry at 9 s).
- **Online retailers:** readiness ④ is done when a supermarket store is set **or** CW/Amazon capture is on. Heartbeat sends `online:[…]`; server `effectiveStores()` adds "Online" for them (planner `ensurePlan`, leases, plan info, Run now, Studio). Facts from CW/Amazon are stored as "Online" and placed as an online price in the device's postcode state (`retailer:online:STATE`, `online:true`). `storeMatches` treats "Trực tuyến" = "Online".
- **Manual entry:** inline "Nhập tên cửa hàng" + Lưu on each store-less supermarket row (success/error messages), the full "Sửa tên cửa hàng bằng tay" form, and a box in the popup on a supermarket tab with no store.
- **Studio:** device card "✎ Sửa cửa hàng" (owner only; support role is read-only server-side), `studio-device` action `update`, audit `scout_device_update` with `details.stores {retailer:{from,to}}` + event `stores_changed`; the computer gets it at its next heartbeat. Online stores shown "Trực tuyến".
- Popup warnings scoped to the current tab's retailer; 1.7.2 signed-in flags are cleared on update to 1.7.3.
- Versions: extension manifest + `EXTENSION_VERSION` 1.7.3 (update banner for 1.7.2), app 1.7.3, README "What's new in v1.7.3".

## Tests
- `npm run test:scout-store` (`src/tests/scout-store-detect.test.mts`): parser on synthetic pages mirroring the live structure (fixtures `store-*.html`, `live-*.html`; placeholders "Sam", "12 Sample Street"), delivery never captured (Woolworths light + shadow, Coles), text fallback, override config, sample privacy, all price fields; server: Online matching, effective stores, planner/leases, Online facts, placement, config validation, Studio edit owner-only + audited + picked up at heartbeat.
- `npm run test:scout-store:browser` (`src/tests/scout-store-browser.test.cts`): real MV3 extension — keyboard typing "Wolli Creek" while storage changes every 700 ms → saved on the server → ④ ✓; error path keeps typed text; full manual form; ALDI detected → "Use this name"; Woolworths ribbon rendered 3 s late in a shadow root detected; Coles delivery not read; popup box saves Coles; CW "Login or Sign up" clears a stale flag; CW warning not shown on the Amazon tab, shown on the CW tab; heartbeat reports online retailers; Studio editor at 4 sizes.
- Both added to `test:all`. Existing `scout-parse` ALDI assertion changed: ALDI is never signed in (live structure: no accounts). Amazon fixture's was-price now carries `data-a-strike="true"` as on the live site.

## Local runs (sandbox; supporting evidence only — GitHub CI not run)
`npm run check`, `typecheck`, `npm test`, `test:scout`, `test:scout:browser`, `test:scout-pair:browser`, `test:scout-studio:browser`, `test:scout-release`, `test:studio-nav:browser`, `test:scout-store`, `test:scout-store:browser` — all pass.
Changes to existing suites: `scout-extension-browser` switches CW/Amazon capture off at start (its fake world has only Woolworths fixtures; with them on, the planner would send Auto to the real sites), updates the ④ wording, and allows a sub-pixel (−0.34 px) offset in the “④ scrolled into view” check (Stores step is taller now). Screenshots that older suites rewrite under v1.7.1/v1.7.2 were restored, not committed.

## Behaviour change to note
With CW/Amazon capture on (the default), Auto runs on allowed computers now also visit Amazon AU / Chemist Warehouse search pages as “Online” stores. All existing guardrails apply (robots.txt, pacing, caps, 403/429/challenge → stop + 24 h pause). Turning “Ghi giá” off for those retailers on a computer removes them at its next check-in.

## Responsive evidence (browser viewport simulation in headless Chromium — not physical devices)
- Settings → Stores: 375×812, 820×1100, 1280×800 · VI light + EN dark (`options-stores-*`), after saving (`options-saved-vi-light-1280x800`). No horizontal overflow, touch targets ≥44 px (asserted at 375).
- Popup 375×812: Coles store box, Amazon online note.
- Studio "Sửa cửa hàng": 320×740, 375×812 (VI light), 820×1100 (EN dark), 1280×800 (VI light, EN dark); no overflow, ≥44 px targets on touch sizes.
- No new animation (reduced-motion contexts used).

## Limits
- Live retailer sites are not reachable from the sandbox; fixtures are synthetic copies of the structure Henry sent (2 Nov 2026). Retailer markup changes; fixes can ship as a server config override (Studio → config) without an extension update.
- Coles delivery mode was not in the sample: guarded by "deliver" in the where-link's label/text and digits; if Coles shows only a suburb in delivery mode without the word "delivery", it could be read as a store (Henry can check with "Send this page's structure").
- `storeId` (Coles) is read but only kept in the page result for now; ALDI's store id is in a page script variable that content scripts cannot read, so it is not used.
- CI on GitHub has not run (nothing pushed). Deploy is not approved.
