# v1.7 Easy Scout: install without commands, one-click pairing, remote control, pace, capture time

Branch `agent-x/easy-scout` (from local `v17-base` = PR #7 head 7f62ff0). Not pushed or merged. Not deployed. Rules 1–5, 10, 15 and 18 still apply: GitHub CI on the exact PR head and Henry's explicit DEPLOY are still needed.

## What changed

**Install without commands**
- `npm run build:production` (new hosting build command in `netlify.toml`) runs `npm run check` and then builds the extension. It writes:
  - `dist/downloads/famtray-scout.zip`, with the app address baked in from `SCOUT_SERVER_ORIGIN`, or else from the hosting build's `URL`;
  - `dist-extension-store.zip`, the same files without the pinned `key` (the Web Store refuses that field).
- The `ignore` rule (rule 18) is unchanged; a test checks it word for word.
- The service worker skips `/downloads/`: the file is not precached and `check` asserts both. The zip is served as `application/zip` with `Content-Disposition: attachment`.
- `externally_connectable` lists only the https app origin(s) from the build. The test build adds `localhost`, `kitchen.localhost`, `app.scout.test`, and `other.scout.test`, which is deliberately connectable but not on the extension's own allowlist.
- CI has a new `extension-zip` job that uploads the `famtray-scout-extension` artifact (both zips, 30 days). The test matrix is unchanged.

**One-click pairing**
- The app finds the extension by ping. It tries the bundled id plus the ids from `scout?op=public`, a new public, non-secret endpoint backed by `SCOUT_EXTENSION_IDS`.
- **Ghép ngay / Pair now:** the app creates a one-time code and hands it to the extension together with the family postcode. The extension checks the sender origin (`onMessageExternal` plus its allowlist), pairs with **that** origin only, and replies without the token.
- The manual code path stays in a fold.
- The popup asks once, with "Dùng tên này / Use this name", for each store label it reads on a supermarket page.

**Guided install**
- Desktop Chrome/Edge gets 5 illustrated steps with a copy button for `chrome://extensions` / `edge://extensions`. The page then polls for the extension. While waiting, it marks its own URL with `?scout-wait=1`; the extension reloads only such tabs on install, and the card reopens.
- An "Install from Chrome Web Store / Edge Add-ons" button appears only when a store link is set (env `SCOUT_STORE_URL` / `SCOUT_EDGE_STORE_URL` or Studio → Store install links).
- **Phones and tablets** (iPhone, Android, iPad including iPadOS's desktop-style user agent via `MacIntel` + touch points, Android tablets) get: "Scout chạy trên máy tính (Chrome hoặc Edge)…", Price screenshot and Say a price buttons, and a copyable "Open on a computer" link. There is no zip download on these.
- Other desktop browsers are told to use Chrome or Edge.
- Setup tips: keep the computer plugged in, turn off sleep, let Chrome run in the background, start Chrome at login.

**Pace (owner instruction)**
- Presets: Slow 30–60 s, Normal 20–40 s (default), Fast 8–15 s, Very fast 3–6 s, or custom. There is a hard floor of 3 s; the server refuses anything lower.
- Production builds clamp to 3–120 s and the pace is still jittered.
- Studio sets a network default and a per-device override (audited). The device may only choose the same pace or slower.
- Still strictly one page at a time, in one window.
- Automatic back-off: a page slower than 8 s, a 429, or a challenge drops that retailer to Normal for the rest of the day. A challenge still stops the run and pauses the device for 24 h.

**Run now**
- A 60-minute grant for one run, from Studio (per device or for all allowed devices) or from the popup (only when the device is allowed and Auto is on). It is audited and logged.
- It lets `tasks` lease work outside the schedule window and skips the "user is active" wait.
- Kill switches (`SCOUT_AUTO=off`, Auto off, global pause), device pause, caps, pacing, robots.txt, the challenge/403/429 stop, and the battery and Chrome-open checks still apply.
- The popup shows "Đang chạy · 12/150 trang" with a Stop button. The extension sends a notification when the run is done.

**Remote control**
- Studio → Mạng Scout has a card for each device: online/offline (heartbeat age), Chrome open, battery, idle/active, state (idle, waiting for window, running x/y, paused, blocked until…), pace, last run (pages, prices, skipped, errors), last error, extension and config version, recent commands, and a timeline of the last 50 events (no page contents).
- Command queue: Run now, Stop, Pause/Resume, pace, refresh config, re-check stores. It is Studio owner only, needs the CSRF token, and is audited. A command goes `pending → received → done/failed`, or `expired` after 30 minutes. It is delivered with the 1-minute heartbeat, which also runs on startup and when the computer wakes. A device only ever sees and acknowledges its own commands.
- Opt-in owner push notifications reuse the app's web push and go only to the Studio owners' own app devices: run finished, blocked, offline more than N hours during a window (checked in the existing 15-minute reminders job), and parser breakage.

**Capture time**
- The extension sends `capturedAt`, the time the page was read. The server keeps it if it is not in the future and not more than 14 days old.
- Community consensus returns `capturedAt` and `sourceCaptured`.
- The app shows "🔎 Scout · 2 giờ trước · T4 01/11 06:42" / "… 2 h ago · Wed 1 Nov 06:42" in the viewer's local time. Prices older than 7 days are muted and marked "cũ / old".
- This appears in community rows, the recently recorded prices list, the smart-split stops (oldest price), the Studio coverage cells and Studio moderation.

## Verification (local, this sandbox; supporting evidence only, rule 15)

| Check | Result |
|---|---|
| `npm run check`, `npm run typecheck` | pass |
| `npm run test:scout` (scout-api, scout-parse, scout-community, **new scout-remote**) | pass |
| `npm run test:scout:browser`: real MV3 extension in Chromium (`--load-extension`, test build). Covers v1.6 flows, plus install detection, Pair now end to end (device appears, token not in replies, API responses, DOM or storage), manual code fallback, sender-origin refusal (`other.scout.test`), no messaging from a non-listed origin (`127.0.0.1`), one-tap store name, reopen after install, **Run now command → run outside the window at Very fast pace, still sequential (gaps ≥ 3 s), Stop obeyed within one heartbeat**, popup status, live status | pass |
| `npm run test:scout-pair:browser`: install steps, store button only when configured, polling, Pair now hand-off, iPhone / iPad (MacIntel + touch) / Android tablet / Firefox layouts, capture time shown = capture time, owner/trusted only, offline. Sizes 320×740, 375×812, 820×1100, 1280×800, VI/EN, light/dark, no overflow, targets ≥ 44 px | pass |
| `npm run test:scout-studio:browser`: remote-control cards at all sizes, Run now → waiting → received → done, per-device pace, timeline, notifications opt-in, audit | pass |
| **new** `npm run test:scout-release` (in `test:all`): production build with a site URL → zip present with the app address and `externally_connectable`, store zip without `key`, SW precache/bypass, zip headers, ignore rule intact, build without URL | pass |
| `tests/price-scout.test.cjs`: capture-time label VI/EN, relative + absolute, old, day-only | pass |

GitHub CI has **not** run on this branch. The full suite runs there after the lead pushes (rule 17).

## Screenshots (browser viewport simulation, not physical devices)

- **Pairing card** (`*.png` in this folder): `install-{narrow-320x740,mobile-375x812,tablet-820x1100,desktop-1280x800}-{vi-light,en-dark}`, `ready-desktop-1280x800-*`, `paired-desktop-1280x800-*`, `store-button-desktop-1280x800-vi-light`, `phone-375x812-*`, `ipad-820x1100-*`, `android-tablet-820x1100-*`, `e2e-paired-1280x800-vi-light` (real extension).
- **Studio** (`studio/`): `studio-scout-*` and `studio-remote-*` at 320, 375, 820 and 1280, VI light / EN dark, plus `studio-remote-commands-en-dark-desktop-1280x800`.
- **Extension pages** (`extension/`): popup at 375, options at 375/820/1280.
- **Web Store pack** (`docs/scout-store/screenshots/`): five 1280×800 images and a 440×280 promo tile. All files are under 250 KB.

The iPad and Android tablet images are identical because both show the same tablet layout. Physical iPad, Android, Windows and Mac hardware was not tested.

## Limits and risks

- **Chrome policy:** an unpacked or zip install needs Developer mode. Chrome may show a "developer mode extensions" warning at startup. One-click install without Developer mode needs the Web Store listing, and publishing and review are Henry's steps (`docs/scout-store/README.md`). A Web Store build gets a different id, which must be added to `SCOUT_EXTENSION_IDS`.
- **Installing and detecting:** the page can only see an extension installed after the page loaded once it reloads. The extension reloads only app tabs marked `?scout-wait=1`; otherwise there is a "check again" button.
- **Production address:** the address comes from the build's `URL`. If families open the app at another address, set `SCOUT_SERVER_ORIGIN` / `SCOUT_APP_ORIGINS`. Otherwise Pair now is not offered there and the manual code path still works.
- **Faster presets** (Fast / Very fast) **increase the chance that a retailer blocks the device**. The owner has accepted this. Back-off and the 24-hour stop limit the damage, but they do not prevent blocks.
- **Remote control cannot wake a computer** that is asleep, off, or has Chrome closed. Commands wait up to 30 minutes and then expire. The heartbeat every minute is the `chrome.alarms` minimum. Battery status comes from the runner page only, because the service worker has no Battery API, so it can be missing.
- **Owner notifications** need the owner's phone to have app notifications turned on. Phone quiet hours still apply. The offline check runs every 15 minutes, inside the existing reminders job (a small edit in `reminders.mts`).
- **Capture time** is the device clock, limited to the last 14 days and no later than now. Older family records only have a day, so they show the day with no clock time. The shopping list itself shows no per-item price hint today, so nothing was added there.
- **Selectors and store labels** are still not verified against the live retailer sites (unchanged from v1.6).
- No user-facing text names the hosting or storage vendor.

## Files outside the brief's core list (small, surgical)

- `src/frontend/studio.ts`: capture time in moderation evidence (one expression).
- `src/netlify/functions/reminders.mts`: an offline check call.
- `src/netlify/lib/community-prices.mts`: `capturedOf()` in consensus.
- `src/frontend/sw.ts`: `/downloads/` bypass.
- `src/scripts/check.cts`: zip not precached.
