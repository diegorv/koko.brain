# Scout: Rust write/delete commands in `commands/vault.rs`

Read-only mapping. Nothing in the repo was edited. No build or test was run. Claims are tagged **[READ]** (seen in code or docs I opened) or **[INFER]** (reasoned from read code, not executed). Third-party behaviour was checked against upstream source (see section 5).

Scope: `create_note`, `create_folder`, `rename_note`, `toggle_task_status`, `propagate_type_rename`, `save_vault_cache`, `remove_note_from_index`, plus the helpers they call (`write_atomic`, `ensure_safe_write_path`, `update_entry`, `remove_entry`, `rewrite_type_in_frontmatter`, `toggle_task_in_content`, `write_snapshot_atomic`).

---

## 0. Known-issue cross-check

Checked `.scratch/architecture-stability/issues/*.md`.

- **Overlaps, already filed or fixed:**
  - Issue 34 (`34-save-dirty-tabs-before-vault-switch.md`): dirty tabs saved before vault switch. Fixed. Not the same as the leads below.
  - Issue 45 (`45-calendar-own-rename-tail-race.md`): calendar writes racing the rename tail (`renameItem` → `rename_note`). Filed. Related to lead L-09 only in the rename tail.
  - Issue 54 and 63: view parse cache around rename. Not in this slice.
  - Issue 21 (`21-app-lifetime-ports-for-core.md`): content-invalidation signal. Context only.
- **Not covered by any issue, so new:** L-01 (toggle drops unsaved keystrokes), L-02 (toggle by line number with no content check), L-03 (no fsync in `write_atomic`), L-04 (no vault containment on write commands), L-05 (propagate skips members silently).

---

## 1. Entry points and call chains

### 1.1 `create_note` (`commands/vault.rs:888-916`)

- **Callers (TS):**
  - `core/note-creator/note-creator.service.ts:103` (`openOrCreateNote`). `create_folder` at :98 runs first. `exists()` pre-check earlier in the same function.
  - `core/filesystem/fs.service.ts:129` (`createFile`). `readDir` + `generateUniqueName` first, so the name is unique among siblings at read time.
  - Also `features/rail-shell/new-note.service.ts` and `plugins/one-on-one` (not opened; call sites from grep `create_note`, unverified in detail).
- **Chain:** UI (new-note / Ctrl-N / event-calendar) → TS service → `call('create_note', {path, content})` (typed via `contracts/commands.ts:76` area) → Tauri command → `ensure_safe_write_path` (:895) → `Path::exists` (:896) → `vault_fs::write_atomic` (:899) → `read_file_mtime_secs` (:900) → write lock on `VaultIndexState` → `update_note_in_index_inner` (:906) → `app.emit(VAULT_INDEX_UPDATED_EVENT)` (:908, emitted unconditionally).
- **TS follow-up:** `markRecentSave` (`fs.service.ts` after :129), then `applyNoteChange({source:'fs'})` (`note-change.service.ts`, owner).

### 1.2 `create_folder` (`commands/vault.rs:922-925`)

- **Callers:** `note-creator.service.ts:98`, `fs.service.ts:156` (`createFolder`), `features/rail-shell/new-note.service.ts:27`, `plugins/templates/templates.service.ts:105`, `features/type-definitions/type-definitions.service.ts` (test references only at the grep, unverified call site).
- **Chain:** `ensure_safe_write_path` (:924) → `std::fs::create_dir_all` (:925). No index touch, no event.

### 1.3 `rename_note` (`commands/vault.rs:1045-1068`, inner `rename_note_inner` :1001-1036)

- **Caller:** `core/filesystem/path-change.service.ts:159` inside `applyPathChange`. Only called when `to !== null`.
- **Ordering inside `applyPathChange` [READ]:**
  1. Snapshot child paths from `fsStore.fileTree` (before `diskOp`).
  2. `closeTabsForDeletedPath` if delete.
  3. `await diskOp()`. For rename/move this is `rename(oldPath, newPath)` from `plugin-fs`, called from `fs.service.ts` `renameItem` (diskOp near :211) and `moveItem` (diskOp near :239).
  4. `updateTabAfterRenameOrMove`.
  5. Path-change consumers fan-out.
  6. `updateLinksAfterRename` (TS `writeTextFile` on linking notes, `link-updater.service.ts:39`).
  7. `refreshTree()`.
  8. `call('rename_note', {from, to})` (:159). Errors are logged only (:160-162).
  9. `forgetNote` for `from` and each child (removes old keys from dedupe, indexes, and Rust via `remove_note_from_index`).
- **Rust side [READ]:** index only. Takes write lock, collects keys equal to `from` or starting with `from + '/'` (sorted), `remove_entry` then `update_entry(old.with_path(new))` for markdown-filename targets only. Emits once if any step matched. No disk I/O and no `ensure_safe_write_path` call (not needed, no disk write).

### 1.4 `toggle_task_status` (`commands/vault.rs:708-737`, inner `toggle_task_status_inner` :664-686)

- **Caller:** `features/tasks/tasks.service.ts:102` (`toggleTask`). Called from `features/tasks/TasksView.svelte:67` (`handleToggle`), which is the Tasks tab checkbox.
- **TS follow-up [READ]:** if `updateResult.changed`, `syncExternalContentToEditor(filePath, updatedContent, true, 'none')` (`tasks.service.ts:~114`), then `buildTaskIndex()`. Errors: `error()` + `toast.error` (no rethrow).
- **Rust [READ]:** write lock held across `read_to_string` → `toggle_task_in_content` → `write_atomic` → `update_note_in_index_inner`. Lock released before emit.

### 1.5 `propagate_type_rename` (`commands/vault.rs:396-424`, inner :342-388)

- **Caller:** `features/type-definitions/type-definitions.service.ts:226` (`renameType`), after `renameItem(definitionPath, ...)` (:209-ish, catch returns early) and after rewriting open tabs (:211-222 loop, `writeTextFile(tab.path, updated)` at :218).
- **Rust [READ]:** write lock held for the whole loop (`idx` borrowed mutable from :402). Members = index entries with `is_a == old_type` (:347-352). Per member: `read_to_string` → `rewrite_type_in_frontmatter` → `write_atomic` → `update_note_in_index_inner` → `absorb`. Per-file errors `continue` with `debug_log` only. Returns count. Emits once with folded `UpdateResult` if any updated.

### 1.6 `save_vault_cache` (`commands/vault.rs:1412-1426`)

- **Caller:** `app/lifecycle/app-lifecycle.service.ts:587`, inside `teardownVault`. Fire-and-forget (`.catch` logs). `indexedVaultPath` nulled right after (:589).
- **Teardown is reached from** `initializeVault` at `app-lifecycle.service.ts:180-188` (`saveAllDirtyTabs`, `drainEventCalendarWrites`, `teardownVault`), then the new vault's scan starts later in the same function.
- **Rust [READ]:** sync command. Read lock → clone entries → drop lock → `index_cache::write_snapshot(path, &entries)`.

### 1.7 `remove_note_from_index` (`commands/vault.rs:938-960`)

- **Callers:** `core/filesystem/note-change.service.ts:202` (delete branch of `applyNoteChange`, fire-and-forget with `.catch`). Also `forgetNote` path via `path-change.service.ts`. Also test references in watcher-handler tests.
- **Rust [READ]:** `idx.remove_entry(&path)` under write lock, emits if `changed`. No disk I/O. The file itself is deleted TS-side by `moveToTrash` (`trash.service.ts`, `fs.service.ts` deleteItem), which is a soft delete into `.kokobrain` trash.

---

## 2. Every disk write, delete and rename in the slice

Helpers, from `utils/fs.rs` [READ]:

- `write_atomic(path, content)` (`utils/fs.rs:16-32`):
  1. `metadata(path)` (follows symlinks). If readonly, error.
  2. `tmp = "{path}.tmp-{pid}-{seq}"` in the same directory.
  3. `std::fs::write(&tmp, content)`. **No `sync_all` / fsync.** On write failure the tmp file is left behind (not removed; only the rename-failure branch removes it).
  4. `std::fs::rename(&tmp, path)`. On failure removes tmp.
  - The doc comment (:11-15) says a crash leaves old content or a stray tmp. That holds for process crash, not for power loss (see L-03).
- `ensure_safe_write_path` (`commands/vault.rs:862-876`): rejects non-absolute and any `ParentDir` component. It does **not** check that the path is inside the vault.
- `write_snapshot_atomic` (`vault/index_cache.rs:55-78`): `create_dir_all(parent)`, `File::create` on fixed name `vault-index.msgpack.tmp`, `write_all`, `sync_all` (:70), `rename` (:74). Does fsync; `write_atomic` does not.

Per command:

| Command | Disk op | Atomic? | Precondition checks | On error |
|---|---|---|---|---|
| `create_note` (:888) | `write_atomic` new file (:899) | Tmp+rename, no fsync | `ensure_safe_write_path`; `Path::exists()` → error "already exists" (:896-898). Exists check is not atomic with the rename (L-06). | Error returned; no index change. |
| `create_folder` (:922) | `create_dir_all` (:925) | n/a | `ensure_safe_write_path` | Error string `mkdir failed`. |
| `toggle_task_status` (:664) | `read_to_string` (:666) + `write_atomic` (:683) only if the toggle changed text | Tmp+rename, no fsync | **None on content** (no hash, no mtime, no line-text check). **No `ensure_safe_write_path`**, no index-membership check, no containment. | Read error returned; write error returned as `Err` (`?` at :683). Index unchanged on write error (update happens after). |
| `propagate_type_rename` (:342) | per member: `read_to_string`, `write_atomic` (:370) | Tmp+rename, no fsync | Members from index `is_a`. No containment check (paths come from index). | Per-file read/write failure logged and skipped (:359-377). Whole command still returns Ok(count). |
| `rename_note` (:1001) | **none** (index only) | n/a | n/a | Index only. |
| `remove_note_from_index` (:938) | **none** | n/a | n/a | n/a |
| `save_vault_cache` (:1412) | `write_snapshot_atomic` (`index_cache.rs:55`) | Tmp+fsync+rename | none beyond dir create | Error returned; TS logs only. |

TS-side disk ops that feed the same paths (out of slice, cited because the Rust leads depend on them):

- `fs.service.ts` `renameItem` (:~200-215): `exists(newPath)` pre-check, then plugin-fs `rename` (diskOp). **Verified upstream [see section 5]: plugin-fs `rename` calls `std::fs::rename` with no destination check, so an existing target is replaced on POSIX.**
- `fs.service.ts` `moveItem` (:~235-245): same shape.
- `editor.service.ts:168` `saveFileByPath`: `writeTextFile(path, content)`. **Verified upstream: plugin-fs `write_text_file` truncates and writes in place, not atomic.**
- `type-definitions.service.ts:218` `writeTextFile(tab.path, updated)` inside `renameType` loop.
- `link-updater.service.ts:39` `writeTextFile(filePath, updatedContent)`.

---

## 3. Concurrency

- **Rust index lock.** `VaultIndexState` is an RwLock. Write lock is taken by `create_note` (index step only, after the disk write, :904-906), `toggle_task_status` (covers read + write + index update, :713-717), `propagate_type_rename` (covers the whole member loop including all disk I/O, :401-406), `rename_note`, `remove_note_from_index`, `update_note_in_index`. Readers (`get_*_v2`, `get_index_delta`, `save_vault_cache`) wait on the same lock. **[INFER]** `propagate_type_rename` can hold the write lock for N disk round-trips, blocking every panel read for that duration.
- **No file lock.** Nothing coordinates Rust writes with TS writes to the same note. Rust `toggle_task_status` and `propagate_type_rename` read disk without any lock the editor respects. The editor autosave (2 s body / 500 ms frontmatter, `editor.service.ts:213-221`, timers at ~:199-200) writes its in-memory buffer with plugin-fs truncate-write.
- **Editor buffer is live.** `onContentChange` → `editorStore.updateContent` on every keystroke (`editor.service.ts:224-227`). `tab.content` is the live buffer; `tab.savedContent` is the last written version. `isTabDirty` = `content !== savedContent` (`editor.logic.ts:44-46`).
- **Tab switch does not flush.** `switchTab` (`editor.service.ts:250-256`) only sets the active index. A dirty tab stays dirty until the 2 s timer (or Ctrl-S, or vault switch).
- **External-sync replaces the buffer.** `syncExternalContentToEditor` (`editor.service.ts:70-91`), when called with `markSaved=true`, calls `updateTabContentByPath` (`editor.store.svelte.ts:130-136`) which sets **both** `content` and `savedContent` to the passed string. Then `bumpExternalContentSignal` for the active tab. `MarkdownEditor.svelte` (~:312-330) then dispatches a full-document replace (`changes: {from:0, to: length, insert: content}`). The `'none'` schedule is a no-op in `scheduleAutoSave` (:213-221 handles only `'frontmatter'` and `'body'`).
- **Index version throttle.** Listener refetches are delayed `REFRESH_DELAY_MS = 2000`, min interval `REFRESH_MIN_INTERVAL_MS = 10_000` (`app/tauri-listeners.service.ts:85-88`). So after a Rust mutation, TS panels (Tasks list with `lineNumber`) can lag up to ~2 s (up to 10 s during bursts).
- **`save_vault_cache` ordering.** Called fire-and-forget in teardown, which runs before the new vault's scan in `initializeVault` (:180-188). The Rust command reads the **global** index at execution time. Since the save IPC is sent before the scan IPC, the index should still be the old vault when it runs. **[INFER]** not guaranteed by IPC ordering, but no concrete interleaving found.
- **`save_vault_cache` tmp collision.** Fixed name `vault-index.msgpack.tmp`. Two concurrent saves for the **same** vault would share it. `indexedVaultPath` is nulled after one save (app-lifecycle :589), so one save per vault per teardown. Checked, not a lead.
- **`create_note` TOCTOU.** `exists()` (:896) and `write_atomic` rename (:899) are separate. A file appearing between them is overwritten silently (L-06).
- **`rename_note` after disk rename.** Index update is a separate IPC after `diskOp`. If it fails, error is logged only (`path-change.service.ts:160-162`) and then `forgetNote(from)` removes the old-path entries, so the moved note is absent from the Rust index until a full rescan (L-09).

---

## 4. Leads

Confidence: **H** = traced in code, scenario follows from read code. **M** = depends on a timing window or a condition I did not confirm at runtime. **L** = theoretical or low-impact.

### L-01: Toggling a task checkbox discards unsaved keystrokes from the open note [H for mechanism, M for reachability]

- **Steps:**
  1. Open note A in a tab. Type text. Do not wait 2 s (the body debounce is 2 s, `editor.service.ts:213-221`). Keystrokes update `tab.content` but are not on disk.
  2. Within that window, switch to the Tasks tab (`switchTab` does not flush, `editor.service.ts:250-256`) and click a checkbox for a task in note A (`TasksView.svelte:67`).
  3. `toggleTask` → Rust `toggle_task_status` reads **disk** (`commands/vault.rs:666`), which lacks the keystrokes, writes the toggled version, returns `updatedContent` (disk-based).
  4. `tasks.service.ts` calls `syncExternalContentToEditor(filePath, updatedContent, true, 'none')`. This sets `tab.content = savedContent = updatedContent` (`editor.store.svelte.ts:130-136`) and dispatches a full doc replace (`MarkdownEditor.svelte` ~:318-330).
  5. Result: the typed text is gone from the editor and from disk. The debounced save then sees `content === savedContent`, so it is a no-op.
- **Also:** if the write in step 3 happens after the editor's pending save, the toggle is overwritten the other way. Either way one side is lost.
- **Not checked:** whether Tasks and the note editor can be visible together (split panes). Sequence above only needs the Tasks tab to be activated within 2 s of typing.
- **Affected store state:** `editorStore` tab content/savedContent; disk file.

### L-02: Toggle addresses a task by line number with no content check; a stale list flips the wrong line [M]

- **Steps:**
  1. Note A has task `- [ ] buy milk` at line 10 in the Tasks list.
  2. In the editor, user inserts 2 lines above it and waits for the save (2 s). Rust index updates immediately on save (`applyNoteChange` save path, `note-change.service.ts:235`), but the Tasks list is refetched only on the throttled version bump (`REFRESH_DELAY_MS 2000`, `tauri-listeners.service.ts:85-88`), and its items carry the old `lineNumber`.
  3. Within that window, click the checkbox showing line 10. `toggle_task_status(path, 10)` (`commands/vault.rs:664-686`) toggles whatever is on line 10 on disk now, which is now a different line (a different task, or a non-task line which is then a no-op).
- **Why it is silent:** Rust checks only bounds and that the line has a task marker (`parsing.rs` `toggle_task_in_content`, ~:1873-1907). No hash/mtime/expected-text parameter exists in the command signature (`commands/vault.rs:708-713`).
- **Also:** toggling is applied to disk, which in the window lacks the latest keystrokes (L-01 interaction).

### L-03: `write_atomic` has no fsync, so a power loss after rename can leave a zero-length or truncated note [M-L]

- **Evidence:** `utils/fs.rs:27` `std::fs::write(&tmp, …)` then `:28` `std::fs::rename`, with no `sync_all`. `write_snapshot_atomic` in the same codebase does `sync_all` (`index_cache.rs:70`), so the inconsistency is visible. Doc comment (`utils/fs.rs:11-15`) claims crash safety; that claim only covers process crash.
- **Scenario:** toggle or type-rename rewrites a note; OS crashes/power loss before the data blocks reach disk but after the rename metadata commits. Post-reboot the note can be empty.
- **Not verified:** APFS behaviour for this exact pattern. Relevant to the owner's top concern (content loss). Recommend a check of `write_atomic` against the same rule the snapshot writer follows.

### L-04: No vault-containment check on write commands; `ensure_safe_write_path` only rejects `..` and relative paths [M for symlink, L for frontend-only]

- **Evidence:** `commands/vault.rs:862-876` (`ensure_safe_write_path`) checks `is_absolute` and `ParentDir` only. `create_note` (:895) and `create_folder` (:924) call it. `toggle_task_status` (:664-686), `propagate_type_rename` (:342-388) and `save_vault_cache` (:1412) do **not** call it. `toggle_task_status` takes any absolute path and reads/writes it.
- **Scenario A (symlink inside vault):** vault contains `vault/link -> /Users/x/Documents` (symlink). Caller creates `vault/link/new.md`. `create_note` passes `ensure_safe_write_path`, `exists()` follows the link, `write_atomic` writes through the symlinked directory to `/Users/x/Documents/new.md`. The walker skips symlinks (`utils/fs.rs:157`), so the user would not see the vault's index reflect it. Requires a symlink in the vault. Needs a frontend bug to produce the path, or a user-created link.
- **Scenario B:** `toggle_task_status` called with an absolute path outside the vault (not produced by current UI, which uses index paths). Would rewrite that file if a checkbox marker exists on the line.
- **Scenario C:** dangling symlink at `vault/x.md`. `exists()` returns false (follows link), `write_atomic` metadata fails (no readonly check), rename replaces the symlink with a regular file. Changes the link, not content.
- **Confidence:** code-level facts are H. Real exploitability is L given the UI only passes indexed paths.

### L-05: `propagate_type_rename` silently skips members on per-file failure, and the TS caller cannot tell [H for silence, M for frequency]

- **Evidence:** per-file read/write errors `continue` with only `debug_log` (`commands/vault.rs:359-377`). Return value is a count (:397-408). `renameType` (`type-definitions.service.ts:226`) only toasts on a thrown error, not on `updated < members`. Member list is index `is_a` (:347-352), so a note whose on-disk `_type` changed outside the app but whose index is stale is never considered.
- **Scenario:** rename type `Project` → `Initiative`. One member is read-only (`write_atomic` returns "target is read-only", `utils/fs.rs:20-23`) or was just edited elsewhere. The rename reports success; that note still says `_type: Project`, now a dangling type, with no user-visible message. Also: a note added to the type in the last watcher window (not yet indexed) keeps the old type.
- **Concern for owner's top ask:** not data loss, but silent inconsistency.

### L-06: `create_note` exists-check and rename are not atomic; overwrite race and symlink replacement [L]

- **Evidence:** `commands/vault.rs:896` `Path::exists()` then `:899` `write_atomic`. `write_atomic` rename (`utils/fs.rs:28`) replaces any file that appears in between. Upstream `plugin-fs` has the same shape elsewhere (section 5).
- **Scenario:** two writers create the same name between check and rename (e.g. watcher-driven create plus a user click). The second `rename` overwrites the first silently. The first note's content is lost. Window is milliseconds; needs concurrent creation of the same name.
- **Mitigation that exists:** `generateUniqueName` in `createFile` (`fs.service.ts`) avoids same-name creation in the normal path.

### L-07: `write_atomic` does not preserve file mode, xattrs, or hard links [L]

- **Evidence:** `std::fs::write` creates a new inode (default mode from umask). `rename` replaces the directory entry, so the original inode's extended attributes (macOS Finder tags, `com.apple.*`) and mode bits are dropped. **[INFER]** from std semantics; not tested.
- **Scenario:** a note with `chmod 600` or a Finder tag is rewritten by `toggle_task_status`; permissions/tags reset silently. Content unchanged.

### L-08: Stray `*.tmp-<pid>-<seq>` files left in the vault on write failure or crash [L]

- **Evidence:** `utils/fs.rs:27-30`: tmp file is removed only when the **rename** fails, not when `std::fs::write` fails midway (ENOSPC, EIO). Names end in `.tmp-N-M`, so `is_markdown_filename` is false (`utils/fs.rs:114-117`), so they are not indexed. Whether they show in the file explorer depends on `scan_dir` (not read in this pass).
- **Impact:** clutter; the original note is untouched on this path (rename never ran).

### L-09: `rename_note` failure leaves the moved note out of the Rust index [L]

- **Evidence:** `path-change.service.ts:157-162`: `rename_note` error is logged only. Then the loop at ~:166-170 calls `forgetNote(from)` and each child, which removes old-path keys (and `remove_note_from_index` for them). The new path is never inserted, so the note is absent from backlinks/tags/tasks until a full rescan.
- **Trigger:** IPC failure or lock poisoning on `rename_note`. Rare.
- **Known overlap:** Issue 45 covers the rename tail race in calendar writes, not this failure.

### L-10: Read-after-truncate race between editor autosave and Rust toggle [L, narrow]

- **Evidence:** plugin-fs `write_text_file` truncates the target then writes (upstream, section 5). `toggle_task_status` reads with `read_to_string` under the Rust index lock, which the editor write does not take.
- **Scenario:** a Rust toggle reads the file in the window after the editor's truncate and before its write completes. The read is partial. `toggle_task_in_content` may still flip a line in the partial text, and `write_atomic` then replaces the note with the partial content. The editor's file descriptor keeps writing to the now-unlinked old inode, so the tail is lost.
- **Impact:** truncation of a note. Window is the duration of one autosave write. Low probability, high severity.

### L-11 (minor, index hygiene): cache header hash is not validated on load [L]

- `index_cache.rs:98` stores the raw vault path in `vault_path_hash` (doc at :25 says sha256 prefix), and `read_snapshot` (:82-92) does not compare it. The loader at `commands/vault.rs:1207` checks only `schema_version`. Cache sits inside each vault at `<vault>/.kokobrain/vault-index.msgpack`, so cross-vault contamination would need a copied `.kokobrain` folder. Low.

### Not leads (checked)

- `toggle_task_in_content` preserves CRLF and the trailing newline (`split('\n')` / `join('\n')`, `\r` stays in the line text). Checked by reading.
- `create_note` refuses an existing path before writing (`:896-898`). Only the race in L-06 remains.
- `remove_note_from_index` is index-only; it never deletes a file. Real deletes are `moveToTrash` (soft delete).
- `save_vault_cache` tmp collision: one save per vault per teardown (see section 3).
- `UpdateResult::absorb` (`index.rs:59-78`) keeps the last operation per path, as documented.

---

## 5. Third-party sources fetched

- **tauri-plugin-fs** `plugins/fs/src/commands.rs` on `tauri-apps/plugins-workspace` branch `v2`, fetched via `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs` (WebFetch). Findings:
  - `write_file` / `write_text_file` share `write_file_inner`. Open flags: `truncate = !append`, `create = opts.create` (default true), `create_new` false by default, `append` false by default. No temp file, no rename. **Writes in place, not atomic.**
  - `rename`: `resolve_path` on both sides (scope checks), then `std::fs::rename(&old, &new)` with **no destination existence check**. Overwrite semantics are whatever std does on the OS (POSIX replaces).
  - Scope checks run in `resolve_path` before open/rename (deny patterns, allow check on the real path after symlink resolution).
- **Not fetched** (not needed for this slice): notify crate (watcher not in scope), std `fs::rename` docs (I relied on the POSIX behaviour, which is widely documented; not re-fetched).

---

## 6. What I did not check

- `scan_dir` (`commands/vault.rs:91-165`): whether stray tmp files and symlinks show in the explorer (L-08).
- `rewrite_type_in_frontmatter` behaviour on malformed frontmatter beyond the `None` path.
- `frontmatter_range` (used by `rewrite_type_in_frontmatter`).
- The watcher's self-save filter (`markRecentSave`) and whether a `.tmp-*` event triggers a rebuild.
- Actual runtime behaviour of any lead. Nothing was built or run, per the task rules.
- APFS fsync semantics for L-03.
