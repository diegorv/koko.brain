# Issue 18: Calendar, live-preview and misc cleanup

Status: ready-for-agent
Phase: P2
Source: PONY #38 #2 #36 #41 #58 #18 #52, ARCH 7.1 (reduced), ARCH 1.2 (reduced) — plan-2026-08-12.md §P2 — Safe deletion batch (Calendar / LP / misc)
Blocked by: none

## What

The calendar wrapper inlining, the small live-preview deletions, the corrected canvas-helper cut, one
date-formatting reuse, plus two reduced ARCH items that ride the same surfaces (the kanban no-op
guard, M27, and one false comment). All are pure deletions or mechanical rewrites and must land
before any ARCH refactor rewrites these files.

## How

- **#38** inline the calendar wrappers at `CalendarPanel` with a direct `openFileInEditor` import;
  **keep** the `openOrCreatePeriodicNoteForDate` import (Dayjs-vs-dateKey naming trap). Per C13 this
  is permanently **NOT** an arch 2.2 caller — calendar has no position target.
- **#2** delete the debug-composition surface, plus the 4 dead lines in `editor-extensions` and the 3
  prose comments; note in the commit message the contrary judgment recorded at
  `tasks/done/negative-patterns-remediation.md:21`.
- **#36** delete the 5 `Decoration` constants + 2 CSS rules — **keep `.cm-lp-code`**.
- **#41** delete `HorizontalRuleWidget` + `.cm-lp-hr` — **keep the `:15` import**.
- **#58** `core/types.ts` — fold `Line` into the existing import and fix the jsdoc.
- **#18** canvas helpers — **corrected range `374-408` ONLY**; `:411` is the LIVE `duplicateNode` and
  must not be touched. The test-import surgery is mandatory, same commit.
- **#52** reuse `formatDate(date, 'YYYY-MM-DD')`. **NEVER** `toLocaleDateString('en-CA')` — WKWebView
  ICU drift empties the calendar. No cross-layer import.
- **ARCH 7.1 (reduced)** — make `persistState`/`persistCalendarConfig` end in `commitStructural`
  (~6 mechanical lines) and copy the no-op pre-guard into `KanbanView.applyChange` (fixes M27).
- **ARCH 1.2 (reduced)** — fix the false cross-reference comment at `queryjs-block-widget.ts:95`
  only. The `clearAllWidgetCaches` barrel is deferred to P5 (see issue 45).

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files for each item (`git add <specific files>`), then verify with
  `git diff --cached --stat`.
- **One commit per item**, test collateral in the same commit. Full commit format (Context, Problem,
  Solution, Behavior, Files with line ranges).

## Comments
### 2026-08-18 - closing

All nine items landed, one commit per item, in issue order.

| Step | Resolving SHA |
|------|---------------|
| #38 | `fea106fa` |
| #2 | `6ec98aa7` |
| #36 | `4e21d453` |
| #41 | `5aa08884` |
| #58 | `82044ad8` |
| #18 | `52f8e6ac` |
| #52 | `058bccd4` |
| ARCH 7.1 (reduced) | `003c7d01` |
| ARCH 1.2 (reduced) | this commit |

**Gate + review, per step** (frontend surface throughout: `pnpm check` + `pnpm vitest run` +
`pnpm build`; adversarial reviewer was a Fable 5 sub-agent under the presumed-flawed stance):

- **#38** `fea106fa` - gate green. Review: could_not_refute, 0 fix rounds.
- **#2** `6ec98aa7` - gate green. Review: could_not_refute, 0 fix rounds.
- **#36** `4e21d453` - gate green. Review: could_not_refute, 0 fix rounds.
- **#41** `5aa08884` - gate green. Review: could_not_refute, 0 fix rounds.
- **#58** `82044ad8` - gate green. Review: could_not_refute, 0 fix rounds.
- **#18** `52f8e6ac` - gate green. Review: could_not_refute, 0 fix rounds.
- **#52** `058bccd4` - gate green. Review: could_not_refute, 0 fix rounds.
- **ARCH 7.1** `003c7d01` - gate green. Review: could_not_refute, 0 fix rounds.
- **ARCH 1.2** (this commit) - gate green (`check` 191 files / 0 errors, `vitest` 293 files /
  6571 passed, `build` exit 0). Comment-only change, so no test collateral; the claim itself was
  re-verified against the four sibling widgets before commit.

**Evidence in brief:**

- Deletion steps (#2, #36, #41, #18) rested on caller traces: every deleted symbol had zero
  surviving references, and the surfaces that did still reference them were migrated in the same
  commit (`4e21d453` updated two e2e specs; `5aa08884` dropped the `.cm-lp-hr` row from
  `tasks/notes/css-classes-inventory.md`; `52f8e6ac` removed the matching 77 test lines alongside
  the 36 source lines).
- Keep-lists were honoured: `.cm-lp-code` (#36), the `:15` import (#41), the LIVE `duplicateNode`
  at the old `:411` (#18), and the `openOrCreatePeriodicNoteForDate` import (#38).
- #58 is the one deletion that gained coverage rather than losing it: folding `LineInfo` into
  CodeMirror's `Line` added 38 lines to `get-all-lines.test.ts`.
- #52 and ARCH 7.1 were red-green: `058bccd4` added 11 lines to `file-history.logic.test.ts`, and
  `003c7d01` added a `KanbanViewHarness.svelte` fixture plus 118 test lines pinning the no-op
  pre-guard (M27) in `KanbanView.applyChange`.
- ARCH 1.2: the comment at `queryjs-block-widget.ts:95` claimed the `!isConnected` guard "mirrors"
  mermaid / collection / block-math. Reading those widgets refutes it - `mermaid-widget.ts:36` and
  `block-math-widget.ts:10` / `inline-math-widget.ts:10` cache markup STRINGS, and
  `collection-block-widget.ts:36` caches query DATA and rebuilds the DOM per `toDOM()`. None of them
  holds a live node, so none of them has (or needs) an `isConnected` check; `grep -rn isConnected`
  over the live-preview and collection trees returns exactly one hit, the queryjs one. The comment
  now says the guard is unique to this widget and why.

**Notes:**

- All seven prior steps reviewed could_not_refute, zero fix rounds, gates green.
- Note from #52 review: the finding covered TWO sites (collection `calendar.logic.ts`
  `formatDateKey` AND file-history `toDateKey`) despite the issue's singular phrasing - both were
  converted, correctly.
- Follow-up candidates from reviews: `tasks/notes/css-classes-inventory.md:99` still lists
  `cm-lp-hard-break` (stale pre-existing); `CalendarPanel`'s inlined `'daily'` literal now lives in
  untestable component code (inherent to the mandated inline).

**Minor findings for follow-up (none blocking):**

- minor - `src/lib/features/collection/CollectionView.svelte:257-262`: the `persistCalendarConfig`
  leg of the consolidation has no direct test coverage anywhere (grep for
  `persistCalendarConfig`/`viewDateProperty` in `src/tests/` is empty). Pre-existing gap, and the
  edit is byte-equivalent to the `persistState` leg which IS pinned by `CollectionView.test.ts`, so
  this does not block the commit; worth a test whenever the calendar config surface is next touched.
- minor - `src/lib/features/type-definitions/TypeNoteList.svelte:236`: out-of-scope observation, no
  action for this commit. `persistViewState` arms its own `selfUpdate` latch unconditionally before
  an async write, the third latch of this family in the codebase. Whether it has an analogous
  no-op/error-path hazard was not traced (issue 18's scope contract bounds ARCH 7.1 to
  `CollectionView` + `KanbanView`); flagging so the pattern is on record for a future audit.

**Discrepancy vs plan:** none. The issue's reduced scoping of ARCH 1.2 (comment only, barrel
deferred to P5 / issue 45) was followed; no `clearAllWidgetCaches` barrel was built.
