# 108 discovery

No `spec.md` exists for `tasks-view-ux`; the Issue is the spec.

## Files that change

- `src/lib/features/tasks/tasks.store.svelte.ts:3-33`: `hasLoaded` state, getter, `setHasLoaded`, cleared in `reset()`.
- `src/lib/features/tasks/tasks.service.ts:57-86`: `buildTaskIndex` `finally` calls `setHasLoaded(true)` under the `request === latestTaskIndexRequest` guard; JSDoc updated.
- `src/lib/features/tasks/tasks.logic.ts` (append after `computeTaskStats`, ~L114): private `displaySectionTag`, exported `describeTaskRule`, `explainEmptyTasks` and its result type. Uses only `FileTaskGroup` / `TaskDateFilter`, already imported.
- `src/lib/features/tasks/TasksView.svelte`:
  - L90 root drops `bg-card`;
  - L92-134 toolbar: input gets `aria-label="Section tag"`, a trailing `{#if hasLoaded && isLoading}` `<span role="status" aria-label="Refreshing tasks">` with `Loader2`;
  - L139-220 content: `Indexing tasks...` gated on `!hasLoaded`; the rule sentence `<p>` (plus a "Clear tag" button in the same wrapper when a tag is set and the list is not empty) above the count and above the empty state; the empty state renders `explainEmptyTasks` (message `<p>` + action button).
  - A `clearSectionTag()` handler: clears the debounce timer, `sectionTagInput = ''`, `updateSectionTagFilter('')`.
- `help/documentation/10-tasks-and-todoist.md`: intro, Tasks View paragraph, Writing Tasks line, Filters table (Date, Section filter rows), a short paragraph on the sentence and empty-state messages.
- `e2e/specs/tasks-view.spec.ts:17-19`: comment only.

## Tests (prior art)

- `src/tests/lib/features/tasks/tasks.store.test.ts`: add `hasLoaded` default / setter / reset cases next to `setLoading`.
- `src/tests/lib/features/tasks/tasks.service.test.ts:91-168`: copy `clears loading state even on IPC error` and `drops a call that resolves after resetTasks` for `hasLoaded`.
- `src/tests/lib/features/tasks/tasks.logic.test.ts`: reuse its `makeTask`; new `describeTaskRule` and `explainEmptyTasks` describes.
- `src/tests/lib/features/tasks/TasksView.test.ts`: new describe with the same `beforeEach` (reset, empty tag) and inline `invoke` mocks; a `note(tasks[])` helper for several tasks; a `deferred()` helper.

## Plan (commits)

1. discovery.md.
2. Store `hasLoaded` + service guard (tests first).
3. Logic functions (tests first).
4. View: mounted list, spinner, sentence, Clear tag, empty state, aria-label, `bg-card` (component tests first).
5. Help doc + e2e comment; run the e2e spec.

## Risks / defaults taken

- `latestTaskIndexRequest` is module state: every component test resolves its deferred promises before it ends.
- "Clear tag" in the sentence and the empty-state action share one handler; the sentence's button is hidden in the empty state, so the page has exactly one "Clear tag" button.
- Spinner span carries only `flex items-center` (no toolbar classes), placed as the toolbar's last child.
- The sentence `<p>` gets a `data-task-rule` attribute so tests select it without depending on classes.
