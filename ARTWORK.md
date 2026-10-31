# Family Kitchen artwork

The built-in catalog has **58 ingredient illustrations and 540 individually mapped dish illustrations**. Artwork is generated with the built-in image generation tool, referencing the existing original artwork. No retailer photographs were copied. These are illustrations of the recipe, not photographs of a cooked result.

## Assets and mapping

- `dist/artwork/ingredients-v1.webp` through `ingredients-v4.webp`: 4×4 ingredient sheets. `INGREDIENT_ART` in `src/frontend/artwork.ts` explicitly maps all 58 IDs. The fourth sheet distinguishes ribs, mustard greens, water spinach, glass noodles, hu tieu, udon, banh canh, macaroni, cooked rice, salt, sugar, vegetable stock, pho noodles, boneless pork, shredded cooked chicken and corn kernels.
- `dist/artwork/dishes-v1.webp` through `dishes-v35.webp`: 4×4 dish sheets. The first two reuse 27 appropriate paintings. Sheets 3–35 add the other **513 recipes**, one distinct initial cell per recipe. Two recipes use corrected standalone paintings in `dist/artwork/corrections/` instead of their initial cells; those superseded cells are not displayed. The final set renders 538 sprite cells and two standalone paintings.
- `REVIEWED_DISH_ART` is an explicit recipe-ID-to-cell map; there is no broad protein/category assignment. A frozen signature checks the recipe name, category, protein, ingredients, preparation and steps before reusing a painting. Edited or family-authored recipes use the ingredient-led vector fallback rather than an unrelated catalog painting.
- Exact Vietnamese/English ingredient labels can resolve to the same mapped artwork; unknown family ingredients use a neutral shopping-bag illustration.
- All sheets are bundled for offline caching. WebP encoding preserves composition. The source generated images remain in the generation workspace; the repository contains the application assets.

## Design direction and evidence

Warm ivory `#fffefa` backgrounds, sage accents, softly shaded natural food colors, gouache/watercolor texture, consistent three-quarter overhead view and ivory bowls/plates follow the original sheets. Each recipe brief includes its actual ingredients, preparation and cooking steps. The prompts explicitly distinguish steamed, boiled, stir-fried and braised dishes; noodle types; minced meat, ribs and fillets; and plate versus soup bowl. They forbid adding unrelated rice, meat or other foods.

See [generation provenance](docs/reviews/artwork/generation.json), [the complete catalog and briefs](docs/reviews/artwork/catalog.json), [visual gallery](docs/reviews/artwork/gallery.html), and [review record](docs/reviews/artwork/review.md). Illustrations simplify quantities, cuts and small garnishes; they are not ingredient identification or food-safety evidence. Recipe text remains authoritative.

Run `npm run artwork:audit` after `npm ci` to rebuild the catalog/gallery. The original audit baseline is pinned to `0bcef706f1b01260b4c0a5980aa67ad09fc63c95`. No recipe amounts, family data, instructions, prices or meal schedules are changed by artwork work.
