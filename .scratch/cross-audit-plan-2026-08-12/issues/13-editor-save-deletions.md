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

**2026-08-18 — done (all four steps landed, strict order, one commit each).**

- Step 1 (#54) `flushPendingSaves` → 33e1529. Reviewer confirmed born-dead (no commit ever
  added a caller); bonus finding: the deleted test was order-dependent (never called
  `onContentChange`, passed only via closure leakage through the module-scoped debounce mock).
- Step 2 (#44) `clearRecentSaves` → 33f8064. Commit message written per the correction: the
  watcher deliberately does not clear (watcher-handler.service.ts:44-45, ADR-0017 Decision
  item 5); no "watcher should clear" story.
- Step 3 (#15) transform hooks → 31c3703. Tail stopped at `:148`; `notifyAfterSave` untouched
  except the two dangling `readTransform/writeTransform = null` resets inside `resetHooks`
  (mechanical collateral of deleting the vars). `editor.service.ts:139-145` collapsed to bare
  `writeTextFile`; `docs/perf/baseline-template.md:23` reworded; commit notes it reverses
  80abf50's keep-the-seam decision. Reviewer verified behavior parity line-by-line, including
  race re-check ordering in `openFileInEditor`.
- Step 4 (#55) `closeVault` → this commit. Corrected range `:36-40` applied (HEAD file was
  exactly 40 lines; `:38-42` would have overshot EOF). Arch 3.0's collision rationale edited
  out of reverification-2026-08-12.md (Recommendation + Verdict + the "Naming collision
  confirmed" bullet); the "already lives at :117-122 / tested at test:712-734" leg preserved.
  `vaultStore.close()` behavior stays covered by vault.store.test.ts:37-41,94-109.

Red-green note: these are pure dead-code deletions, so the "red" proof is the caller trace
(repo-wide grep = zero production references for all four symbols, re-verified independently
by each reviewer) rather than a failing regression test. Gate ran green before every commit
(`pnpm check` 0 errors, `pnpm vitest run` 290 files green, `pnpm build` OK); vitest count
walked 6697 → 6696 → 6680 → 6678, matching the deleted test collateral exactly. Adversarial
review (fable sub-agent, refute stance): "could not refute" on all four diffs; no working-tree
mutations by reviewers (git status audited after each run).
