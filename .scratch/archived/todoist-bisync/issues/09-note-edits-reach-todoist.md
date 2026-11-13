# 09: Edits made in the note reach Todoist

**What to build:** After "Sync now", changes made in the brain to a synced line's text, `📅`, priority emoji or tags update the Todoist task. When both sides changed the same field, Todoist wins and the brain value goes to the sync log. Design: `.scratch/todoist-bisync/research/design.md` rules 3, 7, 8, 9, 13.

**Blocked by:** 08

**Status:** resolved

- [x] Failing tests first (fake `/sync`, real stores).
- [x] Local change = parse(line) vs `local_base`, compared in Todoist terms (projected priority, normalized labels) so a lossy field never ping-pongs. Pushes are `item_update` commands with uuids, at most 100 per request.
- [x] `labels` always includes `remote_base.unmapped_labels` and any `Work` / `personal` / default label the task carries (design rule 8b); a brain tag edit never removes them.
- [x] `📅` change: a task with a time keeps the time from `remote_base`; a recurring task always sends `{date, string: remote_base string, lang}` (a date-only update drops the rule, `research/live-check.md`).
- [x] Content over 500 characters or with a newline is not queued; logged. Lines flagged by ticket 06's round-trip check are never pushed.
- [x] Conflict per field: Todoist wins, the line is patched to the Todoist value, the brain value is logged.
- [x] Over 50 field pushes in one cycle: "pause and ask" (design rule 9).
- [x] Bases move only after `ok`; the echo of our own write is not seen as a remote change.
- [x] From Issue 08's integration review (minor, verified on main at `36e7a849c`): when a link pushes a close/reopen, `planFields` skips it (`fields.logic.ts:81`) and the `sync_token` is committed before the push (`sync-now.service.ts:266`). If Todoist then rejects the push with a terminal 4xx, a Todoist field edit made in the same cycle is never seen again. Withhold the token when a pushed anchor's item differs from `remote_base` in content, due, priority or labels (as `skippedDetaches` does), with a failing test first.
- [x] Gate: frontend.

## Notes

- Size: M.

## Comments

- 2026-11-10, branch `issue/09-note-edits-reach-todoist`: brain edits to a synced line's text, `📅`, priority and tags push to Todoist as `item_update` commands; per-field conflicts let Todoist win and log the brain value; the sync token is held back when a pushed close/reopen anchor's item differs from `remote_base`. Review round 1 CHANGES_REQUESTED (4 findings fixed: unsent text marker `unpushedDescription`, single mid-sentence log entry, code-point limit documented, case-insensitive tag dedupe); round 2 APPROVED with one finding fixed (reverted line pushes after an unsendable mid-sentence text); round 3 APPROVED, no findings. Tests: `pnpm check` exit 0; todoist-sync tests 540 passed; full suite at a9b8010d9 exit 0 (605 files, 14751 passed, 54 skipped, 1 todo).
