# v1.7 · Usage statistics, Studio “Mức sử dụng / Usage”, privacy & terms — review record

Branch `agent-w/usage-analytics` (from local `v17-base` = PR #7 head 7f62ff0). Not merged, not pushed, nothing deployed and no previews were built (AGENTS.md rules 1–3, 18). Deployment approval has not been requested: GitHub CI still has to pass on the exact head commit (rules 15–17).

## Owner decision implemented
Henry: “bật sẵn cho tắt, dùng cả postcode và mạng”. That means usage statistics are **on by default with an opt-out**, and location uses **both** the family’s Price Scout postcode and the network location. The privacy and terms texts that were drafts are now final (“Cập nhật: 1/11/2026”).

## What changed
- **App (`src/frontend/usage-analytics.ts`, last in the startup pack, starts after `load` when the browser is idle)**
  - Active seconds count only while the page is visible **and** there was a pointer, key, scroll, touch or wheel event in the last 60 s. A new session starts after 30 min without activity. The script also keeps an hour-of-day histogram and counts a fixed whitelist of 15 features. Navigation is hooked through `render`/`view`, `recipeForm` is wrapped, and clicks on existing entry points are caught by delegation.
  - Batches are kept in localStorage (max 14 days). They are sent every 5 min and on `pagehide`/hidden: as a beacon in account mode, and as a keepalive fetch with `credentials:'omit'` in device-only mode, so no account cookie is attached there. A batch keeps its id until the server confirms it, and the server de-duplicates by that id. Offline, the queue is kept and sent after reconnecting.
  - **Other settings → Thống kê sử dụng**: a “Gửi thống kê sử dụng ẩn danh / Share anonymous usage statistics” switch (on by default), a one-line explanation and a “Xem chi tiết / Details” link to `/privacy.html#usage`. Turning it off stops sending, clears the local queue, drops the install id and sends `op=forget` once (retried after reconnecting if offline).
  - The Studio flag `usageAnalytics` (read from `bep-platform-flags`) stops collection and clears the queue. The settings switch is then disabled and says the statistics are paused for everyone.
  - A one-time, dismissible, **non-modal** “Điều khoản đã cập nhật / Terms updated” notice appears for existing community contributors who accepted the earlier `2026-11-draft` terms.
- **Server**
  - `src/netlify/functions/usage.mts` and `src/netlify/lib/usage.mts` use their own store (`bep-usage`) and keep **daily rollups only**, one per install per day; per-account and per-family figures are derived from those. The handler has `op=ingest` and `op=forget`, plus Studio ops `studio-usage-overview` (owner or support, aggregates only, cached 60 s), `studio-usage-inactive` and `studio-usage-detail` (owner only, both written to the Studio audit log).
  - Ingest has these protections:
    - 8 KB size limit.
    - Strict whitelist: unknown fields are **rejected**, including any client-supplied account or family, and so are unknown features and bad types.
    - Same-origin when an Origin is sent.
    - Rate limits of 30 per install per hour and 600 per network address per hour. The address is only hashed into a counter key that expires after 2 hours.
    - Writes use conditional `editRecord`.
  - Account and family come only from the session cookie.
  - Network location is reduced to **country + state/subdivision**. City, coordinates, postal code, timezone and IP are dropped before anything is stored, and a test asserts none of them appear in the store.
  - Postcode → state uses the existing `geo-resolver.mts`. No suburb names exist in the data, so none are invented. In reports the postcode is used when set, otherwise the network location.
  - Retention is 13 months. A new scheduled function, `usage-cleanup.mts`, is declared in its own `config` export (`17 16 * * *` UTC); `netlify.toml` was not touched. Ingest also runs an opportunistic sweep every 12 h.
- **Studio** (`src/frontend/studio-usage.ts`, registered in `window.studioPages`, script tag added to `dist/studio.html`) shows:
  - DAU, WAU, MAU, average minutes per user per active day, sessions per day, and active families, accounts and anonymous devices.
  - A users-per-day chart and a weekday × hour heatmap with peak hours.
  - A feature table and 8 weekly retention cohorts.
  - Inactive-family counts for 14 days, 30 days and never. The family list is shown only after an explicit, audited click, and each family’s detail is audited too.
  - A location table with network-only rows marked.
  - Device, version and language splits.
  - One summary request, cached about 60 s on both client and server. Bilingual, light and dark.
  - A **Settings** switch “Thống kê sử dụng ẩn danh” and a privacy link in the Studio footer.
- **Privacy & terms page** `dist/privacy.html` (VI + EN) covers family data, community prices, voice (on-device vs browser recognition, voice statistics contents), usage statistics (exact fields, location precision, 13 months, opt-out, forget) and the Scout extension. Contact is the family owner via the app. No e-mail, company or domain is invented; an HTML comment marks where Henry can add an operator contact if he wants one. The hosting vendor is not named.
- **Consent texts**:
  - The community terms sheet no longer says “Bản nháp / Draft”. It now shows “Cập nhật: 1/11/2026” and links the full page.
  - `TERMS_VERSION` is now `2026-11-01`, and `community?op=status` also returns `acceptedTermsVersion`. Existing acceptances stay valid and contributors are not blocked.
  - The share box and the voice-statistics hint link to the privacy page.

## Verification (local; supporting evidence only — GitHub CI is the release gate)
- `npm run check` and `npm run typecheck` pass.
- New `tests/usage.test.mjs` passes. It covers whitelist, size and type validation, origin, rate limit, batch de-duplication, rollup merge and caps, cookie-only identity, absence of stored IP, city and coordinates, postcode precedence, flag off, forget, 13-month retention through the scheduled function, the Studio role gate, the 60 s cache and the audited drill-downs.
- New `tests/usage-browser.test.cjs` (`npm run test:usage:browser`, added to `test:all`) passes. It covers:
  - active-minute counting, where a hidden tab and idle time do not count and the session splits after 30 min;
  - a whitelisted flush with no cookie in device-only mode and no recipe text;
  - the offline queue, then a flush after reconnecting;
  - opt-out (forget sent, queue and install id cleared, nothing sent afterwards);
  - the Studio switch turned off;
  - the bilingual settings switch;
  - the terms notice (non-modal, dismissed for good);
  - the privacy page in VI and EN;
  - the Studio Usage tab, including the audited inactive-family drill-down, the client cache and language switching.
- Re-ran the touched existing suites: community-prices, community-rewards, studio, studio-hooks, studio-speed, voice-stats, offline-lite, core, personal, voice-stats-client, app-update, offline-downloads, startup and authenticated-startup (with the DNS shim). kitchen-hub needed its expected Other-settings section list to include the new `settings-usage` card. That expectation update is the only change to an existing test.

## Responsive QA (browser viewport simulation in Chromium — not physical devices)
| Surface | Sizes | Themes / languages | Screenshots |
|---|---|---|---|
| Other settings → usage switch | 375×812, 820×1100, 1280×800 | light VI, dark EN, dark VI | `settings-usage-*` |
| Terms updated notice | 375×812, 820×1100, 1280×800 | light VI, light EN, dark VI | `terms-notice-*` |
| Privacy page | 320×740, 375×812, 820×1100, 1280×800 | VI/EN, light/dark | `privacy-*` |
| Studio Usage tab | 320×740, 375×812, 820×1100, 1280×800 | VI light, EN dark | `studio-usage-*` |

Every size was checked for horizontal overflow, and touch targets of at least 44 px were checked on touch layouts (switch, links, dismiss button, Studio buttons, select and links). Reduced motion turns off the switch animation. Online and offline behaviour is covered by the offline-queue test.

## Limits / open points
- Opened offline, `/privacy.html` falls back to the app shell, because it is not precached and I kept the lite precache budget unchanged. It is reachable whenever the device is online.
- The rate-limit counter uses a hash of the network address that lives for at most 2 hours; the address itself is never stored. This is stated on the privacy page.
- The day bucket is the device-local date, while Studio windows use the Australia/Sydney date.
- The version is `APP_EDITION/build-date` (for example `5/20261101`). `package.json` is still `1.6.0`; the version bump for v1.7 is left to the release integration.
- The Studio platform settings still have empty `links.privacy` and `links.terms`. Henry can set them to `/privacy.html` in Studio → Ra mắt if he wants the checklist item ticked.
