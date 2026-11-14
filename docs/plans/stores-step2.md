# More stores, step 2 (planned, not in v1.7.20)

Step 1 shipped in v1.7.19 (13 Nov 2026, Sydney time): this version's validators accept every store id in `store-registry.ts` for saved products and So Giá observations, but nothing new is offered, so older devices never receive an id they would reject.

**Step 2** offers ALDI, Harris Farm, IGA, Costco, Spudshed, FoodWorks and the others:
- the product form, filter, search links and CSV import list them;
- So Giá saves them under their own ids instead of `other`;
- the server's So Giá ids (`community-prices.mts`, `grocery-pricing.mts`) are widened, and `shopping-optimizer.ts` gets a fallback for an id it does not know.

**When it is safe:** when almost every active device runs v1.7.19 or later. A device still on v1.7.18 that syncs a family state holding an ALDI product would reject the state and stop syncing.
- Check in Studio → Usage → versions (14 days of active devices). Go ahead when v1.7.18 and older are under 2% of active devices, and at least 14 days after 13 Nov 2026 (so not before 27 Nov 2026, Sydney time).
- Until then, older devices see the recovery screen only if a newer device saves such a product, which step 2 would start.

**Tests for step 2:** an older-validator round trip (the v1.7.18 `validImport` from main's history) rejects the new ids — proving why we waited — and the current one accepts them; the offered lists include every registry store; So Giá saves `aldi`; the server accepts it.

Same gate: Henry says DEPLOY.

## Done early in v1.7.21 (Henry, 14 Nov 2026, evening AEDT: "Làm luôn đi đừng chờ")
- Henry chose not to wait for the 27 Nov device check. Risk he accepted: a device still on v1.7.18 that syncs a family state
  holding one of the new store ids stops syncing until it updates (opening the app updates it).
- Offered now: ALDI, Harris Farm, IGA, Costco, Spudshed, FoodWorks in saved products (form, filter, CSV) and So Giá (own ids,
  voice prices, receipts). Online search links only for ALDI, Harris Farm and Costco (IGA, Spudshed, FoodWorks have none).
- Kept for older data: products from these stores still accept any plain https link (the step-1 rule); a link is shown only
  when it is on the store's own website. Server So Giá ids widened in community-prices and grocery-pricing; the optimiser
  skips an id it does not know instead of failing.
