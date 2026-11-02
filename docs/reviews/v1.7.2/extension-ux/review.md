# v1.7.2 · FamTray So Giá extension: easier Auto mode, a shorter popup, one-column Settings, update check

Owner feedback: "bật auto mode on bên extension như thế nào? … nhìn nó dài quá … trang bên trong rất khó hiểu, bố cục rời rạc". Second request: "làm luôn cái extension auto update".
Branch `agent-kk/extension-ux`. Extension manifest version **1.7.2** (package.json not bumped).

## What changed

**Popup (360 px wide, at most 480 px tall in every state)**
- One card shows the state line, the last capture, and one primary action. The state line reads Chưa ghép / Đã ghép · Bán tự động đang bật / Tự động: sẵn sàng · lần chạy tới T4 06:30 / Đang chạy · 12/150 trang / Tạm dừng / Bị chặn đến …. The primary action is Ghép ngay, Chạy ngay or Dừng (Tiếp tục while paused). The blocked state has no primary action.
- While Auto is not ready, the card lists **only the missing steps** of ①–⑤, in order. Each step has its own fix: Studio link, Chuẩn bị (opens Settings#prep), or the ⑤ switch. The first missing step is the only primary button.
- Secondary items: a small Pause in the header, ⚙ Cài đặt in the footer, the per-site capture switch when the tab is a supermarket, and the VI│EN toggle. The pairing code form is folded under "Hoặc nhập mã ghép".

**Readiness checklist ①–⑤ (popup and Settings → 3. Tự động)**
① paired · ② Studio "So Giá tự động" on · ③ Studio "Cho phép tự động" for this computer · ④ computer prepared (the three confirmations) · ⑤ Auto on for this computer.
- The ②③ fixes open `<app>/studio.html#scout` (Mạng So Giá).
- "chỉ quản trị viên" is shown when the account is not a Studio admin. This uses a new `ownerStudio` field in the device view.
- The old "Studio: this device is not allowed yet" line is now step ③.

**Run now** from this computer, in the popup or Settings, works once ①–④ are done, even outside the schedule. The person pressing the button is the consent. Scheduled runs and Run now commands sent from Studio still need ⑤. An unprepared computer (④ missing) never runs. All other guardrails are unchanged: server grant, kill switches, pauses, caps, pacing, robots.txt, challenge stop, battery and Chrome-open checks.

**Settings**: one column, at most 720 px wide. The steps are 1. Ghép máy → 2. Cửa hàng → 3. Tự động → Trạng thái & nhật ký → Quy tắc an toàn (collapsed).
- Finished steps fold to one line with "Sửa".
- Stores show the name read from each supermarket page, with "Dùng tên này", which saves straight away. Typing names by hand is a folded fallback.
- Schedule uses preset chips: T4 & T7 sáng (mặc định) / Mỗi sáng 06:30–09:00 / Tuỳ chỉnh. The day/time editor appears only under Tuỳ chỉnh, with one row of 7 day pills and add/remove window buttons.
- Page limits are folded.
- Pace uses segmented buttons: Chậm / Bình thường / Nhanh / Rất nhanh. Paces faster than Studio's limit are disabled, and "Theo Studio" resets the choice.
- Theme is Auto / Light / Dark. Version and config are in the footer. Unpair is under "Nâng cao".

**Update check**
- Chrome cannot update a zip or unpacked extension, and Manifest V3 forbids remote code. The parser config still updates as data.
- The server announces `EXTENSION_VERSION` (`src/netlify/lib/scout-version.mts`). The build fails if this differs from the manifest.
- Each heartbeat/device view now carries `update {latest, zip, storeUrl, edgeStoreUrl, reported, outdated}`.
- The production build writes `dist/downloads/famtray-scout.json` with version, size and sha256.
- When the computer is behind, the popup shows "Có bản mới x · Cập nhật (1 phút)". Settings then walks through three steps: download the zip, open downloads and unzip over the old folder, then ↻ Reload (`chrome.runtime.reload`) or open `chrome://extensions/?id=…`. It warns against pressing Remove. When a store listing is configured, Settings links to the store instead. A store install says it updates by itself.
- The extension reports its version from the manifest, so Studio sees the new version after the reload.
- **Studio fields for agent LL to render "Cần cập nhật":** `studio-overview` → `extensionLatest`, `devices[].latestVersion`, `devices[].outdated`, `devices[].live.latestVersion`, `devices[].live.outdated`. No Studio UI files were edited.

**Docs**
- `docs/scout-store/README.md` gains "Turning Auto mode on" and "Updating the extension".
- The Web Store screenshots are regenerated.
- The in-app guide text in `scout-pair-ui.ts` now points to "1. Ghép máy" and "Nâng cao → Hủy ghép nối".

## Later additions in this release (coordinator follow-ups from Henry's real tests)

**Stores and empty runs**
- "Có ít nhất 1 cửa hàng" is now a required readiness step, so the checklist runs ①–⑥. Each retailer has an open button and a ready chip.
- `canStart`, `run-now`, Studio run-now and `leaseTasks` refuse with `no-stores` ("Cần ít nhất 1 cửa hàng") instead of running to 0 pages.
- The server adds `planInfo` {retailersWithStore, tasksToday, open, done, reasonIfEmpty: no-stores | no-wanted-items | all-done | retailer-paused | cap}. It is returned on leases and in device views/heartbeats, and Studio live status gets `devices[].live.planInfo`.
- The last-run text explains an empty run.

**Runner**
- The window is created minimized, with a small unfocused window as fallback. It never counts as "in use" unless focus moves into it.
- It closes only its own tabs. Waits between pages run in the worker, so throttled timers in a minimized page do not stretch the pace.
- runner.html explains why it exists and shows the current item (Đang xem: Woolworths · Hurstville · … · trang n/N). It lists today's pages by kind (Khuyến mãi / Món gia đình cần giá / Link đã lưu / Giá cũ cần cập nhật) with host+path only and each row's status, plus totals and the empty-state reason.
- New device op `plan`. The popup and Settings show "Lần chạy gần nhất" (pages with prices per page) and "Xem trước hôm nay sẽ xem gì".

**No questions: confident placement only** (`src/netlify/lib/scout-match.mts`)
- A fact is attached to an item only on that item's own confirmed product page, or when its name confidently is that item. Matching uses VI/EN names, aliases and a synonym/exclusion table plus generic variant words (smoked, canned, cat food, chips, …).
- Anything else stays "Giá chưa gắn món". Product-link votes come only from confident matches.
- Results return `placement` {placed, unplaced:{no-item|no-store|no-postcode|outside-pilot|community-off|store-mismatch}, facts}.
- The popup on a retailer tab says passively what happened ("Đã đọc N giá trên trang này" / "Chưa đọc được giá…: reason" / "…nhưng chưa gửi: reason") and why prices are not shown yet. "N giá chưa gắn món · Xem" opens a one-tap "Gắn" with suggestions and the catalogue (device op `catalog`). Gắn sends `results{attach:{itemId}}`: a trusted price checker confirms the link at once, anyone else counts as one family vote, and the price is placed.
- Studio ops for LL to render: `studio-unplaced` (list + suggestions) and `studio-unplaced-resolve` {keys, itemId | action:'reject'} (bulk, audited, moderator-confirmed link).

**Page samples**
- "Gửi mẫu trang để sửa" builds a sanitised structure sample in the content script (`ScoutParse.diagnose`). It holds: URL origin+path(+searchTerm), page type, JSON-LD types and trimmed Product/ItemList, price meta, selector match counts incl. open shadow roots, custom elements, ≤ 30 price-like texts with short CSS paths and nearby headings, parse result, timing, and versions.
- Emails, phones, long numbers, form fields, account menus and cookies are excluded.
- The popup shows a preview, and the sample is sent only on a tap (device op `diagnose`, rate-limited, sanitised again on the server, 30-day retention). Studio op `studio-diagnostics` lists the samples.

**SPA navigation**
- The content script re-reads after client-side route changes (URL polling, popstate/hashchange, MutationObserver) with retries at 0.6/2/5 s for lazily rendered prices.
- An e2e fixture navigates by pushState from a no-price page to a product rendered 1.2 s later.

**Placement tests (scout-community)**
- Salmon fillets → Cá hồi. Smoked, pink, cat-food and flavoured salmon → not placed.
- No store label → `no-store`.
- Attach: another family's vote stays a candidate, while a trusted checker's vote is confirmed; the price is placed in both cases.
- Studio list/attach/reject.
- Diagnostics are sanitised, refused for non-retailer pages, and pruned after 30 days.

## Verification (local, Chromium 1243 headless via Playwright; the real MV3 extension loaded)
`test:scout:browser` (scout-extension-browser), new v1.7.2 blocks:
- The checklist shows each missing step in order, with its fix target: Studio href, admin-only note, Settings#prep scrolled into view, and ⑤ disabled until ④.
- Run now (local) is allowed after ①–④, while scheduled and Studio-started runs return `local-off`.
- The popup fits 360×480 without scrolling in 7 states (unpaired with the code form open, paired-missing with the update line, ready, running, paused, blocked, not-assigned). This was checked at 100 % and 150 % device scale, in VI-light and EN-dark. Checks: no horizontal scroll, targets ≥ 44 px, exactly one primary action, exact state lines.
- Settings is one column (same left edge and width, ≤ 720 px) with the steps in order and no overflow at 360/820/1280, VI-light and EN-dark. Targets are ≥ 44 px, rules are collapsed and Unpair is hidden.
- Presets save exactly `[{days:[0..6],start:'06:30',end:'09:00'}]` and `ScoutCore.DEFAULT_SCHEDULE`. A custom edit saves `[{days:[1,3],start:'07:00',end:'09:00'},…]`.
- With Studio at Fast, Very fast is disabled and cannot be chosen. Slow is saved, and "Theo Studio" clears the choice.
- The update banner, its three actions, the store link and the hidden-when-current state are all checked.
- Update in place: files replaced in the same folder with a higher version keep the same id, token, device id, server and Auto setting. The worker and pages report the new version.

Existing v1.6/v1.7/v1.7.1 extension checks still pass, updated for the new structure with exact strings.
`scout-api` adds versionCmp, isOutdated, heartbeat `update`, `ownerStudio`, and the Studio `outdated`/`latestVersion` fields before and after an update.
`scout-release` adds the json version, bytes and sha256, EXTENSION_VERSION = manifest, and an unchanged pinned key.

## Screenshots
- `popup-<state>-<vi-light|en-dark>-360x480.png` for the 7 states.
- `options-<vi-light|en-dark>-<360x800|820x1100|1280x800>.png`, `options-full-vi-light-820.png` and `options-update-vi-light-820.png`.
- Updated older-flow screenshots are in `e2e/`.

## Limits
- Chromium viewport and device-scale simulation only. Not tested on physical hardware, and not tested in the real toolbar popup frame (the popup page is opened as a tab at 360×480).
- In the test, `chrome.runtime.reload()` disables an extension that was loaded with `--load-extension`. The in-place update was therefore verified by relaunching on the replaced folder. The ↻ button's call is verified with a stub.
- The popup's 480 px budget covers the states above. The rare cases where a store-name question or signed-in/mismatch warnings appear at the same time can be taller, up to Chrome's 600 px popup maximum.
- No GitHub CI run yet: this branch has not been pushed (rule 15).
