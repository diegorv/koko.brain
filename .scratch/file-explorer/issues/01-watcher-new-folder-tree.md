# 01: Files created inside a new folder outside the app appear in the explorer

**What to build:** When files are created outside the app inside a folder that is also new (or a chain of new folders), the file explorer shows them without restarting. Today the watcher's incremental tree refresh rescans only the immediate parent directory of each changed path (`handleChangedPaths`, `src/lib/core/filesystem/fs.watcher.ts:148-155`) and patches the result into the tree with `patchSubtree` (`:87-113`), which silently does nothing when that parent is not in the tree yet. So the new folder and everything under it never appear until a full scan (app restart). When a parent to rescan is not in the current tree, walk up to the nearest ancestor that is (the vault root at worst) and rescan that one instead; keep the "more than 5 parents means full refresh" rule, counted after the walk-up and deduplicated (a parent under another parent being rescanned is covered by it).

**Context:** Reported 2026-10-29. Log `~/Library/Logs/com.diegorv.kokobrain/2026-10-29_20-43-35.log` at 23:49:47: 114 files copied into `.../use-cases-test/examples/{markdown-editor-vault,queryjs-features,collection-features}`; the watcher did "incremental — 4 parents", scanning the leaf folders; `examples` was new, so none of them was patched in, and `use-cases-test` was never rescanned. Same at 23:50:18 for a new `live-preview-regressions` folder. Indexes (Rust VaultIndex, search) were rebuilt correctly; only `fsStore.fileTree` stays stale.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/filesystem/fs.watcher.ts` (modify; parent selection in `handleChangedPaths`, possibly a pure helper for "nearest ancestor present in the tree")
- `src/tests/lib/core/filesystem/` (watcher tests)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] Test, written and seen failing first: a file created at `<existing>/new-a/new-b/file.md` (neither `new-a` nor `new-b` in the tree) makes `new-a`, `new-b` and `file.md` appear in `fsStore.fileTree`
- [ ] Test: a file created in an existing folder still rescans only that folder (incremental path unchanged)
- [ ] Test: walked-up parents are deduplicated, and more than 5 distinct parents after the walk-up still triggers the full refresh
- [ ] Folder order / content order is still applied to the rescanned subtree

## Comments

- 2026-10-29 20:53 — discovery — plan: walk each missing parent up to the nearest folder in the tree, dedupe nested parents, then apply the >5 rule — work/01/discovery.md
