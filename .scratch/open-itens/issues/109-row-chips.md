# 109: Task rows show clean text with date, priority, recurrence and tag chips

**Origin:** `tasks-view` Issue 05, moved here on 2026-11-08 and rewritten on 2026-11-12 from the Tasks view UX research (`.scratch/tasks-view-ux/research/`). The status glyph half moved to Issue 237. Its PRD stays in `.scratch/archived/tasks-view/`. Issue numbers in this text are open-itens numbers. Line numbers are left out on purpose.

**What to build:** Rust already sends each task's metadata (`src-tauri/src/vault/task.rs`, `TaskMetadata` in `#lib/contracts`), and the row ignores it: the emoji signifiers show as raw text. "Send invoice 📅 2026-11-03 ⏫ #work" should read "Send invoice" followed by chips for Nov 3 (overdue), high and #work.

- **Text.** Render the text from a pure `taskDisplayText(task)` in `tasks.logic.ts` through `parseTaskTextSegments`, instead of the raw `task.text`. It returns `task.metadata.description` (signifiers and tags removed by the Rust parser), except in these cases, where it returns the raw `task.text`:
  - `parseTaskTextSegments(task.text)` holds a wikilink with a `heading`, or a link whose `url` contains `#`;
  - the text holds a `#` inside a bare URL (`/\S+:\/\/\S*#/`), which `parseTaskTextSegments` does not detect;
  - the description is empty (a tag-only task such as `- [ ] #todo`).

  The Rust description is lossy: its tag regex also strips `#...` inside links (`[[Book#Chapter 2]]` becomes `[[Book 2]]`), and ADR-0037 records that loss. The raw text keeps such a link pointing at the right note. On the raw-text path, `taskDisplayText` drops a trailing block id (` ^abc123`) and a Todoist anchor (` 🆔 td-...`) with a local regex in `tasks.logic.ts`. Do not import `todoist-sync`'s anchor logic: that would add a `tasks -> todoist-sync` feature pair. Wikilinks and URLs keep working. The parser defect itself is fixed elsewhere (Issue 075, or the option PRD B7 picks); this fallback stays harmless after either.
- **Chips** after the text, from a pure `taskChips(metadata, today)` in `tasks.logic.ts` with `today` as `YYYY-MM-DD`. It returns `{ kind, label, title?, overdue? }[]` in this order, each only when the field is set:
  - `due`: label `MMM D` (`formatDate(date, 'MMM D')` from `#lib/utils/date.js`, for example `Nov 3`), `MMM D, YYYY` when the year differs from today's; `title` `Due YYYY-MM-DD`, or `Overdue, due YYYY-MM-DD`; `overdue: true` when the due date is before `today` (string comparison);
  - `scheduled`: label `Scheduled Nov 3` (same date rule);
  - `start`: label `Starts Nov 3` (same date rule);
  - `priority`: the level word (`highest`, `high`, `medium`, `low`, `lowest`), none for `none` or a missing priority;
  - `recurrence`: `metadata.recurrence.text`, for example `every week`;
  - `tag`: one chip per tag, label `#<tag>` (Rust tags carry no `#`).

  The view gets `today` from `formatNow('YYYY-MM-DD')` (`#lib/utils/date.js`). Chips are `text-xs`, label in `text-muted-foreground`. The due chip starts with a small calendar icon. An overdue due chip colors only that icon with `text-destructive` and keeps its label in the foreground color: `text-destructive` as text is about 3.4:1 on the default card.
- **Narrow pane.** Mark the view's root `@container`. Below 560 px container width (`@max-[560px]:` variants; `RailNoteList.svelte` already uses this syntax as `@max-[84px]:`) the chips wrap onto one meta line under the text instead of trailing it.
- Chip colors use only theme tokens, no raw Tailwind palette classes (Issue 236's check).

**Blocked by:** 237

**Blocked by (origin):** 021 dropped (resolved 2026-11-09).

**Status:** ready-for-agent

**Answered:** overdue tone (a): tone on the chip icon only, label in the foreground (synthesis Q12, adopted by the owner on 2026-11-12).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the row markup the spec reads changes.

- [ ] Failing test first, `tasks.logic.test.ts`: `taskChips` with today `2026-11-05` for a due date before (`overdue: true`), on and after today, a due date in 2027 (label carries the year), scheduled, start, each priority including `none`, a recurrence and two tags; a task with only a description returns `[]`.
- [ ] `tasks.logic.test.ts`: `taskDisplayText` returns the description for `Send invoice 📅 2026-11-03`; the raw text for `read [[Book#Chapter 2]]`, for `see [doc](https://example.com/a#b)`, for a bare `https://example.com/a#b` and for `#todo` alone; and the raw text without ` ^abc123` and without ` 🆔 td-123` on the raw-text path.
- [ ] `TasksView.test.ts` with the real store and the clock faked to 2026-11-05 (`vi.useFakeTimers({ toFake: ['Date'] })`, `vi.setSystemTime(new Date('2026-11-05T12:00:00'))`): a task with text `Send invoice 📅 2026-11-03 ⏫ #work` and the metadata Rust sends for it (`description: 'Send invoice'`, `dueDate: '2026-11-03'`, `priority: 'high'`, `tags: ['work']`) renders "Send invoice", a due chip `Nov 3` whose icon carries `text-destructive`, `high` and `#work`, and no `📅` or `⏫` in the row's text. Fails today (the raw text renders).
- [ ] The toggle still sends the raw `task.text` and status as `expectedText` and `expectedStatus`.
- [ ] Wikilink and URL rendering in `e2e/specs/tasks-view.spec.ts` still passes. A viewport test at 500 px width shows the chips under the text.

## Notes

- **Size:** S to M.
- Run in series with the other Tasks view Issues (see 108).
