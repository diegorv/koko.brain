# 248: Todoist sync reads task tags with the same rule as the Rust parser

**Origin:** follow-up filed by the main session on 2026-11-12, from the review of Issue 075 (`.scratch/tasks-view-ux/work/075/review.md`, finding 1, and its Resolution). Issue numbers in this text keep the open-itens numbering: the Tasks view Issues live in `.scratch/tasks-view-ux/issues/`, the others in `.scratch/open-itens/issues/`.

**What to build:** Issue 075 made the Rust parser read task tags with the note tag rule (`#` at the start of the text or after whitespace, then a letter or `_`, then letters, digits, `_`, `-` and `/`, Unicode letters included). Todoist sync still checks tags with the old ASCII rule in `src/lib/features/todoist-sync/task-line.logic.ts` (`TAG_NAME`, `isTaskTagName`, `tagMatches`), used by `pull.logic.ts` to choose which Todoist labels become `#tags` on the line. The two rules now disagree, and the sync loops:

- A digit-first Todoist label such as `2026` passes the old rule, so pull writes `#2026` on the line. Rust no longer reads `#2026` as a tag, so it stays in the task description. The next cycle sees no `2026` tag on the line, removes the label from Todoist, and pushes `content #2026` as the task text.
- A label with a non-ASCII first letter (`über`) fails the old rule, so pull never writes it, while Rust would read `#über` as a tag.

Make Todoist sync use one tag rule that matches Rust's:
- `isTaskTagName(name)` accepts exactly the names Rust reads as task tags after Issue 075. Derive it from the shared inline-tag rule in `src/lib/utils/tag-extraction.ts` (`findInlineTags`), not a third copy of the regex.
- `tagMatches(text, tag)` finds a `#tag` only where Rust reads one: at the start or after whitespace, not after a letter or `(`, with the same set of following characters ending the tag, still skipping wikilinks, markdown links and URLs.
- A Todoist label that is not a valid task tag (`2026`) is never written as `#2026`, and its absence from the line never removes it from Todoist. Say in the delivery how such labels are handled (left on the Todoist side untouched), and pin it in a test.

**Blocked by:** 075

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`. Targeted: `src/tests/lib/features/todoist-sync/` and `src/tests/lib/architecture/pure-logic.test.ts`.

- [ ] Failing test first, `src/tests/lib/features/todoist-sync/pull.logic.test.ts` (or the closest existing pull test) with the sync's existing fakes: a Todoist task carrying the label `2026` and the label `work`; after one pull and one push cycle the line holds `#work` and no `#2026`, the Todoist task keeps both labels, and the pushed content has no `#2026`. Fails today (the label is written, then removed, and `#2026` is pushed as content).
- [ ] `task-line.logic.test.ts`: `isTaskTagName` accepts `work`, `über`, `_x`, `a/b`, `a-b` and rejects `2026`, `-x`, `` (empty); `tagMatches` finds `#work` at the start and after a space, and not in `word#work`, `(#work)` or `[[note#work]]`. Existing cases that pinned the old rule (`(#tag)` and `word#tag` counting) change on purpose, and the commit says so.
- [ ] A parity test feeds the same inputs to `isTaskTagName` and to the cases the Rust parser pins (copy them from the Rust tests Issue 075 added; do not invent expectations).
- [ ] `help/documentation/10-tasks-and-todoist.md` says which Todoist labels become `#tags` and that the others stay only in Todoist.

## Notes

- **Size:** S to M.
- Must land before the next release: until it does, a vault that syncs with Todoist and has a digit-first label loses that label on the Todoist side.
- Out of scope: `RECURRENCE_RE` keeping `#über` inside the recurrence text (`🔁 every week #über`), which Issue 075's review rated minor and not a regression. File it separately if wanted.
- Run in series with the other Tasks view Issues that edit `todoist-sync` (129).

## Comments

- 2026-11-12: filed by the main session from Issue 075's review.
