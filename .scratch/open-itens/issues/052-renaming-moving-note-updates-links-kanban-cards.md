# 052: Renaming a note updates [[links]] in kanban cards

**Origin:** `audit-2026-11-05` Issue 31, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** updateLinksAfterRename (src/lib/core/filesystem/link-updater.service.ts:35-80) finds the files to rewrite only through get_backlinks_v2, and the Rust VaultIndex holds only .md/.markdown/.view files (src-tauri/src/utils/fs.rs:140-143). No code rewrites .kanban or .canvas content on a path change, so after a rename the card keeps [[Old]] (its preview disappears and the click opens nothing) and a canvas file node keeps the old path ('Could not load file'). A pure folder move skips the link rewrite entirely (link-updater.service.ts:39), which is right for name-based wikilinks but leaves canvas file paths stale. Fix direction: on a Markdown note rename, also rewrite wikilinks that resolve to the old note in the vault's .kanban files (they are few, listed in fsStore.fileTree), using the same resolution-aware replaceWikilinks and syncing an open tab like the .md path does; on rename or move, rewrite canvas file-node paths that point at the old path, in the stored path format that Issue 17 settles. Follow docs/agents/indexing-watcher-rules.md for the writes.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Scope (owner, 2026-11-06):** kanban only. Add the .kanban files from fsStore.fileTree to the affected paths in updateLinksAfterRename and reuse replaceWikilinks and the open-tab sync. The canvas file-node path rewrite moved to Issue 155, so this no longer waits for Issue 15.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/core/filesystem/link-updater.service.test.ts: a file tree with Old.md and board.kanban whose card is '- [ ] call [[Old]]'; get_backlinks_v2 returns []; updateLinksAfterRename(Old.md, New.md) writes board.kanban with '[[New]]'. It fails today.
- [ ] An open, dirty kanban tab is rewritten from its in-memory content and stays consistent, like an open .md tab.
- Moved to Issue 155 on 2026-11-06: A canvas whose file node points at the renamed or moved note has its file field updated to the new path.
- [ ] A card link that resolves to a different note with the same old name is left alone.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/medium. Board links dangle after a rename. Rewriting canvas file nodes depends on the stored path format and resolver from Issue 17.
- **Trigger:** Rename a note that a kanban card links as [[Note]], or rename or move a note placed as a file node on a .canvas, from the Files navigator or note list.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/filesystem/path-change.service.ts:189-191 calls updateLinksAfterRename only for a Markdown target; src/lib/core/filesystem/link-updater.service.ts:39 skips same-name moves; link-updater.service.ts:46-47 affected files from get_backlinks_v2 only; src-tauri/src/utils/fs.rs:140-143 is_markdown_filename excludes .kanban and .canvas, so they never appear as backlink sources; src/lib/plugins/kanban/kanban.service.ts:70-79 resolves the card's first wikilink against the current tree, so [[Old]] resolves to nothing; src/lib/features/canvas/FileNode.svelte:40-49 and :81 read data.file and show 'Could not load file'. Documented features: help/documentation/21-kanban.md:94 and :158.
- **Related Issues before the audit:** `.scratch/archived/audit-2026-11-04/issues/17-canvas-node-path-resolution.md`, `.scratch/archived/file-io-audit/issues/27-link-rewrite-scope.md`, `.scratch/archived/audit-2026-11-04/issues/15-resolution-aware-link-rewrite.md`
- **Second opinion:** upheld (ux, medium). Confirmed. updateLinksAfterRename (link-updater.service.ts:35-80) finds files to rewrite only through get_backlinks_v2, and the index holds only Markdown and .view files, so .kanban and .canvas are never sources. No path-change consumer touches canvas or kanban files (consumers: event-calendar, rail-shell navigators, collection, boot caches). The related Issue 17 covers absolute versus relative canvas paths, not a rewrite on rename, so this is not a duplicate. Links in boards dangle after a rename, but nothing is overwritten or corrupted. Corrections to apply while implementing: Category ux (dangling links after a rename). The file content is unchanged rather than lost or corrupted.
- **Source:** audit 2026-11-05, domain `boards`, finding `N-boards-06` (from boards-content-4). Size M.

## Comments

- 2026-11-06: narrowed to kanban by the owner after the challenge review; canvas moved to Issue 155.
