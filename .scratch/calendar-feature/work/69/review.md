VERDICT: CHANGES_REQUESTED

# Review: issue 69, calendar test gaps and consistency nits

Range: `main...HEAD` (ada92c9f..aa628e4b), 13 commits, 17 files.

## How this was checked

- `pnpm check`: 211 files, 0 errors, 0 warnings.
- vitest, run by the reviewer: `src/tests/lib/features/event-calendar`, `src/tests/lib/core/trash`, `src/tests/lib/features/auto-move`, `src/tests/lib/plugins/periodic-notes`, `src/tests/lib/core/app-lifecycle`: 36 files, 1364/1364 passed.
- Mutation probes (source reverted or guard removed, the new test re-run, file restored with `git checkout HEAD`):
  - day-drag, EventTimeGrid, service and daily-note store reverted to `main`: the 4 new tests failed (`EventMonthGrid.test.ts` and `EventTimeGrid.test.ts` lost-release tests, `event-calendar.service.test.ts` "judges a delete tombstone by the index version...", `event-calendar-daily-note.store.test.ts` "...without an unregister...joins").
  - `EventPopover.svelte` `handleInteractOutside` without `e.preventDefault()`: the new retarget test in `EventCalendarView.test.ts` failed.
  - `EventWeekStrip.svelte` refocus line removed: the new week-strip focus test in `EventCalendarView.test.ts` failed.
  - `restoreNow` `if (!isCurrent()) return restored;` removed: the new Undo vault-switch test in `event-calendar.service.test.ts` failed.
- Tailwind 4.3.3 `after:` variant emits `content: var(--tw-content)` (checked in `node_modules/tailwindcss/dist/lib.js`), so the pseudo-element border renders without a `content` utility.
- E2E (`e2e/specs/sidebars.spec.ts`) was read against `BacklinksPanel.svelte`, `LinkItem.svelte`, `e2e/fixtures/test-vault.ts` and the `get_backlinks_v2` mock; not run (orchestrator runs E2E).

The test verdict rests on: `EventMonthGrid.test.ts`, `EventTimeGrid.test.ts`, `EventCalendarView.test.ts`, `EventCalendarSection.test.ts`, `event-calendar.service.test.ts`, `event-calendar-daily-note.store.test.ts` (all under `src/tests/lib/features/event-calendar/`), `src/tests/lib/core/trash/trash.service.test.ts`, `src/tests/lib/features/auto-move/auto-move.service.test.ts`.

## Acceptance criteria (items checked in the Issue)

- [x] Pending dashed border no longer narrows `@container`: met. `EventBlock.svelte:76` uses `after:absolute after:inset-0 after:border after:border-dashed`; `EventTimeGrid.test.ts:182-192` asserts the class and the absence of a real `border`. Visual only, jsdom sees classes.
- [x] View-level retarget test: met. `EventCalendarView.test.ts` "retargets the open popover to a second block..." fails when the retarget guard is removed.
- [x] View-level WeekStrip arrow focus test: met. `EventCalendarView.test.ts` "moves focus with the pressed day..." fails when the refocus is removed.
- [x] Backlinks E2E asserts real entries: met on reading (expands the panel, scopes to the sibling of the "Linked mentions" trigger, asserts Welcome and 2026-Q2 buttons). Not run. See finding 4.
- [x] `showTasks` through `$derived` in `EventTimeGrid.svelte:71`: met; new mounted-flip test in `EventTimeGrid.test.ts`.
- [x] Trash tree miss logged with `error()`: met, `trash.service.ts:168`, test updated. The "disk listing" fallback is tracked by a separate unchecked item.
- [x] Daily-note in-flight map cleared on unregister, comment fixed: partly met. The mechanics match the Issue's ask, but the new comment and test name state a false invariant, and the change makes the cross-vault double-init window join the previous vault's open. See finding 1.
- [x] `eventTypeName` trim verified: met. `settings.logic.ts` `normalizeEventTypeName` trims; no code change needed.
- [x] Auto-move tests (lossy note moved, `setIconForPath` IO error): met, `auto-move.service.test.ts`.
- [x] `lookupCalendarEvent` reads the version before the await: met, `event-calendar.service.ts:213-224`; test fails without the fix.
- [x] Toast Undo vault-switch guard confirmed and tested: met; test fails without the guard.
- [x] Trash folder-case refresh failure test and file-case ordering assertion: met, `trash.service.test.ts` (two new tests).
- [x] `EventCalendarSection.test.ts` waits on the `creating` reset: met; `flushSync` inside `vi.waitFor` makes the disabled check read current state.
- [x] Lost release after an Escape discard (DayDrag and time grid): met. `#discard` / `discardGesture` add a capture `pointerdown` that runs `#disarm` / `disarmSwallow`, which already removes the `pointerup` waiter; a normal release re-adds the same listener (deduped) via `#arm`. Unmount cleanup (`EventTimeGrid.svelte:93-96`, `DayDrag.reset`) removes it.

Unchecked items each carry a reason in the Issue; none is forced. The Issue keeps `Status: ready-for-agent` and is not closed, which is right while items remain open.

Layer rules: no `features/` -> `plugins/` import added. Commit messages: every commit has Context/Problem/Solution/Behavior/Files and the trailer. No scope creep found.

## Findings

1. **Medium** (behavior impact low), `src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:31-33` (and the test name at `src/tests/lib/features/event-calendar/event-calendar-daily-note.store.test.ts:105`). The new comment says "A replacement without an unregister is a re-init of the same vault". That is false for the only reachable path: `+layout.svelte:55-67` re-runs `initializeVault` only when `vaultStore.path` / `isOpen` change, and `app-lifecycle.service.ts:136-138` documents the rapid double switch (A->B, then B->C before B's step 7) in which `teardownVault` is skipped, so C's `registerCalendarDailyNoteOpener()` (`:251`) replaces B's opener with no unregister. The two openers belong to different vaults. Before this change `register` cleared the map; now a click on a day header in vault C while B's open of the same day is in flight returns B's promise and opens nothing in C. A same-vault replacement without unregister is only reachable through HMR. Fix: key the join by vault, e.g. have `register` take the vault path (passed from `registerCalendarDailyNoteOpener` via `vaultStore.path`) and clear `inFlight` when it differs from the previous registration's path, keeping the clear in the unregister; or restore the clear in `register` alongside the new one in the unregister. Either way rewrite the comment and the test name to describe the real case, and add a test for the cross-vault replacement (does not join).
2. **Low**, `src/tests/lib/features/event-calendar/event-calendar-daily-note.store.test.ts:40-51`. The unregister now also clears `inFlight`, but no test pins that a stale unregister (a replaced opener's handle) leaves the current opener's in-flight opens alone; moving `inFlight.clear()` above the `opener !== next` guard passes every test. Fix: extend the "stale unregister leaves it in place" test to start an open under the new opener, call the stale unregister, and assert a second open of that day returns the same promise.
3. **Low**, `src/lib/features/event-calendar/EventMonthGrid.svelte:126`. The month chip still draws its pending state with a real `border border-dashed`. It has no `@container` switch, so no bug today, but the two pending styles now differ in mechanism. Fix: none required; mention in the Issue comment that the chip was left on purpose, or align it if a container query is ever added there.
4. **Nit**, `e2e/specs/sidebars.spec.ts:28`. `toContainText('2')` on the "Linked mentions" trigger also passes for 12, 20 or 21 mentions. Fix: `toHaveText(/Linked mentions\s*2$/)` or assert the count `<span>` exactly.

## Resolution

1. Fixed (4de6ff2f): took the second option. `register` clears the in-flight map again and the current opener's unregister keeps its clear; the comment names the double vault switch. The "same-vault re-init joins" test is replaced by a double vault switch test (replacement does not join). Keying by vault was not needed: the only reachable replacement without an unregister is cross-vault (HMR aside). Mutation probe: dropping the clear in `register` fails the new test.
2. Fixed (4de6ff2f): the stale-unregister test starts an open under the current opener, runs the stale unregister and asserts the second open returns the same promise. Mutation probe: moving `inFlight.clear()` above the `opener !== next` guard fails it.
3. No code change: the month chip keeps its real dashed border on purpose (no `@container` switch there); noted in the Issue.
4. Fixed (bc0a6ab3): asserts the count span with `toHaveText('2')`.
