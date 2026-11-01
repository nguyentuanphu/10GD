# v1.7.1 · Floating ladybug feedback ("bọ rùa góp ý")

Owner request (1 Nov 2026): *"cho thêm cái floating lady bug, cách hoạt động và sử dụng giống SparkleValley, để người dùng assigned hay tôi bật mở để mọi người feedbacks"*.

Branch `agent-ff/ladybug` (from `babc433`). Not merged, not pushed, not deployed. No preview was built and no hosting tools were used (AGENTS.md rules 1–5, 18). Deploy needs Henry's separate, explicit DEPLOY approval after GitHub CI passes on the exact head commit (rules 15–16).

## What was built

| Part | Files |
|---|---|
| App: floating bug, feedback sheet, picture capture/hiding, offline outbox, "My feedback" | `src/frontend/ladybug.ts` (new, last script in the startup pack: one-line edit to the list in `src/frontend/bootstrap.ts`), CSS block in `dist/styles.css` |
| Server: visibility, submit, reporter list, Studio inbox/workflow, testers, mode | `src/netlify/lib/feedback.mts`, `src/netlify/functions/feedback.mts` (new) |
| Retention: daily cleanup (13 months) | `src/netlify/functions/feedback-cleanup.mts` (new, in-code schedule like `usage-cleanup`) |
| Studio page "Góp ý / Feedback" | `src/frontend/studio-feedback.ts` (new, registered through `window.studioPages`), one `<script>` line in `dist/studio.html`, CSS block in `dist/studio.css` |
| Privacy | `dist/privacy.html` new section 6 "Góp ý / Feedback" (Contact becomes section 7) |
| Tests | `src/tests/feedback.test.mts` (in `npm test`), `src/tests/ladybug-browser.test.cts` (`npm run test:ladybug:browser`, added to `test:all`) |

No other shared file was edited: `studio.ts`, `studio.mts`, `family-menu-ui.ts`, `voice-local.ts`, `offline-downloads.ts` are untouched.

## Who sees the bug

Studio → Góp ý → "Ai thấy bọ rùa góp ý / Who sees the feedback ladybug": `feedbackBug` = **off** / **assigned** (default) / **everyone**, stored in the new `bep-feedback` store (not in the boolean platform-flags object, so `studio.mts` did not need changing).

| | off | assigned | everyone |
|---|---|---|---|
| Studio owner (STUDIO_ADMINS) | ✓ | ✓ | ✓ |
| Account on the "Người thử / Testers" list | – | ✓ | ✓ |
| Other account | – | – | ✓ |
| Device-only (no account) | – | – | ✓ |

The server enforces the same table: a submission from anyone outside it gets **403** (`code: not_allowed`). The testers list is owner-only, needs the Studio CSRF token, must name an existing account, and every add/remove and mode change is written to the Studio audit log (`feedback_tester_add/remove`, `feedback_mode`). This follows the v1.7.1 extension-allowlist pattern (`scout.mts` `studio-extension-users`).

## Ported from Sparkle Valley (read-only reference `/home/user/nguyentuanphu/tpn`)

| Sparkle Valley | Here |
|---|---|
| `js/tester-float.ts` floating control outside the app's layers, pointer capture, 8 px drag threshold, position remembered per device, double-tap / dblclick / **Home** key reset, long press, safe-area + visual-viewport bounds | Same gestures and bounds. Added **edge snap** on release (requested) and the bottom navigation / side navigation / update notice as hard bounds. |
| Default position ranked against the open panel's controls (collision score), user-dragged positions kept | Same ranking against the top layer (dialog, sheet, menu, or the page). A position you chose is kept **except** it never sits on the top layer's primary button (it yields and returns when the dialog closes). |
| Long press = quick report | Long press = **tuck away** (small 44 px tab at the edge; tap to bring it back). A text-less quick report is not useful for a family app and the server requires a note. |
| Badges: queued count, fixed tick, "new" dot | Queued count (number), dot for a new reply or a "fixed — please check" item; both in the accessible name. |
| Panel: kind chips, note (600), picture taken at tap, "Include complete interface", picture viewer, Send, Retry queued | Kind chips (Có lỗi / Hiển thị sai / Chữ hoặc dịch / Ý tưởng / Khác), note (1000), **picture only on "Take screenshot" or "Choose a picture"**, preview with **hide parts** (drag rectangles or "hide top/middle/bottom third", pixelated, undo, remove), full list of technical details, Retry. |
| `js/screencapture.ts` (clone the DOM into an SVG foreignObject, canvas fallback painter, private fields masked) | Ported, plus: the window's scroll position, off-screen parts keep their box, the bug/sheet/toast are excluded, `[data-private]`/password/file fields masked. |
| `js/report-outbox.ts` (queue on device, clientId, never lose text to keep a picture) + server receipts | Same: max 10 waiting, falls back to text-only on storage quota, sent on `online` / connectivity / every 60 s, server receipt per `clientId` → the same report is stored once. |
| Error lines (window error / unhandledrejection, ResizeObserver notices ignored) | Same, last 10, scrubbed of emails, long numbers, quoted values and query strings (client and server). |
| Tester status: My reports, "Fixed, please check" → Yes, fixed / Still wrong | "Góp ý của tôi / My feedback": status, the team's replies, **Đã ổn / Vẫn còn lỗi** → `closed` or `back`. |
| Studio Tester reports: problems list with filters, details, picture on request, status new→fixing→fixed→confirmed/back, not a bug, duplicate | Studio Góp ý: filters (status, kind, page, reporter incl. testers / no account), detail with context and recent errors, picture on request, status **new → triaged → fixing → fixed → closed** (+ back, won't fix), **internal notes**, **replies to the reporter**, change history; audit for every view and change. |
| Rate limits per device/IP per day, size limit, 60-day retention | Per reporter 4/min and 20/day, per network address 60/day (address only hashed into a counter key), 600 KB request, 400 KB JPEG ≤ 2400 px, **13 months** retention with daily cleanup. |
| — | Push to the Studio owner on new feedback (kind + page only, never the text), and to the reporter's account on a reply ("Tap the ladybug → My feedback"), reusing the Scout `notifyAccount` push; quiet hours / per-device switches apply. |

### Not ported, and why

- **Automatic reports** (freeze, slow frames, button off screen, game did not open, child stuck, auto-play nightly runs, retest replays): game-specific detectors; a meal planner has no frame loop or games. Only recent error lines are kept.
- **Rewards** (Bug Hunter badges, coins, stickers, weekly star, tester gear): built for children in a game; not appropriate here.
- **Agreement / consent screen and player names in reports** (SV PRIV-016): here nothing personal is collected, so no separate agreement; the sheet lists exactly what is sent and links the privacy page.
- **"Already reported here → add to it"**: it shows other people's report titles; family feedback can be personal, so reporters never see each other's reports.
- **Spoken note** (SV mic) and the **L** keyboard shortcut: not added (the app's voice features are separate; a single-letter shortcut would clash with typing and voice commands).
- **Problem grouping by key / duplicates**: each report is its own item; volumes are small.

## Privacy

Stored per report: id, time, kind, the note, context (page/route, dialog kind, app edition + build, platform class, installed-app flag, language, theme, viewport, online, signed-in flag, from-offline-queue flag, device time), scrubbed error lines, picture flag, status, reporter `{account username or null, hashed reporter key, role}`, replies, internal notes, history. **Not stored:** IP address, email, family id, display names, recipe or family data, the raw device token. Pictures: JPEG only, re-encoded on the device (≤1280 px), EXIF/XMP/comments stripped again on the server, viewing a picture is audited. Unit test `feedback.test.mts` asserts the exact stored field list.

## Verification (local, this sandbox)

- `npm run check`, `npm run typecheck`, `npm test` (incl. new `feedback.test.mjs`): pass.
- `npm run test:ladybug:browser` (new): pass — visibility per mode/role; drag → snap + remember, reload, double-click and Home reset, long-press tuck away, stays above the bottom navigation at 320 and 375 and right of the side navigation at 820 and 1280, primary button of an open dialog not covered; send without a picture, with a screenshot (hide parts, JPEG stored); empty note refused; offline → badge "1" → sent exactly once when back online (two concurrent flushes); Studio mode/testers/filters/detail/picture/status/internal note/reply and audit entries; reporter sees the reply dot and "My feedback" (internal note never shown); "Yes, fixed" closes it; VI/EN switch keeps the draft; light/dark; reduced motion (no wiggle) vs motion allowed; no horizontal overflow; ≥44 px targets; privacy section VI/EN.
- Related suites re-run, all pass: `test:browser`, `test:studio-speed:browser`, `test:urgent-reasons:browser`, `test:usage:browser` (screenshots those suites rewrote were restored, not committed).
- **GitHub CI has not run on this branch** (not pushed). Rule 15: release evidence requires a green `CI` run on the exact head commit.

## Screenshots (this folder)

Browser viewport simulation in Chromium, **not** physical devices.

- Mobile 375×812: `bug-new-reply-vi-light-mobile`, `bug-tucked-vi-light-mobile`, `bug-en-dark-mobile`, `sheet-vi-light-mobile`, `sheet-vi-dark-mobile`, `sheet-en-dark-mobile`, `sheet-screenshot-vi-light-mobile` (preview with hidden parts), `my-feedback-vi-light-mobile`, `studio-feedback-en-dark-mobile`.
- Narrow 320×740 (floats over the navigation): `bug-vi-light-narrow`, `bug-queued-en-dark-narrow`, `sheet-offline-en-dark-narrow`, `sheet-vi-light-narrow`, `studio-feedback-vi-light-narrow`.
- Tablet 820×1100: `bug-vi-light-tablet`, `sheet-vi-light-tablet`, `my-feedback-fixed-en-dark-tablet`, `studio-feedback-vi-dark-tablet`, `studio-feedback-en-light-tablet`.
- Desktop 1280×800: `bug-vi-light-desktop`, `bug-en-dark-desktop`, `sheet-vi-light-desktop`, `sheet-en-dark-desktop`, `studio-feedback-vi-light-desktop`, `studio-feedback-en-dark-desktop`, `studio-feedback-detail-vi-light-desktop`.

## Limits

- Viewport simulation only; no physical iPhone/Android/iPad. Safe-area insets are read from `env()` but were 0 in the simulator; touch drag was exercised with mouse pointer events.
- Screenshot capture renders the page from a DOM copy: page fonts and CSS background artwork may differ slightly from the real screen (falls back to a simpler painter if the browser refuses). Safari behaviour of the SVG renderer is untested here.
- Owner/reply pushes use the existing app push (Scout `notifyAccount`); not tested against a real push service.
- The Studio inbox reads all reports on each load (fine for hundreds; would need an index for many thousands).
- Not deploy approval. Deploy requires Henry's explicit DEPLOY for the reviewed commit.
