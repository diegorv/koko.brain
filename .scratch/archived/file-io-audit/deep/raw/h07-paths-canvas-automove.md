# Deep dive h07-paths-canvas-automove

Worktree read: /Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/file-io-repro (HEAD 0ba80e6a).
No cargo or build run. No app code edited. Repro tests added under
src/tests/repro/h07-paths-canvas-automove/ and run one file at a time.

Third-party sources fetched (GitHub raw, not ~/.cargo):
- tauri-apps/tauri `crates/tauri/src/scope/fs.rs` (dev branch): `is_allowed`, `try_resolve_symlink_and_canonicalize`, `allow_directory`.
- tauri-apps/plugins-workspace `plugins/dialog/src/commands.rs` (v2 branch): `open` command scope grant.

## Summary

| ids | bug | verdict | severity | priority |
|---|---|---|---|---|
| feature-writers-8 | Unarchive to a root note writes `vault//x.md` into the tab and Rust index | CONFIRMED_BY_TEST | stale-state | P2 |
| feature-writers-11 | Canvas file/image nodes from picker or drop double-prefix the vault path | CONFIRMED_BY_TEST | minor | P2 |
| rename-move-delete-9 | Auto-move destination from frontmatter has no `..` check | CONFIRMED_BY_TEST (logic) + CONFIRMED_BY_TRACE (scope) | security | P2 |
| rust-writes-4 | Vault outside the two allowed folders: reads and writes of subfolder notes denied | CONFIRMED_BY_TRACE | stale-state | P2 |

Nothing in this group is a content-loss P0 or P1. None of the four bugs
destroys bytes on its own.

---

## 1. feature-writers-8: unarchive to root gives `vault//x.md`

### Trace
- Lifecycle rule. type-lifecycle-rules.ts:36-55. The unarchive rule is emitted only for `{folder}/<seg>`. Its destination is `{parent}`.
- `{parent}` for `<vault>/_archive/x.md`. auto-move.logic.ts:107 (`relFolder` = `_archive`), :115 `parentFolder` = '' (no slash). Template result is '' at :129.
- Service composes the dir. auto-move.service.ts:173 `destPath = \`${vaultPath}/${resolvedDest}\`` = `/vault/`. isAlreadyInDestination (logic :69-81) is false ('_archive' != '').
- moveItem. fs.service.ts:50-51 `newPath = \`${targetDirPath}/${fileName}\`` = `/vault//x.md`. The guard at :53 (`sourcePath === newPath`) does not fire.
- applyPathChange(from `/vault/_archive/x.md`, to `/vault//x.md`). path-change.service.ts:132 `updateTabAfterRenameOrMove` sets the tab path to `/vault//x.md`. link-updater.service.ts:76-79 uses exact equality.
- Rust rename_note_inner (commands/vault.rs:1001-1019) keys by exact string, so the index entry moves to `/vault//x.md`.
- Disk: the rename itself succeeds because POSIX collapses `//`.

### Downstream effects (traced)
- Tree-initiated rename or delete does not find the tab. updateTabAfterRenameOrMove (link-updater.service.ts:76-79) and closeTabsForDeletedPath (editor.service.ts:360) compare exactly. The tab keeps `/vault//x.md`.
- Next save of that tab writes to the stale path. saveFileByPath (editor.service.ts:161-170) calls writeTextFile(tab.path). After a tree rename, that recreates the old-name file (ghost duplicate). After a tree delete, it resurrects the deleted note. Only when the tab is dirty.
- Clicking the note in the tree opens a second tab. openFileInEditor uses findTabIndex exact match (editor.service.ts:114). Two editor states for one file. Edits in the second tab can be overwritten when the stale tab is edited later. This needs both tabs edited, so it is narrow.
- Duplicate index entries: PLAUSIBLE, not traced. The watcher would upsert `/vault/x.md` after the move, which would add a second key, but I did not trace the watcher-handler self-save filter.

### Reachability
- autoMove.enabled defaults to false (settings.store.svelte.ts:102-105). Opt-in.
- Needs a type with `_archive_to: "{folder}/<segment>"` (type-definitions.logic.ts:114). Opt-in.
- Needs a root-level member, archived then unarchived.

### Repro
- File: src/tests/repro/h07-paths-canvas-automove/unarchive-root-path.test.ts
- Result: 2 failed. `expected '/vault//x.md' to be '/vault/x.md'`; `rename` called with `/vault//x.md`.
- Test mocks only plugin-fs, path-change.service and debug. The moveItem path composition is the real one.

### Recoverable
Note bytes are on disk at the root. The stale tab and index key persist until restart. Ghost file or resurrected note can be deleted by hand.

### Fix sketch
Canonicalize in moveItem or in auto-move: pass `vaultPath` without a trailing slash when the resolved destination is empty, or join with a helper that collapses `//`.

---

## 2. feature-writers-11: canvas file/image nodes double the vault prefix

### Trace
- Picker and drop store absolute paths. The file tree is absolute: Rust FileNode `path` is "Absolute path on disk" (commands/vault.rs:56-60). CanvasFilePicker.svelte:61 passes `file.path` from flattenFileTree (file-entries.logic.ts:21). CanvasInner.svelte:465-472 (handleFileSelected), :474-480 (handleImageSelected), and the drop handler at :559 build nodes with the absolute path.
- Readers prefix again. FileNode.svelte:40-41 `${vaultStore.path}/${filePath}` then readTextFile. canvas-image.service.ts:34 does the same for resolveImageSrc, used by ImageNode.
- Contract says vault-relative. canvas.types.ts:48 and :75 "Path to the file in the vault".
- Click still works. FileNode.svelte:56 calls openFileInEditor(data.file), which takes an absolute path.
- Persistence: createFileNode (canvas.logic.ts:353-355) stores the absolute path into the .canvas JSON, so the file is not portable across vault moves.

### Reachability
Normal use: any file or image node added through the picker or drag-and-drop. Canvas is always loaded.

### Repro
- File: src/tests/repro/h07-paths-canvas-automove/canvas-picked-file-path.test.ts
- Chain: flattenFileTree (real) on an absolute tree, then resolveImageSrc (real).
- Result: `readFile` called with `/vault//vault/assets/pic.png`, expected `/vault/assets/pic.png`.

### Recoverable and impact
No note content lost. Preview shows "Could not load file" or a broken image. Absolute paths in .canvas break if the vault folder moves.

### Fix sketch
Pick one contract. Either store vault-relative paths at creation (picker, drop) and keep the readers, or make the readers accept absolute paths. The second choice also needs the stored JSON to be migrated or left as is.

---

## 3. rename-move-delete-9: auto-move destination `..` not rejected

### Trace
- resolveDestination (auto-move.logic.ts:102-130) fills `{status}` and `{type}` from frontmatter (:122-123). The only cleanup is slash collapse, leading and trailing slash removal (:129). No `..` check.
- evaluateAndMove (auto-move.service.ts:172-188) builds `destPath = vault + '/' + resolved`, calls exists and mkdir(recursive) and moveItem.
- Rust guard exists, but only for Rust writes: `ensure_safe_write_path` (commands/vault.rs:862-874) rejects `..` components. The TS auto-move path uses plugin-fs and has no equivalent.

### Scope leg (fetched)
- capabilities/default.json allows `$DOCUMENT/kokobrain-vaults/**` (and $HOME) for mkdir, rename, exists.
- tauri scope/fs.rs (fetched): `is_allowed` calls `try_resolve_symlink_and_canonicalize`. For an existing path that canonicalizes and resolves `..`. For a non-existent path it returns the path unchanged, and then `components().collect()` keeps `ParentDir` components, so the raw string is matched against the globs.
- Consequence: `exists`, `mkdir` and `rename` targets with `..` that do not exist yet are matched by string prefix. The `**` glob matches `..` segments. So the scope check does not stop traversal.
- The escape is therefore not limited to the vaults root. Any depth of `..` that keeps the literal prefix passes the scope check. OS permissions are the only remaining limit. This is PLAUSIBLE beyond the vaults root (scope logic traced, not run live). Within kokobrain-vaults it is CONFIRMED_BY_TRACE.

### Repro
- File: src/tests/repro/h07-paths-canvas-automove/auto-move-dotdot-destination.test.ts
- Result: `expected [ 'Tasks', '..', '..', 'Other' ] to not include '..'`.

### Reachability
- autoMove.enabled defaults to false. Opt-in.
- Needs a frontmatter value containing `../` used in a rule destination. Realistic mainly for imported or shared vaults or deliberate input. Not a default-settings path.

### Impact
Note bytes are preserved (rename). The note disappears from the app tree. mkdir can create directories outside the scope. Recoverable by moving the file back.

### Fix sketch
Reject or strip `..` segments in resolveDestination, or refuse any destination that is not a plain relative path inside the vault, mirroring ensure_safe_write_path.

---

## 4. rust-writes-4: vault outside the two allowed folders

### Trace
- vault.service.ts:26 `open({ directory: true, multiple: false })` with no recursive flag. The Open Vault button (routes/(app)/+page.svelte:12-14, :31) accepts any folder.
- plugin-dialog open (fetched commands.rs): for directory mode it calls `s.allow_directory(&path, options.recursive)` on the fs scope. recursive defaults to false.
- tauri scope/fs.rs (fetched) allow_directory: non-recursive pushes `dir` and `dir/*`. Only direct children match (require_literal_separator). Subfolder notes are not allowed.
- Nothing persists the grant. Cargo.toml has tauri-plugin-fs and tauri-plugin-dialog only, no persisted-scope plugin.
- Reads that fail: subfolder readTextFile (editor open), link-updater.service.ts:35 and :39 (in Promise.allSettled, rejection only logged at :58, no toast). createFile (fs.service.ts:119-130) readDir works for direct children only; create_note in Rust then succeeds, and the open fails.
- Rust bypasses the ACL. scan_vault (commands/vault.rs:85-96) and create_note use std::fs. So the tree shows subfolder notes.
- Onboarding copy (routes/(app)/+page.svelte:44) states the allowed locations, but nothing enforces them.

### Reachability
Normal use: Open Vault on a folder such as ~/Desktop/notes. Subfolder notes fail to open. Ctrl-N in a subfolder creates an empty file and then fails to open it. Renaming a root note leaves subfolder backlinks unchanged, with only a console log. After restart, the grant is gone, so root notes are also denied reads (the audit said "nothing opens"; the trace agrees, but I did not run it).

### Data loss check
I did not find a write path that overwrites content with stale data, because reads fail before a tab exists. No loss found.

### Not checked
Live run of the dialog in the app. The exact glob behavior of the dialog-granted scope against the static capability in one combined scope. I traced it, not run it.

---

## Not verified
- Watcher handling of the post-unarchive event, and therefore the duplicate index entry (feature-writers-8). PLAUSIBLE.
- Live runs of any of the four bugs in the app. No Tauri runtime available to me.
- Whether the `..` escape reaches beyond kokobrain-vaults in practice (rename-move-delete-9). PLAUSIBLE.
