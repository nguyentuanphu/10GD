# v1.6 — Voice prices (“🎙 Nói giá / Say a price”) and recipe dictation (“Đọc công thức”)

Branch `agent-s/voice-price-recipe` (from `v16-base`). Not merged, not pushed, not deployed. Deploy approval is a separate gate (AGENTS.md rules 1–5, 10). GitHub CI has **not** run on this branch yet, so rule 15 is not met. Only a green `CI` run on the PR head commit counts as release evidence.

## What changed
- **Price Scout**: a new “🎙 Nói giá / Say a price” button in the capture row, plus a 🎙 button on every “Cần săn giá” row, which pre-fills that item. The sheet starts recognition in the UI language and has the same Tiếng Việt | English toggle convention (`bep-voice-lang` / `bep-voice-auto`). The text is editable, so typing also works, including offline.
- **Grammar** (`src/frontend/voice-price.ts`, pure). It handles VI and EN prices in these forms:
  - currency words: đô / đồng / dollar / bucks / cents / xu, and `$` with digits
  - VI shortcuts: “2 rưỡi” = 2.50, “mười bốn chín chín” = 14.99, “ba đô mốt” = 3.10, “mười đô năm mươi một ký” = $10.50/kg
  - pack sizes, only when a number and a unit are said: kg, g, lạng, L, mL, viên, cuộn, pack, quả, “a dozen”, “một chục”
  - per-container prices (bó, hộp, gói…), kept as words only
  - retailers, and “chợ X” / “tiệm X”, which become a Vietnamese grocer with branch X. A branch matches a saved store by name or address; otherwise it is kept in the note.
  - promos: sale, khuyến mãi, 1/2 giá, half price, special buy…
  - was-price (“trước là…”, “was…”, “normally…”) and savings (“save…”)
  - several prices in one utterance, giving several rows. A store said once applies to the rows that have none.
  - items are matched against the catalogue, plus a small per-device learned map (label → item) that is updated when a voice price is saved.
- **Confirm**: each row opens the **existing** Price Scout confirm sheet with `source:'voice'` and evidence `manual-voice`. These prices are family-only: the community box is replaced by a note saying a shelf-tag photo or screenshot is needed to share. `canShareToCommunity` stays false, and the server's community evidence list does not include voice. The `priceSanity` warning still applies. After a row is saved, the sheet comes back with the remaining rows.
- **Recipe dictation** (`src/frontend/voice-recipe.ts`):
  - It appears only in the form for a **new** family recipe.
  - You can take several takes with pause and continue. The recogniser restarts after browser pauses, and the draft is kept on the device until the recipe is saved.
  - Segmentation finds the title, servings, total time, ingredients and numbered steps (split on rồi / sau đó / xong / tiếp theo / cuối cùng / then / next…).
  - Vague amounts (“một ít”, “vừa ăn”, “to taste”, or nothing said) stay **blank** and are flagged “cần điền”. A count with no unit is flagged “cần đơn vị”.
  - A review screen lets you edit everything. A duplicate name shows a warning, and the recipe is still saved as a new one.
  - “Dùng bản này” fills the existing form. Units the app does not store (muỗng canh, củ, tép…) keep the spoken words and are saved under the existing “missing quantity” list, never guessed.
  - The raw transcript is saved on the new recipe and shown in a collapsible “Lời đọc gốc” in the recipe view.

## Files
- **New**: `src/frontend/voice-price.ts`, `src/frontend/voice-recipe.ts`, `src/tests/voice-price.test.cts`, `src/tests/voice-recipe.test.cts`, `src/tests/voice-price-browser.test.cts`.
- **Edited (owned)**:
  - `src/frontend/price-scout-ui.ts`: buttons, voice note in the community fieldset, voice re-read, save hook, 🎙 source icon.
  - `src/frontend/family-menu-ui.ts`: entry button, hidden transcript, dictated lines kept instead of erroring, transcript saved on new recipes only.
  - The CSS block appended to `dist/styles.css`.
- **One-line edits outside ownership**:
  - `src/frontend/bootstrap.ts`: script list.
  - `src/frontend/shopping-optimizer.ts` and `src/netlify/lib/grocery-pricing.mts`: `'voice'` added to SOURCES and `'manual-voice'` added to EVIDENCE, so voice observations validate on the device and the server. Community evidence is unchanged.
- `package.json`: the two unit suites are added to `test`, and the new `test:voice-price:browser` is added to `test:all`.

## Verification (local sandbox — supporting evidence only)
- `npm run check`, `npm run typecheck` and `npm test` (all suites) pass.
- `voice-price.test`: 48 checks. These cover 40+ VI/EN utterances, including the five owner examples, multi-price, retailer/branch/promo/was, “no invented pack”, learned and wanted prefill, and the confirm seed: valid observation, `manual-voice`, not shareable.
- `voice-recipe.test`: 7 realistic recipes (5 VI, including one with no punctuation as recognisers output it, and 2 EN), several takes, and the form-line format.
- `voice-price-browser.test`, with mocked SpeechRecognition, covers:
  - capture → two rows → two confirms → saved as `voice` / `manual-voice`, then the sheet returns
  - sanity warning on an unusual spoken price
  - “Cần săn giá” prefill
  - language toggle restart and remembered choice
  - offline typing
  - dictation with two takes, a browser-pause restart, review, edit, fill the form, save as a new recipe (the existing same-name recipe is byte-identical afterwards), transcript shown
  - a typed recipe offline
  - at every size: overflow, ≥44px targets, clipped labels, visually hidden screen-reader text
- Existing `price-scout-browser`, `voice-browser`, `community-browser`, `startup` and `kitchen-hub` suites still pass. Their regenerated screenshots were not committed.

## Responsive QA
Sizes: mobile 375×812, tablet 820×1100, desktop 1280×800. VI and EN, light and dark, reduced motion. Screenshots in this folder:
- `price-sheet-vi-light-mobile`, `price-sheet-en-dark-tablet`, `price-sheet-vi-dark-desktop`
- `price-confirm-vi-light-mobile`
- `price-offline-en-light-mobile`, `price-offline-vi-dark-mobile`
- `recipe-review-vi-light-mobile`, `recipe-review-en-dark-tablet`, `recipe-review-vi-dark-desktop`
- `recipe-form-vi-light-mobile`

The header and navigation were not changed, so no 320px check was needed.

## Limits
- This is browser viewport simulation with a **mocked** recogniser. It was not tested on physical phones or tablets, or with real speech or accents.
- Real recognition needs a browser that supports it and a connection. Offline, the user types instead.
- Agent R's `VoiceAPI` / `registerVoiceRecognizer` was not available on this base. The wrapper uses `VoiceAPI.getRecognizer()` / `VoiceAPI.Recognizer` if present, announces each live recogniser through `registerVoiceRecognizer(rec,{owner,stop})` if that hook exists, and otherwise falls back to `SpeechRecognition`. This should be re-checked after the merge.
- Item matching uses the 136-item Price Scout catalogue plus learned labels. Unmatched items still open the confirm sheet, with the item left to pick.
- Recipe segmentation is heuristic. The review screen is the safety net, and nothing is saved without it.
