# 66: Calendar path identity across rename, delete and undo

**What to build:** fix the places where the Calendar identifies an event by its path and goes wrong when the path changes (rename, delete, restore, undo, vault switch). Each fix starts with a failing test. Split out of the former ticket 64 (Calendar polish from the post-merge adversarial reviews). Items are low severity as recorded; line anchors are as recorded at review time and may have drifted, so re-locate them on main first.

**Blocked by:** None

**Status:** ready-for-agent

Ticket 28 review (fix 606978d4):
- [x] `opsUpTo` (`event-calendar.service.ts:705`, now `:734`) moves every op on the old path recorded before the anchor, including ops left by an earlier, different note at that path (note A deleted outside the calendar, B created there and deleted, suffixed restore of B carries A's ops).
- [x] A suffixed restore with no recorded state (`:755`) never calls `dropPending(path)`, so a stale delete placeholder can hide the new note at the old path until the next index refresh.
- [x] Pre-existing: `duplicateEvent` (`:612`) queues on the source path only, so a write to the copy's new path is not serialized behind its creation.

Ticket 26 review (fix ed15a49c):
- [x] The stale-target `$effect` in `EventPopover.svelte:42-44` matches the event by `path` only, so a pending rename overlay (tickets 24/39) that moves the event to a new path closes the popover on the same event; unverified whether the overlays rewrite the path while the popover is open.

Ticket 27 review (fix eb7ab2b1):
- [x] `EventDialog.svelte:43` closes the dialog when `path` has no matching event. If a title change renames the note and the merged events drop the old path before `editEvent` resolves, the dialog closes mid-save: a success skips the `lastPath = newPath` step (early return near `:86`), so focus falls back to the view root instead of the renamed block, and a failure in that window toasts instead of showing the inline error. Same class as the ticket 26 popover note above (lookup by `path` across a rename). Probably pre-existing; no test covers a rename during save. Cover both with one E2E: edit the title in the dialog and save, then assert the dialog and popover behaviour and focus.

Ticket 29 review (fix 5c14e82d):
- [x] Pre-existing: Undo clicked after a vault switch still calls `undoDeleteEvent(oldPath)` (`:1016`, now `:1021`); confirm the restore is refused for a path outside the current vault, and that the toast is dismissed on vault switch.

Ticket 56 review (fix 0e187396):
- [x] Rename/delete tombstone with a stale store: `lookupCalendarEvent` falls through to the stale snapshot for the old path, so "Show in Calendar" stays and opens the old date with nothing focused. When `isPending(path)` and `eventByPath(path)` is undefined, return `{ event: null }`.
- [x] The throttled index bump means a body edit that moves the date pulses the old day for ~2-10 s; inherent, but the "current day" wording overstates it.

## Comments

- 2026-10-28 18:41 — discovery — plan for all 8 items in work/66/discovery.md (popover remap verified; dialog in-flight guard; generation-checked toast Undo) — pending
- 2026-10-28 18:48 — implement — all 8 items done (opsUpTo note boundary, suffixed-restore tombstone, duplicate joins copy queue, popover remap pinned, dialog save guard + new E2E spec not run, vault-switch toast dismiss/refuse, tombstone lookup, JSDoc lag); pnpm check 0 errors, 1375 targeted vitest pass — ed096d93
