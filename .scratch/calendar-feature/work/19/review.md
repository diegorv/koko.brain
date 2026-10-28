VERDICT: CHANGES_REQUESTED

# Review: calendar-feature issue 19 (read service, calendar clock, Calendar tab openers)

Reviewed `git diff main...HEAD` (36ebf354, c3ef20b7, b12e8343) in the worktree.

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings (192 files).
- `vitest run src/tests/lib/features/event-calendar/ src/tests/lib/core/editor/ src/tests/lib/core/vault/ src/tests/lib/plugins/graph-view/`: 24 files, 705/705 passed.
- The test verdict rests on `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` (new), `src/tests/lib/core/editor/editor.logic.test.ts` (changed), and the existing event-calendar store, view-store and logic suites, `src/tests/lib/core/vault/` (the `getVaultEntries` memo) and `src/tests/lib/plugins/graph-view/` (the copied opener pattern).
- Probe: a temporary test file, deleted afterwards and not committed. (a) A load made stale only by a vault switch leaves `eventCalendarStore.isLoading === true`. This was reproduced and is finding 1. (b) Two `loadEvents()` calls at the same index version, with a settings change between them, make one `invoke` call and re-project with the new color. This holds but no committed test covers it (finding 2).

## Acceptance criteria

- [x] **`'event-calendar'` fileType and `EVENT_CALENDAR_VIRTUAL_PATH`: met.** The type is at `editor.types.ts:12`. The constant is at `editor.logic.ts:14-15` with value `'__virtual__/event-calendar'`. `editor.logic.test.ts:120-123` asserts both the value and `isVirtualTab`. The build report says this test failed before the implementation.
- [x] **`loadEvents()` projection: met.** `event-calendar.service.ts:37-56` calls `getVaultEntries()`, then `eventsFromEntries` with defaults, `typeName`, `vaultPath` and `systemFolder`, then `setSnapshot(projection, version)`. It uses a latest-wins token plus the captured `vaultStore.path` (`:38-41`). The defaults use `defaultDurationMinutes` and `defaultColor`, which is the real `EventDefaults` shape (`event-calendar-event.logic.ts:43`). The ticket's `durationMinutes` / `color` is shorthand. Test: `service.test.ts:175-182`.
- [x] **Failure handling: met.** On failure it calls `error('EVENT-CALENDAR', ...)` (`:57`), sets `loadError` when the load is still current, leaves events alone and rethrows (`:56-63`). Test: `service.test.ts:195-209` asserts the same `events` reference, the unchanged `snapshotVersion`, `loadError`, `console.error` and the rejection.
- [x] **Service test setup and coverage: met.** Only `@tauri-apps/api/core` is mocked (`service.test.ts:6-8`). The tests use the real vault, editor, settings and event-calendar stores and the real logic. Coverage: happy path `:157`, empty vault `:184`, IPC rejection `:195`, stale result after reset `:221`. They also cover a stale failure, latest-wins and a vault switch.
- [x] **Load scope: met.** `service.test.ts:278-289` checks that the `_system/templates` template and the archived event are excluded and that `archivedCount` is 1. `:291-301` checks that only `_type: Meeting` notes load with `eventTypeName: 'Meeting'`.
- [x] **Tab openers: met.** `service.ts:70-104` copies `graph-view.service.ts:20-53` line for line and uses the name "Calendar". `service.test.ts:72-154` tests open, focus, date/view, toggle in all three branches and close against `editorStore.tabs`.
- [x] **C5: met.** The openers write tabs only through `addTab`, `setActiveIndex` and `removeTab`. `setDate` / `setView` run only when `date` / `view` are given (`:71-72`, tested at `:96-121`), and both clear the popover (`event-calendar-view.store.svelte.ts`).
- [x] **`acquireCalendarClock()`: met.** It is ref-counted with a 30 s `setInterval`, a `focus` listener on window and a `visibilitychange` listener on document (`:122-127`). Release is idempotent through a closure flag, the count is clamped with `Math.max(0, …)`, and the last release clears the interval and both listeners (`:129-138`).
- [x] **Clock tests: met.** They use fake timers and a focus event (`service.test.ts:304-388`): double release `:350`, two acquirers `:350-362`, timer count 0 and listeners removed after the last release `:337-348`.
- [x] **`resetEventCalendar()`: met.** It resets the two stores and bumps the load token, and touches neither the clock nor the tabs (`:145-149`). `service.test.ts:376-388` acquires, resets, releases, re-acquires and checks that the interval still ticks. `:405-409` checks the tabs are untouched.
- [ ] **Gate green and one commit in full format: not yet.** The full gate and e2e are deferred to the deliver step. The feat commit c3ef20b7 has Context, Solution, Behavior, Tests and Files with line ranges; no Problem section is needed for a new feature.

## Findings

1. **Medium: `event-calendar.service.ts:45` and `:58-61`. A load made stale only by a vault switch leaves `isLoading` stuck at `true`.**
   - `isCurrent()` combines the token check with the path check. When a load is still the latest (`token === loadToken`) but `vaultStore.path` changed while it was in flight, both the success branch (`:45 return`) and the failure branch (`:58`) skip `setLoading(false)`.
   - No newer load or reset owns the flag in this case, so it stays `true` until some later load. Reproduced by the probe: `loadEvents()`, then `vaultStore.open('/other')`, then resolve. `isLoading` is `true`.
   - It can happen in practice. The Task 20 view effect (plan line 452) calls `loadEvents()` on `vaultIndexVersion` / `indexReady` changes. A load started after Task 19's entry reset and before the path changes during `initializeVault` lands in exactly this state.
   - Fix: split the guard. When the load is stale by path only, clear the flag before discarding. For example, `if (token === loadToken) eventCalendarStore.setLoading(false);` before the early return, and the same in the catch branch when the load is not current. Write nothing else.
   - Test: extend `service.test.ts:266-276` to assert `isLoading === false`, and add the matching stale-by-path rejection case (rethrown, `loadError` null, `isLoading` false).

2. **Low: test gap, `event-calendar.service.ts:33-34`.** The JSDoc says a re-projection after a settings change costs no IPC, and the plan relies on this for the settings-keyed effect (plan line 452). No committed test pins it.
   - Fix: add a test that calls `loadEvents()` at version N, changes `settingsStore.updateEventCalendar({ defaultColor: 'green' })`, calls `loadEvents()` again and asserts one `invoke` call and that the event's `color` is `'green'`. The probe showed this passes on the current code.

3. **Low: test isolation, `service.test.ts:313-388`.** `clockRefs` and `clockTimer` are module-global, and every clock test calls its release at the end of the test body. If an assertion fails before that call, the ref leaks into every later test. The next "first acquire" then does not tick, which produces confusing cascade failures.
   - Fix: push each release into an array and call them all in the clock `describe`'s `afterEach`. The release is idempotent, so calling it twice is safe.

4. **Info, no change in this Issue: `event-calendar.service.ts:62`.** A stale failure is rethrown by design (the documented default). The Task 20 caller's `.catch(...)` must therefore not toast an error from a superseded load, such as the previous vault's error after a switch. Record this for Task 20. It does not block this Issue.

No scope creep. All five touched source and test files are the ones the Issue lists. The layer rules hold (a feature imports core), and the service propagates its errors as CLAUDE.md requires. No mocks of stores or `.logic.ts` files were added.
