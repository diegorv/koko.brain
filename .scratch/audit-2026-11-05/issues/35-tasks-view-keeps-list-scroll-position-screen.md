# 35: The Tasks view keeps its list and scroll position on screen while it refreshes after a toggle or an index update

**What to build:** buildTaskIndex sets `tasksStore.setLoading(true)` on every call (src/lib/features/tasks/tasks.service.ts:65), and TasksView swaps the whole list for 'Indexing tasks...' while loading (src/lib/features/tasks/TasksView.svelte:169-170). The ScrollArea content collapses, the scroll clamps to the top, and the list redraws there. A toggle triggers it twice: once right after the toggle (tasks.service.ts:150) and again when the throttled vault-index-updated bump re-runs the effect (TasksView.svelte:78-83). Every save in another pane repeats it, and so does every mount, because the store keeps the previous groups. Fix direction, the same as the Tags view fix from this audit: show the loading message only while no task list has loaded yet; a refresh over existing groups keeps the keyed rows mounted (TasksView.svelte:179, :199) and swaps the data in place.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

**Owner decision (2026-11-06):** close it: covered by .scratch/open-itens/issues/108-mounted-list-and-rule-sentence.md (the list stays mounted during a refetch).

- [ ] Failing test first, in a new src/tests/lib/features/tasks/TasksView.refresh.test.ts (mock only Tauri APIs: @tauri-apps/api/core and @tauri-apps/plugin-fs; tasks.store and tasks.logic stay real): with tasksStore holding one group with the task 'Buy milk' and `get_tasks_in_section_v2` left pending, mount TasksView; the 'Buy milk' row is still in the DOM and 'Indexing tasks...' is not. It fails today.
- [ ] With an empty store (first load), 'Indexing tasks...' still shows until the IPC resolves.
- [ ] After a toggle resolves, the rows other than the toggled one are the same DOM nodes (not remounted).
- [ ] A refresh that fails leaves the previous list on screen.
- [ ] Frontend gate: `pnpm check` + `pnpm vitest run` pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/medium. Every tick in a long list blanks the list and resets the scroll position.
- **Trigger:** Open the Tasks tab with a list longer than the pane, scroll down and tick a task. Or keep the tab open while a note is saved elsewhere (any vault-index-updated bump).
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/app/EditorView.svelte:71-72 mounts TasksView only while the Tasks tab is active. TasksView.svelte:78-83 $effect on vaultStore.vaultIndexVersion (also runs on mount) -> buildTaskIndex. tasks.service.ts:63-84 buildTaskIndex: setLoading(true) at :65 before the IPC, setLoading(false) in finally :82. tasks.service.ts:150 buildTaskIndex after each toggle; the Rust toggle emits vault-index-updated (src-tauri/src/commands/vault.rs:811-820), whose refresh is throttled (src/lib/app/tauri-listeners.service.ts:106-109, :278-290) and bumps the version again. TasksView.svelte:169-170 '{#if tasksStore.isLoading}' replaces the list inside the ScrollArea at :167.
- **Source:** audit 2026-11-05, domain `calendar`, finding `N-calendar-03` (from calendar-ux-1). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, medium). buildTaskIndex calls setLoading(true) on every call (tasks.service.ts:65) and runs after each toggle (:150). TasksView.svelte:78-83 re-runs it on every vaultIndexVersion bump and on mount, and :169-170 swaps the whole list for 'Indexing tasks...'. The defect exists. The overlap the Issue names is real: .scratch/open-itens/issues/108-mounted-list-and-rule-sentence.md item 1 specifies the same fix (isLoading && fileTaskGroups.length === 0) with a failing test. That directory is untracked. Corrections to apply while implementing: Practically a duplicate of tasks-view/04, which already specifies this fix and test (and is blocked by tasks-view/01). Record that this Issue should be closed in favor of 04 unless the owner wants the list fix to ship ahead of 04's other parts.

## Comments
- 2026-11-06: owner decision (tasks-view PRD L4 (a)): kept `.scratch/tasks-view/issues/` Issue 04, which covers this one. Closed without work.
