# 164: Quick Switcher Create with a folder path (Projects/Idea) creates the note in that folder, and a failed create says why

**Origin:** `audit-2026-11-05` Issue 57, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** createAndOpenNote (src/lib/features/quick-switcher/QuickSwitcher.svelte:40-58) appends .md and passes the raw query with its slash to createFile(vaultStore.path, name) (src/lib/core/filesystem/fs.service.ts:194-220 at HEAD, the function at the 'Creates a file on disk' doc comment), which builds `${vault}/Projects/Idea.md` and calls create_note. Rust create_note (src-tauri/src/commands/vault.rs:984-995) does not create parents, so write_atomic's temp write fails (src-tauri/src/utils/fs.rs:27) and the switcher shows only 'Failed to create file.' (QuickSwitcher.svelte:50-52), with no reason and no note. When the folder already exists the same path works, so the behavior depends on state the user cannot see. Fix direction: split the query on '/', refuse empty, '.' and '..' segments with a clear message, create the missing folders under the vault (Rust create_folder is recursive and a no-op for an existing folder, vault.rs:1012-1022; do not use fs.service createFolder, which renames on a collision) and add them to the tree, then createFile in the target folder with the last segment. The error toast names the reason.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts: with no files in the tree, type Projects/Idea and click the create action; create_folder is invoked for /vault/Projects before create_note is invoked with /vault/Projects/Idea.md, and the note opens. It fails today (no folder is created).
- [ ] A nested path (Area/Projects/Idea) creates every missing folder level.
- [ ] An existing folder is reused, not duplicated as 'Projects 1'.
- [ ] A query with an empty, '.' or '..' segment creates nothing and shows a toast that says why.
- [ ] When creation fails, the toast includes the error reason; the existing 'toasts and opens nothing' test keeps passing with its assertions adjusted only for the new text.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/low. A path-style create into a folder that does not exist is uncommon.
- **Trigger:** Cmd+O, type a path-style name such as Projects/Idea whose folder does not exist yet (no note name matches), then click Create "Projects/Idea".
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/features/quick-switcher/QuickSwitcher.svelte:43-49 name = query + '.md', createFile(vaultStore.path, name, ...); :50-52 bare catch -> toast.error('Failed to create file.'). src/lib/core/filesystem/fs.service.ts createFile: readDir(parentPath) of the vault root only, filePath = `${parentPath}/${uniqueName}`, call('create_note', { path: filePath, content }), catch logs and rethrows. src-tauri/src/commands/vault.rs:991-995 ensure_safe_write_path, exists check, vault_fs::write_atomic with no create_dir_all. src-tauri/src/utils/fs.rs:27 std::fs::write(tmp) fails with 'write failed' when the parent is missing. src/lib/core/filesystem/file-entries.logic.ts:51-56 filterAndRank fuzzy-matches the query against nameWithoutExt only, so a query with '/' rarely matches and the Create branch (QuickSwitcher.svelte:94-103) shows.
- **Related Issues before the audit:** `.scratch/archived/ux-polish/issues/03-quick-switcher-enter-creates-on-no-match.md`
- **Source:** audit 2026-11-05, domain `shell`, finding `N-shell-03` (from shell-ux-4). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, low). Confirmed. QuickSwitcher.svelte:40-58 passes 'Projects/Idea.md' to createFile(vault). createFile (fs.service.ts:198-224) builds the path under the vault root and calls create_note. Rust create_note (vault.rs:984-1004) has no create_dir_all, and write_atomic's temp write (fs.rs:27) fails when the parent is missing. The bare catch shows 'Failed to create file.' filterAndRank fuzzy-matches nameWithoutExt only (file-entries.logic.ts:51-56), so a query containing '/' usually reaches the Create branch. ensure_safe_write_path already rejects '..' on the Rust side, which supports refusing it in the frontend with a clear message.

## Comments
