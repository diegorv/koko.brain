VERDICT: CHANGES_REQUESTED

# Review: Issue 25, drain calendar writes before vault teardown and window close

Reviewed `git diff main...HEAD` (884dd25a, 9baefa39, 893e0327) in the worktree.

Test verdict rests on my own runs of:
- `src/tests/lib/core/layout/tauri-listeners.service.test.ts` (changed)
- `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts` (changed)
- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` (owns `drainEventCalendarWrites`)
- `src/tests/lib/features/properties/frontmatter-write.service.test.ts` (the writer the drain waits on)

Result: 4 files, 195 passed, 0 failed. `pnpm check`: 0 errors, 0 warnings. I did not run the full gate or E2E (deliver runs those).

## Acceptance criteria

- [x] **Existing regression cases stay green.** Met. "saves all dirty tabs before tearing down previous vault on switch" (app-lifecycle test :1222-1244, moved from the ticket's :1169-1185) and "saves all dirty tabs before destroying the window" (tauri-listeners test :210) pass.
- [x] **`initializeVault` awaits the drain after `saveAllDirtyTabs()` and before `teardownVault()`.** Met. See app-lifecycle.service.ts:174-179. The await uses the existing event-calendar import (:64). It sits only on the switch branch.
- [x] **`registerCloseHandler` awaits the drain after the discard prompt and before `flushSettingsPersistence()`, and nothing else in the file changes.** Met. See tauri-listeners.service.ts:63-65, plus the import at :17. Nothing else in the file changed.
- [x] **app-lifecycle test extends the existing mock and checks the order with `invocationCallOrder`.** Met as worded. The mock at :151-154 and the test at :1246-1258 check `saveAllDirtyTabs` < drain < `resetEditor`. The test does not prove the drain is awaited (finding 1).
- [x] **First open never drains.** Met. See :1336-1340. The describe's `beforeEach` calls `teardownVault()` (:1161), so this really is a first open.
- [x] **tauri-listeners test adds the mock and checks save < drain < flush < destroy.** Met as worded. The mock is at :65-70 and the test at :297-316. The flush shows up through the mocked `writeSettingsFile` boundary. If the flush never wrote, `invocationCallOrder[0]` would be undefined and `toBeLessThan` would throw, so the assertion cannot pass vacuously. It still does not prove the await (finding 1).
- [x] **A cancelled discard neither drains nor destroys.** Met. See :318-329.
- [~] **Both drain-order assertions are seen failing before the awaits are added.** Partly met. The build report says they went red. They went red because the drain was not called at all. Removing only the `await` keeps them green (finding 1).
- [x] **Every `vi.mock` specifier matches the module's import.** Met. All are `$lib/features/event-calendar/event-calendar.service`, the same as both source imports. No `#lib` imports exist on main yet.
- [ ] **Gate green, one commit in full format.** Not yet checked; the deliver step owns the gate. Commit 9baefa39 has Context, Problem, Solution, Behavior, Files with line ranges and the trailer. Its Problem and Behavior text repeats the inaccurate switch-path claim (finding 2).

Rules checks:
- Layer rules: both files already imported `features/`, so nothing new crosses a layer (app-lifecycle :62-64, tauri-listeners :10-16).
- No store writes were added.
- `drainEventCalendarWrites` uses `Promise.allSettled` and never rejects (event-calendar.service.ts:246-248), so neither the close nor the switch can be aborted by a failed write.
- Tabs are used and the scope matches the Touches list.

## Findings

1. **Medium: the new tests do not pin the `await`, which is the whole change.**
   - Where: src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts:1246-1258 and src/tests/lib/core/layout/tauri-listeners.service.test.ts:297-316.
   - Problem: both mocks return `Promise.resolve()`. If `await drainEventCalendarWrites()` became `void drainEventCalendarWrites()`, the drain would still run synchronously before `teardownVault()` and before `flushSettingsPersistence()`. So `invocationCallOrder` would still read save < drain < reset/flush/destroy and both tests stay green. The red-first run only proved the call is present, not that it is awaited.
   - Fix: add one deferred-drain case per file.
     - app-lifecycle: make `drainEventCalendarWrites` return a pending promise. Start `initializeVault('/vault-b')` without awaiting it and flush microtasks. Assert `resetEditor` (or `stopWatching`) has not been called. Resolve the promise, await the init, then assert `resetEditor` was called.
     - tauri-listeners: the same with `capturedCloseHandler`. While the drain is pending, assert `writeSettingsFile` and `mockDestroy` have not been called. After it resolves, assert both were.

2. **Medium: the switch-path rationale in the code comment and the commit is false for the common case. The drain cannot make a queued calendar write reach the old vault's index.**
   - Where: src/lib/core/app-lifecycle/app-lifecycle.service.ts:175-176, the Problem and Behavior sections of 9baefa39, and the ticket's "What to build".
   - Why it is false:
     - `vaultStore.path` is already the new vault before `initializeVault(B)` runs. `vault.service.ts:11,33` calls `vaultStore.open(...)`, and the `$effect` in `src/routes/(app)/+layout.svelte:54-61` then calls `initializeVault(path)`. The comment at app-lifecycle.service.ts:103-108 says the same thing.
     - An in-flight write to a closed note therefore fails `assertVault` (frontmatter-write.service.ts:120, which compares the live `vaultStore.path` with the captured vault). It throws `vault-changed` after `writeTextFile` and skips `notifyAfterSave` (:123). `frontmatter-write.service.test.ts:381-400` pins exactly this: "skips the after-save path when the vault switches during the write", with no `update_note_in_index`.
     - A queued write that has not started yet runs after `resetEventCalendar()` (app-lifecycle.service.ts:145, which runs before the drain). It throws `missing` from `requireEvent` (event-calendar.service.ts:257-259).
     - Only the open-tab branch reaches an index. There `saveFileByPath` calls `notifyAfterSave` itself (editor.service.ts:141) before the writer's `assertVault` throws.
   - What the switch drain actually guarantees: every in-flight calendar write settles before `teardownVault()` resets the editor and stores, so no write is still running under the teardown. It does not guarantee the index update.
   - The close path is not affected. `vaultStore.path` does not change on close, so the claim holds there.
   - Fix (in scope):
     - Reword the comment at :175-176 to say what the drain guarantees, for example: "Let in-flight calendar writes settle before teardown resets the editor and stores; a write to a closed note has already lost its index update to the vault-changed check, since vaultStore.path is the new vault by now."
     - Do not rewrite 9baefa39. Correct the record in the fix commit's message.
     - Add an Issue comment recording the gap for a human: on a switch, a calendar write to a closed note lands on disk with no index update in the old vault. Closing that gap needs a drain before `vaultStore.open` or a writer change, which is outside this ticket's Touches list.

## Resolution

Both findings accepted and fixed; none rejected.

1. Added a deferred-drain case to each file: app-lifecycle.service.test.ts:1260-1281 (resetEditor and stopWatching stay uncalled while the drain is pending) and tauri-listeners.service.test.ts:318-344 (writeSettingsFile and destroy stay uncalled while the drain is pending). Both were seen failing with `void drainEventCalendarWrites()` in place of the awaits, then passing with the awaits restored.
2. Reworded app-lifecycle.service.ts:175-177 to what the switch drain guarantees. The fix commit's message corrects the 9baefa39 record (not rewritten). The closed-note index gap on a switch is recorded as a human follow-up in the Issue's Comments.
