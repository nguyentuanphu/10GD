# v1.6 — Bandwidth, offline downloads and app updates (Agent T)

Branch `agent-t/bandwidth-offline` (from `v16-base`). Not pushed; no PR; not deployed. Deploy approval is a separate
gate (AGENTS.md 1–5, 10) and GitHub CI on the PR head commit is still required (rules 14–17).

## Before / after bytes

Measured locally with Chromium against a throttled static server: **1.6 Mbps down, 150 ms latency per request,
one shared link, gzip for text** (a stand-in for the hosting CDN, which uses brotli, so real text transfers are a
little smaller). Bytes are bytes on the wire incl. ~250 B headers per request. Device-only (no account), new household.

| | Before (v16-base) | After (this branch) |
|---|---|---|
| Intended service-worker precache (static, wire) | **17.67 MB** (70 files: 58 artwork sheets 16.87 MB, startup pack 323 KB gz, icons 442 KB) | **0.43 MB** (13 files: shell, CSS, icons, pack list; no artwork) |
| First visit, total incl. worker install | 3.12 MB measured — the old install gave up: 8 s per-file deadline on a shared 1.6 Mbps link, so only 13 of 70 files were cached and the "offline" install was incomplete | **0.49 MB**, every lite file cached |
| First visit, ready to use | 4.7 s (0.79 MB) | **3.2 s** (0.48 MB) |
| Install finished (network quiet) | 13.0 s (incomplete) | **5.8 s** (complete) |
| Startup pack | 1.63 MB raw / 323 KB gz, incl. 530 KB recipe catalog | 1.15 MB raw / 313 KB gz; catalog is a separate 36 KB gz download |
| Startup pack downloads on first visit | 2 (page + worker install) | 1 (worker revalidates the page's download, 304) |
| Repeat visit (online) | 1.4 s, ~2 KB (revalidations) | 0.6 s, ~3 KB |
| Offline reopen | OK | OK |
| This week's artwork (pinned after the first render) | — (all sheets intended) | ≈ 6.8 KB per dish cell, 2.2 KB per ingredient cell; a full week (≈35 dishes, ≈40 ingredients) ≈ 0.33 MB |
| Logo `family-logo.png` | 430 KB (1254 px) | 79 KB (512 px; manifest `sizes` updated) |

Lite default install ≈ 0.49 MB + this week's pictures ≈ 0.3 MB — well under the 2–3 MB target. `npm run check`
fails if the lite precache grows past 1.5 MB on the wire or lists artwork.

Optional downloads (exact bytes from the generated `dist/offline-packs.json`):

| Row | Size | Contents |
|---|---|---|
| Toàn bộ hình món ăn / All dish pictures | 5,261,408 B (5.0 MB) | 848 per-cell WebP thumbnails (740 dishes 192 px, 106 ingredients 128 px, 2 corrections) |
| Hình chi tiết độ nét cao / High-detail pictures | 16,869,370 B (16.1 MB) | the 58 original sheets (detail views) |
| Kho 740 món (dữ liệu) / 740-recipe library | 526,497 B stored, 36,006 B gz transfer | `recipe-catalog-data.js?v=<hash>` |
| Đọc hoá đơn/giá bằng camera / Camera reader (OCR) | 8,508,965 B (SIMD) or 8,508,585 B (non-SIMD) | tesseract.min.js 68,654 · worker.min.js 126,321 · one core (simd-lstm 3,938,114 / lstm 3,937,734) · eng 4.0.0_best_int 2,952,873 · vie 1,423,003 |
| Giọng nói không cần mạng / Offline voice | placeholder | filled by Agent U via `registerOfflinePack({...})` |
| Price Scout catalog | 51,823 B (6.6 KB gz) | built into the startup pack (always offline) |

OCR is **self-hosted** under `dist/vendor/tesseract/` (tesseract.js 5.0.0 / tesseract.js-core 5.0.0, Apache-2.0;
traineddata from tessdata_best int via `@tesseract.js-data/{eng,vie}` 1.0.0, Apache-2.0 data; LICENSES.txt
generated). Copied from `node_modules` by the build (new exact-pinned devDependencies); `dist/vendor/` is gitignored.
Verified in Chromium: "MILK 2L $3.50" recognised online (≈0.9 s) and again **offline** after first use/download; no CDN
request was made.

## What changed

- **Service worker (`sw.ts`)**: lite precache; artwork cache-on-view in `bep-art-runtime-v1` (stale-while-revalidate at
  most once a day, LRU bounded to 240 entries / 6 MB); `PRECACHE_ART` message pins this week's menu cells, the family's
  own recipes and the week's/pantry ingredients (`bep-art-pinned-v1`, never evicted; unpinned cells return to the LRU);
  download packs `bep-pack-*`; lazy catalog kept (one version) for offline; OCR vendor files cache-on-use; Studio
  offline navigation shows a friendly page; old release's precached sheets are kept as the high-detail pack on upgrade
  (no re-download). Fixed a bug found while testing: the response was cloned after the page started reading it, so
  viewed artwork was never stored.
- **Lazy reference catalog**: the build splits `recipe-catalog.js` at a marker into `recipe-catalog-data.js` (data, lazy)
  and `recipe-catalog-core.js` (diet/label helpers + `catalog-loader.ts`, same slot in the startup order).
  `ensureCatalog()` is awaited by the library view, meal editor, menu generator and new-kitchen preview; family
  recipes and planned meals live in family state and never need it. Before `app.js` runs, the catalog is fetched only
  for a new or pre-edition-5 household. **Mixed-version safety**: a household created before the catalog arrives keeps
  `seedVersion: 2`, so every app version (old or new) adds the reference recipes itself instead of tombstoning them;
  family sync never uploads such a state (guard on `syncFamilyState`); deletions (tombstones) are respected when the
  recipes are added. Painted artwork stays exact before the catalog loads through build-time FNV hashes of each
  reference recipe's signature (`CATALOG_ART_HASHES`).
- **Smaller images**: `src/scripts/artwork-cells.py` crops each painted cell exactly like `spriteCellStyle()`
  (SPRITE_GRID, 4×4 mapping unchanged) → `dist/artwork/cells/` (committed, 5.3 MB). Lists show the cell; detail views
  (`.recipe-detail-hero`, `foodArt(r,true)`) layer the full sheet over the cell. `check` verifies every cell exists and
  that `cells/manifest.json` matches the current sheets (re-run the script after changing a sheet).
- **Downloads for offline use** + **Sẵn sàng offline** cards in Cài đặt khác (`offline-downloads.ts`, wraps
  `otherSettingsModal`): size, status, Download/Resume/Stop/Remove, progress bars, resumable per file with retries,
  "Chỉ tải khi có Wi-Fi" default ON (Network Information API; desktops without it count as unmetered; phones without
  it are asked once per session; Save-Data/2G count as metered); queued packs start when Wi-Fi returns;
  `navigator.storage.estimate()` and `persist()`; works offline (pack list precached). Readiness: app, this week's
  menu, shopping list, saved prices, this week's pictures (tap to save), all pictures and the catalog (tap to download).
  The header connectivity icon gets a dot and a tooltip summary.
- **Online-only features offline**: weather modal shows an offline note and disables "Get current weather" (manual
  hot/cool still works); Studio links show a toast and the worker serves a friendly page; community price refresh,
  family refresh and browser speech already had friendly offline messages (checked); Auto Scout lives in Studio
  (covered). Receipt OCR is no longer blocked offline once the reader is downloaded.
- **App updates (owner addition, `app-update.ts`)**: new worker waits; idle → save/flush, `SKIP_WAITING`, reload on
  `controllerchange` (6 s fallback); busy (edited form/confirm, cooking, voice listening, download, unsaved, pending
  family sync) → small bilingual notice hidden while busy; Update flushes (≤10 s, offline keeps the pending marker),
  asks for the new version (8 s), waits for install (≤2 min), activates, reloads; double-tap safe. Checks on start,
  visible, online and every 30 min (60 s gap). Forced: startup-pack hash mismatch and a 404 for a lazy part offer the
  update even with notices off; Studio `minBuild` newer than the running build → blocking overlay after the busy work,
  single Update, attempt counter (Retry + support hint after 2; third attempt retires the worker, data kept), never an
  automatic loop. Build id `YYYYMMDDTHHMMSSZ-<pack8>` (in `bootstrap.js` and `dist/build.json`). Events
  `update.started` / `update.result {outcome, reason}` go to Studio via a new public, enumerated-fields-only
  `studio?op=client-event`.

## Files outside my ownership (minimal, please review at merge)
- `src/frontend/family-features.ts` — one condition: receipt OCR allowed offline when `ocrOfflineReady()`.
- `src/netlify/lib/studio.mts` — settings keys `updateNotice` (default true), `minBuild` (validated format).
- `src/netlify/functions/studio.mts` — banner returns `updateNotice`/`minBuild`; `settings-save` of those keys is
  owner-only (audited via existing `save_settings`); new public `op=client-event` (no rate limit — fields enumerated).
- `dist/studio.html` — one `<script src="studio-update.js">` line; `src/frontend/studio-update.ts` (new, mine) adds the
  "App updates" card under Platform settings (toggle, current build, "require the current build", remove).
- `dist/manifest.webmanifest` icon size; `dist/family-logo.png` downscaled.
- Tests: `kitchen-hub.test.cts` expects the two new Other-settings cards; `authenticated-startup.test.cts` checks the
  lite cache and that artwork viewed online opens offline (sheets intentionally not precached → 504).
- `package.json` / lockfile: 4 exact devDependencies (tesseract), 3 unit suites appended to `test`, 2 browser suites
  added to `test:all`. Startup `scripts` array: `recipe-catalog.js` → `recipe-catalog-core.js`, appended
  `offline-downloads.js`, `app-update.js`.

**Finding for all browser suites:** in Playwright 1.64 `page.waitForFunction(async () => …)` resolves immediately
(the returned Promise is truthy). Three such waits in `authenticated-startup` (two pre-existing semantics) were silently
no-ops; replaced there and in my suites with an explicit polling helper. Other suites were not audited for this.

## Tests (added to CI)
- `offline-lite.test.mjs` — SW in VM: lite list/budget, update protocol (waits/SKIP_WAITING/legacy), LRU entry+byte
  bound, recency, offline answers, pinning, catalog single version + offline, Studio offline page, upgrade migration.
- `offline-downloads.test.cjs` — lazy catalog guards (no data in startup, seedVersion 2, no tombstones, sync guard,
  upgrade adds 685 recipes once, deletions kept) and the downloads manager (heuristics, Wi-Fi queue/resume, ask once,
  retry/resume, remove, storage text, pack registration, OCR variant).
- `app-update.test.cjs` — VM harness: idle/busy, controllerchange, 6 s fallback, flush-first, double tap, unsaved,
  update wait, notice switch, module-gone, forced overlay + loop guard.
- `offline-downloads-browser.test.cjs` (`test:offline:browser`) — real worker on 127.0.0.2: lazy catalog for library,
  meal editor, generator online and offline-after-download; offline without catalog (family recipes, planned meals,
  generator); pinned week art offline; readiness/indicator; Downloads screen 375/820/1280 × VI/EN × light/dark
  (no overflow, ≥44 px buttons, Wi-Fi default), real 5 MB download → offline use → Remove.
- `app-update-browser.test.cjs` (`test:update:browser`) — real worker, version bumped between loads, 375 VI / 820 EN /
  1280 VI+EN: idle switch, busy notice → Update, forced overlay + Retry guard, events received.

Local runs (supporting evidence only): `npm run check`, `typecheck`, `npm test`, `test:browser`, all browser suites
(artwork, catalog, catalog-filters, voice, units, price-scout, community, banner, scout-studio, offline, update) pass.
`test:authenticated-startup` passes locally only with the documented sandbox DNS workaround (API request context
cannot resolve `kitchen.localhost`); the unmodified file must pass on GitHub CI.

## Screenshots (this folder; Chromium viewport simulation, not physical devices)
`downloads-{375,820,1280}-{vi,en}-{light,dark}.png`, `downloads-820-vi-offline.png`,
`offline-status-375-vi-offline.png`, `offline-status-1280-en-offline.png`,
`update-notice-*-{vi,en}.png`, `update-required-*.png`, `update-required-retry-*.png` (375/820/1280).
Not tested: real iOS Safari/WebKit (no Network Information API → "ask once" path is unit-tested only), real slow
cellular networks, storage-pressure eviction by the browser.
