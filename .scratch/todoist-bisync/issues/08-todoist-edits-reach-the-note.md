# 08: Edits made in Todoist reach the note

**What to build:** After "Sync now", a synced line reflects changes made in Todoist to the task's content, due date, priority and labels, each written as a token patch so nothing else on the line changes. Design: `.scratch/todoist-bisync/research/design.md` rules 3, 4, 7, 8.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] Failing tests first (fake `/sync`, real stores; projection/diff cases in the `.logic.ts` tests).
- [ ] Per field against `remote_base`: content -> description text via ticket 02's replace (a conflict result leaves the line alone and logs); `due.date` -> `📅` (date part; a time stays in `remote_base`); priority -> emoji through the reverse of the moved priority map; labels -> tags per rule 8 (case-insensitive compare, unmapped labels kept, the `#todoist` scope tag, the configured default label and the context labels `Work` and `personal` excluded, design rule 8b). A test: a remote label change that only adds `Work` (the owner's webhook) writes nothing to the line.
- [ ] Owner decision (2026-11-09, design rule 4): a tag, link or signifier before the first word no longer blocks a description replace; only one between the first and the last word does. Change ticket 02's replace helper accordingly, with a test: `- [ ] #todoist Call Bob` receives `Call Bob Smith` and keeps `#todoist` in front.
- [ ] Security review of Issue 07's merged code (verified on main at `e5583a987`): `due.string` written after `🔁` gets only its line breaks replaced (`pull.logic.ts:304`). When it holds a signifier emoji (`hasSignifier`) or a `#`, the recurrence text is left out of the line (the `📅` stays) and the item is logged; the same check applies wherever this ticket writes `🔁` text. Failing test first.
- [ ] Owner decision (2026-11-09), from Issue 07's review: a brain close is dropped because the remote due moved only when the task is recurring (`completion.logic.ts:173`, add `item.due?.isRecurring`). A non-recurring task rescheduled in Todoist and checked in the brain is closed in Todoist and its line keeps `[x]`. Failing test first; update design rule 6's wording to match.
- [ ] Content that fails the round-trip check is not written; logged.
- [ ] Idempotent: two cycles in a row with no change write nothing (a test per field, including priorities `low` and `lowest`, which both map to Todoist 1).
- [ ] Recurring: `🔁` text is written only at creation (ticket 06); due moves update `📅` only.
- [ ] Gate: frontend.

## Notes

- Size: M.
