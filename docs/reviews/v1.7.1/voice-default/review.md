# v1.7.1 voice default: review record

Branch `agent-ee/voice-default` (from 945552d, agent AA's v1.7.1 voice work). Not merged, not pushed, not deployed.
Responsive QA here is local browser viewport simulation (Chromium 1243 via Playwright). It is **not** physical-device
testing: no real iPhone, iPad or Android phone was available.

## Henry's decision → what changed

"giọng chính xác làm default khi tải app về luôn": the on-device **More accurate** pack (Whisper small) now downloads by
itself and becomes the recogniser automatically.

| Area | Behaviour |
|---|---|
| When | After the app has loaded and gone idle: `load` + 10 s + `requestIdleCallback`. Never during startup. |
| Only if | The device can run it (same capability check as before), there is room (`navigator.storage.estimate`, need × 1.1), and the pack is not ready yet. `navigator.storage.persist()` is requested. |
| Network | **With** the Network Information API (Android, desktop Chrome), it starts only on Wi-Fi, ethernet or an unknown non-cellular link, never with Data Saver, and waits on mobile data or 2G. **Without** the API (iPhone/iPad, Firefox), it starts and shows the progress chip. |
| Battery / tab | It does not start below 20 % battery unless charging (where `getBattery` exists), or while the tab is hidden. Once started it continues in the background. It retries on `online`, a connection change, a battery change and when the tab becomes visible. |
| Chip | "Đang tải bộ giọng chính xác · 120/266 MB · **Tạm dừng**", with the note "Nếu đang dùng 4G/5G, bấm Tạm dừng — sẽ tiếp tục khi bạn bấm Tiếp tục" when the network type is unknown (EN: "Downloading accurate voice · Pause / If you're on mobile data, tap Pause…"). It is non-blocking and sits above the bottom navigation on phones or in the corner on tablet and PC. It stays below dialogs (z-index 70 < 80). × hides it for the session while the download continues. |
| Pause / Resume | Pause is stored on the device (`bep-voice-auto-paused`). After a reload the chip comes back paused and nothing downloads. Resume continues from the last stored **8 MB range** (not only per file), so pausing in the middle of the 157 MB decoder keeps what was already downloaded. |
| While downloading | The browser recogniser is used as before. The Downloads row shows "Đang tự tải…" with its own Pause/Resume and no second Download button. |
| When ready | The pack is registered and becomes `bep-voice-recognizer = local-small`. A one-time toast says "Đã bật giọng nói chính xác (dùng được không cần mạng) / Accurate voice is on (works offline)". |
| Family choice | The app never overrides these: an explicit **browser** choice in Voice settings (no auto-switch and no auto-download), a **removal** of the pack (Downloads row, voice sheet or failure panel: `bep-voice-auto-removed`, never auto-downloaded again), and a failed run on this device (the v1.7.1 memory guard). |
| Setting | Downloads row → "Tự tải bộ giọng chính xác / Download accurate voice automatically", **on** by default. Turning it on again clears an earlier removal. Turning it off pauses a running download. |
| Accounts | It works the same on device-only and signed-in devices. The flags are per device (`localStorage`), because the pack is stored per device. Existing users get the same auto-download once after updating. |
| Automation | `navigator.webdriver` (CI, crawlers, Lighthouse) never auto-downloads 279 MB unless a test opts in with `BEP_VOICE_AUTO_TEST`. |

## "Sau này có chỉnh sửa có cần tải về nguyên cục hay chỉ tải về phần mới?"

**Answer: only the new parts. App updates never re-download the pack.**

- **App updates.** The model and runtime files live in their own Cache Storage `bep-voice-models-v1`. On activate, the service worker deletes only `bep-family-*` caches, and the pack's cross-origin requests are never intercepted. Tests: `voice-default.test`, "app updates never touch the voice cache" (real `dist/sw.js` in a VM: install + activate keeps both voice entries and retires the old app cache; huggingface/jsdelivr fetches are not intercepted; `sw.ts` never names the voice cache).
- **Model changes.** Every pinned file has a sha256. v1.7.1 measured and added the sha256 of the 5 JSON files, and their sizes match. An index in the same cache (`/__bep-voice-index`) records url → sha256. When a release pins a new revision, each file whose sha256 is unchanged is **copied** from the stored copy to the new URL and the old entry is deleted, so it is not stored twice. Only the files whose sha256 changed are downloaded. After a complete download, entries no longer used are pruned.
- **Runtime.** transformers.js and the ORT mjs/wasm are re-downloaded only when their pinned file changes. Identical bytes under a new version URL are copied, not fetched.
- **Migration.** Entries stored by v1.6/v1.7.0 have no index. They are recorded at idle (`voiceLocalMigrateIndex`) without a download, because they were verified when they were downloaded.
- The Downloads row says so: "Cập nhật app không cần tải lại gói này · nếu gói đổi, chỉ tải phần mới."

## Files
- `src/frontend/voice-local.ts`: content-addressed storage, 8 MB resumable ranges (with a fallback when the server ignores `Range`), a shared download (a second caller joins, and it cancels only when every caller has cancelled), the auto-download policy, scheduler, chip, row extra and automatic switch, and removal flags in the remove paths. The "partial" status now counts a stored runtime.
- `src/frontend/offline-downloads.ts` (surgical, 4 lines): an optional `pack.extraHtml()` under the description, and `status.busy` / `busyText` (hides Download/Remove while the pack downloads itself).
- `dist/styles.css`: the `/* === v1.7.1 voice-default === */` block.
- Tests: `src/tests/voice-default.test.cts` (in `npm test`) and `src/tests/voice-default-browser.test.cts` (`test:voice-default:browser`, in `test:all`). `voice-local.test.cts` gets AbortController/DOMException in its VM.

## Verification (local, supporting evidence only; GitHub CI is the release gate)
- `npm run check`, `npm run typecheck` and `npm test`: all pass. `voice-default` has 8 checks: the policy matrix, inputs (webdriver, removal, browser choice, battery, cellular), the switch and one-time toast, a model update that downloads only the changed files, runtime version bumps, migration without download, range resume after a pause, the no-`Range` fallback, a tampered range rejected, joined downloads, and the SW keeping the voice cache.
- Browser: `test:voice-default:browser` (new), `test:voice-local:browser`, `test:offline:browser`, `test:voice:browser`, `test:update:browser` and `test:browser` all pass.
- `test:voice-default:browser`:
  - On desktop with the default 10 s delay, no pack request is made in the first seconds, and the first one comes ≥ 10 s after navigation. The pack then switches on and the toast shows once. A reload shows no second toast and downloads nothing. An explicit browser choice is kept.
  - On a simulated iPhone, the chip shows the 4G/5G note. Pause persists across a reload, and nothing downloads while paused. Resume fetches only the missing files and switches on.
  - Cellular and Data Saver wait, and a change to Wi-Fi starts the download. Low battery waits, and charging starts it.
  - A removal in Downloads is never auto-downloaded again, and turning the option back on downloads.
  - Screenshots (JPEG): the chip at 320×740, 375×812, 820×1100 and 1280×800 (VI light, EN dark, plus 375 VI dark and EN light) and a paused chip (EN). The Downloads row at 375, 820 and 1280 in VI/EN and light/dark.
  - Each screenshot is checked for: no horizontal overflow, nothing outside the viewport, buttons and the option at least 44 px, the chip above the phone bottom navigation, and no vendor name.

## Honest limits
- Simulation only: no real iPhone, iPad or Android. Real iPhone memory and speed for Whisper small are **unverified**. The v1.7.1 failure guard (fallback to the browser recogniser after a crash or reload) still applies, and auto-switch does not re-enable a pack that failed on the device.
- iOS may evict Cache Storage when `persist()` is not granted. Safari often does not grant it for a site that is not on the Home Screen. An evicted pack then shows as not ready, and the app falls back to the browser recogniser and downloads it again by itself (when it is idle and on an allowed network).
- On iPhone the app cannot tell Wi-Fi from mobile data. It relies on the visible chip and Pause, as decided.
- Removals made **before** v1.7.1 were never recorded, so they cannot be detected. Such a device gets the auto-download once, unless the family had chosen the browser recogniser in Voice settings. They can turn it off in Downloads.
- The 8 MB range resume and the CORS behaviour of `Range` were checked with curl against the pinned hosts (huggingface.co: 302 to the CDN with `access-control-allow-headers: range`; jsdelivr: 206). In the browser tests the files are routed. A browser that refuses the range request falls back to whole files.
- The chip's "MB" uses the Downloads row's unit (1 MB = 1024² bytes), so the chip shows 266 MB for 279,299,677 bytes. The voice sheet's older size label (1 MB = 10⁶ bytes, "252 MB") is unchanged.
