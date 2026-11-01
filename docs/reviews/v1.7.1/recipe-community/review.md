# v1.7.1 recipe form, dish photos, community recipes and meal search: review record

Branch `agent-cc/recipe-community` (from 945552d). Not merged, not pushed, not deployed.
Responsive QA here is local browser viewport simulation (Chromium 1243 via Playwright, touch emulation, iPhone 13 /
iPad Pro 11 user agents). It is **not** physical-device testing. No real iPhone, iPad, iOS Safari photo picker or HEIC
decoder was available.

## Henry's report → root causes → changes

| Report | Root cause (found in v1.7.0 code) | Change |
|---|---|---|
| "Không type hoặc chọn được ingredients" (create, "Chép thành món nhà", edit) | (1) The family recipe form had only **one free-text box** for every ingredient. There was no way to *choose* a catalogue ingredient or a unit. (2) Its save parser **threw "Kiểm tra lượng và đơn vị"** for any line in a unit the shopping list cannot count, such as "Tỏi 3 tép", "2 lát gừng" or "1 nhánh gừng". The whole save then failed, so typing ingredients looked broken. (3) The form's save handler is a document *capture* listener that stops the event, so any later capture hook on the form never ran. In Chromium the textarea itself accepted typing, and no overlay intercepted taps (checked with `elementFromPoint`). | One row per ingredient: name (combobox with catalogue suggestions, touch + ArrowUp/Down/Enter/Escape), amount (`inputmode="decimal"`, comma accepted) and a unit picker. The picker has two groups: units counted for shopping (g, kg, lạng, ml, l, quả, cái, bó, gói, miếng) and note-only units (tép, củ, nhánh, lát, muỗng…). Rows can be added, removed and moved up/down, and a "Dán nhiều dòng" box adds pasted lines. Rows write back to the original `ingredients` box, so the existing save, voice dictation and older data are unchanged. Lines in note-only units are now **kept verbatim** in `missingIngredients` and flagged "chưa tính đi chợ", where they used to block the save. Nothing is converted or guessed except exact kg→g, l→ml and lạng→100 g. An untouched row re-emits its original line byte-for-byte (rule 6). |
| "Không upload được ảnh" | The family recipe form had **no photo control at all**. Only receipts had photos. | "Ảnh món": **Chụp ảnh** (`capture="environment"`) and **Chọn ảnh**. Each is a full-size transparent `<input type=file accept="image/*">` inside a `<label>`, never `display:none`. `accept="image/*"` without `.heic` lets iOS hand over a JPEG. The photo is decoded (`createImageBitmap` with EXIF orientation, `<img>` fallback), downscaled to ≤1600 px, re-encoded as JPEG ≤900 KB (which drops EXIF) and previewed. Replace and remove are supported. A file Chromium cannot decode (HEIC) shows a clear message: pick from the library, or set Camera › Formats › Most Compatible. The photo is stored in the existing per-scope IndexedDB photo store as `recipe-<id>`. It uploads through the existing family photo endpoint (`family?op=photo`, JPEG, ≤3.5 MB) whenever receipt photos upload. Other family devices fetch it on demand. The photo overlays the dish illustration on cards and in the detail view, and the illustration stays as the offline fallback. |
| Share to community | — | Recipe detail of a **family** recipe has a "Chia sẻ lên cộng đồng" card. The share sheet offers: the whole recipe or only photo + name; the family's display name or "Ẩn danh"; an explicit consent box and a link to `/privacy.html#community-recipes` (new section 5b, VI + EN). The card then shows the status: pending, approved (+points), or not approved with the reason. "Gỡ khỏi cộng đồng" deletes the shared copy and photo, and the family recipe is untouched (asserted). |
| Server | — | New `community-recipes` function and `lib/community-recipes.mts`, in the `recipes/` namespace of the existing community store. They follow the community-prices patterns: signed-in accounts only, viewers read-only, same-origin mutations, 10 shares/day, 20 reports/day, per-IP public read limit, 60 KB JSON cap. Photos are JPEG only, ≤6 MB upload and ≤1.2 MB stored, 64–2400 px, and APP1–APP15 (EXIF/GPS/XMP/ICC) plus COM segments are stripped server-side. No re-encode is possible on the server: no image library exists in the repo, and the device re-encodes. Items stay **pending** until a Studio owner approves them. Public reads return approved items only, with no account, family id, source id, reports or history. |
| Studio | — | New page **Món cộng đồng / Community recipes** (`studio-recipes.js`, registered through `window.studioPages`, so `studio.ts` is not edited). It has tabs Pending / Reported / Approved / Rejected / Removed / All, the photo, and the ingredients and method. Actions are approve, reject (reason), remove (reason), restore and dismiss reports. It is owner only (same role as Community prices), CSRF-protected, and every view and action is in the audit log. The page also has a switch for the new platform flag **`communityRecipes`** (default on, `STUDIO_FLAG_COMMUNITY_RECIPES` env override). |
| Library | — | A "🌏 Cộng đồng / Community" tab in the recipe library shows approved recipes. The cards use the v1.7 image + name design and can be filtered by search and category chips. "Xem công thức" shows the shared quantities exactly as shared. "Chép thành món nhà" creates a family copy with `source:{type:'community',id,by}`. Only exact shopping units are counted, and everything else goes to "chưa rõ lượng" as written, never invented. The photo is copied too. "Báo cáo" offers 5 reasons plus a note and needs sign-in. With the flag off (cached platform flags), the tab, the share card and the API are all hidden or disabled. |
| Points | community-rewards exists | Approval appends **+5** (`award:recipe:<id>`, idempotent, within the existing daily cap) to the existing points ledger. Pending and rejected items earn nothing (tested). |
| Meal editor search: 5 + "Xem thêm" | The search showed up to 60 reference dishes and all family matches. | While searching, each section (family and reference) shows its top **5**, "Đang hiện 5/N món" and a **"Xem thêm 5 món"** button that reveals 5 more per tap. It is a real button, so Enter/Space work, and focus stays in the list. The counts appear in the status line. With no search, the 30 suggestions are unchanged, and the empty state is unchanged. |

## Tests
- `tests/community-recipes.test.mjs` (in `npm test`) runs against the real accounts/studio handlers with in-memory stores. It covers EXIF/XMP/COM stripping, quantities copied exactly (missing stays missing), auth (401, viewer 403, cross-origin 403, consent), the 60 KB cap, pending not public, photo ownership, re-share replacing the same item, owner-only Studio with CSRF, audit entries, +5 points once and only on approve, the public payload with no personal data, report (dedupe), reject (reason, photo deleted, no points), anonymous, unshare (only the owner family), the daily limit and its reset, and flag off with the env override.
- `tests/recipe-community-browser.test.cjs` (`npm run test:recipe-community:browser`, appended to `test:all`) checks:
  - On touch-emulated **375×812 with the iPhone UA** and **820×1100 with the iPad UA**:
    - typing name, amount (`0,5` + kg → 500 g) and unit;
    - choosing a suggestion by tap and by keyboard;
    - add, remove and reorder;
    - the "Tỏi 3 tép" line that failed in v1.7.0;
    - file inputs that are not `display:none`, with `accept=image/*` and `capture`;
    - a HEIC-like file showing the graceful message;
    - a 2400×1800 JPEG downscaled to 1600×1200, stored and shown;
    - a PNG re-encoded to JPEG, then replace and remove;
    - "Chép thành món nhà" copying quantities exactly;
    - an unchanged edit leaving the family recipe byte-identical;
    - meal search showing 5, then 10 (tap), then 15 (keyboard), with the empty state unchanged.
  - Signed in, against the real community-recipes handler: share → pending (not public) → Studio approve (+5, audited) → visible → copy (source + quantities) → report → unshare (family recipe untouched), plus reject with reason, anonymous and flag off.
  - Screenshots, and no horizontal overflow at every size.
- Updated `tests/catalog-filters-browser.test.cjs`: "spag" now expects the top 5 plus "Xem thêm" instead of ≥10 rows. This is the owner-requested behaviour change, not a weakened check.

## Screenshots (JPEG, all < 250 KB)
`mobile-*` 375×812 · `tablet-*` 820×1100 · `desktop-*` 1280×800. Each size has `form`, `community` and `meal-search` in VI light and EN dark, plus `studio-vi`. Also `mobile-form-rows-vi` (filled rows with notes), `mobile-share-modal-vi`, `mobile-community-vi` (expanded recipe) and `mobile-meal-search-vi` (5 + Xem thêm). No narrow 320 px check was taken, because header and navigation did not change.

## Limits
- **Simulation only.** I could not test the iOS photo picker or camera, HEIC→JPEG conversion, the iOS keyboard or real touch. Chromium cannot decode HEIC, so only the message path for HEIC was tested. On iOS, `accept="image/*"` normally delivers JPEG.
- I could not reproduce "cannot type" itself in Chromium: the textarea accepted input. The fixes target the causes found in the code (no picker, the save error on common units, no photo control). Please re-check on the iPhone.
- The server strips metadata but does not re-encode pixels. The device re-encodes before upload.
- When a photo is replaced or removed, the old copy on the server is not deleted, because the existing family photo endpoint has no delete. It is deleted with the family.
- Community moderation is owner-only, matching Community prices. No separate moderator role exists.
- GitHub CI on the exact head commit is still required before a deploy request (rules 15–17). Responsive QA is not deploy approval.
