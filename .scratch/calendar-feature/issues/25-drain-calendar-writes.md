# 25: In-flight calendar writes drained before vault teardown and window close

**What to build:** a vault switch and a window close both wait for every queued calendar write to settle before anything is torn down. `initializeVault` awaits `drainEventCalendarWrites()` between `saveAllDirtyTabs()` and `teardownVault()`, so queued `notifyAfterSave` calls reach the old vault's index before teardown. `registerCloseHandler` awaits it after the discard prompt and before `flushSettingsPersistence()`, so a drag, create or delete queued just before Cmd+Q is no longer cut between its write and `notifyAfterSave`, or between a restore's rename and its index update. The new awaits write no store and only order existing ones (Notes C9). The double-switch path (teardown skipped) stays covered by the write generation (Task 23, ticket 24) and the writer's `vault-changed` check (Task 12, ticket 13).

**Plan reference:** Task 24 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 574-584). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 20, 24

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/app-lifecycle/app-lifecycle.service.ts` (modify)
- `src/lib/core/layout/tauri-listeners.service.ts` (modify)
- `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts` (modify)
- `src/tests/lib/core/layout/tauri-listeners.service.test.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh e2e/specs/editor.spec.ts`

- [ ] The existing regression cases stay green before and after the change: "saveAllDirtyTabs before resetEditor" (`src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts:1169-1185`) and "saves all dirty tabs before destroying the window" (`src/tests/lib/core/layout/tauri-listeners.service.test.ts:203`)
- [ ] `initializeVault` (`app-lifecycle.service.ts:165-172`) awaits `drainEventCalendarWrites()` right after `await saveAllDirtyTabs()` and before `teardownVault()`, through the event-calendar service import that ticket 20 added
- [ ] `registerCloseHandler` (`src/lib/core/layout/tauri-listeners.service.ts:49-67`) awaits `drainEventCalendarWrites()` after the discard prompt and before `await flushSettingsPersistence()` (`:66`); the close-handler drain is the only change to this file (D3)
- [ ] `app-lifecycle.service.test.ts` extends the existing `vi.mock('$lib/features/event-calendar/event-calendar.service', ...)` from ticket 20 and asserts with `invocationCallOrder` that `saveAllDirtyTabs` < `drainEventCalendarWrites` < `resetEditor` on the switch path
- [ ] `app-lifecycle.service.test.ts` asserts that the first open (no previous vault) never calls `drainEventCalendarWrites`
- [ ] `tauri-listeners.service.test.ts` adds `vi.mock('$lib/features/event-calendar/event-calendar.service', ...)` beside the existing service mocks (`:52-74`, orchestrator exception) and asserts `saveAllDirtyTabs` < `drainEventCalendarWrites` < `flushSettingsPersistence` < `destroy`
- [ ] `tauri-listeners.service.test.ts` asserts that a cancelled discard prompt never drains and never destroys the window
- [ ] Both drain-order assertions are seen failing before the awaits are added (Notes C9, Q5)
- [ ] Every new or extended `vi.mock` string uses the same specifier as the module's import (`$lib` or `#lib` per Notes > Dependencies), so no mock silently loads the real service
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)
