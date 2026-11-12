# v1.7.19: a reply notification opens “Góp ý của tôi”; privacy rule 28

All times are in Sydney time. **Not approved for deploy.** Nothing is merged into main or built on hosting until Henry says DEPLOY.

## Owner decisions, 12 Nov 2026 (pop-up)
- **Privacy section 7a** (receipt text sent to improve reading, added in v1.7.18): **kept as it is.** Henry was not asked before it went live. That was the agent's mistake, and it led to the new rule 28.
- **Reply to a family's feedback:** tapping the notification opens the ladybug straight on **“Góp ý của tôi”**.

## 1. AGENTS.md rule 28: privacy changes need Henry first
These changes need Henry's answer, given through the pop-up, before they go on any release branch:
- the privacy policy;
- the terms;
- what personal or family data the app collects, sends, stores or shares.

The question must show him the exact VI and EN wording and the data change. Approving a feature does not approve its privacy text. Every release report must name each privacy or data change in plain words.

## 2. A reply notification opens “Góp ý của tôi”
**Before:** Studio replies to a report, and the person who sent it gets “Có trả lời góp ý của bạn — Chạm con bọ rùa → Góp ý của tôi.” Tapping it opened Hôm nay only, so they had to find the ladybug and the tab themselves.

**Now:**
- The notification links to `/#today?lb=mine`.
- The text reads “Chạm để đọc câu trả lời.” / “Tap to read the reply.” (rule 26).
- **Server (`push.mts`), service worker (`sw.ts`) and the in-app push handler (`household-ui.ts`):** these accept that one extra link. Any other unknown link is still not passed on.
- **App (`ladybug.ts`):** the app opens on Hôm nay, puts back a plain `#today`, and opens the ladybug on “Góp ý của tôi”. This works when the app was closed and when it is already open.
- If the ladybug is not shown for this person, only Hôm nay opens.

**Data:** none. No new data is collected, sent or stored, and the privacy text is unchanged.

**Tests:**
- `notifications.test` (in `npm test`) checks:
  - the reply link and its wording in VI and EN;
  - that other unknown links are not passed on.
- `test:ladybug:browser` checks:
  - from a closed app, the link opens the sheet with “Góp ý của tôi” selected and leaves `#today`;
  - the same with the app already open;
  - nothing opens for someone the ladybug is hidden from.

**Local results** (12 Nov 2026, Sydney time): check, typecheck, `npm test`, `test:ladybug:browser` and `test:offline:browser` all OK.

## 3. Evidence: the buying-unit sheet on the live site
Henry asked on 12 Nov 2026 why he could not see the new unit sheet. These screenshots were taken on the live 10gd.netlify.app (v1.7.18) at 390×844 in Chromium, with test data in device-only mode. They show where the sheet is:
- `unit-picker-prod/1-di-cho-nut-luong-mua.png`: the quantity button on Đi chợ.
- `2-bang-chon-don-vi.png`: suggestions shown straight away.
- `3-xem-tat-ca-don-vi.png`: “Xem tất cả đơn vị”.
- `4-them-don-vi-rieng.png`: “Tự thêm đơn vị”, with the optional conversion.

These are not screenshots from a physical phone.

## Audit fixes — language, Sydney time and money (W4)
Audit of 12 Nov 2026 (Sydney time), findings D11–D21 and B13, B17, B19–B22. Branch `agent-w4/fixes`. **Privacy / data change: none.** What is sent off the device is unchanged. The errand push body is untouched; only the text the family shares or copies follows the app language. `dist/privacy.html`, `dist/feedback-privacy.html` and the ladybug filing are not touched.

**Test:** `test:v1719-language:browser` (`src/tests/v1719-language-browser.test.cts`, added to `test:all`). It covers the following:
- EN sweep of every screen and of every reachable sheet the audit named.
- A check of every hard-coded sheet title, error, placeholder and accessible label in the code (115 literals).
- Share text in EN and VI.
- VI developer words.
- Sydney time on `Asia/Ho_Chi_Minh` and `America/New_York` devices, with the clock fixed at 12:00 Sydney.
- VND in global search.
- Accent-insensitive search.
- `validImport` round trip.

Before the fixes, the first run of this suite listed more than 600 problems. It now passes. Screenshots are in `language-time-money/`: EN pantry edit, where to buy and stores, at 320×740, 375×812, 820×1100 and 1280×800, light and dark. This is Chromium viewport simulation, not physical phones.

| Finding | What changed | Test |
|---|---|---|
| D12 (Henry) | Pantry edit sheet: "Edit pantry food", "Delete this batch"; the buying-unit lot sheet is translated too (`unit-picker.ts`) | EN sheet sweep |
| D11, B22 | Stores, add/edit store, "Where to buy X?" for items and extras: every title, label, placeholder and button in English; dynamic titles use `uiText` with the English ingredient name | EN sheet sweep |
| D13 | Shopping rows: "Used in N meals · Your amount · Less than the recipes need"; "Bought/Remove X" labels; the family's purchase note is marked as family content | EN screen sweep, with a custom amount seeded |
| D14 (language part) | `textShopping` and the family week share are in the app's language (English day and dish names; family dishes and notes stay as written). The errand share and copy use `requestShareText`. The emoji lines keep their structure for W5. | EN/VI share check |
| D15 | All 95 literals have English (dictionary block in `language.ts`, plus `uiText` where names are built in); the suite now scans every `modal(` title, `throw Error(` message, placeholder and aria-label in the code | literal check |
| D16 | "Gợi ý thực đơn khác" replaces "/ Generate mới"; "hóa đơn" replaces "receipt"; the CSV sheet explains each column name in Vietnamese | VI sheet check |
| D17 | Errand result sheets: "Đã lưu yêu cầu, nhưng chưa gửi được thông báo tới điện thoại người nhận" (+ EN) | literal check |
| D18 | Studio → Góp ý says "kho lỗi của nhóm làm app" / "the app team's issue list" and "cài đặt máy chủ". Only the wording changed; nothing sent changes. | source check |
| D19, D20, D21, B21 | One helper, `appTimeLabel` / `sydneyParts` / `sydneyHour` (`core.ts`), in the family's zone (Sydney by default, the same zone as `sydneyDate`). It is used by the sync-conflict sheet, So Giá "Updated", receipt tick/capture/created times, extension last seen, trusted-device expiry, ladybug times, the voice check, the greeting's default hour and the automatic dark theme. Studio sign-up labels, capture times and "Computed" are in Sydney time with "giờ Sydney". | TZ check + source scan for device-zone formatting |
| B13 | Global search receipts, receipt matching and receipt quality use `aud(n, currency)`. VND shows "125.000 ₫". Receipt matching keeps a discount's minus sign. | VND check |
| B17 | `searchHit` (same `normalizeText` as global search) for the meal picker, the recipe list and the weekend soup search | accent check |
| B19 | The guest total no longer switches to a decimal comma; portions use one style | source check |
| B20 | The dry place is "Pantry shelf" everywhere (dictionary and global search) | pantry places check |

**Not fixed, and why**
- **Legacy sheets that cannot be opened in family mode:** week advice, day suggestion, the weekend soup picker, the old meal editor and the old recipe form. Their titles, labels and messages are translated. Their long body text is not, because no screen opens them any more (checked in the browser: no control for them on any screen). The code is kept.
- **Start-up failure page (`bootstrap.ts`, part of D16):** it is still bilingual ("VI / EN"). It shows before the language setting loads, and the heading, note and Retry button are bilingual too. The startup tests assert the bilingual button. Changing this needs a product decision.
- **Usage statistics' hour buckets (`usage-analytics.ts`):** these use the device hour. That is stored and sent data, so it is left alone under the no-data-change rule.
- **So Giá / voice price amounts:** these stay in AUD on purpose, because they are Australian supermarket prices.
- **Week-start uses near the greeting (`monday(date)`):** these belong to the week-start group (W2/W3).
- **B19 amount precision:** the precision in `pantryBuyingDisplay` and the "suất" / "suất chuẩn" wording are left to the amounts and maths group.
