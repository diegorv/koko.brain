VERDICT: APPROVED

Re-review round 2 of the fix commit c42b443b6 (`git diff 1bb3356ac..HEAD`): two help lines plus the Resolution in review.md. No source or test change.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | nit | resolved | help/documentation/20-keyboard-shortcuts.md:120 now lists Toggle Table of Contents in the shared panel row with the "turning a panel on also shows a hidden sidebar" sentence; the old separate TOC row is gone. help/documentation/07-sidebar-panels.md:14 adds the exception "(canvas, kanban, views and virtual tabs)", which matches `hidesRightSidebar` in src/lib/core/layout/layout.logic.ts (canvas, view, kanban files and the four virtual paths). |

## Acceptance criteria re-checked

- [met] Help pages above updated. — Both pages now describe the four panel toggles, TOC included, and the sidebar exception consistently (20-keyboard-shortcuts.md:120, 07-sidebar-panels.md:14). The other help edits from round 1 are untouched by the fix.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check`: exit 0, 234 files, 0 errors, 0 warnings. The fix changes no code or test; the only test that reads `20-keyboard-shortcuts.md` (src/tests/lib/features/event-calendar/event-calendar-keys.logic.test.ts:236, checks a Calendar row) passes, exit 0, 24 of 24. The full `pnpm vitest run` is deliver's to run.

## Findings

None open or new. The fix touches only the two help lines named in the nit and the workflow's own review.md; no test weakened, no scope creep, no layer-baseline change.

## Checks run

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/features/event-calendar/event-calendar-keys.logic.test.ts`: exit 0, 24 passed.
- Not run: the full suite (deliver), help page rendering (two Markdown lines).
