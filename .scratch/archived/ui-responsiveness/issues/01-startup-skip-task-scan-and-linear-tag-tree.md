# 01: Vault open no longer runs the full task scan and builds the tag tree in linear time

**Status:** resolved

Priority: P1 (quick-win bundle; every vault open, 1.2-6 s)

**What to build:** Two startup costs that sit in the same `setTimeout(0)` (`src/lib/app/lifecycle/app-lifecycle.service.ts:404-417`). They ship together: removing only the first moves the daily-note delay onto the second.

1. **Drop the eager `buildTaskIndex()` at startup** (`app-lifecycle.service.ts:409`). Its only reader is `TasksView.svelte:53`, which mounts only while the Tasks tab is active (`EditorView.svelte:38`) and refetches on mount (`TasksView.svelte:78-83`). The default `sectionTag` is `'#to-list'` (`tasks.store.svelte.ts:8`), so this call runs `get_tasks_in_section_v2`, which reads all 10,628 notes on the app main thread: 1,819 ms in the baseline session, max 6,164 ms.
2. **Linear-time `buildTagTree`** (`src/lib/features/tags/tags.logic.ts:13`). Replace the per-level `currentLevel.find(...)` with two `toLowerCase()` per comparison by a `Map` index keyed `i === 0 ? lower : parentKey + '/' + lower`. Keep the `pathSoFar` line (`:12`) unchanged so `fullPath` keeps its current semantics, including the `/b` -> `b` quirk. Measured in JSC: 274-1,088 ms today for 6,040 flat tags (mixed case is the slow end), 2-6 ms with the Map.
3. **Split timers in `buildTagIndex`** (`tags.service.ts:22-42`): `timeSync` around map, build, sort and set, and one line with R (root count), P (parent-child pairs) and the share of segments with an uppercase letter. `timeAsync` today mixes the IPC wait with the JS block.

Update the stale docs: `tags.service.ts:16-20` and `tasks.service.ts:75-80`.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/app/lifecycle/app-lifecycle.service.ts:404-417, src/lib/features/tasks/TasksView.svelte:53,78-83, src/lib/features/tasks/tasks.store.svelte.ts:8, src/lib/features/tags/tags.logic.ts:11-24, src/lib/features/tags/tags.service.ts:16-42

- [x] Failing first: `app-lifecycle.service.test.ts:615` asserts `buildTaskIndex` is NOT called after `initializeVault` plus a macrotask flush
- [x] Delete the assertion at `app-lifecycle.service.test.ts:688` instead of flipping it: it is a watcher test that passes only because the startup `setTimeout(0)` fires after `vi.clearAllMocks()`. `:687` and `:710` assert `buildTagIndex`, which stays at startup in this Issue, so they keep passing (by accident: they are watcher tests too). Leave them. Do not add tags or tasks to the watcher path to make any of them pass. `:535` and `:1172` stay valid
- [x] Failing first: 6,040 flat tags build in under 200 ms (a 20k case would exceed vitest's 5 s timeout on the red run)
- [x] Characterization tests, green before and after: `Work/a` + `work/B` merge under `Work`, insertion order kept, `/b` and `b` stay separate, `a//c`
- [x] `TagsView.test.ts` and the tasks tests stay green
- [ ] Not verified by the agent: on device, `get_all_property_records` enters within about 20 ms of the `get_all_tags_v2` exit, and the `[HB] stall` after `buildTagIndex` is gone

## Notes

- Sessions that open the Tasks tab still pay the scan on first activation. Issue 02 makes that scan cheap and moves it off the main thread.
- Research: `.scratch/ui-responsiveness/research/A-deep-dive.md` (F2), `A-verify.md` (correction 3, test `:688`), `C-deep-dive.md`, `C-verify.md` (JSC bench, casing factor).

## Comments

- 2026-11-02, branch `issue/01-startup-skip-task-scan-and-linear-tag-tree`: `initializeVault` no longer calls `buildTaskIndex` on vault open; `buildTagTree` uses a Map keyed on the lowercased segment path (linear); `buildTagIndex` times the IPC and each JS step apart; characterization tests pin the merge and path quirks; stale task-scan doc corrected in `tasks.service.ts`. Review round 1: APPROVED with three nits (discovery note corrected; the Rust doc and the always-passing assertions deferred to Issue 02). Full suite: 438 files, 10104 passed, 1 skipped, 1 todo; `pnpm build` ok (exit=0). The on-device timing criterion is left for the owner.
