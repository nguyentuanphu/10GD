---
name: release-check
description: Checklist the agent must complete before telling Henry a Bếp Gia Đình / 10GD release is ready, and whenever Henry reports a bug. Use for every release, plan, merge of helper-agent work, or bug report in this repository.
---

# Release check — Bếp Gia Đình / 10GD

This skill follows the lessons from the 12 Nov 2026 whole-app audit: 105 problems, 22 serious. See `docs/reviews/audit-20261112/`. `AGENTS.md` rules 29–36 are the source; this is the working checklist. Do every step and write the result into the release record (`docs/reviews/<version>/review.md`).

## 1. Before planning or coding
- [ ] **Inventory the related places (rule 29).** `grep` for the function, the data field and the wording you are changing. List every place that does the same job: screens, sheets, voice, receipts, import, Studio, share text and notifications. Write the list in the plan.
- [ ] **When fixing a reported bug,** search for the same pattern elsewhere (rule 36), and plan to fix all of it.
- [ ] **Privacy or data change?** Stop and ask Henry with the exact VI and EN wording first (rule 28).

## 2. While building
- [ ] **No silent defaults (rule 32).** Units, amounts, prices, places, people, stores and dates are either chosen by the family or truly known. Unknown means empty or “Chưa rõ”, never g, $0 or the first item in a list.
- [ ] **Add, edit, undo parity (rule 31).** If the family can add something, they can also edit it and undo removing it, the same way as similar items.
- [ ] **Counts match content (rule 31).** Every number on a control equals what the control opens.
- [ ] **Week start.** Use `planStartOf(state, date)` / `weekStartDay(state)`. Never assume Monday, and never index weeks by anything else.
- [ ] **Time and money.** Use Sydney time helpers (`sydneyDate`, Australia/Sydney formatting), never the device zone. Format money with the currency helper, never a hand-written "$".
- [ ] **Language.** Wrap every new string as VI/EN (`tr`/`T`), including titles, placeholders, aria-labels, toasts and share text.
- [ ] **Rules 19–27.** No emoji. Use drawings from `ui-art.ts` on main and icon-only buttons only. Sheet X / Đóng / Lưu are floating pills. Tap targets are at least 44 px. Tapping must not move the page.

## 3. Tests (each must fail on the old code where it covers a bug)
- [ ] A browser test taps every new or changed control. Run it with data and with empty data, in VI and EN, at 320/375/820/1280, in light and dark.
- [ ] **Family settings matrix (rule 34).** Cover a week starting on Saturday or Sunday, a non-Sydney device time zone (`timezoneId`), a non-AUD currency, recipes with a yield, guests, and two devices merged with the sync merge.
- [ ] **Round trip (rule 33).** After the changes, `validImport(state)` is true and the sync merge keeps every edit.
- [ ] Add each new suite to `test:all` in package.json.

## 4. Before saying “ready”
- [ ] **Check helper work yourself (rule 30).** Read the diff, open each changed screen yourself, and check the related places.
- [ ] **Audit sweep (rule 35).** Run `npm run test:audit:browser`, plus review against this checklist. Record what you found, fix the serious items, and list the rest for Henry.
- [ ] **Local checks.** Run the checks for what changed (rule 17), not the whole `test:all` (Henry, 14 Nov 2026: rely on CI, rule 17a). Use local runs to find the cause of a CI failure.
- [ ] **CI.** GitHub CI must be green on the exact head before merge after DEPLOY.
- [ ] **Report to Henry** in Vietnamese, in Sydney time. Include:
  - what changed;
  - every privacy or data change in plain words (or “none”);
  - the related places checked;
  - the limits (simulation, not a real phone);
  - the PR and CI links.

  End with the việc / cần duyệt / bước tiếp table.
