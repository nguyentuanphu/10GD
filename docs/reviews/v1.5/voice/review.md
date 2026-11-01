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

---

## Follow-up: bilingual voice input (v1.5, agent N, branch `agent-n/bilingual-voice`)

Owner report (Henry, preview): “Voice input is still not smart when I select English: it picks up Vietnamese. It should pick up BOTH languages and give results in the SELECTED language.”

### Root cause (exact)

1. **Spoken-language choice was ignored mid-session and not remembered.** The sheet had a small `<select id="voice-language">` that `startVoiceMic()` read only when a recogniser launched. The mic starts automatically as soon as the sheet opens, in the UI language (Vietnamese UI → `vi-VN`). Picking “English” in the select had no change handler and did not restart recognition, so the running `vi-VN` session kept producing Vietnamese text. Reopening the sheet or “Edit transcript” reset the select to the UI language. (With the app UI in English, recognition already started as `en-AU`.)
2. **Results were always Vietnamese.** The preview filled every recognised line with `INGREDIENTS[id][0]` (the Vietnamese catalog name) and the stored units (`bó`, `quả`, `hộp`…). The English UI translator (`applyLanguage` in language.ts) deliberately skips `<input>` values, so in English “two kilos of pork belly” was shown as “Thịt heo · 2 · kg”. Recipe choices showed the Vietnamese recipe name.
3. **Parser gaps found while checking thoroughly:** “half a dozen”, “three quarters of a kilo”, “a head of lettuce”, “two stalks of lemongrass”, “an onion” lost their amounts; “on Monday cook …” left a stray “on” shopping line; “spaghetti tối nay” became a shopping line instead of tonight’s dish; an unaccented decimal at the start (“2.5 kg chicken”) lost its quantity; “bean sprouts” matched green beans and “coconut milk” matched coconut water; “a bunch of cilantro, a bunch of Vietnamese mint” collapsed into one line.

### Design

- **Recognition language** (`personal-ui.ts`, voice lines only): default = UI language (EN → `en-AU`, VI → `vi-VN`). The sheet shows a large two-way toggle “🎙 Tiếng Việt | English” (`aria-pressed`, ≥48 px, language names never translated) near the top. Tapping it switches immediately; if listening, the old recogniser is aborted and a new one starts, keeping every word already heard. The manual choice is remembered on this device (`bep-voice-lang`, `bep-voice-auto=0`). “Tự động / Auto” (default on) follows the UI language and may *suggest* a switch.
- **Auto suggestion, never a silent switch** (`voiceLanguageHint` in personal-core.ts): suggests the other language when the transcript’s vocabulary fits it better (Vietnamese diacritics or plain Vietnamese words under English recognition; English unit/number/food words under Vietnamese recognition) and nothing recognisable parsed, or when the recogniser’s confidence is < 0.5 and no item was recognised. Mixed speech that already parses (“2 kg pork belly với một bó rau muống”) is left alone. One tap “Chuyển sang … / Switch to …” or “Giữ nguyên / Keep”.
- **Bilingual parser regardless of recognition language:** one curated VI/EN list (`VOICE_LEXICON`) maps spoken names in both languages to *existing* catalog ingredients only (pork belly/thịt ba chỉ, water spinach/morning glory/rau muống, bok choy, beef mince, chicken thigh/breast/wings, prawns/shrimp, fish sauce, jasmine rice, eggs, tofu, spring onion/scallion, coriander/cilantro, Vietnamese mint, Thai basil, lemongrass, lime, garlic, onion, tomato, …). Bean sprouts, chilli and coconut milk have no catalog ingredient, so they are blocked from wrong matches and kept exactly as said. Alternatives (`maxAlternatives: 5`) are scored with both vocabularies; the chosen alternative’s confidence feeds the suggestion.
- **English depth:** one…ninety-nine, hundred(s), “and”, a/an (+ unit or countable food), couple, dozen, half a dozen, half, quarter(s) (“three quarters of a kilo”), “one and a half”, “two point five”, digits with “.” or “,”; fillers (um, uh, like, you know, please, can/could you, I/we need, get me, grab, also, and then, maybe, on, this, next); corrections (no wait, actually make that, make it, change that to, I meant, scratch that); time (tonight, tomorrow, this weekend, Monday…Sunday, for breakfast/lunch/dinner).
- **Units, both languages, only after a number, never converted** (owner addendum): chai/bottle, lọ/jar, hũ/pot/tub, lon/can, thùng/case/carton, két/crate, bao/sack, bình/jug, can/jerrycan, ống·tuýp/tube, viên/tablet, cuộn/roll, vỉ/card, khay/tray, túi/bag, gói/pack/packet, hộp/box, bó/bunch, nắm/handful (flagged approximate), cây/stalk, củ/bulb, tép/clove, nhánh/knob/sprig, bắp/head/cob, lạng (=100 g), chục (10), tá/dozen (12). Pounds/ounces are kept as `lb`/`oz` and flagged — no conversion. `TODO`: switch to the shared unit registry (`src/frontend/unit-registry.ts`) when it lands.
- **Results in the selected UI language** (`voiceItemView`): known lines show the UI-language name and unit (EN “Pork belly · 2 · kg”, “Water spinach · 1 · bunch”; VI “Thịt ba chỉ · 2 · kg”, “Rau muống · 1 · bó”). When the shown name differs from the words heard, a small “Nghe được / Heard: “…”” line keeps it honest. Unknown words are shown exactly as said — never machine-translated. Dish choices use the library recipe’s English title in English; family-authored recipe names stay as written. The dish date/meal line uses the UI language.
- **Storage:** a confirmed known line is stored under the catalog Vietnamese name with its ingredient id (and `nameEn`), units in the app’s usual Vietnamese form; the English UI renders it in English, so switching UI language later re-renders the list. A line the family edited is stored exactly as typed. No audio is stored or sent anywhere new — still the browser’s own recognition only.

### Verification (browser viewport simulation, Chromium 1243 headless; not physical devices)

- `src/tests/voice.test.cts`: 60 checks (43 existing unchanged + 17 new): EN UI/en-AU → English labels; VI UI/vi-VN → Vietnamese labels; mixed utterances in both modes; same utterance in either language → same ingredient ids; parser output independent of UI language; English numbers; every unit above in VI and EN; lb/oz and handful flags; low-confidence/wrong-language suggestion; unknown items verbatim; no invented quantities; canonical storage + edited lines verbatim; bilingual alternative scoring; recipe titles.
- `src/tests/voice-browser.test.cts` (new, added to `test:all`) with a mocked `SpeechRecognition`: EN UI starts `en-AU`; VI UI starts `vi-VN`; toggle aborts and restarts as `vi-VN` keeping the heard text; choice remembered; Auto re-tick returns to UI language; suggestion appears without switching and one tap switches (Auto stays on); EN and VI previews show UI-language labels; confirmed lines show “Pork belly” in English and “Thịt ba chỉ” in Vietnamese after `changeAppLanguage`; offline shows the type/keyboard-dictation message and starts nothing. Each size checks no horizontal overflow, toggle labels not clipped, toggle/Auto/suggestion/mic buttons ≥ 44 px; reduced-motion context.
- Screenshots (25): `sheet-{vi,en}-{light,dark}-{mobile,tablet,desktop}.png`, `preview-…` for the same 12 combinations (375×812, 820×1100, 1280×800), and `hint-en-light-mobile.png`.
- `npm run test:all` passed locally in the sandbox (supporting evidence only; GitHub CI on the PR head is still required — AGENTS.md rule 15).

### Limits

- Browsers recognise **one language per session**; switching restarts recognition. Mixed speech works best when the recogniser language matches most of what is said; the bilingual parser then understands the other language’s words that the recogniser writes out.
- iOS Safari: Web Speech availability and continuous listening vary by version, recognition may require a network connection and Siri/dictation enabled, and sessions stop after short silences (the sheet restarts up to 3 times, then asks to tap “Keep talking”). Keyboard dictation and typing remain the fallback. Not tested on physical iOS/Android hardware.
- The shopping list’s quantity text for voice extras (e.g. “1 bó”) still uses the stored Vietnamese unit in English (existing behaviour for all extras, outside this change).
- Some library recipes have no English title yet; they show their Vietnamese name in English.
- No deploy approval is implied (AGENTS.md rules 1–5, 10).
