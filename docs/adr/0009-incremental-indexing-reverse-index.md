---
type: ADR
id: "0009"
title: "Incremental indexing with reverse index and strict setContents → setIndex ordering"
status: active
date: 2026-04-22
---

## Context

Kokobrain maintains several in-memory indexes over the vault: `noteContents` (raw text by path), `noteIndex` (parsed wikilinks by path), `propertyIndex` (frontmatter), `tagMap`, `fileTasksIndex`, `modifiedAtMap`, and a reverse backlinks index. Every backlink query, every search, every `kb.pages()` call, every "navigate to link" depends on these indexes being correct.

The naive implementations had three distinct problems:

1. **O(N) backlink lookup**: "who links to file X?" was implemented by scanning `noteIndex` entries and resolving each wikilink. For 1800 notes with ~10 wikilinks each, every backlink query cost ~18 000 lookups. The backlinks panel recomputed on every tab switch and keystroke.
2. **O(N²) wikilink resolution on bulk rebuild**: `rebuildReverseIndex` resolves each wikilink target (e.g., `[[b]]`) against `allFilePaths` to find the absolute path. Doing that linearly for every link on every file is O(N × L) where L is links per file; plus basename-match fallback scans. On a 1870-note vault, initial index build was ~17M ops.
3. **Silent empty reverse index**: `setNoteIndex` synchronously calls `rebuildReverseIndex`, which builds its resolution cache from `noteContents.keys()`. If contents are empty at that moment, every wikilink fails to resolve, the reverse index stays empty, and an O(N) fallback path in `updateBacklinksForFile` hides the bug — until the first incremental `updateNoteEntry` call flips `reverseIdx.size > 0`, at which point the fast path returns `[]` for every untouched file. This was a real regression that took significant debugging.

Plus: the file watcher fires many events, some from the app's own writes; the content-effect (keystroke indexing, 1 s debounce) and `notifyAfterSave` (save-time indexing) can both run the same updaters back-to-back with identical inputs, wasting 5–15 ms each.

## Decision

**Maintain a reverse index incrementally, enforce a strict `setNoteContents` → `setNoteIndex` ordering on bulk loads, and deduplicate per-file index work with a shared `lastIndexedContent` map.**

Reverse index (`note-index.store.svelte.ts:14-68`):

- `reverseIndex: Map<resolvedTargetPath, Set<sourcePath>>` — maintained on every `updateNoteEntry` by `updateReverseIndexForFile`, which removes old reverse entries and adds new ones using a `WikilinkResolutionCache`.
- `rebuildReverseIndex` only runs on bulk `setNoteIndex`; single-file edits use the incremental path.
- Backlink lookups (`updateBacklinksForFile` at `backlinks.service.ts:126-146`) check `reverseIdx.size > 0` and use the O(K) reverse-index path; fall back to O(N) only when the reverse index is empty (startup).

Bulk-load ordering (`backlinks.service.ts:69-76`):

```typescript
// Contents must be set BEFORE the index: setNoteIndex triggers
// rebuildReverseIndex, which resolves wikilinks using noteContents.keys().
noteIndexStore.setNoteContents(contents);
noteIndexStore.setNoteIndex(index);
```

This is documented as an invariant in `note-index.store.svelte.ts:80-89` and called out in `CLAUDE.md` Indexing rule 7.

Incremental file watcher (`CLAUDE.md` Indexing rule 3): for ≤10 changed files, read and index only those files; fall back to a full rebuild for larger changesets. Hidden directories are silently filtered by `isInsideHiddenDir()` — `.git`, `.kokobrain`, `.claude`, `.obsidian`, etc.

Absolute-path index keys (`CLAUDE.md` Indexing rule 5): all indexes key on absolute paths from `FileTreeNode.path`; never strip to vault-relative before storing. Path traversal protection is enforced in Rust (`canonicalize` + `starts_with`) in `read_files_batch`, not by frontend path juggling.

Index dedupe (`src/lib/utils/index-dedupe.ts`): shared `Map<path, lastContent>` with `isAlreadyIndexed` / `markIndexed` / `clearIndexedEntry` / `clearAllIndexed`. `resetHooks` wipes it on vault teardown.

Single note-change owner (`src/lib/core/filesystem/note-change.service.ts`): every path that changes a note's bytes goes through `applyNoteChange({ kind: 'upsert' | 'delete', source, path, content?, vaultPath?, isStale? })`. It owns the dedupe map, the Rust `update_note_in_index` / `remove_note_from_index` IPC, the FTS5 / semantic legs and the fan-out to the registered per-file indexes. The five sources (`save`, `edit`, `watcher`, `create`, `fs`) each get a row in `SOURCE_POLICY`, and the `consumers` and `rust` axes are deliberately independent - `save` fires the Rust IPC even on a dedupe hit while skipping the TS consumers, `edit` skips both, and `create` / `fs` skip the IPC entirely because Rust's `create_note` already indexed the note. Collapsing the two axes into one boolean silently drops the save-side `VaultIndex` refresh.

FTS5 and semantic keys are vault-relative while every other index is absolute, so the owner derives them through the single nullable helper `vaultRelativeKey` (`src/lib/utils/path.ts`). A path that cannot be made relative (canonicalized through a symlinked vault, or a sibling directory that merely shares the prefix) yields `null` and the update is SKIPPED - falling back to the absolute path would corrupt those tables.

Save-time synchronous updates: `notifyAfterSave` refreshes per-file indexes **synchronously** before invalidating the queryjs cache, even though the layout content-effect would also run the same updaters - because that effect has a 1 s debounce whose pending `setTimeout` is cleared when `activeTabPath` changes. A user who creates + saves + switches tabs within a second would otherwise see their just-saved file missing from `kb.pages()` on the new tab. `applyNoteChange` is `async`, so this holds only because the `save` policy row sets `yieldBeforeConsumers: false` and nothing is awaited before the fan-out. `edit` is the one row that yields: it fires the Rust IPC, hands a macrotask back to the browser, then re-checks the caller's `isStale` before touching the consumers.

## Alternatives considered

- **Compute reverse index on demand**: fresh snapshot per query — simple but pays O(N × L) every time. Rejected — backlinks are queried frequently.
- **Cache full recompute on `setNoteIndex` only, no incremental updates**: works for bulk loads but every keystroke-driven `updateNoteEntry` triggers a global rebuild. Rejected — that's 30+ ms per keystroke on large vaults.
- **Debounce the save-time indexing the same way as the content-effect**: moves the activeTabPath-change race back into the critical path. Rejected after the race was observed.
- **Make `setNoteIndex` auto-call `setNoteContents(contents)` to avoid the ordering hazard**: tempting, but callers that update only one side (the rare case) would silently overwrite the other. Rejected in favor of a comment + discipline.
- **Path-relative index keys**: would save memory and simplify some display code, but duplicates path-traversal protection into the frontend and creates an ambiguity when vault roots move. Rejected — absolute paths are the single source of truth.

## Consequences

- Backlink queries are O(K) where K is the number of backlinks for the target, independent of vault size. On a 1870-note vault, the backlinks panel updates in <1 ms instead of ~30 ms.
- The `setContents` → `setIndex` ordering is a quiet tripwire: getting it wrong produces a slow-but-functional fallback. The invariant lives in the store comment, the service call order, and `CLAUDE.md` Indexing rule 7 — three places, because historically only one wasn't enough.
- `index-dedupe` saves the same work from running twice per save. The cost is a ~50 B Map entry per indexed file (~90 KB for a 1870-note vault); content strings are references, not copies.
- Any function that mutates vault state (delete, rename, move) must route through the owner's delete branch or risk a stale dedupe signature skipping a re-creation, and a deleted note lingering as a phantom page in every per-file index. `forgetNote(path)` in `fs.service.ts` is the adapter the file explorer's delete / rename / move use; the watcher calls `applyNoteChange` directly with a `vaultPath` so the FTS5 row goes too. New code that removes a note from a path must use one of the two - never a hand-rolled `clearIndexedEntry` + `remove_note_from_index` pair.
- Consumers register instead of being imported: `core/` must not import `features/` or `plugins/` (ADR-0003), so the collection property index, the frontmatter icon index and the calendar day index each export a register function that `app-lifecycle` calls in `initializeVault` and unwinds in `teardownVault`. The failure mode is silent - an unregistered consumer makes `applyNoteChange` a no-op for that index and the panel just looks stale - so the registration is pinned by a test that asserts eviction after `initializeVault` and survival after `teardownVault`.
- Writers that bypass the editor save path route through the owner too. `frontmatter-icon.service.ts` (icon set / remove), `link-updater.service.ts` (post-rename wikilink rewrite) and `type-definitions.service.ts` (`renameType`'s open-tab rewrite, `toggleFavoriteForPath`) call `syncExternalContentToEditor(..., 'none')`, which arms no auto-save; `file-icons.service.ts::ensureFolderNote` writes its `---\n---\n` placeholder straight to disk and never touches the editor at all. Either way `notifyAfterSave` never fires, so the owner is the only thing that indexes their bytes before the watcher's 500 ms debounce. They use source `save`. `kanban.service.ts` and `collection.service.ts` write nothing to disk - `KanbanView`/`CollectionView` go through `EditorView` into the editor save path - so they need no call of their own.
- The `.view` writers (`updateViewIcon`, `updateViewQuery`) deliberately stay OFF the owner. A `.view` body is bare YAML with no `---` fences, so `buildNoteRecord` parses zero properties and would replace the Rust-projected record (`organized` / `archived` / `favorite` / `tags`, from `project_note_record`) with an empty one, while the icon and calendar consumers can read nothing from it either. Zero upside, one measurable downgrade. Pinned by a test in `type-definitions.service.test.ts`.
- The watcher cannot cover every race by itself — `areAllRecentSaves` skips self-saves, so `notifyAfterSave` has to do the synchronous refresh. Removing the synchronous call would reintroduce a subtle class of missed-index bugs.
- Re-evaluation triggers: move indexes to Rust (FTS5 is already there — semantic and backlink reverse index could follow); vault size exceeds what fits comfortably in memory (~10 000+ notes); an incremental-sync API like CRDTs obviates in-memory reverse indexes.
