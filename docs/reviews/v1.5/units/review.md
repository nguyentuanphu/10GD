# v1.5 Units & unit icons — review record

Owner request (Henry): “Add many more units like chai, lọ, etc., with icon artwork so they're easy to understand.”

Branch `agent-o/units-icons` (based on `claude/bold-pascal-riryi0` incl. be017cd). Not deployed; deploy approval is still needed separately (AGENTS.md rules 1–5, 10).

## What changed
- **Unit registry** (`src/frontend/unit-registry.ts`, loaded in the startup pack before `purchase-units.js`): 40 units with id, stored VI label, VI/EN labels, EN plural, category (weight / volume / count / container / produce), base dimension, VI+EN synonyms and an icon. Includes g, kg, lạng (100 g), ml, l, cái, miếng, lát, quả/trái, con, bó, nắm (flagged *approximate*), cây, củ, tép, nhánh, bắp, cuộn, gói, túi, hộp, khay, vỉ, chục (10), tá (12), chai, lọ, hũ, lon, lốc, thùng, két, bao, can, bình, ống, tuýp, viên, tờ, lần giặt.
- **Icons**: 41 original 24×24 line icons (40 units + a generic “custom unit” tag), `currentColor` plus one accent token `--unit-accent` (lighter in dark mode), no text or brand marks, inline in the startup pack so they work offline (no new files to precache). Always `aria-hidden` next to a visible text label. Sheet: `unit-icons.html`, `icon-sheet-*.png`.
- **Unit picker** (`unit-picker.ts`): the old drop-down is replaced by unit chips grouped under **Hay dùng / Cân/đo / Đếm / Bao bì / Rau củ / Khác** (EN: Recently used / Weigh / measure / Count / Packaging / Produce / Other). Recently used units (per device, `bep-recent-units`) come first, a search box filters by VI/EN synonyms with or without diacritics (“jar”, “lọ”, “lo”), arrow keys/Home/End move between chips, Enter/Space chooses, focus returns to the chosen chip. Chips are ≥44 px tall. “+ Tự đặt đơn vị…” is always available (generic icon); if a search has no match the typed text is carried into the custom name. A custom name that matches a synonym (e.g. “bottles”) is stored as the registry VI label (“chai”).
- **Definitional conversions only**: lạng → 100 g, chục → 10, tá → 12 are offered as editable defaults. Containers (chai, lọ, hũ, thùng…) never get a gram/mL amount unless the family enters it — unchanged “size estimate” behaviour.
- **Shopping rows**: the amount button and free-text extras show the unit icon and a localized unit label (“2 lọ” / “2 jars”). Shared/copied list text and stored data are unchanged.
- **Price Scout**: purchases and extras are normalised via `unitScoutQuantity` — “2 chai 500 ml” → 1000 mL; a bottle with no size stays a pack; viên / lần giặt → per_wash, cuộn → per_roll, tờ → per_sheet, lạng → grams, chục/tá → each.
- `BUYING_UNITS` (also used by receipt unit selects) now lists every non-measured registry unit, the original ten first.

## Backward compatibility
Stored shape unchanged: `unit` stays a plain string (VI label). No `unitId` field was added. Validators unchanged. Tested: the released main client's (0bcef70) `validUnitState`/`validImport` accept a state with lọ / lạng / lần giặt / hũ / custom units (snapshot fixture `src/tests/fixtures/main-0bcef70-units.cts`). Legacy spellings (“Chai”) map to registry units by synonym.

## Verification
- `tests/units-registry.test.cjs` (in `npm test`): completeness, unique ids/labels/icons, synonym collisions (only the documented `can` = jerrycan vs EN “can” = lon; stored VI wins), VI/EN lookup with/without diacritics, picker choice rules, old-client compatibility, Price Scout normalisation including `basisMultiplier`.
- `tests/units-browser.test.cjs` (`npm run test:units:browser`, in `test:all`): shopping-row icons + text labels VI/EN light/dark at 375×812, 820×1100, 1280×800; picker groups/headings, 44 px targets, search (jar, lọ, lo, bottle, tub, crate, dozen, lan giat, tin), keyboard, EN labels incl. wheel, save → plain VI string stored, recent units, custom unit; no horizontal overflow at 320×740, 375×812, 820×1100, 1280×800; no page errors. Reduced motion is emulated; chip transitions only run with `prefers-reduced-motion: no-preference`.

Screenshots: `shopping-{vi-light,en-dark}-{mobile,tablet,desktop}`, `picker-{vi-light,en-dark}-{mobile,tablet,desktop}`, `picker-vi-dark-mobile`, `picker-en-light-mobile`, `picker-vi-light-narrow` (320 px), `picker-search-{vi-light,en-dark}-mobile`, `picker-custom-vi-light-mobile`, `icon-sheet-{light,dark}-{mobile,tablet,desktop}`.

## Limits
- Browser viewport simulation in headless Chromium only; not tested on physical phones/tablets.
- Offline state not re-tested separately: icons are inline in the startup pack, which the existing offline/startup suites cover.
- Some pre-existing picker text (quantity labels, note placeholder, save button) still relies on the existing translation layer; not changed here.
- Receipt unit selects are plain `<select>` elements and show the longer list without icons.
- The voice parser (Agent N) does not use the registry yet; the exported API is ready for it.
