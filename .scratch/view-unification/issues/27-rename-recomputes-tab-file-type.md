# 27: A rename does not recompute an open tab's file type

**What to build:** `editorStore.updateTabPath` (`src/lib/core/editor/editor.store.svelte.ts`) changes a tab's `path` and `name` but keeps its `fileType`, which `openFileInEditor` (`editor.service.ts:137`) set from the old name. A `.collection` renamed to `.view` while open stays a text tab, and opening the new path only activates that tab, so the table appears only after closing and reopening it. The reverse (`.view` renamed to `.collection`, or to `.md`) keeps the collection editor on a file that is no longer a view.

Recompute `fileType` from the new name when a tab's path changes, with the same rule `openFileInEditor` uses.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first: renaming an open `Foo.collection` tab to `Foo.view` gives a `collection` tab; renaming an open `Foo.view` to `Foo.md` gives a text tab.
- [ ] A rename that keeps the extension leaves `fileType` unchanged.
- [ ] Read `docs/agents/indexing-watcher-rules.md` before touching the path-change path.

## Notes

- Found by Issue 23's review (finding 1, minor). Not new to that branch: it affects every file kind. The hand migration in `help/documentation/12-collection.md` (rename a `.collection` to `.view`) is the common way to hit it.
- **Size:** S.
