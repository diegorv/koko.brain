# 109: Rows show status, dates, priority, recurrence and tags

**Origin:** `tasks-view` Issue 05, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/tasks-view/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Rust already sends each task's status and metadata (`src-tauri/src/vault/task.rs:42-130`; `TaskMetadata.ts`), and the row ignores all of it (`TasksView.svelte:197-269`): every non-todo status shows the same checked circle, and the emoji signifiers show as raw text.

- **Status glyph.** A pure `statusGlyph(status)` in `task-status.logic.ts` (created by Issue 02) returns `{ icon, word, tone }`, not a component: `@lucide/svelte` imported into a `.logic.ts` fails `pure-logic.test.ts` (`:43` forbids Svelte packages). The key-to-component map lives in `TasksView.svelte`. The table (every icon exists in the installed `@lucide/svelte` 1.61.0, `node_modules/@lucide/svelte/dist/icons/`):

  | status | `icon` (lucide import) | `word` | `tone` (class) |
  |---|---|---|---|
  | todo | `circle` | todo | `text-muted-foreground` |
  | in-progress | `circle-dot` | in progress | `text-primary` |
  | done | `circle-check-big` | done | `text-success` |
  | cancelled | `circle-minus` | cancelled | `text-muted-foreground` |
  | question | `circle-question-mark` | question | `text-warning` |
  | important | `circle-alert` | important | `text-destructive` |
  | forwarded | `circle-arrow-right` | forwarded | `text-muted-foreground` |

  The circle button's `aria-label` is `Mark task as done (<word>)` when `toggleTarget(status)` is `done`, else `Mark task as not done (<word>)`, and its `title` is the word.
- **Text.** Render the text from a pure `taskDisplayText(task)` in `tasks.logic.ts` through `parseTaskTextSegments`, instead of the raw `task.text` (`:221`). It returns `task.metadata.description` (signifiers and tags removed, `parsing.rs:1758-1859`), except when `parseTaskTextSegments(task.text)` holds a wikilink with a `heading` or a link whose `url` contains `#`: then it returns `task.text`. It also returns `task.text` when the description is empty (a tag-only task such as `- [ ] #todo`) or the text holds a `#` inside a bare URL (`/\S+:\/\/\S*#/`), which `parseTaskTextSegments` does not detect; both cases go in the `taskDisplayText` test. Rust's `TASK_TAG_RE` (`parsing.rs:1576-1577`) also strips `#...` inside links (`[[Book#Chapter 2]]` becomes `[[Book 2]]` in the description), and the raw text keeps such a link pointing at the right note. Wikilinks and URLs keep working. The parser defect itself is fixed by Issue 26 or Issue 31, whichever PRD decision B7 picks; this fallback stays harmless after either.
- **Chips** after the text, from a pure `taskChips(metadata, today)` in `tasks.logic.ts` with `today` as `YYYY-MM-DD`. It returns `{ kind, label, title?, overdue? }[]` in this order, each only when the field is set:
  - `due`: label `MMM D` (`formatDate(date, 'MMM D')` from `#lib/utils/date.js:42`, e.g. `Nov 3`), `MMM D, YYYY` when the year differs from today's; `title` `Due YYYY-MM-DD`; `overdue: true` when the due date is before `today` (string comparison);
  - `scheduled`: label `Scheduled Nov 3` (same date rule);
  - `start`: label `Starts Nov 3` (same date rule);
  - `priority`: the level word (`highest`, `high`, `medium`, `low`, `lowest`), none for `none` or a missing priority;
  - `recurrence`: `metadata.recurrence.text`, e.g. `every week`;
  - `tag`: one chip per tag, label `#<tag>` (Rust tags carry no `#`, `parsing.rs:3219`).

  The view gets `today` from `formatNow('YYYY-MM-DD')` (`#lib/utils/date.js:15`). Chips are `text-xs`; the overdue due chip uses `text-destructive`, scheduled and start use `text-muted-foreground`, the rest `text-muted-foreground` too.
- **Narrow pane.** Mark the view's root `<div>` (`TasksView.svelte:103`) `@container`. Below 560 px container width (`@max-[560px]:` variants, the syntax `RailNoteList.svelte` already uses as `@max-[84px]:`) the chips wrap onto one meta line under the text instead of trailing it. jsdom cannot check this; it is on the manual checklist.
- Strike-through stays on `task.checked` here. Issue 06 changes the open rule.
- Glyph and chip colors use only the theme tokens named above, not raw Tailwind palette classes. Open Issue `audit-2026-11-05/84` (migrated from `ux-polish/48`) swaps the two raw classes in this file (`TasksView.svelte:184`, `:252`) and adds `palette-classes.test.ts`, which fails on any new one; do not touch those two lines here.

**Blocked by:** 021, 108

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the row markup the spec reads changes.

- [ ] Failing test first, `tasks.logic.test.ts`: `taskChips` with today `2026-11-05` for a due date before (`overdue: true`), on and after today, a due date in 2027 (label carries the year), scheduled, start, each priority including `none`, a recurrence and two tags; a task with only a description returns `[]`.
- [ ] `tasks.logic.test.ts`: `taskDisplayText` returns the description for `Send invoice 📅 2026-11-03`, and the raw text for `read [[Book#Chapter 2]]` and for `see [doc](https://example.com/a#b)`.
- [ ] `task-status.logic.test.ts`: `statusGlyph` for all seven statuses.
- [ ] `TasksView.test.ts` with the real store, the clock faked to 2026-11-05 (`vi.useFakeTimers({ toFake: ['Date'] })`, `vi.setSystemTime(new Date('2026-11-05T12:00:00'))`): a task with text `Send invoice 📅 2026-11-03 ⏫ #work` and the metadata Rust sends for it (`description: 'Send invoice'`, `dueDate: '2026-11-03'`, `priority: 'high'`, `tags: ['work']`) renders "Send invoice", a due chip `Nov 3` with the overdue class, `high` and `#work`, and no `📅` or `⏫` in the row's text. An `in-progress` task's circle has the label `Mark task as done (in progress)`. Fails today (the raw text renders).
- [ ] Wikilink and URL rendering in `e2e/specs/tasks-view.spec.ts:87-110` still passes.

## Notes

- **Size:** S to M.
