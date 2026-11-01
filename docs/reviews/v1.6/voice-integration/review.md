# v1.6 integration (Agent V): voice reconciliation, Vietlish, spoken lists, CI failures, startup modal

Branch `agent-v/integration`, built from local `v16-int` and with `v16-int` merged in again up to b6d7f0b. It has not been pushed, merged or deployed, and this is **not** deploy approval (AGENTS.md rules 1–5, 10, 18). GitHub CI on the PR head is still the release evidence (rules 15–17). The local runs below are supporting evidence only.

The voice design is recorded in `docs/reviews/v1.6/voice/review.md`, section "v1.6 integration (Agent V)".

## Root causes

### `voice-local-browser` (failed on v16-int and in CI run 41290420393 at line 161)
There were three integration faults, all from the R + U merge:
1. **Load order.** `voice-local.js` loads before `voice-commands.js`, so `registerVoiceRecognizer` did not exist yet. The on-device recogniser never registered with R's registry.
2. **Two selection keys.** U stored its choice in `bep-voice-local`. R's selector reads `bep-voice-recognizer`. Downloading a pack therefore never changed what the sheet used.
3. **Callback shape mismatch.**
   - U calls `onResult(text, final:boolean)`.
   - R's adapter read `info.isFinal !== false` from that boolean, which treated every partial as final.
   - R's `stop()` also ended the session before U had flushed the last words.

**Fixes:**
- R announces the registry with a `bep-voice-registry` event, and U registers when it hears it.
- There is one key (`bep-voice-recognizer`), and the old key is migrated once.
- U is adapted to `{isFinal}`, and R also accepts a boolean.
- A recogniser can set `flushOnStop` / `abort`.
- Only packs that are downloaded **and** usable on the device are registered.

**Second failure in the same suite (Studio part).** Since the v1.5 Studio panel registry (`window.studioPages`), Studio builds its nav once at boot. Scout registers afterwards, so `#nav a[href="#scout"]` was missing.
- Studio now rebuilds the nav when the page set changes.
- The Studio voice panel registers as a normal page, like Scout, instead of adding its own nav link.
- **Test expectation changed:** voice and Scout now render inside `#main` instead of hiding it.

### `scout-studio-browser` (CI)
- **Missing nav link.** Same root cause as the Studio part above.
- **Overview "loaded behind the Scout page".** The v1.5 speed-up quietly prefetches the overview *after* the first page has rendered. The assertion now checks the order of the requests (the overview never comes before the Scout page's own data) instead of "never requested". The guarantee it tests is unchanged: Studio does not render the overview first.

### `scout-pair-browser` (CI: "countdown ticks", `'14:58' === '14:58'`)
- **Test timing.** The test read the countdown, slept a fixed 1200 ms and expected a change. On a slow runner the 1 s interval had not fired in that window. It now waits up to 5 s for the next tick, and still asserts that the countdown changes.
- **Code fix.** The tick now updates every countdown span instead of only the first `.scout-pair-card` in the document.

### `offline-downloads-browser` (CI)
- T's Downloads screen showed a "Offline voice — coming soon" placeholder, and U's two packs were appended at the end, so both appeared.
- U's packs now take the voice slot and the placeholder shows only when no voice pack is registered.
- U's `status()` now returns T's shape `{state, have, total}` (`'ready'|'partial'|'none'|'unavailable'`), and T also accepts a bare string.
- `download(onProgress(done,total), signal)` is mapped to U's fraction-based progress.
- The labels are localised functions. The CI `test:browser` failure "untranslated Vietnamese in Other settings: Nhận giọng nói trên máy · Nhẹ" came from U's labels being computed once at load.

### kitchen-hub "a modal was blocking the avatar click" (~1 in 18 runs)
- **How it was found.** An instrumented copy logged every modal. In 1 of 18 (and 1 of 6 under parallel load) runs, the blocking modal was **"Bếp này chưa thiết lập"** (the new-kitchen setup prompt).
- **Cause.** `personal-ui.js` opened it on its own when `initialCloudCheck` resolved. That can be about 1 s after first paint, which is later than the test's `ready()` (content + 300 ms). It then landed over the header and swallowed the next tap.
- **Fix (app, not test).** No modal opens unprompted at startup. A new family kitchen gets an inline, dismissible notice at the top of the page instead ("Bếp này chưa thiết lập — Bắt đầu / Để sau", touch targets ≥ 44 px).
- **Regression check.** Section 5 of kitchen-hub now waits for that notice (a real condition) and asserts that no modal is open.
- **Side effect in `startup.test`.** This test passed only because that startup modal satisfied `waitForSelector('.modal')`. Its mock `families` response disagreed with its `status` response (no household), so opening My kitchen reloaded to `?connect=1`. The mock now returns the same household as `status`. The assertion is unchanged.
- **Async waits.** No `waitForFunction(async …)` was found in the suites touched (Playwright 1.64 returns immediately on those).

## Other integration work
- **Recipe dictation and voice prices (S)** use `VoiceAPI.recognizerClass()` / `recognizerOffline()`. S's guessed `registerVoiceRecognizer(rec, …)` call, which always threw, is removed. S also stops R's confirm window before taking the mic.
- **The VI/EN override** for these sheets sits in a collapsed "Cài đặt giọng nói · Tự động" panel.
- **My kitchen** still has exactly four cards (kitchen-hub asserts this).
- **Price Scout** still has one "🎙 Nói giá" in the capture row, plus one per wanted item, as designed by S.
- **The voice sheet** has one settings panel; the test asserts there is no second block and no second recogniser chooser.

## Responsive QA (this folder)
- **Method.** Chromium viewport simulation with reduced motion and a mocked recogniser. It does **not** test physical devices.
- **Sizes.** 375×812 and 820×1100 / 1280×800, each in VI light and EN dark, plus 320×740 VI light.
- **Screens.** Each size has:
  - `sheet-auto-*`: Auto mode, no language prompt, the mode chip
  - `settings-*`: the one panel with language, on-device packs, consent and the shared options
  - `preview-did-you-mean-*`: the owner's 10-item list giving 10 lines and two "Có phải / Did you mean" buttons
  - `price-sheet-auto-*`
  - `downloads-voice-*`: the voice packs in Downloads for offline use
- **Checks at every size:** no horizontal overflow, nothing clipped past the viewport, the listed controls are ≥ 44 px, and no hosting vendor is named.

## Local runs (supporting evidence only)
- **Pass:** `npm run build`, `node scripts/check.cjs`, `npm run typecheck`, and `npm test` (all unit suites, including the new `voice-vietlish`).
- **Browser suites, pass:**
  - startup, artwork, price-scout, catalog, catalog-filters, community, platform-banner
  - voice, voice-price, voice-commands, units, studio-speed
  - scout-studio, scout-pair, voice-local, offline-downloads, app-update
  - `test:scout`, `test:scout:browser`
- **kitchen-hub:** 16/16 consecutive passes after the fix, and a further final batch of 16 on the final build (see the report).
- **`authenticated-startup`** cannot run in this sandbox: Node-side requests fail with `ENOTFOUND kitchen.localhost`, a known sandbox DNS limit. CI adds the hosts entry.

## Limits
- **Recognisers.** The recognisers are mocked. Real accents, real Vietlish speech and the vi-VN engine's actual spellings of English words were not measured, so the Vietlish lexicon spellings are educated guesses.
- **Pack sizes.** The Downloads screen shows pack sizes in binary MB (for example 102 MB for "Nhẹ" including the runtime). The voice sheet shows decimal MB (79,7 MB + 27,5 MB runtime). The bytes are the same; the display units differ.
