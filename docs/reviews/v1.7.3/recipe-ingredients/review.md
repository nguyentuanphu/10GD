# v1.7.3 · Recipe ingredients in the detail view

Owner report (iPhone, production v1.7.2): "Vẫn chưa thấy nguyên liệu". He opened the family recipe "Mỳ Quảng (Tôm - Thịt)" from a meal and saw the heading "Nguyên liệu cho phần món trong bữa này" with an empty box under it. He had entered the ingredients row by row, with units, in the v1.7.1 rows form and saved.

## Root cause (reproduced on origin/main 4aa46fb)

1. **The meal kept an old copy of the dish.** When a dish is added to a meal, the app stores a copy of the recipe (`clone(r)` in `meal.recipes`). The detail view, the meal card and the shopping list all read that copy. Saving the recipe form updated only `state.recipes`, so a meal that already held the dish kept the empty copy. The view showed no ingredients and `$0.00`, and the shopping list did not get the new items either.
2. **Lines the shopping list cannot count were never shown.** Lines such as "Tỏi 3 tép", "Nước mắm 2 muỗng canh" or a name without an amount are saved in `missingIngredients`. `showRecipe` only drew `r.ingredients`, so these lines were missing even in the library view.
3. **The box in the screenshot was the prep note.** With `prep:''` the app still drew an empty `.callout`, and that is the box Henry circled.

The rows save itself works. The window capture listener writes the rows into the box before the family save handler runs. The repro saved exactly `Mì Quảng | 500 | g`, `Tôm | 300 | g`, `Thịt heo | 300 | g`, `Tỏi 3 tép` and `Nước mắm 2 muỗng canh`. Henry's ingredients are already stored, so he does not need to enter them again.

## Fix

- `family-menu-core.ts`:
  - `recipeIngredientRows` returns catalogue lines scaled to the meal, then every other line exactly as typed. It never guesses an amount, and it skips an unknown id instead of throwing.
  - `liveMealDish` is used only for display. For a meal that is not yet cooked it shows the family's current recipe and keeps that meal's portion size. Cooked meals, weekend-batch dishes and library recipes keep their copy. It writes nothing to storage.
  - `refreshPlannedDishes` runs only from the family's own recipe save. It updates copies in meals that are not yet cooked, so the meal card and the shopping list match the recipe.
- `app.ts`:
  - The detail view lists every line. A line that is not counted shows the small note "không tính đi chợ" / "not counted for shopping".
  - A recipe with no lines shows "Chưa có nguyên liệu · [Thêm nguyên liệu]". The button is at least 44 px, appears only for an editable family recipe, and opens the edit form with focus in the first ingredient row.
  - The empty prep box is no longer drawn.
- `family-menu-ui.ts`: one call to `refreshPlannedDishes` after the edit save.
- `dist/styles.css`: one appended block.

The only stored data that changes is the copies in meals that are not yet cooked, and only when the family saves a recipe.

## Verification

- `tests/recipe-ingredients.test.cjs` (unit): checks scaling, verbatim lines, unknown ids, cases (b) and (c), live versus cooked, batch and library copies, that viewing writes nothing, the shopping list after a save, and a JSON sync round trip with `validImport`.
- `tests/recipe-ingredients-browser.test.cjs`: iPhone user agent, touch, 375×812.
  - (c) The empty state, and that "Thêm nguyên liệu" opens the rows.
  - (a) Henry's path: rows entered by touch with units, then the dish opened from Today. Amounts match the shopping-list scaling, and the shopping list includes the shrimp and pork.
  - (a′) Data saved under v1.7.2 (empty meal copy) shows without editing, and storage is unchanged.
  - (b) A recipe from before v1.7.1, loaded from storage.
  - (d) "Chép thành món nhà".
  - (e) Two signed-in devices: device A saves and uploads the family state, device B loads it and shows all 5 lines. The family state endpoint is an in-memory stand-in that stores the state verbatim, the same way the real handler does.
- Screenshots in this folder:
  - Phone 375×812: `mobile-meal-detail-{vi,en}-{light,dark}`, `mobile-empty-vi-light`, `mobile-empty-en-dark` and `mobile-empty-add-form-vi-light`.
  - `tablet-meal-detail-vi-light` (820×1100) and `desktop-meal-detail-en-dark` (1280×800).
  - No horizontal overflow was found in the page or the modal.

## Limits

- This is Chromium viewport and touch simulation, not testing on a physical iPhone or iPad.
- Data that was never saved cannot be recovered. In this case the reproduction shows that the rows were saved.
- The shopping list for a meal planned before this fix still uses that meal's old copy. It updates the next time the recipe is saved: open "Sửa" and press "Lưu", with nothing to retype. The detail view is correct straight away. Changing the shopping list to read live recipes was deliberately left out, because cook and undo stock deductions depend on the meal copy.
- Cooking mode (`start-cooking`) is unchanged.
