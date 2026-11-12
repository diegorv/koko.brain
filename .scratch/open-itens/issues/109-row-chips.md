# 109: Task rows show clean text with date, priority, recurrence and tag chips

**Origin:** `tasks-view` Issue 05, moved here on 2026-11-08 and rewritten on 2026-11-12 from the Tasks view UX research (`.scratch/tasks-view-ux/research/`) and its review. The status glyph half moved to Issue 110. Its PRD stays in `.scratch/archived/tasks-view/`. Issue numbers in this text are open-itens numbers. Line numbers are left out on purpose.

**What to build:** Rust already sends each task's metadata (`src-tauri/src/vault/task.rs`, `TaskMetadata` in `#lib/contracts`), and the row ignores it: the emoji signifiers show as raw text. "Send invoice 📅 2026-11-03 ⏫ #work ^abc123" should read "Send invoice" followed by chips for Nov 3 (overdue), high and #work.

- **Text.** Render the text from a pure `taskDisplayText(task)` in `tasks.logic.ts` through `parseTaskTextSegments`, instead of the raw `task.text`.
  - By default it returns `task.metadata.description`: the Rust parser removes dates, priority, recurrence, ids and tags from it. It does not remove a trailing block id (` ^abc123`), so `taskDisplayText` does.
  - It returns the raw `task.text` instead when `parseTaskTextSegments(task.text)` holds a wikilink with a `heading` or a link whose `url` contains `#`, when the text holds a `#` inside a bare URL (`/\S+:\/\/\S*#/`, which `parseTaskTextSegments` does not detect), or when the description is empty (a tag-only task such as `- [ ] #todo`). The Rust tag regex also strips `#...` inside links (`[[Book#Chapter 2]]` becomes `[[Book 2]]`, PRD B7), and the raw text keeps such a link pointing at the right note.
  - On both paths it removes, in this order, a trailing block id (` \^[A-Za-z0-9-]+$`) and then a trailing Todoist anchor (` 🆔️? td-\S+`): a synced line can end in `🆔 td-x ^abc`. Use a local regex in `tasks.logic.ts`, not `todoist-sync`'s anchor logic, which would add a `tasks -> todoist-sync` feature pair.
  - On the raw-text path the signifiers stay in the text, and the date, priority and recurrence chips still show; that duplication is accepted for these rare rows. Tag chips are left out on that path: the tags are visible inline, and the Rust tag list holds false tags taken from links (`Chapter` from `[[Book#Chapter 2]]`, `b` from `https://example.com/a#b`).
  - Wikilinks and URLs keep working. The parser defect itself is Issue 075 (PRD B7 (a)); this fallback stays harmless after it.
- **Chips** after the text, from a pure `taskChips(metadata, today, { tags })` in `tasks.logic.ts` with `today` as `YYYY-MM-DD` and `tags: false` on the raw-text path. It returns `{ kind, label, title?, overdue? }[]` in this order, each only when the field is set:
  - `due`: label `MMM D` (`formatDate(date, 'MMM D')` from `#lib/utils/date.js`, for example `Nov 3`), `MMM D, YYYY` when the year differs from today's; `title` `Due YYYY-MM-DD`, or `Overdue, due YYYY-MM-DD`; `overdue: true` when the due date is before `today` (string comparison);
  - `scheduled`: label `Scheduled Nov 3` (same date rule);
  - `start`: label `Starts Nov 3` (same date rule);
  - `priority`: the level word (`highest`, `high`, `medium`, `low`, `lowest`), none for `none` or a missing priority;
  - `recurrence`: `metadata.recurrence.text` without a trailing ` ^id` (the Rust recurrence regex swallows a block id that follows it), for example `every week`;
  - `tag`: one chip per tag, label `#<tag>` (Rust tags carry no `#`).

  The view reads `today` from `formatNow('YYYY-MM-DD')` (`#lib/utils/date.js`) when the rows are rebuilt, so a view left open past midnight updates on the next refetch; that is accepted. Chips are `text-xs` with the label in `text-muted-foreground`. The due chip starts with a small `calendar` icon. An overdue due chip colors only that icon with `text-destructive` and shows its label in `text-foreground`: `text-destructive` as text is about 3.4:1 on the default card.
- **The circle's label** (Issue 110) uses `taskDisplayText` instead of the raw text.
- **Narrow pane.** Mark the view's root `@container`. Below 560 px container width (`@max-[560px]:` variants; `EventBlock.svelte` uses the same syntax as `@max-[84px]:`) the chips wrap onto one meta line under the text instead of trailing it.
- Chip colors use only theme tokens, no raw Tailwind palette classes (Issue 236's check).

**Blocked by:** 236

**Blocked by (origin):** 021 dropped (resolved 2026-11-09).

**Status:** ready-for-agent

**Answered:** overdue tone: tone on the chip icon only, label in the foreground (synthesis Q12 (a), proposed to the owner on 2026-11-12 with no objection).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the row markup the spec reads changes.

- [ ] Failing test first, `tasks.logic.test.ts`: `taskChips` with today `2026-11-05` for a due date before (`overdue: true`), on and after today, a due date in 2027 (label carries the year), scheduled, start, each priority including `none`, a recurrence `every week ^abc123` (label `every week`), two tags, and `tags: false`; a task with only a description returns `[]`.
- [ ] `tasks.logic.test.ts`: `taskDisplayText` with descriptions copied from the pinned Rust outputs of `parse_task_metadata` (the parser tests in `src-tauri/src/vault/parsing.rs`), not written by hand: `Send invoice` for text `Send invoice 📅 2026-11-03 ^abc123` with description `Send invoice ^abc123`; the raw text for `read [[Book#Chapter 2]]`, for `see [doc](https://example.com/a#b)`, for a bare `https://example.com/a#b` and for `#todo` alone; and the anchor and block id removed from `Call Ana 🆔 td-123 ^abc123` on both paths.
- [ ] `TasksView.test.ts` with the real store and the clock faked to 2026-11-05 (`vi.useFakeTimers({ toFake: ['Date'] })`, `vi.setSystemTime(new Date('2026-11-05T12:00:00'))`): a task with text `Send invoice 📅 2026-11-03 ⏫ #work` and the metadata Rust sends for it renders "Send invoice", a due chip `Nov 3` whose icon carries `text-destructive`, `high` and `#work`, and no `📅` or `⏫` in the row's text. A task `read [[Book#Chapter 2]]` shows no `#Chapter` chip. Fails today (the raw text renders).
- [ ] The toggle still sends the raw `task.text` and status as `expectedText` and `expectedStatus`.
- [ ] Wikilink and URL rendering in `e2e/specs/tasks-view.spec.ts` still passes. A viewport test at 500 px width with a `📅` task asserts the chip's top is at or below the text's bottom. The e2e mock parser fills only `dueDate`, so the e2e run cannot show priority or tag chips; the unit tests cover them.

## Notes

- **Size:** M.
- Run in series with the other Tasks view Issues (see 108).
