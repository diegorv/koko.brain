# Issue 13: Editor / save-path deletions (C06 steps 1-3)

Status: ready-for-agent
Phase: P2 (cluster C06, steps 1-3)
Source: PONY #54 → #44 → #15, then #55 — plan-2026-08-12.md §P2 — Safe deletion batch (Editor files, strict order)
Blocked by: none

## What

Delete the dead editor/save-path symbols **before any ARCH editor refactor touches these files**, so
the shared test files are rewritten once instead of twice. Strict internal order, corrected ranges,
one commit each.

## How

Strict order, one commit per step:

1. **#54** delete `flushPendingSaves` — **corrected range `:191-195`**.
2. **#44** delete `clearRecentSaves` — with a **corrected commit message**: the watcher *deliberately*
   does not clear, per `watcher-handler.service.ts:43-45` and **ADR-0017 Decision item 5**. Do not
   write the "watcher should clear" story into the message.
3. **#15** delete the transform hooks — **corrected tail `:119-148`**; **never touch `notifyAfterSave`
   at `:150+`**. Collateral in the same commit: collapse `editor.service.ts:139-145` to a bare
   `writeTextFile`; reword `docs/perf/baseline-template.md:23`; note in the commit message that this
   **reverses 80abf50**.
4. **#55** delete `closeVault` — **corrected range `vault.service.ts:36-40`** (the file is 40 lines;
   the finding's stated `:38-42` overshoots EOF). Edit arch 3.0's collision rationale out but keep its
   "already implemented and tested" leg.

## Gate

Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build` before every commit. Stage only the
files for the current step, verify with `git diff --cached --stat`, and commit each step separately
using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
