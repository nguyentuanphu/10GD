# v1.7 — Library chips, page size, compact cards and onboarding guide

Branch `agent-z/library-guide` (from local `v17-base`, v1.6 code). Not merged, not pushed, not deployed. No hosting builds or previews were triggered.

## What changed (Henry's feedback, iPhone, dark mode, English UI)

1. **Filter chips consolidated** (`src/frontend/family-menu-ui.ts`). The library now shows one horizontally scrollable row: All, Main dishes, Soups, Vegetables, Noodle & soup meals, Western & Italian, Seed & grain salads, Dressings. The counts are shown smaller. A compact **Lọc / Filters** button opens an inline sheet with the diet filters (Healthy, Vegetarian, Vegan) and **⚡ ≤20 phút / ≤20 min**. The button shows a badge with the number of active filters, and the sheet has **Clear all filters** and **Done**. Escape closes the sheet and returns focus to the button.
   - Diet is now a separate filter (`familyRecipeDiet`), so it can be combined with Western, Seed salads or Dressings. Counts still come from the shared index (`recipeMatchesLibraryFilters` / `recipeMatchesLibraryTag` in family-menu-core). When only one chip is active, every count is the same as in v1.6. "Tất cả / All" still resets every filter.
   - The "≤20p" label now reads "≤20 phút" in Vietnamese and "≤20 min" in English, in both the sheet and the status line.
2. **Page size**: **Hiển thị / Show 10 · 20 · 50 · 100** (default 20) is saved in `localStorage` under `bep-library-page-size`, inside try/catch. **Xem thêm N món / Show N more** loads the next page and moves focus to the first new card. The text "Đang hiện X/Y món / Showing X of Y dishes" shows the result count. This replaces Previous/Next paging.
3. **Compact cards**: each card shows only the image and the name. There are 2 columns on phones (also at 320 px), and an auto-fill grid of 3–5 columns on tablet and desktop.
   - The name is an accordion button (`aria-expanded`, `aria-controls`). It shows the category or tag pills, ingredient count, time, portions, "Quantities incomplete", **+ Thêm vào bữa / Add to meal**, and Edit or Save as family dish.
   - The image is a `<button data-action="recipe-detail" aria-label="Xem <name>">` that opens the full recipe directly. The separate View button was removed.
   - The images are the v1.6 per-cell thumbnails. They now use `content-visibility:auto` on the image button, so off-screen cards do not fetch their artwork until scrolled near the viewport.
   - The meal editor's dish search uses checkbox rows, not this card component, so it is unchanged.
4. **Onboarding guide** (new `src/frontend/onboarding-guide.ts`, loaded last in the startup pack):
   - On Today, new users see an inline card under the page heading: "Bắt đầu với Bếp Gia Đình / Get started with FamTray". It has a dismiss button (44×44). It is **never a startup modal**.
   - **Start the tour** opens the standard modal with 7 steps: Welcome/Today, Menu & Library (740 recipes), Shopping list, Price Scout, Family (connect, invite, members & portions), Voice input (VI/EN/Vietlish), and Reminders & offline (with an urgent messages line).
   - The tour has progress text and dots, Back/Next, ArrowLeft/ArrowRight, swipe, Skip, and **Done** on the last step. Each step has "Show me" buttons that go to the tab (or open Family connect, Voice or Reminders) without marking the tour complete.
   - The Price Scout step is hidden when `body.flag-off-priceScout` is set, and the Voice step when `flag-off-voice` is set. The urgent-message line is hidden with `flag-off-urgentMessages`.
   - Completion or skip is stored per device in `localStorage` under `bep-guide-v1`, inside try/catch. The guide re-opens from **More → Hướng dẫn sử dụng / How to use** (phone) and the sidebar link (tablet/desktop). The account menu was left unchanged on purpose: kitchen-hub pins its exact items and keeps Sign out last.
   - Slide animation is off under reduced motion. The card and tour work in dark and light themes.

## Verification (local, Chromium 1243 via Playwright 1.64.1)

- New suite `npm run test:library-guide:browser` (`src/tests/library-guide-browser.test.cts`) is appended to `test:all`. It runs at 320×740, 375×812 (touch), 820×1100 (touch) and 1280×800. It checks:
  - no startup modal; the inline card is placed under the heading; tour Next/Back/arrow keys/swipe/Show me/Skip/Done
  - the card does not reappear after reload; re-open from More and the sidebar; steps are hidden when Studio flags are off
  - one chip row, which scrolls on phones, with no diet or time chips in it
  - every category, kind and diet badge equals a catalogue-derived count; combined filters; badge; clear-all; Escape
  - page sizes 10/20/50/100, saved across reload; load more and focus
  - collapsed card shows only the name, toggle with tap/Enter/Space, Add to meal, image opens the recipe, column count
  - EN "≤20 min" and "Filters"
  - blocked storage: defaults are used and nothing throws
  - no horizontal overflow and no page errors at every size
- Existing suites updated only where the UI legitimately changed, with no weaker assertions:
  - `catalog-filters-browser`: diet chips are now `diet-filter` in the opened sheet; 20 instead of 24 cards per page; "Đang hiện 20/N món" instead of "Trang 1/N"; load more instead of page-next.
  - `artwork-browser`: opens the sheet for Vegetarian, then clears it before continuing as before.
- Passed locally: `npm run check`, `npm run typecheck`, `npm test`, `npm run test:browser`, `test:catalog:browser`, `test:catalog-filters:browser`, `test:artwork:browser`, `test:library-guide:browser`. GitHub CI has **not** run on this branch yet: it was not pushed (owner rule), so this is supporting evidence only (rules 15 and 17).

## Screenshots (JPEG, quality 72, all < 250 KB)

`{narrow 320×740, mobile 375×812, tablet 820×1100, desktop 1280×800}` × `today-card-vi-light`, `today-card-en-dark`, `tour-en-dark`, `library-en-dark`, plus `*-tour-vi-light` (mobile, desktop), `*-library-vi-light` (narrow, mobile, tablet) and `*-filters-sheet-vi-light` (mobile, tablet). They are regenerated by the suite.

## Limits

- Browser viewport simulation in headless Chromium, not a physical iPhone, iPad or Safari. iOS Safari momentum scrolling of the chip row and `content-visibility` behaviour were not verified on hardware.
- Swipe was exercised with pointer (mouse) events. Real touch swipe was not physically tested.
- Device-only mode was tested. Account and family mode were not re-run for these views (`test:authenticated-startup` was not run locally).
- The CI failure-artifact step uploads `docs/reviews/**/*.png` only, so these `.jpg` screenshots are not attached on a CI failure.
