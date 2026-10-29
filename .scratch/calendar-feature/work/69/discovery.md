# 69 discovery: calendar test gaps and consistency nits

A list of independent low items. Each done item is its own commit; the rest stay unchecked in the Issue with a reason.

## Done in this branch (file:line on main at ada92c9f)
1. Lost release after an Escape discard (issue 67 review): `event-calendar-day-drag.svelte.ts:113-120` `#discard` and `EventTimeGrid.svelte:119-127` `discardGesture` also listen for the next window `pointerdown` (capture) and disarm, so a lost release no longer leaves `releaseAfterDiscard` waiting. Red tests in `EventMonthGrid.test.ts` / `EventTimeGrid.test.ts` next to "swallows ... Escape-discarded".
2. `lookupCalendarEvent` (`event-calendar.service.ts:206-221`): read `vaultIndexVersion` before `await getVaultEntries()`, as `loadEvents` (`:77`) does. Test: `invoke` mock bumps the version mid-await; a delete tombstone settled at v1, looked up at v2, must still hide the note.
3. `eventCalendarDailyNoteStore.register` (`event-calendar-daily-note.store.svelte.ts:34-39`): clear `inFlight` in the unregister of the current opener (teardownVault, `app-lifecycle.service.ts:554`), not on every register; fix the comment. Rewrite the "new registration does not join" test to unregister first; add "a re-registration without unregister joins".
4. Trash: `trash.service.ts:168` tree miss raised from `debug` to `error`; tests: folder restore whose `refreshTree` throws, file restore asserting the index ran before the refresh failure, tree-miss logs `error`.
5. `EventTimeGrid.svelte:342` `showTasks` through a `$derived`, as in `EventMonthGrid.svelte:26`.
6. `EventCalendarSection.test.ts:253-265`: wait on the button's `creating` reset instead of one microtask.
7. Toast Undo vault-switch guard (issue 66 review): `restoreNow` returns before touching stores when `!isCurrent()` after `restoreItem`; add a test that switches mid-restore.
8. `eventTypeName` trim (issue 68 review): verified, no change. The input normalizes on change (`EventCalendarSection.svelte:250`) and settings load normalizes (`settings.logic.ts:85` -> `normalizeEventTypeName` trims).
9. View-level tests in `EventCalendarView.test.ts`: WeekStrip arrow key moves `document.activeElement`; popover retargets to a second block.
10. Auto-move tests (`auto-move.service.test.ts`): lossy note that is moved (moved, no icon), `setIconForPath` IO error is logged.
11. `e2e/specs/sidebars.spec.ts` backlinks test asserts the linking note's entry (not run here; the orchestrator runs E2E).
12. Pending dashed border (`EventBlock.svelte:74`): draw it with an `after:` pseudo-element so it does not shrink the `@container` content box (the `@max-[84px]` switch).

## Left for a human (unchecked, with reason)
E2E contrast helper and z-index E2E (need a Playwright run to validate), "+N more" hiding a dragged chip (product layout change), focus-effect `storeProjectionKey` (theoretical, needs service state exposed), stray `Event 1.md` after a stale tree (needs a create-without-dedupe API), `saveFileByPath` per-path queue and auto-move write-time lossiness (risky editor-save change), restore "refresh failed" flag + folder indexing from a disk listing (API change across trash and Settings), `EventCalendarSection.svelte:96` silent null (likely unreachable).

## Risks
- Item 3 changes an existing test's expectation; the Issue asks for exactly that.
- Item 12 is visual; jsdom only sees classes. The pseudo-element sits inside the block's padding box and is clipped by its `overflow-hidden` with the same radius.
