# v1.5 voice input review

Branch `agent-c/voice-smart` (from 8d7a7a7). This is preview-build work. It does not authorise a deploy.

## What changed
- **Parser** (`src/frontend/personal-core.ts`, `parseVoiceInput`): the parser was rewritten. It now works on accented tokens before falling back to accent-stripped matching:
  - `bó` (bunch), `bò` (beef) and `bơ` (avocado) are kept apart. So are `còn` (a separator) and `con` (a unit), and `muỗng` (spoon) and `muống`.
  - Filler words are stripped as whole words, in Vietnamese and English. Examples: ờ/à/thì/nha/nhé, cho mẹ, giùm, um/like/please, can you get. Pronouns are stripped when a verb follows them ("mai con mua", "ba ơi").
  - Clauses are split on với/và/rồi/còn/thêm/à/and/also/then and on punctuation. They are also split before a meal verb or time word, and between quantities said with no separator.
  - Time words attach to their own clause. nay/tonight/today is the household's real "today". The open planner day is used only when no time word is said. Weekdays never land in the past.
  - Vietnamese numbers: mươi, mốt, tư, lăm/nhăm, linh/lẻ, trăm, nghìn/ngàn, rưỡi, nửa, chục, tá, "N ký M" = N.M kg, "N lạng" = N×100 g, "một phẩy năm". English numbers: one…ninety-nine, hundred, half (a), a/an, couple, dozen, "point five", "and a half". Decimals can use a comma or a dot.
  - Units: kg, g/gam/gờ ram, lạng, lít/l, ml, bó, con, quả/trái, cái, hộp/box/pack, gói, khay, chai, lon/can (only after a number), túi, vỉ, củ, nắm, and others. A number with no unit becomes a count only when it sits next to a countable item.
  - Self-corrections work ("à không / à nhầm / mà thôi / no wait / actually make that"), and so does cancelling an item ("à thôi khỏi / never mind").
  - Fragments split by pauses are joined back together ("một ký… ờ… khoai tây").
  - Stutters are collapsed. Repeats of the same item are merged, keeping the line that has a quantity. Lines with different amounts are kept and flagged as duplicates.
  - The old relabelling step that wrote mismatched raw text over labels was removed.
  - Unknown amounts (mấy, vài, a few, or a measure word the parser doesn't know) stay `null` and are flagged.
- **Recognition UI** (`src/frontend/personal-ui.ts`, voice lines only):
  - Alternatives are scored with Unicode-aware word boundaries.
  - Duplicate finals from Android Chrome are merged.
  - After a final result, a pause of 2.5 s (4 s in "Nói chậm" mode, remembered on this device) stops listening and opens the preview. Listening is capped at 5 minutes.
  - There is a large Stop button, the transcript is shown in large text, and the status reads "Đang nghe… / Đã dừng / Mic đang tạm dừng".
  - If the microphone can't restart (iOS without a tap, permission error, too many restarts), a visible "Bấm Nói tiếp" button appears and the words heard so far are kept.
  - A session token stops a stale `onend` from an aborted recogniser from starting a new session. Closing the dialog stops the microphone.
  - Typing and phone-keyboard dictation still work. No audio is stored. State only changes on confirmation, and undo still works.
- **CSS**: one block appended to `dist/styles.css`, between `v1.5 voice start` and `v1.5 voice end`. The listening dot follows `prefers-reduced-motion`. Controls are at least 48 px tall and the Stop and Continue buttons are 56 px tall.

## Verification
- `npm run build && npm run check && npm test` all pass. The new `tests/voice.test.cjs` has 43 checks: every utterance from the investigation, 15 long elderly-style utterances in Vietnamese and English, number and unit coverage, dates, never-invent cases, the alternative picker, Android final merging, and a check that parsing doesn't change state. All existing assertions in `personal.test.cts` pass unchanged.
- Chromium 1243 under Playwright, with a mocked `SpeechRecognition` and reduced motion turned on:
  - At each size and in both languages, the script checked the listening state, Stop button visibility and its 44 px minimum height, and horizontal overflow.
  - It sent Android-style cumulative duplicate finals, then 2.9 s of silence. The preview opened automatically with the right lines and today's dinner.
  - It simulated a restart failure: the dialog went to the "Mic đang tạm dừng" state with the "Bấm Nói tiếp" button, and the text was kept.
  - It checked that Stop works and that slow mode gives 4000 ms.
  - It checked for no overflow at 320×740.
  - There were no page errors.

| Screen | 375×812 | 820×1100 | 1280×800 |
|---|---|---|---|
| Listening VI | listening-vi-mobile.png | listening-vi-tablet.png | listening-vi-desktop.png |
| Listening EN | listening-en-mobile.png | listening-en-tablet.png | listening-en-desktop.png |
| Preview VI | preview-vi-mobile.png (+ preview-vi-mobile-dark.png) | preview-vi-tablet.png | preview-vi-desktop.png |
| Preview EN | preview-en-mobile.png | preview-en-tablet.png | preview-en-desktop.png |
| Restart blocked / narrow phone | restart-blocked-vi-mobile.png, stopped-vi-320.png | | |

## Limits
- Browser viewport simulation and mocked speech events only. This was not tested on physical iOS or Android hardware or against real recogniser output.
- Real-world recognition quality for elderly voices depends on the browser's speech service.
- The ingredient catalogue has no avocado or butter entry, so "bơ" stays as free text. Catalogue aliases were not changed.
- The preview fills in one dish draft. Other dishes that were heard are listed as "Cũng nghe thấy". `mealDrafts` carries all of them for a future multi-dish UI.
- The auto-preview after a pause can't be turned off. Slow mode lengthens the wait to 4 s.
