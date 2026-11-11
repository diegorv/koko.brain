# 08: Edits made in Todoist reach the note

**What to build:** After "Sync now", a synced line reflects changes made in Todoist to the task's content, due date, priority and labels, each written as a token patch so nothing else on the line changes. Design: `.scratch/todoist-bisync/research/design.md` rules 3, 4, 7, 8.

**Blocked by:** 07

**Status:** resolved

- [x] Failing tests first (fake `/sync`, real stores; projection/diff cases in the `.logic.ts` tests).
- [x] Per field against `remote_base`: content -> description text via ticket 02's replace (a conflict result leaves the line alone and logs); `due.date` -> `📅` (date part; a time stays in `remote_base`); priority -> emoji through the reverse of the moved priority map; labels -> tags per rule 8 (case-insensitive compare, unmapped labels kept, the `#todoist` scope tag, the configured default label and the context labels `Work` and `personal` excluded, design rule 8b). A test: a remote label change that only adds `Work` (the owner's webhook) writes nothing to the line.
- [x] Owner decision (2026-11-09, design rule 4): a tag, link or signifier before the first word no longer blocks a description replace; only one between the first and the last word does. Change ticket 02's replace helper accordingly, with a test: `- [ ] #todoist Call Bob` receives `Call Bob Smith` and keeps `#todoist` in front.
- [x] Security review of Issue 07's merged code (verified on main at `e5583a987`): `due.string` written after `🔁` gets only its line breaks replaced (`pull.logic.ts:304`). When it holds a signifier emoji (`hasSignifier`) or a `#`, the recurrence text is left out of the line (the `📅` stays) and the item is logged; the same check applies wherever this ticket writes `🔁` text. Failing test first.
- [x] Owner decision (2026-11-09), from Issue 07's review: a brain close is dropped because the remote due moved only when the task is recurring (`completion.logic.ts:173`, add `item.due?.isRecurring`). A non-recurring task rescheduled in Todoist and checked in the brain is closed in Todoist and its line keeps `[x]`. Failing test first; update design rule 6's wording to match.
- [x] Content that fails the round-trip check is not written; logged.
- [x] Idempotent: two cycles in a row with no change write nothing (a test per field, including priorities `low` and `lowest`, which both map to Todoist 1).
- [x] Recurring: `🔁` text is written only at creation (ticket 06); due moves update `📅` only.
- [x] Gate: frontend.

## Notes

- Size: M.

## Comments

- 2026-11-09, branch `issue/08-todoist-edits-reach-the-note`: Todoist edits to content, due date, priority and labels now reach the note line through `planFields` (`fields.logic.ts`), with the leading-tag replace change, the `🔁` signifier/`#` guard and the recurring-only close drop. Review round 1 APPROVED with 4 findings: a line inserted from content that failed the round trip is now left alone with a `description-conflict` log (new test), two JSDoc notes added, the `anchor-mismatch` guard kept. Review round 2 APPROVED, no findings. Full suite at 07fcbe859: 604 files, 14669 tests passed, 54 skipped, 1 todo; `pnpm check` 0 errors.
