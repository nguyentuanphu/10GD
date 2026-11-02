# v1.7.4 · Dictated recipe while the recipe library is loading

## Bug
On a fresh start the family recipe editor waits for the recipe library before it opens. The wait came from
`offline-downloads.ts`, which wraps `familyRecipeEditor` and returns a promise (v1.7.3). "Dùng bản này" (`vrUse()` in
`src/frontend/voice-recipe.ts`) called the editor and filled `#family-recipe-form` straight away. While the library was
still loading, the form did not exist yet, so nothing was filled. The empty form then opened once the library arrived,
and the dictated name, ingredients and steps were lost. This happens on a slow first library download, and also when the
first download failed (offline or flaky network) and the form was opened anyway.

## Fix
- `vrUse()` reads the dictation first, then waits for the editor's promise and fills the form once the form exists
  (`vrFillForm`).
- While the editor waits, the button is disabled, shows "⏳ Đang tải kho món ăn…" / "Loading the recipe library…" and
  has `aria-busy`. A second tap does nothing.
- After filling, the ingredient rows (recipe-community) are rebuilt from the dictated lines. Amounts and units stay
  exactly as recognised, and a line with no amount stays blank and is saved as missing (rule 6).

## Other entry points checked
- "Thêm nguyên liệu" in the recipe detail (`edit-recipe-ingredients`) already awaited the editor in v1.7.3.
- Editing or copying a library recipe ("Chép thành món nhà", `data-fm="edit-recipe"`, `edit-recipe-from-detail`) only
  opens the editor with an id. The form is rendered from state after the wait, with nothing filled afterwards, so it is
  not affected. This is covered by recipe-ingredients (d) and (f), including the reopen right after a reload.
- Community "Chép thành món nhà" (`rcCopy`) saves the copy directly without the form, and "Chia sẻ" uses its own modal.
  Neither is affected.

## Evidence (browser viewport simulation, Chromium; not physical devices)
`src/tests/voice-price-browser.test.cts` section 8 (`npm run test:voice-price:browser`, part of `test:all`). It
simulates a fresh start where the first library request fails, the form opens, and the retry is held until the test
releases it.

| Size | Language / theme | Loading | Filled | Rows |
|---|---|---|---|---|
| Mobile 375×812 | VI light | mobile-loading-vi-light.jpg | mobile-filled-vi-light.jpg | mobile-filled-rows-vi-light.jpg |
| Tablet 820×1100 | EN dark | tablet-loading-en-dark.jpg | tablet-filled-en-dark.jpg | tablet-filled-rows-en-dark.jpg |
| Desktop 1280×800 | VI light | desktop-loading-vi-light.jpg | desktop-filled-vi-light.jpg | desktop-filled-rows-vi-light.jpg |

At each size the test checks the following:
- The form is not opened before the library loads, and the button waits.
- After loading, the name, servings, ingredient box, steps and transcript equal the reviewed dictation, with one row per line.
- "Bạc hà 200 g" and "Beef 300 g" are kept, and "Me chua" and "Soy sauce" have no invented amount.
- Saving adds exactly one family recipe with every line.
- There is no horizontal overflow, all touch targets are at least 44 px, and there are no page errors.

The test failed on the v1.7.3 code (the form opened without the dictation) before the fix.

## Limits
- The header and navigation are unchanged, so there is no narrow-phone check.
- Reduced motion is emulated, and the new state has no animation.
- The failed first request stands in for the offline state. Full offline dictation is covered by the existing sections 4 and 6.
- Pre-existing and not changed here: the meal-group checkboxes in the family recipe form show English labels
  (`FAMILY_PURPOSES`) in Vietnamese.
