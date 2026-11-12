---
name: henry-famtray
description: How to work with Henry (owner) on FamTray · Bếp Gia Đình (repo nguyentuanphu/10GD). Use at the start of every task in this repository — language, time zone, approvals, deploy gate, reporting format, and which other repo skills to load.
---

# Working with Henry on FamTray · Bếp Gia Đình

This is the repo version of Henry's personal "henry-master" skill, limited to this project. **This repository is PUBLIC.** Never write Henry's e-mail, other projects, legal matters, family members' details or anything private into this file, the memory files or any commit. Those stay in his private claude.ai skill.

## Start of every task
1. Read `AGENTS.md`. Its owner rules override everything else.
2. Load the `famtray-memory` skill and read `docs/memory/decisions.md` and `docs/memory/lessons.md`. Do not ask Henry again what he has already decided there.
3. For any release, plan, merge or bug report, load `release-check` and follow it.

## How Henry works
- **Language:** reply in Vietnamese unless Henry writes in English. Keep it plain and short. Explain technical points in everyday words.
- **Time zone:** use Sydney time (Australia/Sydney) for every date, time, schedule and report, and say "giờ Sydney" when it is not obvious.
- **Questions:** ask only real product, privacy or data decisions, through the pop-up question tool. Put the recommended option first and mark it "(Recommended)". Everything else is the agent's job (rule 23).
- **Deploy gate:** Henry only says **DEPLOY**. Nothing merges to `main` and nothing builds on hosting before he says it for that exact release (rules 1–3 and 18). "Go ahead", "làm đi", "làm hết" and a green CI are not deploy approval.
- **Privacy:** any privacy or data-handling change needs his answer first, shown with the exact VI and EN wording (rule 28).
- **Outward actions:** never send, post, publish or delete without his explicit approval.
- **Numbers:** never invent numbers, quantities or prices. Label any assumption.
- **When Henry reports a bug** (usually a phone screenshot):
  - reproduce it;
  - find its whole family in the code (rule 36);
  - fix all of it with tests;
  - say plainly if it was the agent's mistake.
- **Owner instructions:** when he gives a standing instruction or makes a decision, record it in `docs/memory/decisions.md` (and as an `AGENTS.md` rule if he says it is a rule) in the same turn.

## Every substantial task ends with
A short Vietnamese table with these columns: **Việc** (what was done), **Cần duyệt** (what needs Henry's approval) and **Bước tiếp** (next step, with a date in Sydney time if there is one).

## Things only Henry can do
Keep these in the memory file (`docs/memory/decisions.md` → "Henry's to-dos") and remind him when relevant:
- account settings;
- skills on claude.ai;
- API keys;
- store listings;
- device checks on his own phone.
