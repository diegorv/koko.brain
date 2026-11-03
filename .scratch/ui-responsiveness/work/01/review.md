VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: `app-lifecycle.service.test.ts:615` asserts `buildTaskIndex` is NOT called after `initializeVault` plus a macrotask flush — the test at `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts:617` (shifted by the 2-line comment) is `expect(buildTaskIndex).not.toHaveBeenCalled()` after `await new Promise((r) => setTimeout(r, 0))`; it is red against main's `app-lifecycle.service.ts:409` (which calls `buildTaskIndex()` in the same timer) and green now that 269f0c7f drops the call. The import, comment and `Step 5b` perf label are updated; nothing else asserts that label.
- [met] Delete the assertion at `app-lifecycle.service.test.ts:688` instead of flipping it: it is a watcher test that passes only because the startup `setTimeout(0)` fires after `vi.clearAllMocks()`. `:687` and `:710` assert `buildTagIndex`, which stays at startup in this Issue, so they keep passing (by accident: they are watcher tests too). Leave them. Do not add tags or tasks to the watcher path to make any of them pass. `:535` and `:1172` stay valid — the diff deletes only the `buildTaskIndex` line in the file-change-listener test; `buildTagIndex` assertions at `:689` / `:711` and the `:534-535` / `:1172-1173` assertions are untouched; `git diff main...HEAD` touches no watcher source (only `app-lifecycle.service.ts`, `tags.*`, `tasks.service.ts` doc).
- [met] Failing first: 6,040 flat tags build in under 200 ms (a 20k case would exceed vitest's 5 s timeout on the red run) — `tags.logic.test.ts` "builds 6,040 flat mixed-case tags in under 200 ms". My probe ran main's `buildTagTree` and the branch's on the same input in this worktree: old 253.0 ms (red), new 1.2 ms (green).
- [met] Characterization tests, green before and after: `Work/a` + `work/B` merge under `Work`, insertion order kept, `/b` and `b` stay separate, `a//c` — four tests in `tags.logic.test.ts` (dc0e29c9, landed before the Map change). I also ran a probe that compared main's `buildTagTree` against the branch's with `toEqual` on 3,000 random entry lists (alphabet `a A b B '' İ ß x/ /`, so leading, trailing and doubled slashes plus casing and Unicode lowercasing): every tree was identical. The probe is deleted.
- [met] `TagsView.test.ts` and the tasks tests stay green — `pnpm vitest run src/tests/lib/features/tags/ src/tests/lib/features/tasks/ src/tests/lib/app/lifecycle/`: 16 files, 323 tests, exit 0 (includes `TagsView.test.ts` and all 9 tasks test files).
- [not met] Not verified by the agent: on device, `get_all_property_records` enters within about 20 ms of the `get_all_tags_v2` exit, and the `[HB] stall` after `buildTagIndex` is gone — owner's on-device check; it cannot be run here. The code side holds: the timer now runs only tags, properties and icons, and the tree build is linear.

## Checks run

- `pnpm check`: 0 errors, 0 warnings (212 files).
- Test verdict rests on: `src/tests/lib/features/tags/{tags.logic,tags.service,tags.store,TagsView}.test.ts`, `src/tests/lib/features/tasks/*.test.ts` (9 files), `src/tests/lib/app/lifecycle/*.test.ts`. All pass (exit 0).
- Probes (temporary `src/tests/zz-probe/`, removed, worktree clean): old/new `buildTagTree` equivalence and timing.
- Full suite and `pnpm build` not run: deliver runs them.
- Reader trace for dropping `buildTaskIndex` at startup: `tasksStore.fileTaskGroups` is read only in `TasksView.svelte:53`. `TasksView` mounts only for the Tasks editor tab (`EditorView.svelte:70-71`), and its `vaultIndexVersion` effect (`TasksView.svelte:78-83`) runs on mount. `teardownVault` calls `resetEditor()` (`app-lifecycle.service.ts:624`), so no Tasks tab survives a vault switch and waits on the throttled version bump. No other module imports `buildTaskIndex` or `tasksStore`.
- Map-key soundness: a root key holds no `/` and a child key always does, and the key is the lowercased segment path, so it names exactly the node the old per-level `find` reached. The random-input probe agrees.
- Layer baseline, `BASELINE_SIZE` and composition roots are untouched. No `src-tauri/` change.

## Findings

1. nit, `src/lib/features/tags/tags.service.ts:46-51`: `tagTreeShape(entries, tree)` and its log string run on every tag rebuild even when debug logging is off: one extra tree walk plus a second `split('/')` of every tag name. That costs about 1 ms on 6k tags, so it is harmless, but discovery.md says it is "inside the debug line only", which is not true. Fix (optional): skip the shape when neither debug setting is on, or leave it as is and correct the discovery note.
2. nit, `src-tauri/src/commands/vault.rs:611-613`: the Rust doc for `get_tasks_in_section_v2` makes the same stale claim this Issue fixed in `tasks.service.ts` ("fired only when the user types a non-empty filter"). It is out of this Issue's listed scope. Fix: update it in Issue 02, which reworks that command.
3. nit, `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts:535,1173`: `expect(buildTaskIndex).not.toHaveBeenCalled()` now passes in every case, because startup never calls it. The Issue says to leave them, so no change is needed here. Fix: drop or repurpose them when Issue 02 decides where the task scan lives.

## Resolution

1. Fixed by correcting the note: `discovery.md` now says the shape pass runs on every tag rebuild, debug logging on or off (about 1 ms on 6k tags). The code is kept as is; gating it on the debug settings would add a settings read for a 1 ms cost.
2. Deferred to Issue 02, as the finding says: the Rust doc belongs to the command that Issue reworks, and touching `src-tauri/` here would widen this Issue's scope.
3. No change, as the finding says: the Issue says to leave these assertions; Issue 02 decides where the task scan lives and drops or repurposes them.
