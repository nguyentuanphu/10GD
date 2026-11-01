# v1.6 — FamTray Scout (extension + Scout network) · review record

Branch `agent-k/auto-scout` (from `claude/bold-pascal-riryi0` @ e69ff27). Ships in the release **after** v1.5.
Not deployed. Responsive QA and passing tests are **not** deploy approval (AGENTS.md rules 1–5, 10, 15, 16).

## What it does

**FamTray Scout** is a desktop Chrome/Edge extension (Manifest V3) plus a server-side **Scout network** managed in Studio (owner option C).

| Mode | Default | What happens |
|---|---|---|
| **Semi-auto** | ON | On a supported Woolworths, Coles, ALDI, Chemist Warehouse or Amazon AU product/search/specials page **that the person opened**, the extension reads the product facts on the page (list pages give dozens), shows the count on the toolbar badge, sends them in batches to the server (`source: 'scout-extension'`), and the popup says e.g. “Đã lưu 34 giá · Woolworths Hurstville”. Can be paused per site. |
| **Auto** | OFF | Only after the owner switches `autoScout` on in Studio **and** allows that device **and** the user switches Auto on in the extension (after the onboarding checklist). It then pulls leased tasks from the server inside schedule windows and visits them one at a time at a human pace in one dedicated unfocused window. |

Facts collected (whitelist enforced in the extension `ScoutCore.factsOnly` **and** on the server `validFact`): name, price, unit price (+ basis), was-price, promo type/text, promo end date, pack size, retailer product id/URL, store label shown on the page. **Never** images, descriptions, reviews, ratings or personal data; form fields, cookies and account details are never read.

## Owner guardrails → where they are enforced → test

| Guardrail | Enforcement | Tested in |
|---|---|---|
| No evasion: no UA/webdriver/fingerprint spoofing, no proxy/VPN/IP rotation, never solve/bypass CAPTCHAs, no cookie reuse | The extension runs inside the user's own Chrome; there is no code that changes headers/UA, uses proxies, touches CAPTCHAs or reads cookies. All extension `fetch` calls use `credentials:'omit'`. | Code review (no such code exists); e2e uses stock Chromium |
| Challenge / 403 / 429 / unusual page → STOP, pause 24 h, report, notify | `ScoutCore.detectChallenge` (status, title, text, captcha elements; config-driven); runner stops at once, calls `scout?op=block`, shows a Chrome notification; server pauses the device 24 h, releases its leases, logs an alert; 2 blocked devices on one retailer in a day pause that retailer network-wide for 24 h | `scout-api` (24 h pause, lease release, network pause), `scout-parse` (detection), `scout-extension-browser` (real run stops on a challenge page, nothing visited afterwards) |
| Human pace 1 page / 20–40 s | `ScoutCore.pacing` clamps to [20 s, 40 s] in production builds (server can only make it slower); server `validateNetworkPatch` refuses pacing < 20 s; one page at a time | `scout-parse` (clamp), `scout-api` (refusal), e2e (sequential, gap ≥ test pacing) |
| Per-device pages per run (150) / per day (300); global per-retailer per day | Server lease accounting (`leaseTasks`): run, day and retailer caps; device can only lower its caps | `scout-api` (cap-run, cap-day, cap-retailer) |
| Schedule windows (default Wed 06:30–09:00, Sat 06:30–08:00 device-local) | Extension alarm only starts inside a window; **server refuses tasks outside the window** (`inWindow`, device time zone) | `scout-api` (boundaries incl. 06:29/09:00/Sat 08:00; extension and server agree) |
| Only when Chrome is open; not on battery; pause while the user is active in the window | Alarms only fire while Chrome runs and a normal window must exist; runner checks `navigator.getBattery()` (best effort, stops on battery); `chrome.idle` 'active' → no new run, and the runner waits while the user is focused on the Scout window | Manual/limits below (idle and battery cannot be simulated reliably headless; the test build skips only the *start-time* idle gate) |
| Separate Chrome profile, not signed in to Everyday Rewards/Flybuys | Onboarding checklist must be ticked before Auto can be switched on; content script detects signed-in indicators (config selectors/text) and the popup/options/Studio show a warning | e2e (Auto refused before checklist), `scout-parse` (signed-in marker), Studio test (warning chip) |
| robots.txt Disallow for auto-mode paths | Runner fetches `/robots.txt` from the user's browser (credentials omitted), caches 24 h, RFC 9309 longest-match with `*`/`$`; 4xx → allow, 5xx/network → disallow all; disallowed tasks are reported as `robots-disallowed` and **not visited**. Policy is fixed to `respect` (server refuses any other value). Semi-auto (pages the human opened) is unaffected. | `scout-parse` (matcher), `scout-api` (skip accounting), e2e (search path disallowed → never requested) |
| Kill switches | Extension: per-device Auto toggle, semi toggle, per-site toggles, big **Pause everything**. Studio: per-device pause/resume/allow/deny/revoke, **global pause**, `autoScout` on/off (server refuses tasks when off), `semiAuto` on/off. Env `SCOUT_AUTO=off` overrides. | `scout-api`, Studio browser test |
| Defaults: semi-auto ON, Auto OFF | `NETWORK_DEFAULTS.autoScout='off'`, `autoAllowed:false` per device, extension `autoEnabled:false` | `scout-api` |

## Legal stance (owner-accepted risk)

Henry chose option C knowing that retailer Terms of Use may prohibit automated access. Our position: the extension acts as a single person's own browser, at human speed, on public product pages, inside a few hours a week, respecting robots.txt, collecting only factual price data, with no circumvention of any access control. **That reduces, but does not remove, the ToS risk, which the owner has accepted.** Any challenge, 403 or 429 is treated as the retailer saying no: the device stops and pauses. Studio can stop the whole network instantly. Nothing here is legal advice; before opening the network beyond the family, get advice.

## Setup guide

### Tiếng Việt
1. **Tạo hồ sơ Chrome riêng**: Chrome → biểu tượng hồ sơ (góc trên phải) → *Thêm* → đặt tên “FamTray Scout”. **Không** đăng nhập Everyday Rewards, Flybuys hay tài khoản mua sắm nào trong hồ sơ này.
2. **Cài tiện ích (dạng giải nén)**: chạy `npm run build:extension` (hoặc giải nén `dist-extension.zip`) → mở `chrome://extensions` (Edge: `edge://extensions`) → bật *Chế độ nhà phát triển* → *Tải tiện ích đã giải nén* → chọn thư mục `dist-extension`. Mã tiện ích cố định: `mjeoekikdicoojgoppnfibjbfpcfngja`.
3. **Chọn cửa hàng**: trong hồ sơ này, mở từng trang Woolworths/Coles/ALDI/Chemist Warehouse một lần và chọn cửa hàng gần nhà (tên cửa hàng sẽ hiện trên trang).
4. **Ghép nối**: chủ nhà mở Studio → *Mạng Scout* → *Tạo mã ghép nối* (mã 8 ký tự, dùng một lần, 15 phút). Trong tiện ích: *Cài đặt* → nhập *Địa chỉ ứng dụng* và mã → *Ghép nối*. Nhập tên cửa hàng cho từng siêu thị (hoặc bấm *Dùng tên này*).
5. **Bật tự động (tuỳ chọn)**: Studio → *Mạng Scout* → *Bật chế độ tự động* và *Cho phép tự động* cho máy đó. Trên máy: hoàn tất danh sách chuẩn bị → bật *Tự động*. Máy chỉ chạy trong khung giờ, khi Chrome mở, không dùng pin và khi bạn không dùng máy.

### English
1. **Create a separate Chrome profile**: Chrome → profile icon (top right) → *Add* → name it “FamTray Scout”. Do **not** sign in to Everyday Rewards, Flybuys or any shopping account in it.
2. **Install the unpacked extension**: run `npm run build:extension` (or unzip `dist-extension.zip`) → open `chrome://extensions` (Edge: `edge://extensions`) → turn on *Developer mode* → *Load unpacked* → choose the `dist-extension` folder. The extension id is pinned by the manifest key: `mjeoekikdicoojgoppnfibjbfpcfngja`.
3. **Select stores**: in that profile, open each Woolworths/Coles/ALDI/Chemist Warehouse site once and choose the nearby store (its name shows on the page).
4. **Pair**: the owner opens Studio → *Scout network* → *Create pairing code* (8 characters, one-time, 15 minutes). In the extension: *Settings* → enter the *App address* and the code → *Pair*. Enter the store name for each retailer (or press *Use this*).
5. **Enable Auto (optional)**: Studio → *Scout network* → *Switch Auto on* and *Allow auto* for that device. On the device: finish the checklist → switch *Auto* on. It only runs inside the schedule windows, while Chrome is open, not on battery, and while you are not using the computer.

**Hosting configuration needed before use** (not changed by this work): set `SCOUT_EXTENSION_IDS=mjeoekikdicoojgoppnfibjbfpcfngja` (comma-separate further IDs, e.g. a Web Store build). Without it, extension CORS is refused in production; `SCOUT_DEV=1` (any extension origin) is for local dev/tests only. Optionally build with `SCOUT_SERVER_ORIGIN=https://<the app address>` so the address field is pre-filled.

## Components / files
- `extension/` — `manifest.json` (MV3, pinned key, host permissions for the five retailers only), `config/scout-config.json` (data-only selectors/regexes; versioned; refreshed from `scout?op=config`), `src/` (`scout-core.ts` pure helpers, `scout-parse.ts` JSON-LD → meta → selectors parser incl. open shadow roots, `content.ts`, `background.ts`, `runner.ts`, `scout-client.ts`, `ui-common.ts`, `popup.ts`, `options.ts`), `pages/` (popup/options/runner HTML + `ui.css`).
- `tsconfig.extension.json`, `src/scripts/build-extension.cts` (copies pages, writes `default-config.js`/`build-info.js`, draws PNG icons, zips to `dist-extension.zip`; `--test` writes `dist-extension-test/` with `*.scout.test` hosts and a shortenable pacing for tests only). Outputs are gitignored.
- Backend: `src/netlify/lib/scout.mts`, `src/netlify/lib/scout-adapter.mts`, `src/netlify/lib/scout-config.mts` (build fills it from the JSON), `src/netlify/functions/scout.mts`.
- Studio: `src/frontend/studio-scout.ts` (+ one `<script>` tag in `dist/studio.html`).
- Tests: `src/tests/scout-api.test.mts`, `scout-parse.test.cts`, `scout-extension-browser.test.cts`, `scout-studio-browser.test.cts`, fixtures in `src/tests/fixtures/scout/` (synthetic, invented products/prices). All in `npm run test:all` via `test:scout`, `test:scout:browser`, `test:scout-studio:browser`.

## Endpoints (`/.netlify/functions/scout?op=…`)
- Public: `config` (GET, `&v=` returns `{unchanged:true}` when current).
- Extension (header `Authorization: Bearer <token>`; CORS for allowed `chrome-extension://` origins): `pair` (POST, one-time code → token, only its SHA-256 is stored), `device` (GET), `heartbeat`, `device-settings`, `tasks`, `results`, `release`, `block`, `unpair` (POST).
- Signed-in account (cookie, same-origin): `pair-code` (POST), `my-devices` (GET).
- Studio (cookie + Studio role; POST = owner + same-origin + `x-studio-csrf`; every POST audited): `studio-overview`, `studio-coverage`, `studio-events` (GET); `studio-pair-code`, `studio-network`, `studio-device` (pause/resume/allow-auto/deny-auto/update), `studio-revoke`, `studio-retailer` (pause/resume), `studio-trusted`, `studio-config` (data-only override or reset) (POST).

Storage: own store `bep-scout`; the key scheme is documented at the top of `src/netlify/lib/scout.mts`. Concurrent writes use `editRecord` (onlyIfMatch/onlyIfNew retries) and append-only events use onlyIfNew.

## Merge notes (Agent I's community work) — TODO(merge)
`createDefaultAdapter()` in `scout-adapter.mts` keeps everything inside `bep-scout` until wired. Replace each method:
- `wantedItems()` → the “Cần săn giá” wanted-list read in `community-prices.mts` (map to `{itemId,name,families}`).
- `productMappings()` → the product-mapping store public GET (confirmed rows `{itemId,retailer,productUrl,productId,packQty,confirmations}`).
- `lastSeen()` → community pool latest `observedAt` per `itemId|retailer`.
- `catalogItems()` → master catalog `{id,name}`.
- `publishObservation(obs,{confirmed,agreeing})` → the pool write used for screenshot facts, with `source:'scout-extension'` (obs already uses the app's field names: `label, price, unitPrice, unitBasis, wasPrice, promo, validUntil, packQty, packUnit…`).
- `holdObservation(obs,reason)` → community moderation hold queue.
- `recordMappingCandidate(c)` → mapping-store candidate write (confirmations++).
Also: `networkSettings()` should read an `autoScout` key from Studio platform settings once one exists (studio.mts), keeping `bep-scout` as fallback; `studio-scout.ts` should register as a Studio page if `studio.ts` gains a page registry; add a “Pair FamTray Scout” button in My kitchen calling `scout?op=pair-code` (endpoint ready; UI not added here to avoid editing files other agents own).

## Verification (sandbox, 1 Nov 2026)
- `npm run test:all` passes locally (see commit). New suites: Scout API (pairing, token auth, revoked/unpaired token rejected, CORS, kill switches, schedule window, leases with no duplicates and expiry re-queue, release, caps, priority Wed-specials → wanted-by-many → stale → rest, validation/facts-only/dedupe/consensus/disagreement hold, trusted scouts, robots skip, parser-breakage auto-pause + resume, challenge → 24 h pause, Studio audit, config override); parsing (unit prices per 100g/1kg/500g/each/wash/roll/L/100mL, packs, promos, promo end dates, robots, challenges, pacing clamp, 8 fixture pages incl. 24-tile specials with shadow DOM, 30-tile Coles list, Amazon list, meta-tag product, store labels, signed-in marker); extension e2e in Chromium (MV3 loaded with `--load-extension`, new headless): options pairing, semi-auto capture → badge 24 → popup “Đã lưu 24 giá · Woolworths Hurstville”, paced auto run (2 pages, robots skip), challenge stop + 24 h pause; Studio panel against real handlers.
- Screenshots (browser viewport simulation, **not** physical devices): extension popup 375×812 (VI light, EN dark); options 820×1100 and 1280×800 (VI light, EN dark) and 375×812 (EN light); Studio Scout 320×740, 375×812, 820×1100, 1280×800 (VI light) and 375×812, 820×1100, 1280×800 (EN dark), coverage and pairing-code views. Checked: no horizontal overflow, touch targets ≥ 44 px on touch-size layouts, language switching, reduced motion (no animations beyond colour transitions under `no-preference`).

## Limits (please read)
- **Live retailer parsing is UNVERIFIED.** The sandbox cannot reach the retailer sites (they answer 403). Selectors, page-type paths, product-id patterns, specials URLs and challenge markers are modelled on typical markup; fixtures are synthetic. The owner must test on the real sites (semi-auto first) and ship a corrected config via `studio-config` (data only) — no extension update needed for selector changes.
- Retailer pages that render prices only after scripts run are handled because the content script reads the live DOM after load and re-reads on DOM changes (up to 6 times); closed shadow roots cannot be read.
- `navigator.getBattery()` is best effort (not available everywhere; desktops report charging). `chrome.idle` is system-wide; the runner additionally waits while the Scout window is focused.
- In the e2e test build the start-time idle gate is bypassed (headless has no user input) and pacing is shortened via `testPacing`; production builds ignore both.
- The extension's popup is a fixed 360 px panel on desktop; the “375×812” popup screenshot is the closest representative size. Popup/Options were not tested in Edge (Chromium only).
- Store selection must be done by the person on each retailer site once; the extension only reads and compares the label.
- The Studio panel is a standalone container at `#scout` (studio.ts has no page hook); while it is shown, Studio's own router still renders its overview into the hidden main area.
