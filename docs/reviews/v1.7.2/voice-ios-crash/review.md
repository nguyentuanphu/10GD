# v1.7.2 — iPhone crash loop with on-device "More accurate" voice

Branch `agent-nn/voice-ios-crash` (base e0fa40b, PR #9 head). Not deployed. Not pushed. No hosting builds or previews.

## Henry's report (production v1.7.1, iPhone Safari tab)

Voice sheet with the footnote "Đang nghe trên máy (không gửi âm thanh)" → hold "Giữ để nói" → page turns white and
reloads to Today. Sheet again → hold → iOS microphone prompt → Allow → white again → Safari: "A problem repeatedly
occurred on …". That is the iOS WebContent process being killed (memory), twice in a row.

## Root cause

1. **Whisper small needs more memory than an iPhone tab is allowed at the peak of an inference.** Measured in
   Chromium (Linux, renderer process RSS, real pinned files, single thread, WASM): idle app ≈ 445 MB, model loaded ≈
   1.0 GB, peak while decoding ≈ 1.63–1.67 GB (+1.2 GB), and ≈ 1.38–1.41 GB stays resident afterwards because
   WebAssembly memory never shrinks. Whisper pads every input to a 30 s window, so a 1 s clip reaches the same peak as
   a 15 s one. iOS kills tabs well below that on many iPhones.
2. **The v1.7.1 crash guard had gaps.** The marker (`bep-voice-local-busy`) was written only around the model load and
   around each transcription, and removed in between — while the ~1 GB model stayed in memory for the whole hold
   (recording, segmenting, between sentences, after release). A kill in a gap left no marker, so after the reload the
   stored choice was still `local-small`, the next hold loaded the model again and died again → "A problem repeatedly
   occurred". The recording supports this: after the first reload the sheet showed no fallback panel (which a marker
   would have produced), and the second time the microphone prompt came only after the model had loaded (v1.7.1
   loaded the model first, then asked for the microphone).
3. **Smaller contributors:** on iOS 26 the worker tried WebGPU first (GPU buffers plus CPU copies for the q8 ops),
   partial re-decodes every 2.5 s while speaking, sentences up to 25 s, and a hold that ended while the model loaded
   left the microphone running (the recorder was never stopped). The download assembled each 157 MB / 92 MB file in
   one buffer on the main thread (+0.7 GB peak in Chromium).

The automatic default (agent EE) was not the cause: `voiceAutoMaybeSwitch` already refused a device with a failure
record; it just never got one. The guard itself was the gap.

## What changed

- **Bulletproof marker** (`src/frontend/voice-local.ts`): one synchronous localStorage marker with pack, phase
  (`downloading` | `loading-model` | `self-test` | `resident` | `transcribing`) and timestamp. It is written **before the
  worker is created** and stays for the whole time the model is in memory; it is removed only when the worker is
  terminated (idle 60 s, hidden tab, `pagehide`, explicit release) — a kill runs none of those. A marker found at start-up
  (checked first, before anything can load the model; v1.7.1 marker shapes understood) → failure `crash` with the phase,
  stored choice cleared, the pack unregistered from the selector, no automatic download or switch, and a one-time
  non-blocking notice: "Bộ giọng chính xác làm máy hết bộ nhớ và trang bị tải lại — đã chuyển về giọng nói thường của
  máy. [Thử lại] [Gỡ gói]" (EN equivalent; follows the app language; × to close). The marker survives Safari's
  "repeatedly occurred" page because it lives in localStorage.
- **Try again** is explicit: a warning dialog ("may reload the page once more"), then the self-test; switched on only if
  it passes. **Remove pack** removes files, failure and self-test record, and the pack is never auto-downloaded again.
- **iPhone/iPad self-test** (owner policy kept: download allowed): the pack is only switched on after a background
  "thử bộ giọng" — load in the worker + decode a 1 s synthetic clip, with the marker (phase `self-test`) around it, only
  while the page is visible and nobody is recording; 3-minute timeout. Pass → recorded and switched on (model freed
  again); error → device marked; page dies → marked at next start; interrupted → retried later. A v1.7.1 iPhone choice
  of `local-small` without a passed self-test falls back to the browser recogniser until the test passes.
- **Footnote** `#vl-rec-note` in the voice sheet says which recogniser is really in use (and "đang chạy thử" / "đã tắt
  trên máy này").
- **Memory**: iPhone/iPad run WASM only (no WebGPU), one thread, no SharedArrayBuffer; ONNX session without CPU arena /
  memory pattern; sentences ≤ 15 s, the worker never decodes more than 20 s at once (longer audio in 15 s pieces); no
  partial re-decodes on iOS; one session reused across holds and freed after 60 s idle or when the tab is hidden.
  Download: incremental SHA-256 over the 8 MB parts and a streamed `cache.put` (Blob, then buffer, as fallbacks) — no
  whole-file buffer on the main thread. The worker reports the files it read: the q8 `_quantized` encoder/decoder.
- **Permission flow** (`voice-commands.ts`, `voice-price.ts` hint): on iPhone/iPad while the page has no microphone
  permission, the first tap only asks for it ("Cho phép micro để nói: chạm “Cho phép”…, rồi giữ nút để nói"), then
  "Đã bật micro — giờ giữ nút để nói"; the next hold records. Denied → honest message. Never stuck in "Đang nghe".
  The on-device recogniser now opens the microphone first and loads the model second.

## Memory (Chromium 1243 headless, renderer RSS, `nn-bench/mem.cjs` in the agent scratchpad, not committed)

| | before (e0fa40b) | after |
|---|---|---|
| Download peak (whole pack, routed pinned files) | 1143 MB | **717 MB** |
| Idle app | 443–469 MB | 441–458 MB |
| Model loaded | 835–1018 MB | 835–1037 MB |
| Peak per inference (15 s / 1 s audio) | 1495–1668 MB | 1432–1627 MB |
| Resident after inference | 1380–1414 MB | 1322–1382 MB |
| After dispose | 445–477 MB | 441–474 MB |

The inference peak is inherent to Whisper small (30 s encoder window); it cannot be made to fit every iPhone, which is
why the self-test and the marker, not tuning, are the protection. Tried and dropped (no gain): disabling weight
prepacking. Single-threaded decoding of 1–15 s took 17–32 s here (slow sandbox CPU).

## Tests

- New `tests/voice-local-guard.test.cjs` (in `npm test`): marker lifecycle (before worker, phases, kept between
  sentences, cleared on dispose/release), start-up marker → fallback + notice + no worker + no auto re-enable (4 marker
  shapes), iOS gating (pass / error / page dies / deferred while recording / interrupted), Try again, microphone-first
  order + abort, 15 s / 20 s audio limits, incremental SHA-256 vs WebCrypto.
- New `tests/voice-ios-crash-browser.test.cjs` (`npm run test:voice-ios-crash:browser`, added to `test:all`).
- Updated: voice-local (new texts, Try again with warning), voice-local-browser, voice-default-browser (iPhone switch
  requires the self-test).
- Passed locally: `npm run check`, `typecheck`, `npm test`, browser suites voice-local, voice-default, voice-ios-crash,
  voice, voice-commands, voice-price, offline, `test:browser`. GitHub CI not run (not pushed).

## Screenshots (this folder)

Crash notice: 375×812 VI/EN light/dark, 320×740 VI, 820×1100 VI, 1280×800 EN; sheet after a crash; Try again warning;
iPhone self-test running; iPhone permission-first tap VI/EN. Checked: no horizontal overflow, buttons ≥ 44 px, notice
above the bottom navigation, no vendor name.

## Limits

- **No real iPhone here.** Chromium with an iPhone user agent is not iOS: Safari's per-tab memory limit, jetsam kills,
  the "repeatedly occurred" page and the real microphone prompt were not reproduced. Whether the self-test passes on
  Henry's iPhone is unknown; on devices where it cannot fit it costs **one** reload (during the background test, not
  while speaking), after which the device stays on the standard voice input.
- WebKit's support for a streamed `cache.put` body is not verified on device (fallbacks exist).
- `navigator.permissions.query({name:'microphone'})` on iOS may still say "prompt" after a grant in some Safari
  versions; then one extra "Đã bật micro" tap may appear.
- A tab killed by iOS while hidden does not count (the model is freed and the marker cleared when hidden).
