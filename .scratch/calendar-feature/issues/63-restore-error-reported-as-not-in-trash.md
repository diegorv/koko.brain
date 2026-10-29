# 63: A failed restore is not reported as "no longer in the Trash"

**What to build:** when restoring an event from the Trash fails for a reason other than the entry being gone, the user sees that the restore failed, not "The note is no longer in the Trash".

**Blocked by:** None

**Status:** ready-for-agent

- From the ticket 31 post-merge review (finding 2): `event-calendar.service.ts:773` maps any `null` from `restoreItem` (`trash.service.ts:107ff`: rename or mkdir error, permissions) to `not-in-trash`, so the toast from `:863` / `:1124` says "The note is no longer in the Trash" while the entry is still there.
- `restoreItem` returns `null` for every failure; it needs to distinguish "entry missing" from "restore failed" (a reason, or a throw that the caller maps).

- [ ] Failing test first: a rename error during restore yields a restore-failed reason and message
- [ ] Entry-missing still yields `not-in-trash`; other `restoreItem` callers keep their behavior

## Comments

- 2026-10-28 21:11 — discovery — restoreItem already throws; plan: wrap it as EventCalendarError(restore-failed) in restoreNow — 2294a13d
- 2026-10-28 21:13 — implement — restore-failed reason wraps restoreItem errors in restoreNow; event-calendar + trash + settings tests 1309/1309, pnpm check 0 errors — 6b3c483d
