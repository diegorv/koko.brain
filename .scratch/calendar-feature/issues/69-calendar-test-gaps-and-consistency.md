# 69: Calendar test gaps and consistency nits

**What to build:** close test-coverage gaps and small consistency nits found by the reviews; mostly tests, little product code. Split out of the former ticket 64 (Calendar polish from the post-merge adversarial reviews). Items are low severity as recorded; line anchors are as recorded at review time and may have drifted, so re-locate them on main first.

**Blocked by:** None

**Status:** ready-for-agent

Ticket 22 review (fix b3ffc1ef):
- [ ] `compositedTextColors` in `e2e/specs/event-calendar.spec.ts` (~41-59) folds the block opacity into the text color but not the background, and reads the background without its alpha, so contrast is mis-measured on a translucent block; no contrast assertion covers a pending block. **Left:** needs a Playwright run to validate the new measurement; not run in this workflow.
- [x] The pending dashed border in `EventBlock.svelte:60` (now `:66`) takes 2px, so the `@max-[84px]` title-only switch triggers about 2px earlier for a pending block. **Done:** drawn by an `after:` pseudo-element (94568f08).
- [ ] The z-index clamp `10 + min(column, 9)` has only a style-string unit test, no E2E check of the layering against the now-line. **Left:** E2E only; needs a Playwright run.

Ticket 26 review (fix ed15a49c):
- [x] No view-level test covers retargeting; only the `EventPopover` mount tests and the E2E do. **Done:** `EventCalendarView.test.ts` (b69256e1).

Ticket 58 review (fix 269cfc1e):
- [x] No view-level test asserts `document.activeElement` after an arrow key on a focused WeekStrip day; the focus-follow is only tested in `EventWeekStrip.test.ts` via a direct `setDate`. Add one to `EventCalendarView.test.ts`. **Done:** `EventCalendarView.test.ts` (b69256e1).

Ticket 59 review (fix f1504724):
- [ ] A chip dragged into a full month cell can hide behind "+N more" until dropped (see `work/59/review.md` Resolution). **Left:** product layout change in the month grid, not a nit.

Ticket 56 review (fix 0e187396):
- [ ] The focus effect's loaded check (`EventCalendarView.svelte:166-167`) ignores `storeProjectionKey` (theoretical: a settings change re-triggers the load). **Left:** theoretical; would need `storeProjectionKey` exposed from the service.

E2E harness (found while fixing the issue 56 backlink spec, 81053434):
- [x] `e2e/specs/sidebars.spec.ts` "backlinks panel populates for a note with incoming links" only checks that `/backlinks|linked mentions/i` is visible; the panel header satisfies it, so it passed while backlinks failed to render. Assert on an actual backlink entry. **Done:** asserts the Welcome and 2026-Q2 entries under "Linked mentions" (e6fd3756); not run in the build step.

Ticket 40 review (fix c987395b):
- [x] `EventTimeGrid.svelte:278` still reads `settingsStore.eventCalendar.showTasks` in the template, unlike the `$derived` used in `EventCalendarView.svelte:199` and `EventMonthGrid.svelte:26`; no visible effect, align for consistency. **Done:** (0c7d351c).

Ticket 47 review (fix 8bd85874):
- [x] The "restored folder not in the tree" line in `trash.service.ts:160` uses `debug()`, which is off by default, yet a miss leaves the folder's notes out of VaultIndex, FTS5 and semantic until a full rebuild (the watcher drops the directory-only rename). Raise it to `error()` / `appendLog`, and consider indexing from a disk listing when the tree lookup misses (symlinked vault root). **Done:** raised to `error()` (ff2b09d0). Indexing from a disk listing on a miss is not done.

Ticket 68 review (fix 17dd1f47):
- [x] `event-calendar-daily-note.store.svelte.ts:36` clears the per-day in-flight map on every `register`, including a same-vault re-init (double-init window noted at `app-lifecycle.service.ts:244-246`) or HMR; a click in that window runs a second open and toasts "File already exists" (no duplicate file). Clear on unregister/teardown instead, and fix the comment that says the entries belong to another vault. **Done:** cleared in the unregister of the current opener (a0007f66).
- [ ] With a stale tree, "Open Event type" (`EventCalendarSection.svelte:109-111`) has already written and opened `Event 1.md` before the name-taken toast fires: one stray copy, not one per click. **Left:** needs a create that fails instead of deduping the name.
- [x] Unverified: `openEventType` builds the file name from the untrimmed `calendar.eventTypeName` while `validateTypeName` trims; check whether the setting can hold surrounding spaces. **Done:** verified, no change: the input normalizes on change (`EventCalendarSection.svelte:250`) and settings load normalizes through `normalizeEventTypeName` (`settings.logic.ts:85`), which trims.

Ticket 55 review (fix 27152237):
- [ ] `saveFileByPath` (`editor.service.ts:132-149`) does not serialize per path: an autosave of A in flight plus an icon write saving B (A + icon) can land A last, so the disk lacks the icon and the tab stays dirty with no timer armed until the next edit. No text is lost; a per-path save queue would close it. **Left:** a per-path save queue in the editor save path is a risky change for a no-data-loss case.
- [ ] `auto-move.service.ts:195` checks lossiness on the content captured at save time, not at write time after the debounce; an edit in that window yields one refusal toast or a delayed icon. **Left:** needs a re-read at write time; one toast at worst.
- [x] No test for a lossy note that auto-move actually moves, nor for an IO error from `setIconForPath`. **Done:** (9049cc05).

Ticket 66 review (fix 7c772842):
- [x] `lookupCalendarEvent` (`event-calendar.service.ts:220`) reads `vaultIndexVersion` after `await getVaultEntries()`, while the store reload reads it before its await (`:76`); a bump during the await pairs an older snapshot with a newer version and can expire a delete marker one bump early. Practically unreachable; capture the version before the await. **Done:** (b9c9eb90).
- [x] Unchecked: once `undoDeleteEvent` starts, a vault switch mid-flight is not re-checked in the toast Undo closure; confirm `undoDeleteEvent` guards it. **Done:** guarded: `restoreNow` returns after `restoreItem` when the generation moved, before touching any store; test added (abee2b2d).

- From the post-merge review of baf12cca (issue 63 fix), all low:
  - [ ] `restoreItem` (`src/lib/core/trash/trash.service.ts:155-175`) now swallows a failing `refreshTree` (`scan_vault`) after the rename. Settings > Trash then drops the item with no toast and the note is missing from the file explorer until a later refresh. Consider returning a "restored, refresh failed" flag and showing a warning in `TrashSection.svelte:23-30`. **Left:** changes `restoreItem`'s return and Settings > Trash; for a human to decide the API.
  - [ ] A folder restore whose `refreshTree` throws skips `indexRestoredNotes` entirely, so the folder's notes stay out of VaultIndex/FTS/semantic until a full rescan (same state as before the fix, now without feedback). **Left:** needs a disk listing fallback (same as the ticket 47 item); a test now pins the current behavior (ff2b09d0).
  - [x] `trash.service.test.ts:331-344` covers only the file case; add a folder-case test and assert `applyNoteChange` ran before the refresh failure. **Done:** (ff2b09d0).

- From the post-merge review of ac9cb94b (issue 70 fix), all low:
  - [x] `EventCalendarSection.test.ts` "keeps the panel open without a second toast" waits one `await Promise.resolve()` before asserting no toast; use `vi.waitFor` on the `creating` reset so the negative check is real. **Done:** (a0f96f20).
  - [ ] `EventCalendarSection.svelte:96`: with no vault open the service returns null without a toast and the calendar now returns silently (likely unreachable). **Left:** likely unreachable (the button needs an open vault).
  - [ ] Pre-existing: in the calendar's post-create race branch (file created as `Event 1.md`), `createTypeDefinition` has already opened the stray file before the name-taken toast, and the duplicate is left behind. **Left:** same as the stale-tree "Open Event type" item.

- [x] From the post-merge review of 5632bb89 (issue 67 fix), low: `event-calendar-day-drag.svelte.ts:116` - after an Escape discard, a lost release (pointercancel, or release outside the window) never removes `#releaseAfterDiscard`; a later press outside the area released inside it can arm the swallow and eat one click. Harden by also removing the listener on the next pointerdown. **Done:** in DayDrag and the time grid (e5124b78).

## Comments

- 2026-10-28 22:20 — discovery — 12 items planned, 9 left for a human with reasons (work/69/discovery.md) — ada92c9f
- 2026-10-28 22:27 — implement — 14 items done in 11 commits, 11 left unchecked with reasons; pnpm check 0 errors, touched suites 1364/1364 — 94568f08
- 2026-10-28 22:32 — review — CHANGES_REQUESTED: daily-note in-flight join is wrong across vaults in the double-init window (comment claims same-vault); 1 medium, 2 low, 1 nit (work/69/review.md) — aa628e4b
