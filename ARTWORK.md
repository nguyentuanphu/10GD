# Family Kitchen artwork

Created with the built-in image generation tool; no external retailer product photos were copied. The generated images were encoded as WebP for the app, without changing their composition.

- `dist/artwork/ingredients-v1.webp`: 4×4 sheet, 16 ingredient illustrations. Row order: pork chop/chicken drumsticks/beef/salmon; whole fish/prawns/tofu/eggs; bok choy/broccoli/carrots/tomatoes; potatoes/pumpkin/mushrooms/spring onions.
- `dist/artwork/dishes-v1.webp`: 4×4 sheet, 16 representative dish types. Row order: pork and egg claypot/ginger chicken/beef broccoli/pan-fried fish; garlic prawns/tofu tomato sauce/winter melon soup/pumpkin soup; bok choy/green beans mushrooms/chicken pho/beef noodle soup; wonton noodles/porridge/egg tomato soup/steamed fish.
- `dist/artwork.js` supplies local SVG illustrations for remaining ingredients, preserves the pre-existing vector fallback for unsupported dish groups, and maps recipe categories/proteins to representative artwork. Recipe ingredients remain the source of truth. There are not 540 individually generated recipe photographs.

## Prompt briefs

Ingredient sheet: perfectly square 4-column × 4-row grid, centered equal cells, 18% padding, identical warm ivory #fffefa background, no text/grid lines/frames; editorial hand-painted gouache miniatures, softly shaded realistic ingredient colors, sage accents and consistent three-quarter view. Exact ingredients in the order listed above. Recognisable at 48px; no plates, logos or watermark.

Dish sheet: perfectly square 4-column × 4-row equal-cell grid, each finished dish centered with 15% padding and no overlap. Uniform #fffefa background, no text/labels/grid lines/watermark, simple off-white dishes, warm Vietnamese home-cooking gouache style with sage details. Exact dish categories in the order listed above. Representative illustrations rather than photos.

## Use

Dish artwork appears in the recipe library, meal details, daily/weekly menu and suggestion cards. Shopping ingredient thumbnails remain small enough to preserve large text and tick targets. Pantry cards also show ingredient artwork. The PWA caches both image sheets and rendering code.

## Catalog audit and draft companion artwork (31 October 2026)

See `docs/reviews/artwork/review.md`, `gallery.html` and `catalog.json` for the complete inventory and per-recipe design briefs. Run `npm run artwork:audit` to rebuild these artifacts. The baseline is pinned to commit `0bcef706f1b01260b4c0a5980aa67ad09fc63c95`.

- `ingredients-v4.webp`: companion 4×4 generated sheet, using v1–v3 as references. Rows: ribs / mustard greens / water spinach / glass vermicelli; hu tieu / udon / banh canh / macaroni; cooked rice / salt / sugar / vegetable broth; pho noodles / boneless pork / shredded cooked chicken / corn kernels. This replaces 16 ambiguous shared representations. All 58 built-in ingredient IDs are mapped explicitly. Unknown family ingredients receive a neutral shopping-bag symbol rather than an inferred meat/vegetable picture.
- `dishes-v2.webp`: companion generated sheet referencing dishes-v1. Rows: caramelized ribs / scallion omelette / mushroom meatballs / beef green beans carrots; pumpkin minced-pork soup / mustard shrimp soup / sour fish soup / tofu mushroom carrot soup; cabbage minced-pork soup / chicken potato carrot soup / bok choy mushroom soup / broccoli carrot tofu soup; garlic water spinach / boiled broccoli / cabbage carrot stirfry / cucumber tomato salad.
- 27 reference recipes use reviewed painted compositions. These remain representative illustrations with possible garnish differences, not exact recipe photographs. Edited recipes must retain their original name and ingredient signature to reuse these mappings.
- **513 recipe compositions are draft SVG designs**, using the existing ivory/sage/warm-food palette, recipe ingredients, bowl/plate form, noodles, porridge and pasta. They are not the finished gouache artwork set. Every recipe has a corresponding full production brief. Do not describe this draft as 540 finished, individually reviewed paintings.
- No recipe amounts, family data, instructions, prices or meal schedules were changed. The new sheet URLs are cached and the service-worker version is bumped.

Generation briefs used the exact cell orders above, a square 4×4 grid, uniform #fffefa background, 17–18% internal margins, no text or grid lines, three-quarter view, ivory crockery and warm softly shaded gouache matching the supplied sheets. Assets were encoded as WebP without composition edits.
