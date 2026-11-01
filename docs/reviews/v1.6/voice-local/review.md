# v1.6 · On-device speech recognition + opt-in voice statistics (Agent U)

Branch `agent-u/local-voice-stats` (from `v16-base`). Not pushed, not merged, not deployed.
Henry approved "make it" for on-device recognition. **This is not deploy approval** (AGENTS.md 1–5, 10, 16).

## 1. What was built

| Part | Files |
|---|---|
| On-device recogniser (optional download, OFF by default) | `src/frontend/voice-local.ts`, `src/frontend/voice-local-worker.ts` (→ `dist/voice-local-worker.js`) |
| Opt-in voice statistics (app side) | `src/frontend/voice-stats.ts` |
| Statistics API + storage | `src/netlify/functions/voice-stats.mts`, `src/netlify/lib/voice-stats.mts` |
| Studio "Giọng nói / Voice" panel | `src/frontend/studio-voice.ts`, one `<script>` tag in `dist/studio.html` |
| Startup pack | `voice-local.js`, `voice-stats.js` appended to the `scripts` list in `src/frontend/bootstrap.ts` |
| Styles | appended block `/* === v1.6 voice-local … */` at the end of `dist/styles.css` |
| Tests | `src/tests/voice-local.test.cts`, `src/tests/voice-stats-client.test.cts`, `src/tests/voice-stats.test.mts`, `src/tests/voice-local-browser.test.cts` |
| Manual benchmark (opt-in, not a test) | `src/scripts/voice-bench.cts` → `npm run bench:voice-local`, plus `voiceLocalBenchmark()` in the app |

## 2. Research: browser-runnable Whisper

| Option | Runtime | Download (exact, pinned) | Licence | Notes |
|---|---|---|---|---|
| **transformers.js 4.3.1** + ONNX Runtime Web + `onnx-community/whisper-*` (chosen) | WASM (SIMD), optional WebGPU | library 586,230 B; ORT asyncify runtime 26,914,834 B (plain build for Safari < 26: 14,289,219 B) | transformers.js Apache-2.0; onnxruntime-web MIT; Whisper weights MIT (OpenAI repo) / Apache-2.0 on the HF model card | Maintained, pipeline handles feature extraction + tokenizer + language/task tokens; Cache Storage built in; worker-friendly |
| whisper-tiny q8 (`encoder_model_quantized` + `decoder_model_merged_quantized`) | same | 40.8 MB weights | as above | Vietnamese quality too weak for our long rambling sentences — not offered |
| **whisper-base q8 — "Nhẹ"** | same | 23,201,314 + 53,693,315 B weights + 2,769,562 B JSON = **79,664,191 B (79.7 MB)** | as above | default local choice |
| **whisper-small q8 — "Chính xác hơn"** | same | 92,326,160 + 156,750,845 B + 2,769,608 B = **251,846,613 B (252 MB)** | as above | desktops/laptops; blocked on iPhone/iPad and on devices reporting < 4 GB RAM |
| whisper.cpp WASM (ggml) | WASM SIMD (+ threads) | ggml-base q5_1 59.7 MB, base q8_0 81.8 MB, small q5_1 190.1 MB, small q8_0 264.5 MB | MIT | Fast with threads, but threads need cross-origin isolation (COOP/COEP); we would self-build/host the wasm + JS glue and write our own mel/tokenizer glue; no maintained npm build to pin |
| Web Speech API (existing) | browser vendor | none | — | Chrome sends audio to the vendor's servers; needs internet. Kept as default and as fallback |

Sizes were read from the Hugging Face file API for the pinned revisions and from the jsDelivr package API; every weight file is verified against its SHA-256 (LFS object id) after download and the library/runtime against their published SHA-256.

**WebGPU vs WASM.** WebGPU is faster for the encoder on laptops with a GPU, but it is not available everywhere (Safari shipped it only in 26), fp16/q4 file sets differ (a second download), and it adds GPU memory pressure on phones. v1 uses WASM only so one file set works everywhere; WebGPU is a later option.

**Threads.** ONNX Runtime uses multiple WASM threads only when the page is cross-origin isolated (COOP `same-origin` + COEP `require-corp`). The app is not, so recognition runs single-threaded. Turning isolation on is a site-wide header change (it affects third-party images/embeds) — an **unresolved decision for Henry**, not made here.

**iOS Safari.** WASM SIMD (16.4+), AudioWorklet (14.5+), Workers, dynamic `import()` in workers and Cache Storage are supported. Safari does not expose `navigator.deviceMemory`, and tabs are killed under memory pressure well before desktop limits, so "Chính xác hơn" is disabled on iPhone/iPad (incl. iPadOS desktop UA) and "Nhẹ" is offered. Safari may evict website storage that has not been used for a while unless the app is added to the Home Screen; the pack then shows "Chưa tải" again and the browser recogniser is used.

**Vietnamese + English code-switching.** Whisper predicts one language per 30-s window. With the VI/EN toggle the language token is forced (`vietnamese`/`english`): English food words inside Vietnamese speech usually come out as English words or Vietnamese transliterations, both of which the existing parser pipeline (`parseVoiceInput`) already handles. "Tự nhận ngôn ngữ" leaves detection to Whisper. Quality must be measured on Henry's family's real voices — see §6. Whisper hallucinates YouTube outros on silence/noise in Vietnamese ("Hãy subscribe cho kênh … ", "Cảm ơn các bạn đã theo dõi", "[Âm nhạc]") — we reproduced this in the sandbox; these are filtered, segments are only sent when the energy detector hears speech, output length is capped by audio length and n-gram repeats are blocked.

**Hosting & privacy.** The library and runtime come from `cdn.jsdelivr.net/npm/...@<exact version>`; model files from `huggingface.co/<model>/resolve/<commit sha>/`. These are requested **only** when the person taps Tải/Download (or downloads the pack from the offline-downloads screen). Recognition then reads everything from Cache Storage `bep-voice-models-v1` (the worker's `fetch` is replaced by a cache-only lookup and remote model loading has no fallback) — audio stays in the page and the worker; nothing is sent. The service worker only clears `bep-family-*` caches, so the pack survives app updates.

Sources: transformers.js (https://github.com/huggingface/transformers.js, npm `@huggingface/transformers` 4.3.1, Apache-2.0); ONNX Runtime Web (https://www.npmjs.com/package/onnxruntime-web, MIT); https://huggingface.co/onnx-community/whisper-base, https://huggingface.co/onnx-community/whisper-small (file sizes via `/api/models/.../tree/main`); https://huggingface.co/openai/whisper-base (licence apache-2.0 on card); https://github.com/openai/whisper (MIT); https://github.com/ggml-org/whisper.cpp (MIT) and https://huggingface.co/ggerganov/whisper.cpp (ggml sizes); Whisper paper https://arxiv.org/abs/2212.04356; jsDelivr package API https://data.jsdelivr.com/v1/packages/npm/@huggingface/transformers@4.3.1.

## 3. How it works

- **Off by default.** The voice sheet gets a collapsible "⚙️ Cài đặt giọng nói / Voice settings" block: Browser (default) · Nhẹ 79,7 MB · Chính xác hơn 252 MB (+27,5 MB shared runtime), download/remove buttons with progress, and the capability result. Downloading a pack selects it; removing it returns to the browser recogniser.
- **Capability check** (`voiceLocalCapability`): WebAssembly + SIMD probe, Worker, getUserMedia, AudioWorklet, Cache Storage, `deviceMemory` (≥ 2 GB Nhẹ, ≥ 4 GB Chính xác hơn when known), iOS rule above, free quota (`navigator.storage.estimate`) before download, `storage.persist()` requested. Any failure → reason shown and the browser recogniser stays in use. Cellular/save-data → confirmation before download.
- **Recording**: AudioWorklet at 16 kHz mono (falls back to the device rate + linear resampling), energy-based segmenter → partial snapshot every 2.5 s while speaking (skipped when the worker is busy) and a final segment after 0.8 s of silence or 25 s. Text goes into the same textarea → same Xem trước/Preview → same `parseVoiceInput` pipeline. Stop/Dừng flushes the last words; Preview aborts.
- **Worker protocol v1** documented at the top of `voice-local-worker.ts` (`hello/load/progress/loaded/transcribe/result/dispose/error`), one transcription at a time, audio buffers transferred.
- **Works offline** after download (the worker script is kept in the pack cache too). The browser recogniser still needs internet.
- **Integration hooks** (typeof-guarded, idempotent): `registerVoiceRecognizer({id:'local-base'|'local-small',label,available,start(lang,onResult(text,final),onEnd(info)),stop()})` and `registerOfflinePack({id:'voice-local-base'|'voice-local-small',label,sizeBytes,status()→'ready'|'partial'|'none',download(onProgress(fraction,loaded,total)),remove()})`. When Agent R's hook exists the standalone mic routing is skipped (R's sheet chooses); the settings block is still shown. Wi-Fi-only is enforced by Agent T's screen when present.

## 4. Opt-in voice statistics — privacy notes

- Toggle in the voice settings: **"Giúp cải thiện nhận giọng nói (chỉ gửi chữ, không gửi âm thanh)"**, default **OFF**. Switching it on sends nothing by itself.
- When ON, after each **confirmed** preview (Thêm các dòng đã chọn / Thêm món vào bữa) one record is sent: `{ts, lang, recognizer, kind, transcript ≤ 300 chars, unrecognised words (≤ 20), corrections phrase→catalogue id (≤ 10), item count, household = SHA-256("bep-voice-stats:"+id) first 24 hex}`.
- **Never sent:** audio (the API rejects audio-like fields), family member names (removed on the device, accent-insensitive, including single given names; the signed-in name too), e-mail addresses, links, phone numbers and other ≥ 5-digit numbers (removed on the device **and again on the server**), family recipe ids (only shared catalogue ids count as corrections), account names. Quantities such as "500 gam" stay.
- Identity: a random device token (header `x-voice-stats-device`); the server stores only `sha256(token)[0..24]`. No cookie is needed or read for submissions.
- Limits: 30/hour and 300/day per device, 120/hour per IP; body ≤ 8 KB; same-origin only.
- Retention **90 days** (swept on submit at most every 6 h and on every Studio view). **Opt-out deletes** every record from that device immediately; if offline at that moment, the deletion is retried when back online. Offline confirmations are dropped, not queued.
- Studio: **owner only** (support role refused), aggregates only — no transcripts are displayed. Every view and every export writes a Studio audit entry (`voice_stats_view`, `voice_stats_export`) through `writeAudit`. Export = "add as synonym" **suggestions** JSON for manual review; nothing is applied to the lexicon automatically.
- Legal draft: the only draft in `docs/legal/` covers community prices and does not fit; suggested privacy-policy paragraph for whoever owns legal text:
  > *Nhận giọng nói trên máy:* nếu bạn tải gói, âm thanh được xử lý ngay trên máy và không gửi đi. *Giúp cải thiện (tuỳ chọn, mặc định tắt):* khi bạn bật, sau mỗi lần xác nhận app gửi câu chữ đã lược bỏ tên thành viên, email, số điện thoại, cùng các từ chưa nhận ra và các sửa đổi; không gửi âm thanh; lưu tối đa 90 ngày; tắt là xoá. / *On-device recognition:* audio is processed on your device and never sent. *Help improve (optional, off by default):* text only, names/e-mails/phone numbers removed, kept up to 90 days, deleted when switched off.

## 5. Verification

Local runs (supporting evidence only — GitHub CI on the PR head is the release evidence, AGENTS.md 15/17):
- `npm run build`, `npm run check` (dist syntax, offline assets, edge ESM), `npm run typecheck`.
- `node tests/voice-local.test.cjs` — 9 groups: exact sizes/pins, capability + iOS/memory rules, language hints, hallucination filter, resample/downmix, segmenter, hook registration with stubs (standalone = no-op), download → SHA-256 verify → Cache Storage → status/remove with fake files (tamper → `integrity`, quota → `quota`), recognizer with stub engine/mic (lang hint, stop flush, abort, fallback when unavailable or engine fails), worker protocol with a fake engine (order, errors, version, dispose) and client↔worker round-trip, real engine refuses a tampered runtime without network.
- `node tests/voice-stats-client.test.cjs` — consent gating (nothing sent/created while off, nothing on switch-on, offline drop), redaction, record building, hashed household, opt-out + retry.
- `node tests/voice-stats.test.mjs` — validation, server redaction, audio refusal, same-origin, device/day/IP rate limits, opt-out deletion, retention, owner-only + audited Studio views/export, aggregation numbers.
- `node tests/voice-local-browser.test.cjs` (Chromium, real worker + fake engine, stub mic, synthetic pack files routed) — settings at 375×812 / 820×1100 / 1280×800 VI-light and EN-dark, plus 375 VI-dark and EN-light; no horizontal overflow, nothing outside the viewport, touch targets ≥ 44 px, no hosting vendor named; download with progress; recognition fills the textarea with no request to model hosts; EN toggle → English hint; **offline** recognition from cache; consent off → nothing sent; on → one redacted record (member name and phone removed); opt-out → forget request + token removed; remove pack → browser recogniser again; unsupported device → reason + fallback. Studio panel at 320×740, 375×812, 820×1100, 1280×800 (VI light, EN dark, VI dark desktop): nav link + aria-current, no overflow, ≥ 44 px controls, export downloads valid JSON, hash navigation keeps Studio/Scout panels consistent, every view audited.
- Reduced motion: the new UI has no animation; the browser suite runs with `reducedMotion: 'reduce'`.

Screenshots (this folder): `settings-{vi,en}-{light,dark}-{mobile,tablet,desktop}-*.png`, `settings-vi-light-mobile-downloaded-375x812.png` (after the synthetic download — the sizes shown there are the synthetic test files, "0 MB"), `settings-en-light-mobile-unsupported-375x812.png`, `sheet-local-listening-en-vi-light-375x812.png`, `studio-voice-*.png`.

### Real-model smoke benchmark (sandbox, not a phone)
`npm run bench:voice-local -- --pack base|small --wav <8 s synthetic tone>` in headless Chromium 153 on a 4-thread Linux sandbox (single-threaded WASM, not cross-origin isolated). The real pinned files downloaded and **passed every size/SHA-256 check**; the real transformers.js pipeline ran inside the worker from cache, and the script logged **no network request during recognition** (library, runtime and weights all served from Cache Storage):

| Pack | download | first 8 s clip (incl. warm-up) | real-time factor | 5 s of silence (warm) |
|---|---|---|---|---|
| Nhẹ (base q8) | ~7 s on the sandbox link | 11.0 s | 1.37 | 6.2 s |
| Chính xác hơn (small q8) | ~13 s | 29.0 s | 3.62 | 21.9 s |

The test audio was a tone, so these say nothing about accuracy (base heard "Đi"; small hallucinated the "Hãy subscribe…" outro, which the filter removed). Expect phones to be slower than this sandbox. With these numbers, partial results appear only every few seconds and a sentence finishes a few seconds after the pause — acceptable for "Nhẹ" on laptops and recent phones, too slow for "Chính xác hơn" on phones.

## 6. How Henry can measure on his devices (opt-in, manual)

- **Laptop/desktop:** `npm run build && node scripts/voice-bench.cjs --pack base --wav my-voice.wav --lang vi --runs 3` (16-bit WAV; record 10–20 s of a normal shopping sentence mixing Vietnamese and English). Without a WAV: `--headed --seconds 8` and speak. Results: download time, warm-up, transcription ms, real-time factor, text.
- **Phone/tablet:** open the app → voice sheet → Cài đặt giọng nói → Tải "Nhẹ" (on Wi-Fi) → connect the phone to a computer's web inspector (Safari Web Inspector for iPhone, `chrome://inspect` for Android) → in the console run `await voiceLocalBenchmark('base',{seconds:8})` and speak. Compare `text` with what was said; repeat with the browser recogniser for a side-by-side.

## 7. Limits and open items

- Browser viewport simulation only — no physical phone, tablet or iOS Safari was tested. iOS behaviour above comes from platform documentation, not a device run.
- Real-model runs used a synthetic tone; Vietnamese/English accuracy is **not measured** yet (§6).
- Single-threaded WASM (no cross-origin isolation) — decision for Henry.
- R's `registerVoiceRecognizer` and T's `registerOfflinePack` were not available on `v16-base`; the integration is exercised with stubs only. The exact `status()` value shape (`'ready'|'partial'|'none'`) and `onResult(text, final)` signature should be confirmed when merging.
- The statistics read path scans up to 20,000 records per Studio view (fine for family scale; would need daily roll-ups at larger scale).
- GitHub CI has not run on this branch (not pushed, by instruction).
