# 234: The Tasks list keeps your place

**Origin:** Tasks view UX research, 2026-11-12 (`.scratch/tasks-view-ux/research/`, `synthesis.md` T03 as corrected by `critique.md` D6, D7 and D18). Issue numbers in this text are open-itens numbers.

**What to build:** Ticking a task in the fifth note leaves that note fifth, and leaving the Tasks tab and coming back puts you where you were.

Today three things lose your place:
- Rust returns note groups newest mtime first, and a toggle rewrites the note on disk, so the ticked note jumps to the top on the refetch.
- `TasksView` unmounts whenever another tab is active (`EditorView.svelte` renders it inside an `{#if}`), so the scroll position is lost on return.
- A section tag typed less than 400 ms before the view unmounts is dropped: `onDestroy` clears the debounce timer without applying it. The textbox also holds its own copy of the tag, so a change made outside it (a command, a store reset) is not shown.

Build:
- `buildTaskIndex` sorts the groups by `filePath` before `setFileTaskGroups`. Paths stay absolute (indexing rule 9); every indexed note shares the vault root prefix, so this is the vault-relative path order. Issue 111's `rowsByNote` and Issue 112's note grouping keep this order.
- `TasksView` binds the `ScrollArea` viewport (`viewportRef` is bindable). On destroy it saves the viewport's `scrollTop` into a plain store field with a getter and a setter. That field is not reactive state any component renders, so scrolling causes no reactive churn. After the first render that has rows, the view restores it.
- On destroy, a pending debounce applies its value (`updateSectionTagFilter`) instead of being dropped.
- The textbox shows `tasksStore.sectionTag` whenever it changes from outside and no edit is pending.
- `tasksStore.reset()` clears the saved scroll offset, so a vault switch does not open vault B at vault A's offset.

**Blocked by:** 110

**Status:** ready-for-agent

**Answered:** PRD A3: note groups sort by path, not mtime (owner, 2026-11-06).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `tasks.service.test.ts` with the real store: `get_all_tasks_v2` returns `B.md` before `A.md` (mtime order); after `buildTaskIndex` the store holds `A.md` first. Fails today.
- [ ] `TasksView.test.ts`: after a toggle whose refetch returns the toggled note first, the note still renders in its path position.
- [ ] `TasksView.test.ts`: set the viewport's `scrollTop`, unmount, mount again: the viewport's `scrollTop` is restored.
- [ ] `TasksView.test.ts` with fake timers: type a tag, unmount before 400 ms: the store holds the typed tag and a refetch ran.
- [ ] `TasksView.test.ts`: `tasksStore.setSectionTag('#x')` from the test updates the textbox.
- [ ] `tasks.store.test.ts`: `reset()` clears the saved scroll offset.

## Notes

- **Size:** S.
- Run in series with the other Tasks view Issues (see 108).
- A restore before the rows render may need one animation frame; the research could not check the timing without rendering.
