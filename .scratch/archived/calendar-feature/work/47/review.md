VERDICT: APPROVED

# 47 review: restoring a folder from the Trash indexes its notes

Reviewed `git diff main...HEAD` (663ecb52 plus the docs commits 8dc6e6c5 and f5e27510).

## Acceptance criteria

- [x] **Each Markdown file in a restored folder is indexed (VaultIndex, FTS5, semantic, consumers).** Met.
  - `src/lib/core/trash/trash.service.ts:157-160`: after `refreshTree()`, the folder branch walks `collectFilePathsUnder(fsStore.fileTree, restorePath)`. This is the same walk `applyPathChange` uses on the delete side. It keeps `.md` / `.markdown` with `isMarkdownPath` and passes the result to `indexRestoredNotes`.
  - `trash.service.ts:230-248`: for each note it reads the file, calls `markRecentSave`, then calls `applyNoteChange({ kind: 'upsert', source: 'restore', path, content, vaultPath })`. The `restore` policy row (`note-change.service.ts:92-94`) fires `update_note_in_index` on every call (`:186-190`). It fires FTS5 `update_search_index_file` and semantic `update_semantic_file` whenever `vaultPath` gives a key (`:193-206`), and fans out to the consumers (`:208-215`).
  - The nested-folder test asserts the VaultIndex IPC, the FTS5 IPC, the consumer upserts and the recent-save marks for both depths. It also checks that the `.png` and a sibling note outside the folder are skipped (`trash.service.test.ts:419-452`). Semantic is covered by the code path but not asserted (finding 1).
  - The watcher cannot cover the gap, as the build report claims, and I confirmed it. `rebuildAllIndexes` drops changed paths whose basename has no dot (`src/lib/core/app-lifecycle/watcher-handler.service.ts:38-49`), so a restored `archive/` folder produced no indexing on main.
- [x] **Tests for a nested folder and for an empty folder.** Met.
  - Nested: `trash.service.test.ts:419` (notes at two depths, an empty subfolder, a `.png`, a sibling outside the folder).
  - Empty: `trash.service.test.ts:494`. It expects no reads and no IPC, and checks that the unlinked-dirty flag and the queryjs cache are untouched.
  - Extra: a suffixed folder restore (`:454`) and an unreadable child note (`:474`). The unreadable note gets no recent-save mark, so the watcher fallback is kept.

## Rules check

- Layers: `core/trash` imports `core/filesystem` (`fs.logic`, `fs.store`). No new `features/` or `plugins/` import; the backlinks and kanban imports were already there.
- Single owner: every note goes through `applyNoteChange`, with no direct per-file updater calls (CLAUDE.md Indexing 6).
- Error handling: a read failure is logged and only that note is skipped. A `refreshTree` failure still propagates as before.
- Tests: the one changed source file has its test file updated. No mocks of stores or `.logic.ts` files: the tests use the real `fsStore`, `trashStore`, `backlinksStore`, `queryjsSessionStore`, the dedupe map and a real registered consumer. Only `invoke`, plugin-fs, `debug` and `refreshTree` are mocked.
- Tabs are used throughout. Comments describe the code, not the session. ADR 0032 was corrected where it said directories rely on the watcher, which the change made untrue. That edit is in scope.
- Scope: no creep. The single-file restore keeps its old ordering (indexed before `refreshTree`).

## Checks I ran

- `pnpm check`: 0 errors, 0 warnings (211 files).
- `pnpm vitest run src/tests/lib/core/trash src/tests/lib/core/filesystem/note-change.service.test.ts`: 4 files, 95 tests passed.
- `pnpm vitest run src/tests/lib/core/trash src/tests/lib/features/event-calendar` (event-calendar `restoreNow` calls `restoreItem`): 27 files, 953 tests passed.

My test verdict rests on `src/tests/lib/core/trash/trash.service.test.ts` (the changed file), `src/tests/lib/core/filesystem/note-change.service.test.ts` (the `restore` policy legs) and `src/tests/lib/features/event-calendar/` (the other `restoreItem` caller).

## Findings

1. **Low, test gap** (`src/tests/lib/core/trash/trash.service.test.ts:440-445`). The AC names the semantic leg, but the nested-folder test asserts only `update_note_in_index` and `update_search_index_file`. Fix: inside the same loop, add `expect(invoke).toHaveBeenCalledWith('update_semantic_file', { filePath: rel, content: CONTENT, vaultPath: VAULT });`.
2. **Low, diagnosability** (`src/lib/core/trash/trash.service.ts:158`). `collectFilePathsUnder` returns `[]` both for an empty folder and for a folder that is missing from the tree, so a miss is silent. Concrete case: the vault is opened through a symlinked path. `scan_vault` canonicalizes the root (`src-tauri/src/utils/fs.rs:39-46`), so the tree paths do not start with `${vaultStore.path}`, `findNodeByPath(restorePath)` misses, and no note in the restored folder is indexed, with no log. Symlinked vaults are already degraded elsewhere (see `ftsKey` in `note-change.service.ts`), so do not fix the canonicalization here. Fix: when `findNodeByPath(fsStore.fileTree, restorePath)` is null, log `debug('Trash', ...)` saying the restored folder was not found in the refreshed tree, so the miss can be told apart from an empty folder.
3. **Low, performance note, no change required** (`src/lib/core/trash/trash.service.ts:232-243`). A large restored folder fires three un-awaited IPCs per note (VaultIndex, FTS5, semantic/ONNX), with no upper bound. The watcher switches to a full rebuild above `INCREMENTAL_THRESHOLD = 10` (`watcher-handler.service.ts:16`). Discovery accepted this ("restores are rare"), and a full rebuild would not refresh FTS5 or semantic anyway, so per-note indexing is the right choice. Leave as is unless profiling shows a stall.
4. **Nit, comment accuracy** (`src/lib/core/trash/trash.service.ts:155-156`; `docs/adr/0032-calendar-events-are-event-typed-notes.md:51`). "Its directory-only filter drops" the restore holds only when the folder name has no dot. The filter tests `basename.includes('.')` (`watcher-handler.service.ts:38-41`), so restoring a folder named `v1.2` makes the watcher run a full rebuild as well. That is redundant but harmless. Fix: say the filter drops it "for a dot-less folder name", or leave as is. The ADR line ref `:156-160` should read `:157-160` (154-156 is the comment).

## Resolution

- Finding 1: fixed. The nested-folder test asserts `update_semantic_file` for both notes.
- Finding 2: fixed. `restoreItem` logs `debug('Trash', 'Restored folder not found in the refreshed tree, ...')` when `findNodeByPath` misses; two tests pin the log on a miss and its absence for an empty folder.
- Finding 3: no change, as the review recommends.
- Finding 4: fixed. The source comment and ADR 0032 say the filter drops the restore for a folder name without a dot; ADR line refs updated to `:158-164` and `:224-252`.
