# 15: Retire the old send/sync path and document the two-way sync

**What to build:** The one-way send popover, the per-task completion polling and the `todoist-sent.json` reads and writes are removed, so the two-way sync is the only Todoist path; the user guide and a new ADR describe it; the open tickets it superseded are closed or rewritten. Design: `.scratch/todoist-bisync/research/design.md` (Old send/sync, Open-ticket impact).

**Blocked by:** 10, 12, 13, 14

**Status:** ready-for-agent

- [ ] Before removing anything, trace every caller of the old send/sync service and store (CLAUDE.md "Removing or Refactoring Code") and list them in the commit.
- [ ] Removed: the send popover, the Tasks view Sync button and Todoist badges reading the old store, per-id `getTask` polling, the old store and service, their tests. `todoist-sent.json` stays on disk untouched (no migration, decided); its writer leaves the raw-write ratchet list.
- [ ] Settings > Todoist keeps the token, the default label and the sync settings.
- [ ] `help/documentation/10-tasks-and-todoist.md` rewritten: setup, scope (sync folder + `#todoist`), the `🆔 td-…` anchor and why not to copy or edit it, what syncs (completion, text, `📅`, priority, labels, projects, sections) and what does not (subtasks, comments, Todoist descriptions, reminders, `⏳`/`🛫`), recurring tasks, conflicts (Todoist wins), deletions (detach), the sync log. `19-settings.md` updated.
- [ ] New ADR: state in `kokobrain.db`, `/sync` with uuids, two-base field merge, `🆔` anchor plus description back-link, Todoist wins, detach-only, safety brakes.
- [ ] `.scratch/open-itens/issues/`: 072, 127, 128, 130 closed as superseded (closing commit deletes each file, done recorded in the message); 073 rewritten to what remains or closed; 129 rewritten (linked / frozen / error states on Tasks view rows) with its Blocked by updated; 031's Todoist half removed; no remaining ticket lists a deleted one in Blocked by.
- [ ] Gate: frontend, plus `src/tests/help/`.

## Notes

- Size: M. Merges the draft retirement and docs slices (both close-out work).
