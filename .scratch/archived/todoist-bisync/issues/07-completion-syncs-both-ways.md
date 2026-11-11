# 07: Completing or reopening a task syncs both ways, recurring tasks included

**What to build:** Checking a synced line in the brain closes the task in Todoist, unchecking reopens it, and a task completed or reopened in Todoist checks or unchecks the line on the next "Sync now". A recurring task closed on either side rolls to its next date: the line stays open with the new `📅`. Design: `.scratch/todoist-bisync/research/design.md` rules 3, 5, 6, 7, 9, 10; facts in `research/live-check.md`.

**Blocked by:** 01, 06

**Status:** resolved

- [x] Failing tests first with the fake `/sync` and real stores.
- [x] Each cycle pulls before it pushes. Local change = parse(line) vs `local_base`; remote change = item vs `remote_base`; when both agree only the bases move.
- [x] Closed = status `x`/`X`/`-`; `[/] [?] [!] [>]` are open (rule 5). Line writes use ticket 02's status patch.
- [x] Brain close: a hand-built `item_close` command with a uuid stored in `pending_cmd` until acknowledged (never `item_complete`, never REST `closeTask`). Reopen: `item_uncomplete` the same way. Command batches are sent in requests separate from pulls (rule 13); a 400 `sync_status` is terminal, clears `pending_cmd`, and is logged.
- [x] A pending close is dropped when the remote `due` moved since the base. After an ack, an incremental pull rewrites the line (recurring: open + new `📅`).
- [x] Both sides changed completion: Todoist wins; the brain value is logged.
- [x] Over 25 close/reopen pushes in one cycle: "pause and ask" as defined in design rule 9.
- [x] Where `research/live-check.md` contradicts a criterion, follow the recorded fact and say so in the commit.
- [x] Pull hardening, from a security review of Issue 06's merged `pull.logic.ts` (verified on main at `12fefe60a`), each with a failing test first:
  - `due.string` gets CR/LF turned into spaces before it is written after `🔁` (`:274`), and `due.date` must match `^\d{4}-\d{2}-\d{2}` or the due is dropped and logged (`:269`). As a backstop, no planned line may contain `\n` or `\r` (the plan throws in tests).
  - Content containing `🆔` (or any other signifier the round-trip check flags) is not inserted as-is: the item is skipped and logged, since the parser keeps the first `🆔` on a line and would read the wrong anchor. Before planning an insert, assert `readAnchor(line) === anchorForTodoistId(item.id)`.
  - `kokobrainAnchor` accepts only the brain-born format `kokobrain:td-[0-9a-z]{8}` (`:241`); a description can never claim a `td-<todoist id>` anchor. In rebuild mode the item's own `td-<id>` wins over its description anchor, and when two items claim the same anchor neither is paired and both are logged (`:361`).
- [x] Gate: frontend, or Both if IPC changes.

## Notes

- Size: M.
- From Issue 06's review (finding 3): a link paired by rebuild or by an anchored line already in the vault stores `local_base: null`, since Issue 06 has no TS line parser. Define what null means here, for example: fill `local_base` from the line on the first cycle and push nothing for that link in that cycle. Issue 09 uses the same rule.
- From Issue 06's review (finding 1): a rebuild that pairs no line leaves the link table empty, so every run stays a rebuild and new Todoist tasks never come in; Issue 06 only says so in the toast. How rebuild mode ends (rule 1) is an owner call.

## Comments

- 2026-11-09, branch `issue/07-completion-syncs-both-ways`: completion and reopen sync both ways in "Sync now" (`item_close`/`item_uncomplete` with stored `pending_cmd`, pull before push, Todoist wins on conflict, pending close dropped when the remote due moved, 25-push pause), plus the pull hardening from Issue 06's security review. Review round 1: CHANGES_REQUESTED (4 findings: 3 fixed, 1 rejected as an owner call); round 2: APPROVED (the rejected one carried over as a minor owner decision: drop a brain close on any remote due move, or only for recurring tasks). Deliver changed no code. Full suite at 47ef2f403: exit 0, 598 files, 14563 passed, 54 skipped, 1 todo.
