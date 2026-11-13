# Verification of audit A1–A27, B1–B23 and the v1.7.19 audit-sweep list

Repo /home/user/10GD, branch claude/bold-pascal-riryi0, HEAD 3507cfa (dist/ built 13 Nov 00:23 UTC, after the last src change).
Method: code reading of src/frontend/*.ts (compared with dd2e657 where useful) plus Chromium probes on dist/ (scripts t1–t15.cjs in this folder; device-only, SW blocked, Sydney zone, 375×812 unless noted), `node tests/audit-data-fixes.test.cjs` (26/26), `node tests/week-start.test.cjs` (14/14), and the audit sweep run for 6 of its 10 passes (full-en-320, full-vi-375-saturday, empty-en-375, full-vi-375, full-vi-375-hcm, empty-vi-320) at concurrency 1.
Line numbers are physical lines of the one-line-per-function source files.

| ID | sev | status | evidence (file:line) | test | note |
|---|---|---|---|---|---|
| A1 | med | FIXED | app.ts:244 `check-pantry` lists rows(have>0/skip)+other lots; app.ts:116 both labels count the same | autoplay-audit (au-counts), ladybug-audit.ts | Probe: both buttons “(4)”, sheet 2 rows + 2 lots. Two buttons with different names (“Đồ trong tủ” / aria “Kiểm tra đồ đã có / bỏ qua”) still open the same sheet. |
| A2 | high | FIXED | app.ts:116 `.extra-edit-name data-action="edit-extra"`; app.ts:232; app.ts:50 `extraFormModal(item)` | recipe-units-browser (extras edit), autoplay au-extras | Probe: tap name → “Sửa đồ cần mua” with data-edit-id. |
| A3 | high | FIXED | app.ts:50 unit is `unitFieldMarkup` (hidden input, empty); “Chọn đơn vị trước khi lưu” | extras-audit:67, autoplay au-defaults | Probe: typed name + 10, no unit → refused with message; quick pick of a “con” ingredient → unit con, amount empty. |
| A4 | high | FIXED | app.ts:50 `#extra-cost` empty placeholder; saved `costUnknown:true` | extras-audit:59 | Probe: row shows “Chưa rõ giá”. |
| A5 | med | FIXED | push-ui.ts:38 errand builds the same record (extraRecordFields, unit picker, optional price) | extras-audit:70 | |
| A6 | med | FIXED | app.ts:233 `delete-extra` → “Bỏ … khỏi giỏ?” then undoBar | extras-audit:82 | Probe: confirm → removed → Hoàn tác restores at same index. |
| A7 | med | FIXED | app.ts:116 “Chưa có món nào trong thực đơn những ngày này” + “Mở Thực đơn tuần” | v1719-weeks-dishes:53 | No “đủ nguyên liệu” on any screen with nothing planned (t14). |
| A8 | med | FIXED | family-flow.ts:26 SHOP_MODE_TICKS includes extra-done | extras-audit:107 | |
| A9 | med | FIXED | store-purchases includes ticked ingredient extras | extras-audit:64 | Probe: Sữa tươi 2 l extra → sheet → pantry lot 2000 ml. |
| A10 | low | FIXED | app.ts:116 disabled button + `#store-purchases-why` | extras-audit:90 | |
| A11 | low | FIXED | app.ts:50 “Chọn nhanh từ danh sách nguyên liệu (tùy chọn)” | extras-audit:58 | |
| A12 | low | PARTIAL | app.ts:40 reads the check-pantry button's aria-label | extras-audit:93-94 (compares with the same aria-label — cannot fail) | Sheet says “lấy lại ở nút “Kiểm tra đồ trong tủ””; the button on screen (375 and 1280) reads “Đồ trong tủ (4)”. |
| A13 | med | FIXED | family-menu-ui.ts:164 remove-dish / clear-meal undoBar + fmRedrawStill | v1719-weeks-dishes:91, autoplay au-dish | Probe: both undo restore the dishes. |
| A14 | med | FIXED (redesign per owner 12 Nov) | app.ts recipeSheetFooter: “Bỏ khỏi bữa · Sửa món · Nấu món này” | v1719-dish-sheet, v1719-weeks:101 | Probe typed dish: footer correct; “Nấu món này” says no steps, “Sửa món” to add. Sheet still shows “$0.00” for a typed dish with no ingredients (C12 family, not A14). |
| A15 | med | FIXED (twin gap) | app.ts:272/274 + purchase-units.ts:32 pantryLotDefaults; no preselect | v1719-weeks-dishes:148 | Probe: ing/place empty; rice → dry; egg → fridge + use-by, step 0.25. Twin NOT fixed: personal-ui.ts currencyModal `<select name="ingredient">` (Tiền tệ & giá → Nhập giá) has no placeholder, so a typed price is saved on the first ingredient (Thịt heo). |
| A16 | low | FIXED | Tủ stat cards filter qty>0 / purchase | v1719-weeks-dishes:146 | Probe: zero freezer lot not counted (4 lots, freezer 1). |
| A17 | med | FIXED | urgentForm → connection sheet with reason line | owner-rules | |
| A18 | low | FIXED | accountsModal titled “Kết nối gia đình” | owner-rules | |
| A19 | med | FIXED | products-ui receiptProductPicker empty state + “Chụp / nhập hóa đơn” (receipt-new) | v1719-weeks-dishes:166; sweep rule 31 | |
| A20 | low | FIXED | family-features.ts one label; aside only with receipts | v1719-weeks-dishes:169 | Probe: 2 × “Hóa đơn”. |
| A21 | low | FIXED | add-to-meal lists all MEAL_TYPES, “— Chọn bữa” when no context | v1719-weeks-dishes:118 | |
| A22 | low | FIXED | family-menu-ui.ts:164 quick-add-dish requires role; suggested from name | v1719-weeks-dishes:126 | Probe: empty → “soup” after typing “Canh chua…”. |
| A23 | low | FIXED | Today card explains staples-only pantry, no button | v1719-weeks-dishes:136 | |
| A24 | low | FIXED | push-ui errand-from “— Chọn người nhờ mua”, required | extras-audit:73 | |
| A25 | med | FIXED | recipe-community.ts:38-39 unit button opens the shared picker | recipe-units-browser:53 | |
| A26 | low | FIXED | kitchen-extras import button hint “Cần tài khoản gia đình…” | owner-rules | |
| A27 | low | FIXED | family-menu-ui.ts:38 words only | owner-rules:99-100 | |
| B1 | high | FIXED | family-menu-ui.ts:73,123 dayAt; core.ts:230 dayAt, :231 menuWeekKey; mergeGhostWeeks | v1719-weeks-dishes:64, week-start.test | Probe Sat start: guest save → portions 3.15 → 5.15, no new week key. |
| B2 | high | FIXED | app-search (monday), receipt-match-ui.ts:41 menuWeekKey, voice-commands.ts:268, personal-ui.ts:176-177 | v1719-weeks-dishes:66, week-start.test | Probe Sat start: search finds tonight's dish. |
| B3 | high | FIXED | core.ts:119 mealIngredients skips cookedAhead; family-menu-core.ts:113 override now only drops spoon units | audit-data-fixes:36 (pass) | |
| B4 | high | FIXED | core.ts:117 addDishIngredients used by core.ts:171 dishNeeds | audit-data-fixes:42 (pass) | |
| B5 | med | FIXED | = A6 | extras-audit:82 | |
| B6 | high | FIXED | = A9; extras keep ingredient/amount/unit | extras-audit:64 | |
| B7 | med | FIXED | = A2 | recipe-units-browser | |
| B8 | med | FIXED | shopping-planning extraStoreModal = itemStoreModal fields | extras-audit:98 | Same fields and footer (t12). EN wording drifted between the twins: “Save store” vs “Save where to buy”, “Usual places…” vs “Your usual shops…”, “store list” vs “shop list”. |
| B9 | med | PARTIAL | insights-core.ts:53 storeChoiceNames (receipt store only) | owner-rules (part) | insights-core.ts:36 RETAILERS still Coles/Woolworths/Chemist; price-scout-ui.ts:250 own list; receipt-parse.ts:28, shopping-optimizer.ts:8, voice-price.ts:85 own lists. Review says left for sync compatibility. |
| B10 | med | FIXED | purchase-units.ts:32 pantryLotDefaults used by app.ts:272/274 and voice-commands.ts:263; receipts suggestUseBy (owner 12 Nov) | v1719-weeks-dishes:79 | |
| B11 | med | FIXED (owner decision: spoons are notes) | kitchen-extras.ts:18 tbsp → “muỗng canh” as written; family-menu-core.ts:113 drops spoon units | v1719-weeks-dishes:177, v1715 | |
| B12 | med | PARTIAL | picker in Viết món, extras, errand, receipt line, notes import, voice preview | recipe-units, unit-places | price-scout-ui.ts:256 still `g,kg,mL,L,each,wash,roll,sheet` in the VI screen; pantry manual/barcode base unit only (left “for Henry”, no recorded decision). |
| B13 | med | PARTIAL | app-search, receipt-match-ui, receipt-quality use aud(n,currency) | v1719-language (VND search) | receipt-match.ts:21 `money=n=>aud(Math.abs(n),'AUD')` still formats receipt-line amounts in match reasons; reproduced: “THIT BO $150,000.00” for a đồng line. |
| B14 | med | FIXED | start-cooking gets meal, shows scaled list | v1719-weeks-dishes:109 | Probe: cooking mode lists “Nui 196.9 g …” = sheet. |
| B15 | med | FIXED | app.ts sheetButtonKind + data-sheet-role; footers moved | owner-rules; sweep footer check passes | |
| B16 | low | PARTIAL | confirmAsk for price delete only | owner-rules (part) | native confirm() left: family-menu-ui.ts:252 (remove meal), voice-recipe.ts:280; pantry-lot delete (app.ts `delete-stock-confirm`) still no undo; Xóa 30/Xoá 24/xóa 19/xoá 31, Hủy 18/Huỷ 6. |
| B17 | low | FIXED | app.ts:117,148,314 searchHit | v1719-language | |
| B18 | med | FIXED | ingSearchEnhance on ingredient selects > 15 | owner-rules | |
| B19 | low | PARTIAL | family-menu-ui.ts:70 `+per.toFixed(2)` (no comma) | v1719-language | pantryBuyingDisplay precision and “suất” vs “suất chuẩn” left (review “Not fixed”). |
| B20 | low | FIXED | “Pantry shelf” everywhere (app-search.ts:58) | v1719-language | |
| B21 | low | FIXED | sydneyHour/appTimeLabel; availability-core.ts:50 uses planStartOf; no device-zone toLocale* left outside Studio | v1719-language (TZ) | usage-analytics hour buckets left (stored/sent data; owner “no data change”). |
| B22 | low | FIXED | store sheets in EN | v1719-language; sweep EN passes | see B8 note on EN drift. |
| B23 | med | FIXED | kitchen-extras import opens unsaved draft | v1719-weeks-dishes:175, v1715, v1716 | |
| SW tap<44px (D22–24) | — | FIXED | owner-rules sizes | sweep: 0 failures in 6 passes | |
| SW drawings (D4–D7) | — | FIXED | emoji-art / BTN_BY_DATA | sweep | |
| SW VI in EN (D11–15, B22, N7) | — | FIXED | language.ts dictionary; receipt unit via picker | sweep EN passes | |
| SW EN in VI (D16) | — | FIXED / allowlisted | “hóa đơn” placeholder; CSV column names allowlisted as file format (lead decision, not owner) | sweep | |
| SW footer (D9) | — | FIXED | footer Lưu; auto-save | sweep | |
| SW rule 31 (A19, A1/N5) | — | FIXED | empty states with actions | sweep empty passes | |
| SW week start (N6, Tuần trước/sau) | — | FIXED (false positive) | Monday keys by design (core.ts:224-231); sweep check rewritten to `monday(k)===k` | sweep Sat pass | Decided by the lead, not by Henry. |
| N1 receipt re-read | — | FIXED | receipt-ui fillDraft keeps confirmed lines | receipt-list 1b | was data loss |
| N2 reactions jump | — | FIXED | | sweep; probe still (329→329) | |
| N3 add-row jump | — | FIXED | b860268 keep-in-place | sweep; probe “Thêm nguyên liệu” 329→329, “Thêm nhóm khách” 610→610/611 | |
| N4 overflow 320 EN | — | FIXED | | sweep full-en-320 passes | |
| N5 empty pantry sheet | — | FIXED | “Thêm thực phẩm” action | sweep empty passes | |
| N6 | — | see SW week start | | | |
| N7 receipt unit options EN | — | FIXED | shared unit picker | sweep EN | |

Sweep gap found: the SKIPS regex `/…|log-?in|…/i` matches the id `extra-catalog-ing` (“cata**log-in**g”), so the sweep skips the “Chọn nhanh” select in Mua thêm as “sign-in” — the exact control behind A3/C3 is never tapped by the sweep.

Counts: A — 26 FIXED, 1 PARTIAL (A12). B — 18 FIXED, 5 PARTIAL (B9, B12, B13, B16, B19). Sweep list — all FIXED (sweep re-run on 6 of 10 passes: 0 failures, 11,624 checks, 1,254 taps). NOT FIXED: none. No item is only “left by owner decision”; B11/A14 were fixed to the owner's 12 Nov decisions, and B21's remainder (usage-analytics hour buckets) sits under the “no data change” decision.
Twin gaps found: A15 → currency/price form silently prices the first ingredient (verified: typing 0.02 and Lưu giá sets priceFor(pork)=0.02); B8/B22 → EN wording differs between the extra and item store sheets.
Caution: during this check another session left uncommitted edits in src/frontend (core.ts, family-features.ts, push-ui.ts, receipt-list.ts, receipt-parse.ts, shopping-planning.ts; 13 Nov 01:44 UTC). Cited line numbers were re-checked against HEAD; browser probes used dist/ built from HEAD.
