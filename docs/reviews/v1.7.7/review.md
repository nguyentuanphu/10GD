# v1.7.7 — online prices actually run (owner report 6 Nov 2026, 11:52 Sydney time)

Branch `release/v1.7.7` from `main` at `d366930` (Release v1.7.6). Waits for green PR CI and Henry's DEPLOY (AGENTS.md rules 1–3, 15, 23).

## What Henry reported
Studio → Giá online → **Chạy ngay** showed “Request failed” every time. “Lần chạy gần nhất” still read 06/11/2026 06:54 · skipped (switched off). The app showed no online prices: “Đã có giá: 0/6 món”.

## Why
1. **A full refresh never finished.**
   - It makes about 28 Pinch basket calls (136 catalogue items, 5 per call) and up to 6 WhichGrocer calls, which must be 5 s apart. That takes more than a minute.
   - A normal server request is cut off after a few seconds, so the request was stopped and Studio showed the generic “Request failed”.
   - The 06:xx Wednesday and Saturday schedule had the same limit, so no price was ever saved.
2. **Prices appear only after review.** Families see a price only for products the owner confirmed (✓) under **Duyệt sản phẩm**. With no finished run there was nothing to review, so the list showed 0.

## Changes
- **Refresh runs in the background:** new `online-prices-background` function, allowed up to 15 minutes.
  - **Chạy ngay** and the schedule only start it, with a one-time token kept in the price cache. A wrong or reused token is refused.
  - A second press while a run is going starts nothing new.
- **Studio → Giá online:**
  - While a run is going, the page shows “Đang chạy từ HH:MM (giờ Sydney) — thường mất 1–3 phút” and refreshes itself every 10 s.
  - A run that did not finish says so, and **Chạy ngay** tries again.
  - With both switches off, **Chạy ngay** says “Hãy bật Pinch hoặc WhichGrocer trước”.
- **Duyệt sản phẩm:** a new **✓ Đúng hết (N)** button. Skim the list, press ✗ on the wrong rows, then confirm the rest in one go. It is audited like the single ✓.
- Release 1.7.7.

## Tests
- `studio` (unit):
  - with the switches off, Run now gives a clear message;
  - Run now starts the background function once, with a one-time token;
  - the background function refuses a wrong or reused token, calls Pinch, and records the end of the run and its status.
- New `test:studio-online:browser` (in `test:all`), against the real Studio handler at 375×812 VI light, 820×1100 EN dark and 1280×800 VI light:
  - each switch sits on one line;
  - Run now shows “running since … (Sydney time)”;
  - ✗ on one row, then **Đúng hết** confirms the others and leaves the ✗ row rejected;
  - no horizontal overflow.
  It caught a real bug before release: after a ✗, “Đúng hết” confirmed the wrong rows.
- Local: `npm run check`, `npm run typecheck`, `npm test`, `studio-nav`, `online-prices` and `scout-studio` browser suites pass.

## Limits
- Pinch and WhichGrocer were not called for real here; the tests use synthetic responses.
- The real run, and how long it takes, will show in Studio after deploy.

## After deploy (owner)
1. Studio → Giá online → **Chạy ngay**. Wait 1–3 minutes; the page updates by itself.
2. Under **Duyệt sản phẩm**, press ✗ on wrong products, then **✓ Đúng hết**.
3. Open Đi chợ in the app and press **Làm mới giá**. Online prices show for the confirmed products.
