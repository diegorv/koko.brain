# 09: Edits made in the note reach Todoist

**What to build:** After "Sync now", changes made in the brain to a synced line's text, `📅`, priority emoji or tags update the Todoist task. When both sides changed the same field, Todoist wins and the brain value goes to the sync log. Design: `.scratch/todoist-bisync/research/design.md` rules 3, 7, 8, 9, 13.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] Failing tests first (fake `/sync`, real stores).
- [ ] Local change = parse(line) vs `local_base`, compared in Todoist terms (projected priority, normalized labels) so a lossy field never ping-pongs. Pushes are `item_update` commands with uuids, at most 100 per request.
- [ ] `labels` always includes `remote_base.unmapped_labels` and any `Work` / `personal` / default label the task carries (design rule 8b); a brain tag edit never removes them.
- [ ] `📅` change: a task with a time keeps the time from `remote_base`; a recurring task always sends `{date, string: remote_base string, lang}` (a date-only update drops the rule, `research/live-check.md`).
- [ ] Content over 500 characters or with a newline is not queued; logged. Lines flagged by ticket 06's round-trip check are never pushed.
- [ ] Conflict per field: Todoist wins, the line is patched to the Todoist value, the brain value is logged.
- [ ] Over 50 field pushes in one cycle: "pause and ask" (design rule 9).
- [ ] Bases move only after `ok`; the echo of our own write is not seen as a remote change.
- [ ] From Issue 08's integration review (minor, verified on main at `36e7a849c`): when a link pushes a close/reopen, `planFields` skips it (`fields.logic.ts:81`) and the `sync_token` is committed before the push (`sync-now.service.ts:266`). If Todoist then rejects the push with a terminal 4xx, a Todoist field edit made in the same cycle is never seen again. Withhold the token when a pushed anchor's item differs from `remote_base` in content, due, priority or labels (as `skippedDetaches` does), with a failing test first.
- [ ] Gate: frontend.

## Notes

- Size: M.
