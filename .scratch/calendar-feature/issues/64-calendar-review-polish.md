# 64: Calendar polish from the post-merge reviews

**What to build:** the low-severity follow-up candidates from the event-calendar post-merge adversarial reviews, recorded in ticket 36's Comments, handled as one ticket. Line anchors are quoted as recorded and may have drifted. Tickets 62 and 63 cover the ticket 31 review; they are not repeated here.

**Blocked by:** None

**Status:** ready-for-agent

Ticket 22 review (fix b3ffc1ef):
- [ ] `compositedTextColors` in `e2e/specs/event-calendar.spec.ts` (~41-59) folds the block opacity into the text color but not the background, and reads the background without its alpha, so contrast is mis-measured on a translucent block; no contrast assertion covers a pending block.
- [ ] The pending dashed border in `EventBlock.svelte:60` takes 2px, so the `@max-[84px]` title-only switch triggers about 2px earlier for a pending block.
- [ ] The z-index clamp `10 + min(column, 9)` has only a style-string unit test, no E2E check of the layering against the now-line.

Ticket 28 review (fix 606978d4):
- [ ] `opsUpTo` (`event-calendar.service.ts:705`) moves every op on the old path recorded before the anchor, including ops left by an earlier, different note at that path (note A deleted outside the calendar, B created there and deleted, suffixed restore of B carries A's ops).
- [ ] A suffixed restore with no recorded state (`:755`) never calls `dropPending(path)`, so a stale delete placeholder can hide the new note at the old path until the next index refresh.
- [ ] Pre-existing: `duplicateEvent` (`:612`) queues on the source path only, so a write to the copy's new path is not serialized behind its creation.

Ticket 26 review (fix ed15a49c):
- [ ] The stale-target `$effect` in `EventPopover.svelte:42-44` matches the event by `path` only, so a pending rename overlay (tickets 24/39) that moves the event to a new path closes the popover on the same event; unverified whether the overlays rewrite the path while the popover is open.
- [ ] `FOCUSABLE` (`:24`) matches `[tabindex]`, so a `tabindex="-1"` wrapper takes focus after an outside click; exclude `-1` or skip when `document.activeElement` is already outside the popover.
- [ ] No view-level test covers retargeting; only the `EventPopover` mount tests and the E2E do.

Ticket 27 review (fix eb7ab2b1):
- [ ] `EventDialog.svelte:43` closes the dialog when `path` has no matching event. If a title change renames the note and the merged events drop the old path before `editEvent` resolves, the dialog closes mid-save: a success skips the `lastPath = newPath` step (early return near `:86`), so focus falls back to the view root instead of the renamed block, and a failure in that window toasts instead of showing the inline error. Cover it and the ticket 26 popover item with one E2E: edit the title in the dialog and save, then assert the dialog and popover behaviour and focus.

Ticket 29 review (fix 5c14e82d):
- [ ] The delete toast Undo (`event-calendar.service.ts:1019`) focuses `document.querySelector('[data-event-calendar]')`, the first Calendar root in the DOM, so with two mounted views it can focus the wrong one (focus only).
- [ ] Pre-existing: Undo clicked after a vault switch still calls `undoDeleteEvent(oldPath)` (`:1016`); confirm the restore is refused for a path outside the current vault, and that the toast is dismissed on vault switch.

Ticket 32 review (fix 0542bac2):
- [ ] "Open Event type" (`EventCalendarSection.svelte:79-90`) with an ordinary note `Event.md` already in the vault root: `createFile` (`fs.service.ts:121`) dedupes to `Event 1.md`, whose type name never matches the configured "Event" (resolved by name at `:46-49`), so every later click creates another `Event N.md` and closes Settings on a definition that is not the configured type. Fix: check the returned path's basename against the configured name, or detect the collision first and toast.
- [ ] Nit: `TypeSidebar.svelte:396` discards the new return value (harmless).
