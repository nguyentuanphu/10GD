# v1.7.6 — owner report of 6 Nov 2026 (iPhone, after the v1.7.5 deploy)

Branch `release/v1.7.6` from `main` at `c751349` (Release v1.7.5). **Not deploy-approved.** Needs green GitHub CI on the exact head commit and Henry's explicit DEPLOY (AGENTS.md rules 1–5, 15, 18).

## What Henry reported and what changed

| # | Report | Cause | Change |
|---|--------|-------|--------|
| 1 | “vẫn còn lỗi ngôn ngữ” — **Chi tiêu** left in Vietnamese in English mode (More tools) | One family member is called **Chi**. Family names are protected from translation, so the word “Chi” inside “Chi tiêu” was kept and the phrase could not be translated. | A known interface phrase that contains a family name is translated first. The name itself stays protected everywhere else (`language.ts`). |
| 1b | Connection chip in the top bar said **Online / Offline** in Vietnamese mode | Hardcoded English | It now reads **Trực tuyến / Ngoại tuyến** in Vietnamese and Online / Offline in English, and updates when the language changes. |
| 2 | “Đã bật giá online nhưng chạy lại báo lỗi” — Studio showed *skipped (switched off)*, then *Ran recently. Try again in 10 minutes.* | **Run now** read a copy of the switches cached for up to 60 s, so a run right after switching on still saw them off and was skipped. That skipped run then started the 10-minute wait. | **Run now** and the status card read the switches fresh. A skipped run no longer starts the wait, and the wait message says how many minutes are left. The Studio switches now sit on one line with their label. |
| 3 | “Mấy cái Woolworths và Coles price check này là gì” (*Prices wanted this week*) | A community card asking families to add missing shelf prices. It ignored the online prices, and its buttons were cut off on phones. | Renamed **Giúp thêm giá còn thiếu / Help fill missing prices**, folded by default with a count. One short line says what it is for. Items that already have an online supermarket price are no longer asked for. Buttons are now a 2×2 grid on phones and nothing is cut off. |
| 4 | “Community price hơi dài dòng… làm nó collapsable; … cho nó lên trước mớ giỏ đi chợ” | — | **Giá cộng đồng** is folded by default and shows a count, with one short note inside. **So Giá** now sits folded above the shopping list. Its header shows the chosen trip plan (e.g. *Woolworths + Coles · ~30 phút · $45.76*), and the list keeps its online price lines while folded. Each card remembers whether the family opened it. A copy saved by v1.7.5 is folded once, and first use still shows the postcode form. |
| 5 | “Tôi hôm nay away nhưng vẫn ghi là at home” | The calendar's away only took the portion off. **Ai ăn bữa này?** showed the meal's own attendance (*At home*). | **Ai ăn bữa này?** shows **Không ăn / Away** whenever the calendar says away (or busy with no portion). Choosing *At home / Packed / Pending* for that meal lifts the calendar entry for that one meal, so *Tuần này ai bận* and *Ai ăn bữa này?* always agree. |
| 6 | Names in the packed-lunch table split (“Every / one”, “Ba / Phú”, “Mẹ / Mi”) | The name column was about 50 px wide on phones. | On phones each name sits on its own line above that person's seven day boxes. Names stay whole, and the boxes keep their 44 px touch area. |
| 7 | “Chữ bị wrap xuống dòng nhìn không đẹp. Audit lại tất cả” | — | Full text audit (below). |
| 8 | “Nút hold to talk nằm quá sâu phía dưới, nên để nó nằm ở giữa” | — | In the voice sheet, VI/EN and **Giữ để nói** now sit right under the listening status, above the words box. On a 375 px phone they show without scrolling, and the button is 64 px tall. |
| 9 | “Đã cho phép bật micro rồi mà mỗi lần hold to talk lại đòi thêm cho phép” | iOS asks again whenever a page opens the microphone after all its earlier streams were stopped. Every hold opened its own stream (level meter, on-device voice) and stopped it on release. | One microphone stream is shared while the voice sheet is open and reused by every hold. It is released when the sheet closes, when the app goes to the background, or after 2 idle minutes. The iPhone may still ask once each time the app is opened again, which is iOS's rule for web apps. |
| 10 | Open item from the 5 Nov handoff note: “rounded card top crops the top of the plate” | Dish pictures are square, but the recipe card frame is 4:3, so the plate's top and bottom were cut. | The square picture now fits inside the frame and the whole plate shows. The other handoff item (meal checkboxes in English in Vietnamese mode) was already fixed in v1.7.5; checked again. |

## Ladybug reports and Studio (owner, 6 Nov — second round)

| # | Report | Change |
|---|--------|--------|
| 11 | “Copy for developer… why doesn't it feed through directly?” | Every new ladybug report is also filed as an issue in **nguyentuanphu/10GD**. This is the owner's choice of 6 Nov: one repository, and he accepted that it is public. The feature needs `FEEDBACK_GITHUB_TOKEN` (fine-grained, Issues: read and write on 10GD); `FEEDBACK_GITHUB_REPO` can point elsewhere. Each issue carries the reporter's words, the type and the technical context only: no account, device key, IP, e-mail or picture. A failure never blocks the report. Studio → Góp ý shows the issue link, and **Gửi lên GitHub** files the open reports that have none yet (20 per press, never twice). The feature stays off until the token is set. |
| 12 | No way back to the app from Studio | **← Về app / Back to app** is always visible in Studio's top bar (short **← App** on narrow phones, 44 px). |
| 13 | Report 2 Nov: “Không thấy nguyên liệu cho bữa ăn này” | The meal editor opens with **Nguyên liệu cho bữa này**: each dish's ingredients for this meal's portions. |
| 14 | Report 4 Nov: “Đã dừng và ô màu cam là gì… Thử lại và Gỡ gói… màn hình trắng rồi về homepage” | The status now reads **Mic đang tắt** instead of “Đã dừng”. The accurate-voice notice explains in one line that the white screen was the phone running out of memory and that the app switched accurate voice off. It also says what **Thử lại** (test once more) and **Gỡ gói** (delete the downloaded pack) do. |
| 15 | Report 4 Nov: “Ô ngày và bữa bị đè lên nhau. Ô ngày to quá” | iOS date boxes have a fixed native width and height. They now shrink to their column and keep the normal 44 px height, and in the voice card the two fields stack on phones. This could not be reproduced in Chromium; check on the iPhone. |
| 16 | Report 4 Nov: microphone asked on every hold | Same fix as row 9. |
| 17 | Report 5 Nov: “Người dùng phải được tự ý chọn menu cover từ ngày nào… sáng thứ 7… cover từ thứ 7 cho đến t6” | The owner approved the plan on 6 Nov: one setting for the whole family. **Tuần thực đơn bắt đầu** (Thứ 2 … Chủ nhật, default Thứ 2) sits next to the week switch on the weekly menu. The weekly menu, the week switch, **Lên thực đơn cả tuần**, **Lặp lại tuần trước** and the whole-week shopping list all follow that 7-day window. Stored data is unchanged: weeks stay keyed by their Monday, and a Saturday-to-Friday window is a view over the two stored weeks, so edits change the stored days. Auto-plan now schedules by weekday (Mon–Thu dinner, Friday dinner, Saturday lunch, Weekends feast Sat dinner → Mon breakfast), which gives the same result as before for a Monday week. |

## Text audit — every screen, VI and EN, 320 / 375 / 820 / 1280 px

A script walked Today, Weekly menu, Shopping, Recipes, Pantry, Spending, Insights, Products, How to use, plus the More tools sheet, the packed-lunch sheet and the calendar, with the owner's five family names. It flagged:

- text cut off;
- text sticking out of its button;
- a word broken in the middle;
- a short label or name split over two lines;
- leftover text in the other language.

There were 1,444 findings at the start. The last run has none of the first three kinds. The remaining items are long headings or dish names wrapping between words, and family names and family-typed items in English mode, which are kept on purpose.

Fixed along the way:

- **Weekly menu on tablet and desktop:** meals sat side by side in columns about 60 px wide, one word per line. This has been broken since Bữa phụ made four meals a day. Each day is now a row, with its meals as cards at least 250 px wide.
- **Titles:** no longer break words in the middle (e.g. “Understand / your / spen-ding”).
- **Bếp của nhà mình / Nhập bằng lời nói:** were cut off (“Bếp của nhà mìn…”). On phones they share one row without their small pictures; on Today they stay large.
- **Shopping range and store selects:** no longer cut (“Cả tuầ”, “Tất cả cửa hàng”) at 320 and 375 px.
- **More tools rows:** stay on one line.
- **Who-is-eating meal tabs:** no longer split (“Bữa / sáng”).
- **Sidebar labels:** no longer split (“Kho món / ăn”, “Thói quen ăn / uống”).
- **Top-bar app name:** at 820 px it was three lines; it is now one line.
- **Short buttons:** “Tuần này”, “Giữ bữa”, “Xem cả tuần ›”, “+ Thêm / bớt món ăn”, the date range and the urgent-message title no longer split.
- **Horizontal overflow:** 320 px EN had overflow from *See the week ›*, the week switch and a long pill; all three are fixed.

## Tests

New suite `test:v176-fixes:browser` (in `test:all`). In VI and EN at 320, 375, 820 and 1280 px, it checks:

- the talk button sits above the words box and shows without scrolling;
- the dish picture sits whole inside its card frame;
- choosing Saturday makes the menu week and whole-week shopping start on Saturday, and stored weeks stay keyed by Monday;
- the meal editor lists the meal's ingredients;

- calendar away is shown as Away, and is lifted when the member is set back home;
- “Chi tiêu” is translated with a member called Chi;
- More tools and packed-lunch names stay on one line;
- weekly menu cards are at least 200 px wide;
- nine screens have no cut-off text, no text sticking out, no broken words and no horizontal overflow.

Other suites:

- **`studio`:** a skipped run does not block **Run now**, and the switches are read fresh.
- **`online-prices:browser`:**
  - a copy saved by v1.7.5 is folded once;
  - So Giá is above the list and short;
  - the folded header shows the trip plan;
  - online lines stay on the list;
  - opening So Giá is remembered.
- **`voice-commands:browser` / `voice-ios-crash:browser`:** the second and third holds reuse the microphone (one permission request), and closing the sheet releases it. These assertions replace the earlier “stream stopped on every release”, which was the behaviour the owner reported. The meter's audio context is still released on every release.
- **Seed data:** the So Giá seed in six existing suites is marked as already migrated (`fold176`) and has its cards opened, because those suites exercise the opened panel. No assertion was removed or weakened.

## Local checks run

- `npm run check`, `npm run typecheck` and `npm test` pass.
- All 39 browser suites ran locally; the 7 voice suites ran again after the microphone change and all pass. `units` and `voice-default` failed once because the app was rebuilt while they were running; both pass when run again. The new `v176-fixes` suite passes.

## Evidence

- `docs/reviews/v1.7.6/{vi,en}-{narrow,mobile,tablet,desktop}-{today-away,pack,planner,shopping,more}.png`
- `docs/reviews/v1.7.5/online-prices/v176-folded-above-list-*.png`

These are Chromium viewport simulations, not physical devices. Henry should check the photo picker, packed-lunch table and So Giá on the iPhone after deploy.

## After deploy (owner)

In Studio → **Giá online**, press **Chạy ngay** once more. The run that was blocked should go through now. Then tick ✓ the right products under **Duyệt sản phẩm**.
