# 03: The action picker marks the actions that are running

**What to build:** In a mod's action picker, a row whose action has a live run shows **Running** next to its title. Since Issue 02, pressing a rail button while one of its actions runs opens the picker, and choosing a live row opens that run's view instead of starting the action. Today every row looks the same (`ModActionPicker.svelte:170-182`), so the user cannot tell which row reveals a run and which starts a new one.

**Blocked by:** none

**Status:** resolved

## Acceptance criteria

- [x] Write failing tests first in `src/tests/lib/plugins/mods/ModActionPicker.test.ts`, through the real `modPickerStore` and `modsRunsStore` (no mocked stores), asserting the rendered rows.
- [x] A row whose `busy()` is true shows the text `Running` (the run view's existing label, `STATUS_LABELS.running` at `ModActionPicker.svelte:10`) after its title, and carries `data-mod-action-running`. Idle rows show neither.
- [x] The mark follows the run while the picker stays open: it appears when the action starts elsewhere and goes away when the run ends (done, failed or cancelled).
- [x] The mark is part of the row's visible text, not color alone, so screen readers announce it. It does not change the row's search keywords: typing `running` does not filter rows.
- [x] Choosing a marked row still opens its run view, and choosing an unmarked row still starts the action (or asks for its input), as today.
- [x] `help/documentation/28-mods.md` says, in the paragraph on the one-live-run rule, that the picker marks running actions.

## Scope and constraints

`ModActionPicker.svelte`, its test and the docs line. No change to run keys, the busy check or the run view.

## Verification

Frontend gate: `pnpm check` and `pnpm vitest run`.

## Comments

- 2026-11-08: Follow-up from the review of Issue 02 (`work/02/review.md`, nit 2), rejected there as out of scope.
- 2026-11-08: Delivered from `issue/03-picker-marks-live-actions`. `ModActionPicker.svelte` shows a visible `Running` mark with `data-mod-action-running` on rows whose action is busy, following the run live; search keywords unchanged; docs updated in `help/documentation/28-mods.md`. Fix round: test now checks the row is marked before choosing it. Tests: `pnpm check` 0 errors; `ModActionPicker.test.ts` 34/34; full suite exit 0 (579 files, 14058 passed, 54 skipped, 1 todo). Reviews: round 1 APPROVED, round 2 APPROVED.
