# 237: Each task status has its own glyph, and the row tests find parts by name

**Origin:** Tasks view UX research, 2026-11-12 (`.scratch/tasks-view-ux/research/`). It is the status half of Issue 109's first draft, plus the test hooks of `synthesis.md` T01, folded in as `critique.md` D3 asked. Issue numbers in this text are open-itens numbers.

**What to build:** Every non-todo status shows the same checked circle today, so `[/]`, `[?]`, `[!]`, `[>]` and `[-]` all look done. Give each of the seven statuses its own glyph and tone, and make the row's test hooks stable before Issue 109 adds chips and Issue 241 a menu button.

- **Status glyph.** A pure `statusGlyph(status)` in `task-status.logic.ts` returns `{ icon, word, tone }` as plain strings, not a component: `@lucide/svelte` imported into a `.logic.ts` fails `pure-logic.test.ts`. The key-to-component map lives in `TasksView.svelte`. The table (each icon is in the installed `@lucide/svelte`; check the version in `node_modules/@lucide/svelte/dist/icons/` before relying on a name):

  | status | `icon` (lucide import) | `word` | `tone` (class) |
  |---|---|---|---|
  | todo | `circle` | todo | `text-muted-foreground` |
  | in-progress | `circle-dot` | in progress | `text-primary` |
  | done | `circle-check-big` | done | `text-success` |
  | cancelled | `circle-minus` | cancelled | `text-muted-foreground` |
  | question | `circle-question-mark` | question | `text-warning` |
  | important | `circle-alert` | important | `text-destructive` |
  | forwarded | `circle-arrow-right` | forwarded | `text-muted-foreground` |

- The circle button's `aria-label` is `Mark task as done (<word>)` when `toggleTarget(status)` is `done`, else `Mark task as not done (<word>)`. Its `title` is the word.
- **Row hooks.** The circle button carries `data-task-toggle` and `data-status="<status>"`, the text span carries `data-task-text`. `data-task-row` stays on the row.
- **Tests stop reading the row by position.** `TasksView.test.ts` finds the toggle and the text through those hooks, not "the first span" or "the first button" in a row, and asserts the shown status through `data-status`, not through the presence of an SVG `circle`. One shared fixture builder in `src/tests/lib/features/tasks/` with realistic metadata (due, scheduled, priority, recurrence, tags) and all seven statuses replaces the duplicated group builders in `TasksView.test.ts` and `tasks.service.test.ts`. No existing assertion changes meaning.
- The e2e spec's exact `name: 'Mark task as done'` becomes a match on the label's start (`/^Mark task as done/`).

**Blocked by:** 236

**Status:** ready-for-agent

**Answered:** checkbox shape (a): one circle glyph per status, matching the calendar, not the editor's rounded square (synthesis Q11, adopted by the owner on 2026-11-12).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the circle's accessible name changes.

- [ ] Failing test first, `task-status.logic.test.ts`: `statusGlyph` for all seven statuses.
- [ ] `TasksView.test.ts` with the real store and the shared fixture: one row per status renders `data-status` with that status and the label from the table (for example `Mark task as done (in progress)` and `Mark task as not done (cancelled)`). Fails today.
- [ ] No test in `src/tests/lib/features/tasks/` selects a row part by element position or by `svg circle`.
- [ ] The e2e spec passes with the new label.

## Notes

- **Size:** S to M.
- Run in series with the other Tasks view Issues (see 108).
- Strike-through already follows `isTaskOpen` (Issue 110).
- The editor's live preview cannot render the extended statuses; that parity is a `core/` change outside this plan.
