# Senior review: rust-writes

Theme: Rust-side writes and the bridge. That covers atomicity (`write_atomic` vs plugin-fs `writeTextFile` vs `std::fs::write`), fsync, symlinks, temp leftovers, read-modify-write races in `toggle_task_status` and `propagate_type_rename` against frontend saves, path validation, capability scopes, and errors swallowed across the bridge.

This was a read-only review. Nothing was built or run. **[READ]** means I saw it in code or upstream source. **[INFER]** means I reasoned it from code I read but did not execute it.

Upstream sources fetched (WebFetch):
- `tauri-apps/plugins-workspace` v2 `plugins/fs/src/commands.rs`. `write_file_inner` opens with `truncate: !opts.append`, `create: true` by default, then calls `write_all`. There is no temp file and no `sync_all`. `resolve_path` allows a path when either the runtime `fs_scope` or the capability ACL scope allows the real path.
- `tauri-apps/plugins-workspace` v2 `plugins/dialog/src/commands.rs`. `open` for a folder calls `fs_scope.allow_directory(&path, options.recursive)`.
- `tauri-apps/plugins-workspace` v2 `plugins/dialog/guest-js/index.ts`. `recursive?: boolean`, with no default set in `open()`.
- `tauri-apps/tauri` dev `crates/tauri/src/scope/fs.rs`. `allow_directory` adds `dir` plus `dir/**` when recursive, or `dir/*` when not. `*` does not cross `/` (`require_literal_separator`).

Known-issue sources checked: `.scratch/architecture-stability/issues/*.md` (none match this theme), `.scratch/kimi-3-tauri-audit/{audit,plan}-2026-08-19.md` (containment C1/C2, symlink and permissions M16, open plan tasks 2 and 19), and `.scratch/ios-app/research/review-data-safety.md` (B2 and m2 mention the toggle buffer loss and the missing fsync, as research notes, not filed issues).

---

## Findings

### F1. Ticking a task in the Tasks tab deletes unsaved typing in that note (data-loss, high confidence)

**Path [READ]:**
1. Typing in note A calls `onContentChange` → `editorStore.updateContent` and starts the 2 s body debounce (`src/lib/core/editor/editor.service.ts:224-227`, `:197`). `tab.content` holds the typed text. Disk does not have it yet.
2. Switching to the Tasks tab (`switchTab`, `editor.service.ts:250-255`, or the `toggleTasksTab` shortcut, `tasks.service.ts:147-156`) does not save. `EditorView.svelte:70-71` unmounts `MarkdownEditor` and mounts `TasksView`. `TasksView.svelte:77-82` fetches the task list from the Rust index, which reflects disk.
3. Clicking a checkbox runs `TasksView.svelte:66-68` → `toggleTask` → `call('toggle_task_status')` (`src/lib/features/tasks/tasks.service.ts:100-105`).
4. Rust `toggle_task_status_inner` reads the file from disk (`src-tauri/src/commands/vault.rs:669-670`), toggles the line (`:671`), and writes it with `write_atomic` (`:683`). It never sees the editor buffer.
5. Back in TS, `syncExternalContentToEditor(filePath, updatedContent, true, 'none')` (`tasks.service.ts:114`) calls `updateTabContentByPath` (`editor.service.ts:78-79`). That sets both `tab.content` and `tab.savedContent` to the disk-based result (`editor.store.svelte.ts:130-136`). `'none'` starts no save (`editor.service.ts:213-221`).
6. The pending debounced save then runs `saveDirtyTabs`. The tab is no longer dirty (`content === savedContent`, `editor.service.ts:184-187`), so nothing is written.
7. Switching back to A remounts `MarkdownEditor`, which builds a fresh `EditorState` from `tab.content` (`MarkdownEditor.svelte:99-108`). The typed text is gone, and so is the undo history (new state).

**Outcome:** the text typed in the last ~2 s before the switch is lost from memory and from disk, and the tab shows clean. The typing was never saved, so `notifyAfterSave` never ran and file history has no copy. Nothing can recover it.

**User scenario:** type a line in note A, press the Tasks shortcut, and tick any task that belongs to A within about 2 s of the last keystroke.

**Variant [INFER]:** if the debounced `writeTextFile` of A is in flight when the click lands (the click falls right at the 2 s mark), the Rust read can come before the plugin-fs write. Then one of the two writes overwrites the other. Disk ends up with either the toggle or the typing, and `markSavedByPath` (`editor.store.svelte.ts:91-95`) can leave `savedContent` disagreeing with disk.

**Contrast in the same codebase [READ]:** `frontmatter-write.service.ts:111-135` applies its change to `tab.content` when a tab is open and saves through `saveFileByPath`. `link-updater.service.ts:33-35` uses the dirty buffer. `renameType` rewrites the tab buffers first (`type-definitions.service.ts:211-222`). Only the task toggle overwrites the buffer with disk content.

**Tests:** `src/tests/lib/features/tasks/tasks.service.test.ts:190-201` covers only a clean tab (`content === savedContent`). No test covers a dirty tab.

**Known:** mentioned as a desktop bug in `.scratch/ios-app/research/review-data-safety.md:74` (iOS research, B2). There is no filed issue.

### F2. A Tasks list that is a few seconds stale can tick the wrong task (corruption, medium confidence)

**Path [READ]:** `toggle_task_status` takes only `(path, line_number)` (`commands/vault.rs:708-713`). `toggle_task_in_content` flips whatever task marker is on that 1-based line (`src-tauri/src/vault/parsing.rs:1873-1906`). It does not check the expected text, a hash or the mtime. The Tasks list re-reads the index only on mount, after its own toggle (`tasks.service.ts:115`), or on a `vaultIndexVersion` bump. Those bumps are throttled: 2 s after an isolated event, at most once every 10 s during a burst (`src/lib/app/tauri-listeners.service.ts:84-88`).

**User scenario:**
1. In note A, insert a new task line `- [ ] new` above `- [ ] buy milk` (line 10).
2. Switch to the Tasks tab within 2 s. The list loads from the index, which still matches the old disk, so `buy milk` shows line 10.
3. The debounced save lands. The Rust index now has `new` at line 10 and `buy milk` at line 11, but the list keeps line 10 until the next bump. If anything else changed the index in the previous 10 s (a toggle, a watcher batch), that wait can last up to 10 s.
4. Click `buy milk`. Rust toggles line 10, so `new` gets checked. The immediate refetch then shows `new` checked and `buy milk` still open.

A note edited by an outside tool (sync client, git pull, another editor) while the Tasks tab is open hits the same window. If the line now holds a non-task, the click silently does nothing (`tasks.service.ts:106-108`).

**Known:** `.scratch/ios-app/research/review-data-safety.md:76` (iOS research, two-client form). Not filed.

### F3. Saving into a full disk can empty the whole note, and the quit dialog understates the loss (data-loss, medium confidence; shared with the editor-save theme)

**Path [READ]:** every editor save is `writeTextFile(path, content)` with no options (`src/lib/core/editor/editor.service.ts:168`). Upstream `write_file_inner` opens the target with `truncate: true`, then calls `write_all`, with no temp file. If `write_all` fails (ENOSPC, EIO), the target is already truncated to 0 bytes or holds a partial write. `saveFileByPath` returns false and shows "Failed to save file." (`editor.service.ts:174-177`), and retries every 5 s (`:192`). The watcher does not reload a dirty tab (`editor.service.ts:380`), so the buffer survives in memory.

**User scenario:** the disk fills up (local Time Machine snapshots can keep freed blocks in use, so the truncate may not free room for the rewrite [INFER]). The user saves note A, the write fails, and A is now empty or partial on disk. If the user quits, the close handler asks "Failed to save: A.md. Close anyway and lose unsaved changes?" (`tauri-listeners.service.ts:55-61`). Answering yes loses the whole note, not just the unsaved changes. A crash or force-quit before the retry succeeds has the same result.

The Rust writer `write_atomic` (`src-tauri/src/utils/fs.rs:16-32`) would leave the old file in place on this failure. It is used only for create, toggle and type-rename, not for the editor save.

**Known:** not filed. The ipc-surface and fs-utils scouts raised the mechanism. This is the concrete trigger.

### F4. A vault outside the two allowed folders half-works: Rust writes succeed, frontend reads and writes fail (stale-state, medium confidence)

**Path [READ]:**
- `openVaultDialog` accepts any folder (`src/lib/core/vault/vault.service.ts:25-31`) and calls `open({ directory: true, multiple: false })` with no `recursive`.
- The dialog plugin then grants a runtime fs scope of `dir` plus `dir/*` only, so direct children only (upstream dialog `commands.rs` and tauri `scope/fs.rs`). The repo has no persisted-scope plugin and no Rust `allow_directory` (grep of `src-tauri/src`, `Cargo.toml` and `tauri.conf.json` found none).
- The static capabilities allow only `$DOCUMENT/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**` (`src-tauri/capabilities/default.json:37-185`). The onboarding page states this limit (`src/routes/(app)/+page.svelte:44`), but nothing enforces it.
- The Rust commands use `std::fs` with no ACL: `scan_vault_v2`, `create_note`, `create_folder`, `toggle_task_status`, `propagate_type_rename` (`commands/vault.rs:888-925`, `:664-737`, `:342-424`).

**Outcome:**
- In the session that opened `~/Desktop/notes` through the dialog, root-level notes open and save. Notes in subfolders show in the tree (Rust scan) but `readTextFile` is denied.
- Creating a note in a subfolder succeeds on disk and in the index (`create_note`), then fails to open.
- Renaming a root note lets `renameItem` succeed, but `updateLinksAfterRename` is denied for every linking note in a subfolder. It only logs `Failed to update links` (`link-updater.service.ts:55-59`), so those links silently break.
- After a restart (`openRecentVault`, `vault.service.ts:37-52`), no plugin-fs read or write is allowed at all, while the Rust index, Tasks list and task toggles keep working.

No note bytes are lost, because a denied write fails before it truncates. The user ends up with broken links and a vault that looks loaded but cannot be edited.

**Known:** the asymmetry is noted in the ipc-surface scout lead 3 and kimi-3 L2 (`audit-2026-08-19.md:139`). Not filed. The non-recursive dialog scope and the silent link-rewrite failure are new.

### F5. `propagate_type_rename` reports success when some notes kept the old type (stale-state, high confidence on silence, low on frequency)

**Path [READ]:** per-member read or write errors `continue` with only `debug_log` (`commands/vault.rs:356-376`). The command returns `Ok(updated)` (`:423`). `renameType` ignores the count and toasts only when the call throws (`type-definitions.service.ts:224-230`). `write_atomic` refuses read-only targets (`utils/fs.rs:20-23`).

**User scenario:** rename type `Project` to `Initiative` while one member is read-only, or was deleted or moved since it was indexed. The rename shows success. That note keeps `_type: Project`, a type whose definition no longer exists, so it drops out of the type's collection with no message.

**Known:** scout leads only. Not filed.

---

## Checked and found safe, or not reported

- **`write_atomic` happy path** (`utils/fs.rs:16-32`). Temp file in the same directory, then rename. A unique per-process sequence avoids temp-file collisions (`:7-9,25-26`). Read-only targets are refused (`:20-23`). A failed rename removes the temp file (`:28-30`). A process crash cannot truncate the note. Not reported:
  - No fsync before the rename (power-loss risk, APFS behaviour UNVERIFIED). Known as m2 in `ios-app/research/review-data-safety.md:34,300`.
  - The temp file is left behind when `std::fs::write` fails. It then shows in the tree, because `scan_dir` skips only dot-names (`commands/vault.rs:103`). It is never indexed (`is_markdown_filename`, `utils/fs.rs:114-117`). Clutter only, and the original note is untouched.
- **Symlink replacement and mode/xattr loss** in `write_atomic`. Known: kimi-3 M16, plan task 19 (open). Low reach, because symlinked notes are never indexed (`utils/fs.rs:157`, `commands/vault.rs:120-122`), so toggle and propagate never target them.
- **Missing vault containment** (`ensure_safe_write_path` only rejects relative paths and `..`, `commands/vault.rs:862-876`). `toggle_task_status` has no check at all. Known: kimi-3 C1/C2, plan task 2 (open). In normal use the UI passes only paths from the index.
- **`toggle_task_in_content` itself** (`parsing.rs:1873-1906`): bounds checks, flips only the task-marker group (not a `[ ]` inside the description), keeps `\r` and the trailing newline (split and join on `\n`). The no-op returns the original and skips the write (`commands/vault.rs:672-681`).
- **`toggle_task_status` write lock** (`commands/vault.rs:714-718`) covers read, write and index update, so two toggles cannot interleave. The emit happens after the lock drops. A write error comes back as `Err` with the index untouched, and the TS side shows a toast (`tasks.service.ts:116-119`).
- **`rewrite_type_in_frontmatter`** (`parsing.rs:101-160`): touches only `_type:` and `type:` lines inside the frontmatter block, keeps quote style and CRLF, and returns `None` (no write) when nothing matched. A value with a trailing comment does not match, so it is skipped rather than mangled.
- **`renameType` open-tab ordering** (`type-definitions.service.ts:211-226`): tab buffers, dirty ones included, are rewritten and written before the Rust pass, so the Rust pass cannot overwrite a dirty buffer, and the buffer's later autosave keeps the new type.
- **`create_note`**: refuses an existing path (`commands/vault.rs:896-898`), indexes only after a successful write, and the frontend picks a unique name first. The exists-then-rename race window is microseconds. Known: ios-app review :296. Not reported.
- **`rename_note` / `remove_note_from_index`** (`commands/vault.rs:1001-1068`, `:938-960`): index only, no disk I/O, re-keys only markdown targets.
- **`save_vault_cache` / `write_snapshot_atomic`** (`vault/index_cache.rs:54-77`): temp file, `sync_all`, rename. Cache only. Deleting the cache on a read error (`commands/vault.rs:1228-1233`) costs a rescan, not data.
- **Reloading external changes** skips dirty tabs (`editor.service.ts:375-401`), so a watcher event from a Rust write or a failed save does not overwrite a dirty buffer.
- **`call()`** passes IPC errors through unchanged (ipc-surface scout, `contracts/ipc.ts:21-26`). Not re-traced.

## Not verified

- APFS durability of rename without fsync, and whether ENOSPC on a full APFS volume actually shows up at `write_all` after the truncate (F3 depends on the latter).
- Real click timing for F1 and F2 in the running app. The mechanisms are traced, the timing is not measured.
- The dialog scope's effect on canonicalized versus as-given paths (for example `/tmp` vs `/private/tmp`) for F4.
