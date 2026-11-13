# Issue 234 discovery: path order, scroll offset, section tag flush, refresh error

## Files that change
- `src/lib/features/tasks/tasks.logic.ts` (end of file): export `compareTaskPaths(a, b)`, one module-level `Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })`, raw code-unit tie-break.
- `src/lib/features/tasks/tasks.store.svelte.ts:3-42`: `error` (`$state<string | null>`, `setError`), `scrollOffset` (plain `let`, JSDoc says not reactive, `setScrollOffset`); `reset()` clears both.
- `src/lib/features/tasks/tasks.service.ts:70-94` (`buildTaskIndex`): sort the mapped groups with `compareTaskPaths` (covers both IPC branches, one `v2` value); latest success `setError(null)`, latest failure `setError(TASKS_REFRESH_ERROR)` next to the existing `error()` log. `:235-239`: `resetTasks()` raises a module counter; new export `getTasksResetGeneration()`.
- `src/lib/features/tasks/TasksView.svelte:56-77`: `sectionTagInput` becomes `pendingSectionTag: string | null` (`$state`); the textbox shows `pendingSectionTag ?? tasksStore.sectionTag`; the debounce clears it when it fires; `onDestroy` applies a pending edit when `getTasksResetGeneration()` still equals the value captured at mount. `:202`: `bind:viewportRef`; one `$effect` adds/removes a passive `scroll` listener writing `setScrollOffset(scrollTop)`; one `$effect` restores `untrack(() => tasksStore.scrollOffset)` once per mount, when `viewportRef` is set, `hasLoaded` is true and `filteredGroups` has rows. `:204-306`: alert snippet (CollectionView `role="alert"` classes) with the store message and a Retry button (`disabled` while `isLoading`), rendered under the rule sentence in both the empty-state and list branches; a new branch for `error && fileTaskGroups.length === 0` shows the rule sentence and the alert only.
- `help/documentation/10-tasks-and-todoist.md:13`: path order, numbers compared as numbers.
- `e2e/specs/tasks-view.spec.ts:73-94`: new scroll-survives-tab-switch test after "task list scrolls when it is taller than the tab".

## Tests (copy prior art)
- `tasks.logic.test.ts`: new `describe('compareTaskPaths')`.
- `tasks.service.test.ts`: sort cases (mtime-order input, numeric, section branch); error cases next to "reports only the error of the latest call" (`:220`); generation case in `describe('resetTasks')`.
- `tasks.store.test.ts`: defaults + setters + reset.
- `TasksView.test.ts`: new describes on `mockTaskFetch` / `mountTasksView` (Issue 110 fixture, `.scratch/tasks-view-ux/work/110`), `deferred` helper already there (`:305`). Toggle-in-B case returns `changed: true` from `opts.toggle`. Fake-timer cases restore real timers in `afterEach`.

## Risks
- `mountTasksView` uses `vi.waitFor`, which advances fake timers; mount first, then type, never wait between typing and unmount.
- Restore runs before the webview's layout settles could clamp `scrollTop` and the clamp's own scroll event would overwrite the saved offset: only the e2e shows it; add a `requestAnimationFrame` only if the e2e fails.
- `tasks.service.test.ts` mocks `debug.js`; `TasksView.test.ts` does not, so a rejected fetch there runs the real `error()`; mock `#lib/utils/debug.js` partially (keep `debug`/`timeAsync` real-ish) only if noisy.
- The existing test at `TasksView.test.ts:443` reads the count line as the sentence row's next sibling; the alert sits between them only when an error is set, so it still holds.

## Defaults taken
- Fixed message constant lives in `tasks.service.ts` (`TASKS_REFRESH_ERROR`), the alert prints `tasksStore.error`.
- Retry button style: the empty-state action button classes with `text-destructive` instead of `text-primary`, plus `disabled:opacity-50 disabled:cursor-default`.
- Restore once per mount is a component-local `let restored = false`, not state.
