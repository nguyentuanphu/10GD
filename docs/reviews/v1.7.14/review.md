# v1.7.14 — nothing left to buy after shopping and putting away

**Owner, 8 Nov 2026 (Sydney time):** *“Bạn kiểm tra giỏ đồ của tôi, hôm qua vừa mới đi chợ rồi, cất đồ rồi mà tại sao vẫn hiện đồ để đi mua?”*

The family's own list is on the production server and was not read. The same steps were repeated in the browser on the released code (v1.7.13): plan a week, tick everything bought, **Cất đồ**. Two causes came up.

## 1. Boxes / packs without a known weight came back in full
- **Before:** an item bought by the box or pack (e.g. *Mọc 0.4 hộp*, *Mỳ trứng 1 gói*) with no gram conversion was put away as **0 g + “1 hộp”**. The list subtracts by weight, so after putting away it asked for the item again in full. Reproduced: 1 hộp nấm put away → the list still asked for 125 g nấm.
- **Now:**
  - When put away, such a box / pack **covers what the list asked for at that moment**. The lot is marked as an estimate, and the pantry shows *“≈ 125 g · ước tính đủ cho các bữa đã lên lịch”*. It leaves the list and is used when cooking. The family can change it in the pantry.
  - **Boxes / packs already put away before this fix (0 g)** are not guessed. Their list row shows *“Đã cất 1 hộp trong tủ (chưa rõ g). Đủ cho các bữa chưa?”* with **Đủ rồi** (counts the lot as covering what the list still needs, marked as an estimate) or **Vẫn cần mua** (keeps the row and stops asking).
- The toast after putting away and the put-away sheet's note now say this, instead of “không tự trừ nhu cầu gram”.

## 2. Rounding leftovers
- **Before:** 996.9 g needed and 996.9 g kept could leave a tiny difference that the list rounded up to **0.1 g to buy**.
- **Now:** a difference under 0.05 (g / ml / pieces) is not something to buy. Items counted in pieces are rounded up only for a real shortfall.

## Not changed
- *Trừ đồ đang có trong Tủ* still decides whether stock is taken off the list. When it is off, the list shows full amounts on purpose.
- An amount picked by hand (*“Bạn chọn · Mua ít hơn cần”*) that is less than the meals need still leaves the rest on the list.

## Owner decision (pop-up, 8 Nov 2026)
- *“Tự tính là đủ (ước tính)”*. Boxes / packs without a weight count as covering what the list asked for when put away.
- This replaces the first version's rule (31 Oct 2026) that a box was kept with no weight at all, which is what left the item on the list.
- `units-catalog.test` follows the new decision. The count is still kept, and the mass is marked as an estimate.

## Data
- New optional fields on pantry lots: `qtyEstimated` and `coverAsked`.
- Existing lots are not changed until the family answers.

## Tests
- `core.test`: a rounding leftover is not on the list; a real shortfall still is.
- **New browser suite `test:v1714:browser`** (in `test:all`), at 375×812 (VI) and 1280×800 (EN):
  - a full week bought and put away (one item by the box) → **nothing left to buy**;
  - the box is counted as an estimate and the pantry says so;
  - an old 0 g box still shows, with the question; **Đủ rồi** takes it off; **Vẫn cần mua** keeps it and stops asking;
  - ≥ 44 px, no overflow, no page errors.

## Evidence
- `docs/reviews/v1.7.14/pack-cover-ask-{vi,en}-{size}.png`. Chromium viewport simulation, not physical devices.

## Limits
- The family's real list was not inspected. If something still shows after this release, a screenshot of the row (and of *Đồ trong tủ*) will show which case it is.
