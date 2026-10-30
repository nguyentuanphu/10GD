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
