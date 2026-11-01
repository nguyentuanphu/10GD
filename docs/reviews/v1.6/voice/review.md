# v1.6 voice: commands, read-back, learned words, mic meter, push-to-talk

Branch `agent-r/voice-commands` (from local `v16-base`). Not pushed, not merged, not deployed. Local test runs are supporting evidence only; GitHub CI on the PR head commit is still required (AGENTS.md rules 14–17). Responsive QA is not deploy approval.

## What changed

| Area | Files |
| --- | --- |
| Command parser, questions, answers, recogniser registry, cards UI, read-back, confirmation window, meter, push-to-talk | `src/frontend/voice-commands.ts` (new; loaded after `personal-ui.js`) |
| Regional synonyms, learned corrections, `VoiceAPI` base | `src/frontend/voice-learning.ts` (new; loaded after `personal-core.js`) |
| Lexicon: cá quả, hành hoa, mướp/mướp hương, mì/mỳ, khoai mì/sắn (no longer read as potato) | `src/frontend/personal-core.ts` |
| Three guarded hooks: pluggable recogniser class, offline-capable recogniser, no auto-start in push-to-talk | `src/frontend/personal-ui.ts` (voice lines only) |
| Script order (two entries) | `src/frontend/bootstrap.ts` |
| Styles | `dist/styles.css`, appended block `v1.6 voice-commands` |
| Tests | `src/tests/voice-commands.test.cts` (in `npm test`), `src/tests/voice-commands-browser.test.cts` (`npm run test:voice-commands:browser`, in `test:all`) |

### Commands (VI/EN)
Each part of an utterance (split at `, . ; ? !` and before a command word after và/rồi/and/then) gets one intent. The first match wins:

1. **Question**, answered in the sheet with no changes:
   - "hôm nay nấu gì / tối mai ăn gì / what's for dinner"
   - "còn thiếu gì / what do I still need". This uses the current shopping range: unbought rows plus extra items.
   - "rau muống ở đâu rẻ nhất / where is water spinach cheapest". This uses Price Scout observations (`scoutObservations()` with `PriceScout.bestPrice`) and compares unit prices across stores. When there is no data it says "Chưa có giá… / No price yet…".
2. **Urgent message**: "nhắn cả nhà …", "tell everyone to …". Confirming opens the existing urgent form with the message filled in. Sending still needs the **Send** tap.
3. **Attendance**: "tối nay anh Phú không ăn", "mai bé Na đi vắng" (the whole day), "Phu won't be home for dinner tonight". "có ăn" clears the entry. This writes `setAvailability(…,{status:'away',deduct:true,…})`.
   - Member names are fuzzy-matched. Honorifics are ignored, accents break ties, and a one-letter slip still matches.
   - When there is a tie or no name, the card asks the user to choose a person. Confirming is blocked until they do.
   - "Na không ăn hành" is treated as a food preference, not attendance.
4. **Pantry count**: "tủ còn hai hộp trứng", "we have 6 eggs left", "hết trứng rồi".
   - The new count replaces that ingredient's lots.
   - A unit other than the base unit, such as hộp, is kept as a purchase record with `basePerUnit:null`, unless the family set a conversion earlier. The egg count is never invented.
   - If no amount is heard, the field stays empty and must be filled.
5. **Mark bought**: "đánh dấu đã mua trứng", "mark eggs bought".
6. **Remove**: "xoá hành lá", "không cần mua … nữa", "remove … from the list". Lines calculated from the menu are skipped; extra lines are deleted. Removal is destructive.
7. **Change a planned meal**: "tối thứ Ba đổi thành phở bò", "change Tuesday dinner to beef pho", "trưa mai nấu … thay".
   - A time is required.
   - The user can replace or add to the meal.
   - Cooked or locked meals are refused.
   - A dish that matches nothing can be quick-created with no ingredients. No amounts are invented.
8. Anything else goes to the v1.5 add-items/dish parser. **With no command at all, the original text reaches the v1.5 parser unchanged**, so the old preview appears exactly as before.

When one utterance holds several intents, the user sees several cards, each with its own include checkbox. **Confirm** checks every card first and only then changes anything. If any step fails, the whole state is rolled back. One **Undo voice commands** button reverts the batch. A meal changed after the batch is kept as it is.

### Read-back and voice confirmation
- **Đọc lại kết quả / Read results aloud** (off by default) speaks the summary with `speechSynthesis` in the UI language. It picks a `vi-VN` or `en-AU` voice.
- If the device has no voice for that language, it falls back to text only and shows a note. The summary text is always shown.
- After reading back, a short listening window opens (7 s by default; `VoiceAPI.listenWindowMs`):
  - "đồng ý / ok / yes / xác nhận" confirms.
  - "sửa / không / no / edit" keeps editing and focuses the first field.
  - When the window times out, **nothing is confirmed**.
  - Typing in the preview stops the window.
- Destructive cards (remove, urgent) need a tap or an explicit spoken yes. Urgent messages always need the Send tap as well.

### Regional synonyms and learned corrections
- Words are folded for matching only: lợn→heo, ngô→bắp, dứa/khóm→thơm, lạc→đậu phộng, mỳ→mì, rau mùi/ngò rí→ngò, hành hoa→hành lá, mướp hương→mướp, bí đao→bí xanh, sắn→khoai mì, cá quả→cá lóc, đậu phụ→đậu hũ, dưa chuột→dưa leo, súp lơ→bông cải, vừng→mè, and a few more.
- Some words are protected from folding: lá dứa, bí ngô, sắn dây, bánh mì and similar.
- quả/trái are units and stay with the unit parser.
- Family recipes named with the other region's word are found, for example "canh bí xanh" finds the family recipe "Canh bí đao tôm".
- **Learned corrections**: when someone changes **Hiểu là / Means** on a preview line, or picks a different dish, the app stores `phrase → id` in `state.voiceLearned`.
  - The stored phrase is normalised and regionally folded.
  - Learned words are applied **before** generic matching.
  - Each entry has the shape `{p, k:'i'|'r', id, w?, at, by?}`. The list is newest first, holds at most 300 entries, and keeps one entry per phrase.
  - It syncs with the family state in account mode. For guests it is device-only, because guest state is local.
  - Viewers cannot teach new words.
  - The list can be managed under **Cài đặt giọng nói & từ đã học → Từ đã học** in the voice sheet, with Delete buttons.
- Validation:
  - `validImport` rejects a malformed list and accepts a missing one.
  - Unknown future `k` values are kept but ignored.
  - **The released main client's `validImport` (0bcef70 fixture) accepts a state that contains `voiceLearned`** (tested).

### Mic meter, noise hint, push-to-talk
- **Mic meter**: `getUserMedia` with a Web Audio `AnalyserNode` runs only while listening. The stream tracks are stopped and the `AudioContext` is closed on stop, close or preview (tested).
  - Under reduced motion it updates 4×/s with no transition.
  - It is on by default, except on iOS.
- **"Ồn quá — nói gần máy hơn"** appears after sustained loud input with no new words. "Chưa nghe thấy tiếng…" appears after sustained silence.
- **Push-to-talk** (setting):
  - The big button becomes **Giữ để nói / Hold to talk**. Holding with a pointer, or holding Space/Enter, listens; releasing stops.
  - The microphone does not start when the sheet opens.
  - The button stays visible and focused, and silence auto-preview is suspended while holding.
  - Uses `touch-action:none` and no callout.
- **iOS note** (shown in the settings on iPhone/iPad):
  - Safari may refuse the meter while recognition runs, so the meter defaults to off there.
  - Push-to-talk needs the finger to stay on the button.
  - Keyboard dictation remains the fallback.
  - Not verified on hardware.

## `VoiceAPI` (global, for Agent S "Nói giá" / recipe dictation and Agent U on-device recogniser)
Names below are stable. New names will be added; existing ones will not be renamed. `parseVoiceInput(text, s, baseDate, today)` keeps its v1.5 signature.

```js
VoiceAPI.parseVoiceInput(text, state, baseDate?, today?) // v1.5 items/dish draft (+ learned & regional)
VoiceAPI.parseCommands(text, state, {baseDate, today})   // {cards, restText, rest}
VoiceAPI.detectIntent(part, state, {baseDate, today})    // one card or null
VoiceAPI.cmdTime(text, baseDate, today)                  // {date, type, hasDay, hasType, rest}
VoiceAPI.matchMember(state, phrase)                      // {member|null, candidates, score}
VoiceAPI.confirmWord(text)                               // 'yes' | 'no' | null
VoiceAPI.regionalCanon(text) / regionalVariants(word) / REGIONAL / REGIONAL_UNITS
VoiceAPI.learn(state, 'i'|'r', phrase, id, {by}) / forget(state, k, phrase) / lookupLearned(state, k, phrase) / learnedList(state) / LEARNED_CAP
VoiceAPI.answerMeals(state, date, type|null, today, lang) / answerMissing(lines, lang) / cheapest({ingredient,label}, {catalog, observations, PS, today, lang, money})
VoiceAPI.ingredientName(id, lang) / itemView(item, lang) / recipeTitle(recipe, lang) / cardSummary(card, lang, state)
VoiceAPI.speak(text, onDone?)           // UI-language read-back; onDone(spoken:boolean)
VoiceAPI.listenForConfirm() / stopListening()   // the short "đồng ý / sửa" window for the open preview ([data-vc-confirm] is clicked on yes)
VoiceAPI.meterTiming, VoiceAPI.listenWindowMs   // tunables
// Recogniser plug-in (no edits to voice files needed):
registerVoiceRecognizer({id, label, start(lang, onResult(text,{isFinal,confidence}), onEnd), stop(), offline?}) // returns unregister()
VoiceAPI.recognizers() / activeRecognizer() / recognizerClass()
```
The built-in `browser` recogniser (SpeechRecognition) is the default. When another recogniser is registered, a **Bộ nhận diện giọng nói** selector appears in the sheet settings; the choice is stored per device in `bep-voice-recognizer`. A recogniser registered with `offline:true` may start while the device is offline.

## Verification (local, supporting evidence only)
- `npm run check`: pass. `npm run typecheck`: pass. `npm test` (whole unit chain, including the new suite): pass.
- `node tests/voice-commands.test.cjs`: 20 groups pass. They cover:
  - every intent in VI and EN, precedence, and a five-intent sentence plus remaining shopping lines
  - ambiguity: Phú/Phụ typed without accents gives two candidates; no name means the user must choose
  - fuzzy member names, and "Mai" read as a name, not "tomorrow"
  - "sang" (to) vs "sáng" (morning), "tôi" (I) vs "tối" (evening)
  - pantry and urgent messages never invent amounts
  - 12 regional pairs, protected words, and regional dish matching
  - learned ingredient and dish corrections applied first, the 300 cap, one entry per phrase, validation, and old-client tolerance
  - confirmation words, the three answers (Price Scout cheapest with a stale price ignored, and no-price text), the recogniser registry, and that parsing never changes state
- `npm run test:voice-commands:browser` (Chromium with mocked recognition, synthesis, getUserMedia and AudioContext): pass. It covers:
  - VI: three cards, read back with a vi-VN voice, spoken "đồng ý" confirms, attendance and pantry written, undo restores
  - EN: "no" keeps editing; a timed-out window does **not** remove anything; the tap confirms; undo restores; "6 eggs" is stored as 6
  - text-only fallback when the device has no matching voice
  - learned correction through **Means**, reused for the regional variant, then deleted in settings
  - push-to-talk with pointer and keyboard (no auto-start; focus kept); meter level, noise hint, stream and context released
  - an on-device recogniser plugged in from outside works offline
  - layout checks at every size: no horizontal overflow on the page or in the modal; touch targets ≥ 44 px for card toggles, row checkboxes, the Means select, settings options, Delete, the summary, the confirm strip and footer buttons
- Existing suites rerun locally: `voice.test`, `personal.test`, `core.test`, `catalog-fixes.test`, `units-registry.test`, `family-menu.test`, `npm run test:browser` (startup + kitchen hub), and `test:voice:browser` (v1.5) all pass.

### Screenshots (browser viewport simulation, not physical devices)
- Command cards: `cards-{vi,en}-{light,dark}-{mobile 375×812, tablet 820×1100, desktop 1280×800}.png` (12 files).
- Voice sheet with the meter: `sheet-{vi,en}-{light,dark}-{mobile,desktop}.png` (8 files).
- Listening for confirmation: `confirm-listening-vi-light-mobile.png`.
- Push-to-talk held, with the meter and noise hint: `ptt-meter-noisy-vi-light-mobile.png`.
- Learned-words list: `settings-learned-vi-light-mobile.png`.

## Limits and open points
- Speech recognition, synthesis and the microphone are mocked. Real recognition quality, real voices (whether a vi-VN voice is installed varies by device) and real noise levels are **not** verified. The noise thresholds are heuristics.
- iOS and Android behaviour was not tested on hardware:
  - On Android Chrome, running getUserMedia alongside SpeechRecognition can make recognition fail. If that happens, turn the meter off in settings.
  - On iOS the meter is off by default.
- The read-back speaks the words as heard ("eggs") rather than the matched list name in a few English cases.
- Amounts of extra items in the "still to buy" answer are shown as stored.
- "Mark bought / remove" act on the currently selected shopping range (`shopDates()`) and the current week.
- An urgent message needs a connected family account; otherwise the existing account sheet opens, as it does for the normal urgent button.
- The 300-entry cap is enforced on write. Validation accepts up to 1000 entries so that a future client with a higher cap is not rejected.
