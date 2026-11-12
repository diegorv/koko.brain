# Issue 109 discovery: clean row text and chips

No `spec.md` in `.scratch/tasks-view-ux/`; the Issue text is the spec.

## Files that change
- `src/lib/features/tasks/tasks.logic.ts` (append after `parseTaskTextSegments`, ~line 320): `stripTaskTrailers`, `usesRawTaskText`, `taskDisplayText`, `TaskChip`, `taskChips`. New import `formatDate` from `#lib/utils/date.js`, types `TaskMetadata` from `./tasks.types`.
- `src/lib/features/tasks/TasksView.svelte`: root div (line 224) gains `@container`; `today` `$derived.by` reading `tasksStore.fileTaskGroups` + `formatNow('YYYY-MM-DD')`; row (lines 354-396): circle `aria-label` uses `taskDisplayText(task)` (line 363), text renders `parseTaskTextSegments(taskDisplayText(task))` (line 376), chips after the text from `taskChips(task.metadata, today, { tags: !usesRawTaskText(task), open: isTaskOpen(task.status) })`. Text + chips sit in one `flex flex-wrap items-baseline` wrapper that turns `@max-[560px]:flex-col`. `Calendar` icon on the due chip.
- Tests: `src/tests/lib/features/tasks/tasks.logic.test.ts` (new describes), `src/tests/lib/features/tasks/TasksView.test.ts` (new describe with fake Date; the seven-status label test changes on purpose: its todo fixture text carries signifiers, so its label reads `Send invoice`), `e2e/specs/tasks-view.spec.ts` (new narrow-pane chip test).
- Fixture `src/tests/fixtures/tasks.fixture.ts`: `taskV2(text, overrides)` already takes `text` and `metadata`; no change.

## Plan (commit order)
1. Logic test-first: `taskChips`, `stripTaskTrailers`, `taskDisplayText`/`usesRawTaskText` pairs from the Issue -> fail -> implement.
2. View test-first: Send-invoice row (text, chips, overdue hooks, circle label, toggle payload), Book wikilink row, done past-due row -> fail -> implement view; update the seven-status label assertion.
3. e2e test, run `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts`.
4. Targeted checks: `pnpm check`, the tasks test files, the source scans named in the Issue Notes.

## Prior art
- Seven-status / `mockTaskFetch` / `mountTasksView` tests in `TasksView.test.ts` (Issue 110 folder `work/110`).
- e2e in-test note pattern: `an in-progress task is listed with hide-closed on`; `test.use({ clockTime })` from `e2e/fixtures/test-vault.ts:171`.
- `@max-[84px]:` container variant: `src/lib/features/event-calendar/EventBlock.svelte:89`.

## Risks
- e2e mock parser (`e2e/mocks/vault-index.ts:197-207`) fills only description and dueDate: `Pay rent 📅 2026-11-03` -> `Pay rent`. Matches the criterion.
- Text span stops being `flex-1`: chips must follow the text, not the row's right edge. The clickable area shrinks to the text itself.
- jsdom computes no layout: the 560 px wrap is only checked in e2e.

## Defaults taken
- Anchor regex writes the variation selector as `\u{FE0F}` (no invisible character in source).
- Chip icon `size-3`; chip gap `gap-1`; chips wrapper `gap-x-2 gap-y-0.5`. The non-overdue due icon inherits `text-muted-foreground`.
- `data-overdue` renders as an empty attribute (present/absent).
