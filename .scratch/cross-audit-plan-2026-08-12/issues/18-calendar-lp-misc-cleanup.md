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
