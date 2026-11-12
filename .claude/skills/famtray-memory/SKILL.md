---
name: famtray-memory
description: The project's long-term memory for FamTray · Bếp Gia Đình — owner decisions, lessons from past mistakes, and how this repo and its tests behave. Read at the start of every task in this repository; add to it whenever Henry decides something or a mistake teaches something.
---

# FamTray memory

Sessions in this repository start fresh, so this skill and its files are how the agent learns and remembers between sessions.

## Files
- `docs/memory/decisions.md`: Henry's product decisions and standing instructions, newest first. Each entry gives the date (Sydney time), Henry's words or the pop-up answer, and what it means for the code.
- `docs/memory/lessons.md`: mistakes the agent made, what they cost, and the habit that prevents them. Each lesson points to the `AGENTS.md` rule or test that enforces it.
- `docs/memory/repo-notes.md`: practical facts about building and testing this repository, so they are not rediscovered every session.

## Read
At the start of every task, read all three files. If the task touches an area with a recorded decision, follow it and do not ask again.

## Write: in the same turn, never "later"
- **Henry decides something** (pop-up answer, chat instruction, DEPLOY of a release): add a line to `decisions.md`.
- **Henry finds a bug the agent should have caught, or a release needed a fix after review:** add a lesson to `lessons.md`. Also add or strengthen the rule or test that would have caught it.
- **A build or test quirk took more than a few minutes to work out:** add it to `repo-notes.md`.
- Commit memory changes with the work they belong to, on the release branch. They reach `main` only with the release, after DEPLOY.

## Privacy
**This repository is PUBLIC.** Never write e-mail addresses, keys, tokens, family members' details or anything private. Never write anything about Henry's other projects or legal matters. Write product decisions only.
