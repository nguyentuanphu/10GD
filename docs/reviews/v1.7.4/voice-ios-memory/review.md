# v1.7.4: on-device "More accurate" voice memory on iPhone

Branch `agent-tt/voice-ios-memory`, based on `main` d625b64 (deployed v1.7.3). **Not pushed, not deployed.** No hosting builds, previews or CLI were used. GitHub CI has **not** run on this branch yet (rule 15), so this is not ready for deploy approval.

## Henry's report

iPhone 14 Pro Max (6 GB), Safari / home-screen app. With "Chính xác hơn" (Whisper small q8, transformers.js 4.3.1 + ONNX Runtime WASM), iOS closes the page for memory, and the app then shows the v1.7.2 crash notice. Approved scope: B1 (lower the peak memory, same model and accuracy), A (graceful iPhone fallback) and a self-check page Henry can run on the phone.

## Root causes found for the peak (Chromium measurements)

1. **Weight files were held in JS memory for the whole session.** transformers.js read **both** weight files at once (92 MB encoder + 157 MB decoder, `Promise.all`) into JS buffers and never released them. ONNX Runtime copies each model into its own WebAssembly memory, so after loading the JS copies were dead, but an idle worker doesn't run a garbage collection. A forced GC after loading dropped the page from 1160 to 885 MB and the next inference peak from 1437 to 1161 MB. The ~250 MB of stale weight copies sat on top of every inference.
2. **Chromium keeps buffers from `Response.arrayBuffer()` alive even after they are detached.** The browser's own wrapper holds them until the next full GC (the anonymous rw memory dropped 204 MB on GC while the worker JS heap was only 25 MB). Detaching only helps for buffers the script allocates itself.
3. **Session build order.** The WebAssembly memory never shrinks, so its size is the high-water mark of everything ONNX Runtime ever held. Whichever session was built second was parsed (model bytes + parsed tensors) while the first one was resident. In v1.7.3 the order depended on timing: 597/724 MB usually, 570/680 MB when the decoder happened to go first.
4. **iPhone used the larger "asyncify" runtime build** (26.9 MB of WASM vs 14.3 MB). That build exists only for WebGPU, which iPhone/iPad never use here (v1.7.2 decision). In the iPhone-UA run the smaller build cut the peak by about 50 MB and load time by half.
5. **Bug: the load was reported finished too early.** When no progress callback was given (the iPhone self-test and every hold), the worker client settled the `load` call at the **first progress message**. The crash marker then said `resident`/`self-test` while the model was still being built, and the v1.7.2 "load" measurements were really about 0.1 s. Fixed: progress messages never settle a call.

Not a cause: audio length. Whisper pads every input to a 30 s window, so a 1 s clip and a 15 s clip reach the same encoder peak (measured). Shorter windows would not reduce memory. Audio limits are unchanged: ≤ 15 s per sentence, ≤ 20 s per inference, 15 s pieces beyond that, no partial re-decodes on iOS.

## What changed (B1, same model and accuracy)

`src/frontend/voice-local-worker.ts`
- transformers.js's own browser cache is off. Every file goes through the worker's cache-only fetch (same pinned files, Cache Storage only, no network; Range size probes never read a body).
- **One buffer per weight file, one file at a time, decoder first.** Each weight file is read from Cache Storage, chunk by chunk, into one `ArrayBuffer` the worker allocates itself. The encoder waits until the decoder has been copied into WebAssembly memory. Detection: ONNX Runtime copies with `HEAPU8.set(model, ptr)`, and a watched buffer copied into the runtime's memory is released on the next task. As soon as the copy happens the buffer is **detached (`transfer(0)`), which frees it immediately**. A 20 s fallback releases the queue if the copy is never seen (another runtime version), so loading can't hang. `Uint8Array.prototype.set` is restored after loading.
- The low-memory session is kept (no CPU arena, no memory pattern, sequential), with one thread, no proxy and WebGPU never on iPhone/iPad. Decode settings are unchanged (`chunk_length_s:30`, `stride_length_s:5`, `no_repeat_ngram_size:4`, the same token caps).
- **Memory meter:** the worker records the `WebAssembly.Memory` that ONNX Runtime creates, before the runtime is imported, and reports `{wasmMB, wasmPeakMB}` with `loaded` and every `result`. Reading `buffer.byteLength` works in Safari, so the self-check page shows a real number on an iPhone.

`src/frontend/voice-local.ts`
- iPhone/iPad always use the **plain ONNX Runtime build** (the same pinned version from the same host). Desktop is unchanged.
- The worker-client fix from root cause 5.

### Measurements: Chromium 1248 headless, Linux (desktop simulation, NOT an iPhone)

Renderer process RSS. Peaks are exact kernel high-water marks: `/proc/<pid>/clear_refs` is reset, the phase runs, then `VmHWM` is read. WASM is the runtime's WebAssembly memory. Real pinned files are served locally. Each run: load, then 1 s, 15 s and 15 s clips, then dispose. Two runs per row. The harness is in the agent scratchpad and isn't committed.

| | v1.7.3 (d625b64) desktop | v1.7.4 desktop | v1.7.3 iPhone UA | v1.7.4 iPhone UA |
|---|---|---|---|---|
| Idle app | 239–241 MB | 241–243 MB | 228–241 MB | 239–241 MB |
| **Overall peak (load + 3 inferences)** | **1396 / 1433 MB** | **1182 / 1182 MB** | **1364 / 1431 MB** | **1140 / 1143 MB** |
| Load peak | (hidden by bug 5: load overlapped the first inference) | 1145 / 1150 MB | (same) | 1005 / 994 MB |
| First inference (1 s clip) peak | 1396 / 1433 MB | 1080 / 1082 MB | 1431 / 1364 MB | 1045 / 1038 MB |
| 15 s inference peak | 1266–1274 MB | 1177–1182 MB | 1178–1278 MB | 1137–1143 MB |
| Resident after inferences | 1148 / 1149 MB | 1056 / 1056 MB | 1161 / 1058 MB | 1017 / 1021 MB |
| WebAssembly memory (after load / after inference) | 597 / 724 MB | 570 / 680 MB | 597 / 724 or 570 / 680 MB | 568 / 679 MB |
| After dispose | 212–215 MB | 212–217 MB | 215–222 MB | 211–215 MB |
| Load time (real) | n/a (bug 5) | 7.2–10.4 s | n/a | 3.7–4.3 s |
| 1 s / 15 s decode time | 20–23 s / 18–23 s | 18–26 s / 17–22 s | same range | same range |
| Network requests while in use | 0 | 0 | 0 | 0 |

The overall peak fell by **214–251 MB on desktop and 221–291 MB with the iPhone UA, about 16–20%**. Above the idle app, the model's own peak went from ~1125–1190 MB to ~900–940 MB (−20%). Decode times are within this sandbox's noise; it has a slow CPU, single thread.

**These Chromium numbers are not iPhone numbers.** Safari uses another engine (JavaScriptCore), other code tiers and its own per-tab limit, and it can't be simulated here. The one Chromium-specific effect (root cause 2) is handled by allocating the buffer ourselves, which frees on detach in every engine. Whether Henry's iPhone now passes is unknown. **The real check is the self-check page on his phone.**

### Tried and rejected

- `graphOptimizationLevel:'disabled'`: −100 MB of WebAssembly memory, but **transcripts changed** (7 of 12 clips differ; the fused kernels round differently) and decoding was ~40% slower. Rejected to keep accuracy. `basic`/`extended` gave no gain.
- `session.disable_prepacking`: no gain (as in v1.7.2).
- A GC nudge with untouched ArrayBuffers: no effect in Chromium. Removed.
- Detaching buffers from `Response.arrayBuffer()`: freed nothing in Chromium (root cause 2). Replaced by the self-allocated buffer.
- Plain vs asyncify runtime: **12/12 identical transcripts** on the 6 test clips (VI and auto, EN and auto). The clips are local test audio, not committed.

## A — graceful iPhone fallback

- **No automatic loads after a memory crash.** The crash counter (`bep-voice-local-crashes`) is per device and per release (app memory version 1.7.4 + pinned model revision + runtime versions). Once it is non-zero, the automatic download, switch and self-test never touch the pack again, even after "Gỡ gói" and a re-download. Only an explicit action does.
- **"Thử lại" is one guarded try.** The dialog says the page may reload once more and that a second memory failure switches accurate voice off on this device until the next update.
- **A second crash disables it on the device.** No "Thử lại" in the notice, the voice-sheet panel or the self-check page. The self-test and self-check refuse to run. A new release (a different version string) allows one guarded try again. A crash during a download doesn't count.
- **Short, non-alarming notice:** "Giọng chính xác tạm tắt vì máy thiếu bộ nhớ — đang dùng giọng nói thường của máy." / "Accurate voice is paused: not enough memory on this device — using the standard voice input." After the second crash: "…đã tắt trên máy này vì máy thiếu bộ nhớ (2 lần)… sẽ thử lại được khi có bản cập nhật."
- **iPhone dictation tip** in the quick voice sheet, the price sheet and the recipe dictation sheet, whenever accurate voice is not the recogniser in use on iPhone/iPad. Text: "💡 Trên iPhone: chạm vào ô chữ rồi bấm 🎤 trên bàn phím để đọc chính tả (tiếng Việt rất tốt)." / EN equivalent. The button **"⌨️ Mở bàn phím để nói"** stops the sheet's own listening and focuses the text box, so the keyboard with its 🎤 key opens. The tip follows the app language and is never shown on other devices.
- **"Gỡ gói" says how much it freed:** "Đã gỡ gói giọng chính xác — giải phóng 279 MB trên máy." This counts the stored sizes of the files actually deleted, parts included.

## Self-check page (how Henry runs it)

1. Open the app on the iPhone and go to **Tài khoản & cài đặt → Giọng nói trên máy → "Kiểm tra giọng chính xác trên máy này"**. The same button is in the voice sheet: **Cài đặt giọng nói → Nhận giọng nói trên máy**, and "Kiểm tra máy này" is on the fallback panel.
2. The pack must be downloaded (Tải về để dùng offline). Tap **Bắt đầu kiểm tra**, don't speak, and wait about 10–60 s.
3. The page shows the device class (iPhone / iPad / Android / computer, plus RAM and cores where the browser tells), Đạt / Không đạt, **load time**, **recognition time**, **peak model memory** (WebAssembly, readable in Safari) and the **phase reached**. It also shows page JS memory where Chrome exposes it, and browser-measured memory when the page is cross-origin isolated (not the case today). Text is in VI/EN.
4. If iOS closes the page, reopen the app. The check opens by itself and says **"trang bị tắt ở bước …"** (Nạp mô hình / Nhận dạng đoạn mẫu). That counts as the device's crash under A.
5. **Sao chép kết quả** copies a text summary (device, results, user agent) to send by hand. If the check passes, **Dùng giọng chính xác** switches it on.

Nothing is sent to the server. `voice-stats` is an opt-in transcript-statistics endpoint with a fixed schema, and adding diagnostics would have needed a server and Studio change, so the optional Studio diagnostic was not built. The copy button covers the need without new data flows.

## Tests (local runs, this sandbox)

New:
- `tests/voice-ios-memory.test.cjs` (in `npm test`, 9 checks). Covers: one read per weight file, decoder before encoder, buffers detached after the WebAssembly copy, fallback never hangs, `set` restored, session/env options, Range probe, iPhone options (1 thread, no WebGPU, plain runtime incl. iPad desktop-UA), unchanged decode options, progress never settles a load, memory meter, crash counting / one guarded try / disabled / version reset / no automatic load, dictation tip + keyboard, "Gỡ gói" MB, and the self-check (pass with phases written before each phase, error, died in phase, disabled).
- `tests/voice-ios-memory-browser.test.cjs` (`npm run test:voice-ios-memory:browser`, **added to `test:all`**). Covers the crash notice with one guarded try and no worker or automatic reload, the dictation tip in the quick voice and price sheets (focus moves to the text box), a second crash → disabled, the self-check from Account & settings (running → passed, Dùng giọng chính xác, Gỡ gói with MB), failed, offline, died-in-phase after a reload (VI/EN), and no tip off iOS.

Updated, because the owner asked for the new short wording: crash and retry text assertions in `voice-local`, `voice-local-guard`, `voice-local-browser` and `voice-ios-crash-browser`. In `kitchen-hub`, the new "Giọng nói trên máy" settings card was added to the expected card list. No test was skipped or weakened.

| Command | Result |
|---|---|
| `npm run check` | pass |
| `npm run typecheck` | pass |
| `npm test` (incl. new voice-ios-memory) | pass |
| `npm run test:voice-local:browser` | pass |
| `npm run test:voice-ios-crash:browser` | pass |
| `npm run test:voice-default:browser` | pass |
| `npm run test:voice-ios-memory:browser` (new) | pass, 25 screenshots |
| `npm run test:voice:browser`, `test:voice-commands:browser`, `test:voice-price:browser` | pass |
| `npm run test:browser` | pass (after adding `settings-voice` to the expected settings cards) |
| `npm run test:authenticated-startup` | pass |
| `npm run test:offline:browser` | pass |
| `npm run test:scout-release`, `npm run test:scout` (version bump) | pass |

**GitHub CI: not run** (branch not pushed). Rule 15: deploy approval can't be requested until the `CI` workflow is green on the exact head commit of the PR.

## Responsive review (rules 7–9)

Screenshots in this folder (Chromium viewport simulation with an iPhone user agent, `reducedMotion: reduce`):
- Voice sheet with the dictation tip at 320×740 (VI light), 375×812 (VI/EN, light/dark), 820×1100 (VI light, EN dark) and 1280×800 (EN light, VI dark). Also the price sheet tip (375 VI).
- Self-check passed at the same 9 size/language/theme views, plus running (375), failed (375 EN), offline pass (375 VI), died in phase (375 VI/EN) and the disabled crash notice (375 VI).

Checked by the suite at each size: no horizontal page overflow, no clipped text in the tip and the check, every button ≥ 44×44 px, no hosting vendor named, and VI/EN text. The tip follows a language switch. The check runs offline from the stored pack. No new animation was added; the elapsed-time counter is plain text. Bottom navigation isn't covered: the check is a dialog and the tip sits inside the sheet.

Limits: this is browser viewport simulation, not physical iPhone/iPad hardware. Safari's real keyboard dictation, its memory limit and its page reload can't be reproduced here, and the 🎤 key is the iOS keyboard's own.

## Version

App 1.7.4 (`package.json`, `package-lock.json`, README) and Price Check extension 1.7.4 (`extension/manifest.json`, `EXTENSION_VERSION`), following the 1.7.3 bump. **The extension has no code changes**, but computers on 1.7.3 will see the usual update prompt.

## Limits and open points

- The real effect on Henry's iPhone is unverified. The ~16–20% lower Chromium peak may or may not bring the q8 small model under Safari's limit on a 6 GB phone; the self-check page will say.
- The remaining peak is mostly inherent to Whisper small with transformers.js: the 30 s encoder window, plus ~110 MB of cross-attention cache returned to JS on every decoding step. Removing it would need library changes or another model, both outside the approved scope.
- Detecting the weight copy depends on ONNX Runtime copying with `HEAPU8.set`, as the pinned 1.31.0-dev build does. With a different runtime the fallback keeps loading correct, but the JS buffer is then left to the GC.
- Henry's existing v1.7.3 crash record has no version, so after this update the crash counter starts at 0 (or 1 at the next crash) and he gets one guarded try via the self-check or "Thử lại".
- iPhone users who already passed the v1.7.2 self-test need the plain runtime (14.3 MB, same host and version) before accurate voice is active again. Until then the standard voice input is used.
