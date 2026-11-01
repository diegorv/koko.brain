# Issue 24 discovery: bookmarks merge into Favorites

No `spec.md`; the source is `PRD.md` (Rollout step 4, "Bookmark migration", Q7) and ADR 0033 line 48.

## Files that change
- New `features/properties/bookmark-migration.service.ts`: `migrateBookmarksToFavorites(vaultPath)`.
  Reads `.kokobrain/bookmarks.json`; each markdown file entry (`isMarkdownFile`, not `isDirectory`, still
  on disk) goes through `updateNoteFrontmatter(path, p => toggleFavorite(p, true))`, sequentially
  (the writer requires per-path serialization). Folders, non-markdown and vanished files are dropped.
  Any write failure: keep the file, one error toast naming the notes. Otherwise delete the file, then
  one toast naming the dropped items (only when there are some). Never rejects.
- `core/app-lifecycle/app-lifecycle.service.ts:48-51,286,292-293,634`: step 3 calls the migration in
  place of `loadBookmarks`; teardown drops `resetBookmarks`. Step 3 runs before the step 4 scan, so the
  scan indexes the new frontmatter; the auto-move hook (step 6) is not registered yet.
- `core/file-explorer/FileExplorer.svelte:5-6,45-46,67-69,176-180,338-346`: Bookmark menu item gone.
- `core/filesystem/path-change.service.ts:9,178-186`: bookmark path rewrite gone. Proof: it only wrote
  `bookmarksStore` + `bookmarks.json`; the only `bookmarksStore` reader is `FileExplorer.svelte:67`,
  removed in the same change. The local `vaultStore` import there served only this block.
- Deleted: `features/bookmarks/*` (4 files), `src/tests/lib/features/bookmarks/*` (3), `e2e/specs/bookmarks.spec.ts`.
- Tests touched: `app-lifecycle.service.test.ts` (mock + assertions), `fs.service.test.ts:30,62,800-808,991-999`,
  `fs.service.race-audit.test.ts:41` (mock only).
- Docs: help `02-file-explorer.md` (menu row + Bookmarks section), `01-getting-started.md:98`, help
  `README.md:24`, `README.md:41`, `CONTRIBUTING.md:182`, `docs/TESTING.md:72-78` example store.

## Plan (test-first)
1. `src/tests/lib/features/properties/bookmark-migration.service.test.ts`, copying the in-memory disk +
   real `updateNoteFrontmatter` setup of `frontmatter-write.service.test.ts`: md + folder + canvas bookmarks
   -> `_favorite: true` on disk, one toast naming the others, no bookmarks file; second run and no file:
   no writes, no toast; a lossy note keeps the file and toasts; a vanished note is dropped.
2. Wire into lifecycle, remove the feature, fix tests. 3. E2E `bookmark-migration.spec.ts` seeding
   `bookmarks.json` and checking the favorite flag on disk, the toast and the deleted file. 4. Docs.

## Defaults taken
- A failed write keeps the whole file untouched; re-running is idempotent (already-favorite notes are
  not rewritten), so partial success needs no bookkeeping. The dropped-items toast waits for the run
  that deletes the file, so it shows once.
- Invalid JSON / non-array content counts as no bookmarks (the old loader's behavior): file deleted, no toast.
- A markdown bookmark whose file no longer exists is dropped and named, not a failure (else it would block forever).

## Risks
- A note with lossy frontmatter (comments, anchors) fails every open until fixed: one toast per open, by design.
- `CLAUDE.md:65` and the generated archify / graphify maps still name bookmarks; left for the owner.
- No new UI beyond toasts (svelte-sonner, already themed), so the theme-token criterion has nothing new to check.
