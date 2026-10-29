# 76: Calendar leftovers from issue 69

**What to build:** triage the items issue 69 left unchecked (each with a reason) and the low finding from the post-merge review of its fix; split any worth doing into their own issues, close the rest as wontfix.

**Blocked by:** None

**Status:** needs-triage

Carried over verbatim from `.scratch/calendar-feature/issues/69-calendar-test-gaps-and-consistency.md` as of `f702ca61` (deleted in `fd77eef6`):

- [ ] `compositedTextColors` in `e2e/specs/event-calendar.spec.ts` (~41-59) folds the block opacity into the text color but not the background, and reads the background without its alpha, so contrast is mis-measured on a translucent block; no contrast assertion covers a pending block. **Left:** needs a Playwright run to validate the new measurement; not run in this workflow.
- [ ] The z-index clamp `10 + min(column, 9)` has only a style-string unit test, no E2E check of the layering against the now-line. **Left:** E2E only; needs a Playwright run.
- [ ] A chip dragged into a full month cell can hide behind "+N more" until dropped (see `work/59/review.md` Resolution). **Left:** product layout change in the month grid, not a nit.
- [ ] The focus effect's loaded check (`EventCalendarView.svelte:166-167`) ignores `storeProjectionKey` (theoretical: a settings change re-triggers the load). **Left:** theoretical; would need `storeProjectionKey` exposed from the service.
- [ ] With a stale tree, "Open Event type" (`EventCalendarSection.svelte:109-111`) has already written and opened `Event 1.md` before the name-taken toast fires: one stray copy, not one per click. **Left:** needs a create that fails instead of deduping the name.
- [ ] `saveFileByPath` (`editor.service.ts:132-149`) does not serialize per path: an autosave of A in flight plus an icon write saving B (A + icon) can land A last, so the disk lacks the icon and the tab stays dirty with no timer armed until the next edit. No text is lost; a per-path save queue would close it. **Left:** a per-path save queue in the editor save path is a risky change for a no-data-loss case.
- [ ] `auto-move.service.ts:195` checks lossiness on the content captured at save time, not at write time after the debounce; an edit in that window yields one refusal toast or a delayed icon. **Left:** needs a re-read at write time; one toast at worst.
- [ ] `restoreItem` (`src/lib/core/trash/trash.service.ts:155-175`) now swallows a failing `refreshTree` (`scan_vault`) after the rename. Settings > Trash then drops the item with no toast and the note is missing from the file explorer until a later refresh. Consider returning a "restored, refresh failed" flag and showing a warning in `TrashSection.svelte:23-30`. **Left:** changes `restoreItem`'s return and Settings > Trash; for a human to decide the API.
- [ ] A folder restore whose `refreshTree` throws skips `indexRestoredNotes` entirely, so the folder's notes stay out of VaultIndex/FTS/semantic until a full rescan (same state as before the fix, now without feedback). **Left:** needs a disk listing fallback (same as the ticket 47 item); a test now pins the current behavior (ff2b09d0).
- [ ] `EventCalendarSection.svelte:96`: with no vault open the service returns null without a toast and the calendar now returns silently (likely unreachable). **Left:** likely unreachable (the button needs an open vault).
- [ ] Pre-existing: in the calendar's post-create race branch (file created as `Event 1.md`), `createTypeDefinition` has already opened the stray file before the name-taken toast, and the duplicate is left behind. **Left:** same as the stale-tree "Open Event type" item.

From the post-merge review of 4de6ff2f (issue 69 fix), low:
- [ ] `event-calendar-daily-note.store.svelte.ts:39` with `app-lifecycle.service.ts:251`: a register without an unregister for the same vault (HMR, or a layout remount before init step 7 so teardown is skipped) clears the pending-open map; a second click on the same not-yet-created day can race `create_note` and show a "File already exists" toast while the note still opens once. Dev-only or very narrow window.
