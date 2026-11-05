# 07: Restoring a folder from the Trash re-indexes its views

**What to build:** A folder delete removes every child from Rust (`path-change.service.ts:231-233`, with no extension filter). A folder restore re-indexes only Markdown: `collectFilePathsUnder(...).filter(isMarkdownPath)` (`trash.service.ts:168`, `:263-265`). The comment at `:160-163` says the watcher cannot stand in. So a restored `.view` is on disk and in the tree, with no Rust entry, until the next full rebuild or restart.

Without an entry, `getViewVisible(undefined)` is true: a `_visible: false` view appears in Views, its label is the file name, and its pin is gone. Hidden tables make this more visible once Issue 22 ships.

Index a restored folder's views through `applyNoteChange({ kind: 'upsert', source: 'restore', path, content })` with **no `vaultPath`**.

**Trap:** `indexRestoredNotes` passes `vaultPath` (`:255`), which fires FTS5 and semantic updates. Widening the filter alone would write search rows for a view. Keep views out of that call.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first, using the real tree with only `invoke` mocked: restore a folder holding a `.md` and a `_visible: false, _rail: true` `.view`. `update_note_in_index` fires for the view, `update_search_index_file` does not, and the Views rows honor `_visible: false`.
- [ ] The Markdown child still reaches both.
- [ ] A restored single `.view` file still reaches the index. It is expected to arrive through the watcher (`:151`); confirm this by reading, and add it to this path if it does not.

## Notes

- What the watcher reports for a folder restore was not observed. The code comment at `:160-163` is the source.
- **Size:** S.
