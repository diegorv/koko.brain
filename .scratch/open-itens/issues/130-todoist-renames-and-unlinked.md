# 130: Todoist links follow renames, and unmatched entries are listed

**Origin:** `tasks-view` Issue 30, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/tasks-view/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** After Issue 22 a sent task keeps its link through edits, but its entry holds the note's `relPath`, so renaming or moving the note makes the task look unsent, and entries that match no task are invisible. PRD "Identity strategy".

- **Renames.** A path-change consumer (`registerPathChangeConsumer`, `src/lib/core/filesystem/path-change.service.ts:73`) re-keys `relPath` on rename and move, folders included, and saves the sidecar. It is wired in `initializeVault` and unwound in `teardownVault`, as `registerEventCalendarPathChangeConsumer` is (`src/lib/app/lifecycle/app-lifecycle.service.ts:251`); a missing registration is a silent no-op (indexing rule 6). The consumer never saves from `todoistStore` unless the sidecar was loaded for the current vault: `initTodoist` runs only when TasksView mounts (`TasksView.svelte:72-74`, `todoist.service.ts:238-244`) and `todoistStore.reset()` empties the store on teardown (`app-lifecycle.service.ts:649`), so a rename before the Tasks tab was opened would write `[]` over every link. It reads the file itself, re-keys the matching entries, and writes only when the read succeeded and an entry changed.
- **Unlinked.** Entries that match nothing in any note (Issue 22's unmatched entries, legacy entries that matched no row included) are listed in the Todoist popover with Relink and Forget. Forget asks first and is the only way an entry is removed. Nothing is deleted automatically.

Test, first: with the Tasks tab never opened in the session, renaming a note that has a sent task leaves `.kokobrain/todoist-sent.json` unchanged except for that entry's `relPath`, and the file is never written as `[]` (real `todoistStore`, mock only `@tauri-apps/plugin-fs`).

**Blocked by:** 128

**Status:** ready-for-agent

**Answered:** PRD B3 (used) and B4 (a) (owner, 2026-11-06).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first: renaming the note through `applyPathChange` keeps the link (real path-change service and `todoistStore`, `plugin-fs` mocked). Fails today.
- [ ] Moving a folder re-keys every entry under it.
- [ ] After `teardownVault` the consumer is gone (a rename in the next vault does not touch the old entries).
- [ ] An entry whose task was deleted shows under "Unlinked"; Relink attaches it to a chosen row; Forget removes it from the saved file and nothing else does.

## Notes

- **Size:** S to M. Split out of Issue 22.
