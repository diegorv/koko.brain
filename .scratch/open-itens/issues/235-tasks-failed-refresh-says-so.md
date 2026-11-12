# 235: A failed Tasks refresh says so

**Origin:** Tasks view UX research, 2026-11-12 (`.scratch/tasks-view-ux/research/`, `synthesis.md` T07, `critique.md` D7). Issue numbers in this text are open-itens numbers.

**What to build:** When loading tasks fails, the view says so and offers Retry, instead of silently showing a stale or empty list. Today `buildTaskIndex` logs the error with `error('TASKS', ...)` and leaves the store as it was: the user sees "No tasks" or an old list with no hint (CLAUDE.md "Error Handling": user-facing errors need an inline state or a toast).

- The Tasks store gains an error field with a getter and a setter. `buildTaskIndex` sets it to a short message when the latest request fails, and clears it when the latest request succeeds. A superseded request never sets or clears it (the existing request-sequence guard). The groups are not touched on failure (CLAUDE.md: no partial data in stores).
- With a list loaded, an inline alert above the list shows "Tasks could not be refreshed" with the reason and a Retry button that calls `buildTaskIndex()`. The list stays.
- With no list loaded yet, the alert takes the empty state's place.
- `tasksStore.reset()` clears the error, so a vault switch does not carry an old vault's error.

**Blocked by:** 234

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `TasksView.test.ts` with the real store: the first fetch succeeds with one task, the next `get_all_tasks_v2` rejects; the alert shows with Retry and the task row is still listed. Clicking Retry with a resolving mock removes the alert. Fails today.
- [ ] With no list loaded, a rejected fetch shows the alert instead of the empty state.
- [ ] `tasks.service.test.ts`: a superseded failing request does not set the error; a later success clears it.
- [ ] `tasks.store.test.ts`: the error getter and `reset()`.

## Notes

- **Size:** S.
- Run in series with the other Tasks view Issues (see 108). It needs no data from 234; the edge only keeps the runs in order.
- If Issue 204 has landed, render the alert through `InlineAlert`. Otherwise copy the `role="alert"` pattern `CollectionView.svelte` uses.
