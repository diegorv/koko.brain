# 07: Completing or reopening a task syncs both ways, recurring tasks included

**What to build:** Checking a synced line in the brain closes the task in Todoist, unchecking reopens it, and a task completed or reopened in Todoist checks or unchecks the line on the next "Sync now". A recurring task closed on either side rolls to its next date: the line stays open with the new `📅`. Design: `.scratch/todoist-bisync/research/design.md` rules 3, 5, 6, 7, 9, 10; facts in `research/live-check.md`.

**Blocked by:** 01, 06

**Status:** ready-for-agent

- [ ] Failing tests first with the fake `/sync` and real stores.
- [ ] Each cycle pulls before it pushes. Local change = parse(line) vs `local_base`; remote change = item vs `remote_base`; when both agree only the bases move.
- [ ] Closed = status `x`/`X`/`-`; `[/] [?] [!] [>]` are open (rule 5). Line writes use ticket 02's status patch.
- [ ] Brain close: a hand-built `item_close` command with a uuid stored in `pending_cmd` until acknowledged (never `item_complete`, never REST `closeTask`). Reopen: `item_uncomplete` the same way. Command batches are sent in requests separate from pulls (rule 13); a 400 `sync_status` is terminal, clears `pending_cmd`, and is logged.
- [ ] A pending close is dropped when the remote `due` moved since the base. After an ack, an incremental pull rewrites the line (recurring: open + new `📅`).
- [ ] Both sides changed completion: Todoist wins; the brain value is logged.
- [ ] Over 25 close/reopen pushes in one cycle: "pause and ask" as defined in design rule 9.
- [ ] Where `research/live-check.md` contradicts a criterion, follow the recorded fact and say so in the commit.
- [ ] Gate: frontend, or Both if IPC changes.

## Notes

- Size: M.
- From Issue 06's review (finding 3): a link paired by rebuild or by an anchored line already in the vault stores `local_base: null`, since Issue 06 has no TS line parser. Define what null means here, for example: fill `local_base` from the line on the first cycle and push nothing for that link in that cycle. Issue 09 uses the same rule.
- From Issue 06's review (finding 1): a rebuild that pairs no line leaves the link table empty, so every run stays a rebuild and new Todoist tasks never come in; Issue 06 only says so in the toast. How rebuild mode ends (rule 1) is an owner call.
