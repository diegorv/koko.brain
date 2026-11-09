# 09: Edits made in the note reach Todoist

**What to build:** After "Sync now", changes made in the brain to a synced line's text, `📅`, priority emoji or tags update the Todoist task. When both sides changed the same field, Todoist wins and the brain value goes to the sync log. Design: `.scratch/todoist-bisync/research/design.md` rules 3, 7, 8, 9, 13.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] Failing tests first (fake `/sync`, real stores).
- [ ] Local change = parse(line) vs `local_base`, compared in Todoist terms (projected priority, normalized labels) so a lossy field never ping-pongs. Pushes are `item_update` commands with uuids, at most 100 per request.
- [ ] `labels` always includes `remote_base.unmapped_labels`.
- [ ] `📅` change: a task with a time keeps the time from `remote_base`; a recurring task sends `{date, string: remote_base string, lang}`, or nothing if `research/live-check.md` shows the rule is lost.
- [ ] Content over 500 characters or with a newline is not queued; logged. Lines flagged by ticket 06's round-trip check are never pushed.
- [ ] Conflict per field: Todoist wins, the line is patched to the Todoist value, the brain value is logged.
- [ ] Over 50 field pushes in one cycle: "pause and ask" (design rule 9).
- [ ] Bases move only after `ok`; the echo of our own write is not seen as a remote change.
- [ ] Gate: frontend.

## Notes

- Size: M.
