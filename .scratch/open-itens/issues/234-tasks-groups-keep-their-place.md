# 234: The Tasks list keeps your place, and a failed refresh says so

**Origin:** Tasks view UX research, 2026-11-12 (`.scratch/tasks-view-ux/research/`, `synthesis.md` T03 and T07 as corrected by `critique.md` D6, D7 and D18) and its review. It absorbs Issue 235, merged on the owner's approval the same day. Issue numbers in this text are open-itens numbers.

**What to build:** Ticking a task in the fifth note leaves that note fifth, leaving the Tasks tab and coming back puts you where you were, and a refresh that fails says so instead of showing a stale or empty list in silence.

**Keep your place.** Today three things lose it:
- Rust returns note groups newest mtime first, and a toggle rewrites the note on disk, so the ticked note jumps to the top on the refetch.
- `TasksView` unmounts whenever another tab is active (`EditorView.svelte` renders it inside an `{#if}`), so the scroll position is lost on return.
- A section tag typed less than 400 ms before the view unmounts is dropped: `onDestroy` clears the debounce timer without applying it. The textbox also holds its own copy of the tag, so a change made outside it (a store reset, Issue 243's load) is not shown.

Build:
- `buildTaskIndex` sorts the groups by `filePath` with `a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })` before `setFileTaskGroups`. Paths stay absolute (indexing rule 9); every indexed note shares the vault root prefix, so this is the vault-relative path order. Issue 111's `rowsByNote` and Issue 112's note grouping keep this order.
- `TasksView` binds the `ScrollArea` viewport (`viewportRef` is bindable). On destroy it saves the viewport's `scrollTop` into a plain store field with a getter and a setter. That field is not reactive state any component renders, so scrolling causes no reactive churn. After the first render that has rows, the view restores it. `core/markdown-editor/tab-view-state.ts` keeps per-tab view state for editor tabs; reuse it if it fits a virtual tab, otherwise say in the delivery why a store field is used.
- On destroy, a pending debounce applies its value (`updateSectionTagFilter`) instead of being dropped, unless `resetTasks()` ran since the view mounted: on a vault switch the editor reset unmounts the view and `resetTasks()` runs after it, so a flush would write vault A's tag into vault B's store. The service exposes a reset generation the view checks.
- The textbox shows `tasksStore.sectionTag` whenever it changes from outside and no edit is pending.

**A failed refresh says so.** Today `buildTaskIndex` logs the error with `error('TASKS', ...)` and leaves the store as it was: the user sees an empty state or an old list with no hint (CLAUDE.md "Error Handling": user-facing errors need an inline state or a toast).
- The Tasks store gains an error field with a getter and a setter, holding a fixed message, never the raw error text (the raw error goes to the log). `buildTaskIndex` sets it when the latest request fails and clears it when the latest request succeeds. A superseded request never sets or clears it (the existing request-sequence guard). The groups are not touched on failure (CLAUDE.md: no partial data in stores).
- With a list loaded, an inline alert above the list says "Tasks could not be refreshed. The log has the details." with a Retry button that calls `buildTaskIndex()`. The list stays, under the rule sentence, even when the failed refresh followed a section tag change: the alert says the list is stale.
- With no list loaded yet, the alert takes the empty state's place. While a Retry is in flight the alert stays and its button is disabled.
- Use plain markup copied from the `role="alert"` pattern `CollectionView.svelte` uses. Moving it onto `InlineAlert` is a follow-up after Issues 204 and 241.

`tasksStore.reset()` clears the saved scroll offset and the error, so a vault switch opens vault B at its own top with no stale error.

`help/documentation/10-tasks-and-todoist.md` says notes are listed in path order (it says modification date today).

**Blocked by:** 110

**Status:** ready-for-agent

**Answered:** PRD A3: note groups sort by path, not mtime (owner, 2026-11-06). The merge with 235: owner, 2026-11-12.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `tasks.service.test.ts` with the real store: `get_all_tasks_v2` returns `B.md` before `A.md` (mtime order); after `buildTaskIndex` the store holds `A.md` first; `note 10.md` sorts after `note 9.md`. Fails today.
- [ ] `TasksView.test.ts`: after a toggle whose refetch returns the toggled note first, the note still renders in its path position.
- [ ] `TasksView.test.ts`: set the viewport's `scrollTop`, unmount, mount again: the viewport's `scrollTop` is restored.
- [ ] `TasksView.test.ts` with fake timers: type a tag, unmount before 400 ms: the store holds the typed tag and a refetch ran. Type a tag, call `resetTasks()`, unmount: the tag is `#to-list` and no section command was sent.
- [ ] `TasksView.test.ts`: `tasksStore.setSectionTag('#x')` from the test updates the textbox.
- [ ] `TasksView.test.ts` with the real store: the first fetch succeeds with one task, the next rejects; the alert shows with Retry and the task row is still listed; clicking Retry with a resolving mock removes the alert. With no list loaded, a rejected fetch shows the alert instead of the empty state.
- [ ] `tasks.service.test.ts`: a superseded failing request does not set the error; a later success clears it; the store never holds the raw error text.
- [ ] `tasks.store.test.ts`: the error getter, and `reset()` clearing the scroll offset and the error.

## Notes

- **Size:** M.
- Run in series with the other Tasks view Issues (see 108).
- A restore before the rows render may need one animation frame; the research could not check the timing without rendering. Issue 113's focus on mount uses `preventScroll` so it does not undo the restore.
- Issue 116 later removes the section tag textbox, and with it the debounce flush and the textbox sync from this Issue; they are cheap to keep until then.
