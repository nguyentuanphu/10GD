# v1.5 catalog fixes (Agent D): review record

Branch `agent-d/catalog-fixes`, based on `8d7a7a7` (PR #5, 740-recipe catalog). This is for preview and testing only. **Deploy is not approved**, and this record does not grant it.

## What changed

| # | Finding | Fix |
|---|---|---|
| 1 | Mixed-version sync | `APP_EDITION=5` is written to state as `appEdition`. When the new client sees a newer edition in shared state, it stops syncing and shows **"Có bản cập nhật — tải lại / Update available — reload"**. It reloads automatically once per session and never offers "Dùng bản máy này" (keep mine). `validImport` now accepts unknown built-in ingredient ids from newer editions: it keeps them and registers a placeholder with price 0 and no invented name or price. Unknown ids from the same edition are still rejected. |
| 2 | Deleted recipes resurrect | `state.deletedRecipeIds` holds tombstones. They are validated and persisted, then merged as a union on sync (`persistRemoteState`), on save and on backup import. `upgradeReferenceCatalog` never re-adds a tombstoned id. If the family restores a recipe, its tombstone is cleared. |
| 3 | Menu distribution | **Scoring:** for scoring only, an unpriced ingredient uses the median price of its group and unit. Displayed prices stay "Chưa đủ giá". **Pantry bonus:** salt, pepper, oil, sugar, fish sauce, soy, garlic, vinegar and starch no longer count. **Vietnamese first:** with the default/"viet" preference, Western and healthy dishes appear only as an occasional Friday or weekend "treat" slot (15% chance), with a hard cap of 2 meals a week. **Mains first:** each meal now picks its main dish before its sides. **Seed salads:** used only beside Western or healthy mains. **Dressings:** never placed in slots or suggestions. This covers the planner, `recipeSuggestions`, "Gợi ý món từ nguyên liệu sẵn có" and "Hôm nay bận". |
| 4 | Rice rule | `mealHasRice` now depends on the main or noodle dish only. A side salad or a soup with bread no longer removes rice from a Vietnamese meal. |
| 5 | Diet labels | Diet is computed from ingredients for every recipe, using an explicit plant allowlist. `eggNoodle` counts as vegetarian, not vegan. Miso, parmesan, mozzarella, feta, bread and fresh pasta get "Chay? Xem nhãn" (vegetarian if the label allows it, never vegan). Family-added ingredients leave a dish unlabelled. Meatless Vietnamese dishes now have labels. |
| 6 | "540 món" text | The count is computed and bilingual everywhere (6 strings). |
| 7 | Recipe search | Typing refreshes only the results grid; the input element stays in place. Input during IME composition is ignored and the search runs on `compositionend`, with a 150 ms debounce. Search text is kept when switching tabs. New **Tất cả / All** scope. Family recipes show in Reference tab results (🏠 pill). Matching covers dish names, English names and ingredient names, ignoring diacritics. Exact accented and whole-word matches rank first. The pantry "Tìm món" button now searches by that ingredient. |
| 8 | Pantry crash | **Could not reproduce at `8d7a7a7`:** `artwork.ts` has no `inferIngredient` call. As hardening, the artwork lookup now guards against missing entries. A browser regression test covers pantry, the lot editor, "Tìm món" and recipe details with a `family-ing-*` ingredient. |
| 9 | Dark mode | Appended block `v1.5 dark-contrast` adds surface tokens (`--surface`, `--surface-2`, `--surface-3`, `--border-strong`, `--ink-soft`, `--accent-ink`, `--accent-fill`, warn and danger tokens) and fixes the calendar plus about 50 light-background selectors. |
| 10 | Sprite bleed | Each sheet has measured gutters (`SPRITE_GRID`) because the paintings are not on an exact quarter grid. The third row sat up to 60 px off. Each tile is now cropped around its own cell with a 3% inset. A CSS fallback (block `v1.5 catalog-art`) zooms 4% around the centre of each tile. |

### Menu distribution: 60 simulated weeks on defaults

| Slot (family planner, default) | Before: share new-edition / Vietnamese | After: share new-edition / Vietnamese |
|---|---|---|
| Soup (n=300) | 180 (60%) / 119 (40%) | 6 (2%) / 294 (98%) |
| Main (n=300) | 150 (50%) / 148 (49%) | 21 (7%) / 294 (98%) |
| Veg (n=300) | 257 (86%) / 47 (16%); 196 seed salads | 5 (2%) / 294 (98%); 1 salad (beside a Western main) |
| Friday noodle (n=60) | 92% Vietnamese | 85% Vietnamese |
| Weekend feast slots (n=180) | 97% | 90% |
| Vietnamese main without rice | 67 | **0** |
| Most Western/healthy meals in one week | 5 | 1 |

Classic planner (`familyPlanner:false`, 60 weeks):

- Vietnamese mains went from 37% to 93%, soups from 74% to 93% and veg from 5% to 93%.
- Seed salads as veg dropped from 625 to 34.
- Vietnamese meals without rice dropped from 178 to 0.
- The most Western/healthy meals in one week dropped from 10 to 2.

Dressings selected: 0 before and after.

The shipped test (`catalog-fixes`) uses 50 seeded weeks for each planner. It asserts that every slot is at least 80% Vietnamese, that no dressings are selected, that no Vietnamese rice meal lacks rice, and that no week has more than 2 Western/healthy meals.

### Dark-mode contrast audit

`npm run audit:contrast` runs `src/scripts/contrast-audit.cts`. It covers 8 views, the reference tab, 8 modals and the offline state, at 1280×800 and 375×812, in dark theme.

- **Before:** 1,569 failing text elements across 60 selectors (`contrast-dark-before.json`). The calendar day was 1.16:1.
- **After:** 2 elements across 1 selector (`contrast-dark.json`). This is the disabled "← Trang trước" pager at 4.5:1, which is exempt as a disabled control.
- Selectors the audit does not reach are covered by a CSS sweep of every light-background rule that had no dark override. These include the weight wheel and its fades, receipt lines, cooking steps, the ingredient editor, setup inputs and the urgent viewer.
- **Light theme, for reference and out of scope:** 2,886 elements fail across 62 selectors. Most come from `--muted #7b8379` on white (3.7–3.9:1). I recommend a separate token change.

## Verification

- `npm run build && npm run check && npm test` pass. New suite: `tests/catalog-fixes.test.cjs`.
- `npm run test:browser` passes.
- `npm run test:artwork:browser` passes. It was updated to wait for the 150 ms search debounce, and its vegetarian count is now computed from ingredients (97 of 100 plant recipes).
- New `npm run test:catalog:browser` passes at 375×812, 820×1100 and 1280×800 with no page errors and no horizontal overflow. It covers:
  - Real Chromium IME composition through CDP `Input.imeSetComposition` for "cá kho" and "canh chua". The input element stays the same and the value is exact.
  - Ranking for "cá" (cá dishes above cà/cải), accent-free "ca kho", ingredient search "lá lốt", scopes, and English search "sour soup".
  - Pantry, the lot editor, "Tìm món" and details with a family ingredient.
  - The generated week, which contains no dressing.
  - Calendar contrast of at least 4.5:1 in light and dark.
  - The newer-edition guard: no "keep mine" button, and a reload button.
- **Compatibility:** `catalog-fixes` runs the released main `validImport` (commit `0bcef70`, snapshot in `src/tests/fixtures/main-0bcef70-client.cts`). It shows that main rejects a v5 state and accepts a v3 state.

### Screenshots in this folder

Each set below exists at mobile 375×812, tablet 820×1100 and desktop 1280×800:

- `*-search-vi.png` (cá kho, typed through the IME)
- `*-search-en.png`
- `*-pantry-family.png`
- `*-weekly-menu.png`
- `*-calendar-light.png`
- `*-calendar-dark.png`

Limits: these are browser viewport simulations, not tests on physical devices. Reduced motion was emulated. Offline was checked only through the contrast audit's offline pass. The language toggle was exercised.

## Known limits and decisions

- **One-time mixed-version risk.** Old main clients (`0bcef70`) reject any synced state that contains the 48 new ingredients: their `validImport` shows "Dữ liệu Đồng bộ không đúng định dạng". The risk window is a tab or PWA left open from before the update; a reload fetches the new startup pack. In that window, an old client that later hits a 409 can still choose "Dùng bản máy này", which overwrites newer edits with its older copy. The new client then restores the catalogue on receipt, applies tombstones it knows about, and keeps family recipes. The `appEdition` guard protects future upgrades only, because old code cannot be changed retroactively. Recommendation: tell the family to reload every open device once after deploy.
- `app.ts` still runs the seedVersion <2 and <3 upgrades (from before v1.3) without tombstones. Those copies predate tombstones, so the gap is theoretical. `app.ts` belongs to another owner and was not edited.
- Seed salads are not yet auto-planned as "light mains". They can be picked manually and are auto-planned only beside Western or healthy mains.
- **Artwork extras, listed only and not regenerated:** peas are painted in
  - `r9` Cá kho cà chua
  - `family-v3-356` Bí đỏ và cà rốt luộc
  - `r19` Canh bắp cải
  - `west-v4-060` Pancake yến mạch sữa chua mặn

  None of these recipes uses peas.
