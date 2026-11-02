# v1.7.3 — Family calendar ("Lịch gia đình theo tháng")

Owner request (Henry): the monthly calendar must work as a shared family notice — who is busy/away and when — without
first choosing the person. Family of 3 adults + 2 children.

## What changed

- **Whole-family view by default** (Today → "Lịch tháng"; select option "Cả nhà / Whole family" first). Each day shows
  compact markers per member and status (short name + meal letters S/Tr/T or B/L/D; Busy = amber, Away = grey; legend
  under the grid; "+N" when more than fit). Every day has an accessible name, e.g. "3 tháng 11: Bố bận bữa tối; Bé nhỏ
  vắng bữa tối". Tapping a day lists member, meal, status, note and "báo hộ" for that day, with "Sửa" per entry and
  "Báo bận / vắng ngày này".
- **Editing stays per person** with the heading "Đang báo cho: <name>" / "Reporting for: <name>"; reporting for someone
  else shows "(báo hộ · người báo: Mẹ)" / "(on behalf · reported by Mẹ)" and stores `by` (reporter member id) on the
  entry. Older entries without `by` stay valid; existing family data is never rewritten.
- **Clearer status wording**, derived from the entry's own `deduct` flag: "Bận · vẫn nấu phần" / "Busy · still cooking
  their portion", "Vắng · không nấu phần" / "Away · no portion" (a busy entry with deduct = "Bận · không nấu phần").
  Used in the calendar, the day list, schedule notes on meal cards and Today's attendance. The status select now
  pre-sets the portion checkbox (Away → no portion, Busy → still cooking); the checkbox and behaviour are unchanged.
- **Selected vs saved** look different in edit mode: selected = ring + ✓ on the normal background; saved = status-coloured
  label with meal letters.
- **Today: "Tuần này ai bận / Who’s busy this week"** — next 7 days for all members (e.g. "T3 tối: Bố bận"); each item
  opens the calendar on that day in family view. Hidden when there is nothing.
- **Immediate family notification** when someone saves or clears busy/away entries: triggered on the server by the
  family-data write itself (op=state PUT, merging clients), from the difference between the stored and the new copy —
  text is built only from family data (names, meals, dates, portion flag), plain and short. One notification per save
  (days batched), category "Lịch vắng & khẩu phần / Availability & portions" (off → nothing), quiet hours respected, not
  sent to the reporter or the saving account's member, deduped per day on the same change (re-saving identical entries
  or editing only a note sends nothing), at most 20 per family per day. Device-only / offline use sends nothing.
- **Sync merge**: one availability entry merges as a whole (newest save wins; never a mix of two devices' fields).
- **Bugs from the screenshot**: month label "Tháng 11/2026" / "November 2026"; weekday headers Mon…Sun in English;
  ‹ › have localised labels ("Tháng trước/Tháng sau", "Previous/Next month"). Layout hardened so nothing in the dialog can
  be wider than the dialog (grid tracks `minmax(0,…)`, fields/select/note `min-width:0; max-width:100%`, two-column
  status/note row collapses to one column under 520 px, month bar as a 44 px | 1fr | 44 px grid). On phones ≤420 px the
  calendar dialog is full-screen and the grid runs edge to edge so day cells stay ≥44 px wide at 320 px.

## Responsive review (browser simulation)

Suite `npm run test:family-calendar:browser` (Chromium, touch emulation for phone/tablet, reduced motion) at
**320×740 (narrow), 375×812 (mobile), 820×1100 (tablet), 1280×800 (desktop)** — VI and EN, light and dark. Checks: no
horizontal page scroll and nothing inside the dialog past its visible box (family view and edit view, all four
language/theme combinations), ≥44 px day cells / nav / footer / list buttons / Today items, month label, weekdays,
nav labels, day-cell accessible names, day list text, on-behalf storage, selected vs saved styling, Today line and its
tap, schedule note wording, offline save, no animation.

Screenshots in this folder: `<size>-today-who-busy-vi-light`, `<size>-family-day-vi-light`,
`<size>-edit-on-behalf-vi-light`, `<size>-family-vi-dark`, `<size>-family-en-dark`, `<size>-edit-en-dark`,
`<size>-today-who-busy-en-dark`, for each of narrow, mobile, tablet and desktop (28 images).

## Limits

- Browser viewport simulation only (Chromium); not tested on physical phones, tablets, Safari/WebKit or Firefox.
- The original clipping could not be reproduced in Chromium at any width from 300 to 1440 px; the fix removes every
  implicit minimum width in the dialog and the suite asserts no element exceeds the dialog box. Please re-check on the
  device/browser of the original screenshot.
- Push delivery is tested with a mock transport (server tests); no real notification was sent. A notice skipped in
  quiet hours is not re-sent later (the 19:00 day-before reminder still covers tomorrow). Older app versions that write
  without the merging protocol do not trigger notices.
- Responsive QA is not deploy approval.
