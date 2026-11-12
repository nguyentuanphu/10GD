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
