# Deep-dive group o08-atomicity

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## save-pipeline-9: Editor save is truncate-in-place with no temp file or fsync; ENOSPC or a crash mid-write leaves a truncated note
- claimed severity: data-loss
- anchor: src/lib/core/editor/editor.service.ts:168
- scenario: The disk is nearly full. Autosave truncates N, then write_all fails. A toast appears and the buffer stays dirty, but the disk copy is empty or partial. A later Cmd+Q (save-pipeline-1) or 'Close anyway' loses both copies. Power loss during the write has the same effect.
- evidence given: FETCHED plugins-workspace v2 plugins/fs/src/commands.rs: write_text_file opens with truncate:true and create:true, calls write_all, and has no temp file, no rename and no sync_all. READ: the repo already has an atomic writer, src-tauri/src/utils/fs.rs:16-32 write_atomic (tmp+rename), used by vault.rs:370,683,899 but not by the editor save.

## calendar-3: Every calendar disk write truncates the note in place (non-atomic)
- claimed severity: data-loss
- anchor: src/lib/core/frontmatter/frontmatter-write.service.ts:149
- scenario: The app is killed, crashes or loses power between the truncate and the end of write_all during a calendar drag, a delete-save or a title-rename link rewrite. The note is left empty or partial, and the calendar keeps no backup.
- evidence given: writeTextFile at frontmatter-write.service.ts:149, editor.service.ts:168 (reached from frontmatter-write:129 and event-calendar.service.ts:1037) and link-updater.service.ts:39. FETCHED: write_file_inner opens with truncate true, then write_all. Rust write_atomic (src-tauri/src/utils/fs.rs:16-32) is used only by create_note (vault.rs:899).

## rust-writes-3: Saving into a full disk can empty the whole note, and the quit dialog understates the loss
- claimed severity: data-loss
- anchor: src/lib/core/editor/editor.service.ts:168
- scenario: The disk is full. Saving note A truncates it, then write_all fails with ENOSPC, leaving A at 0 bytes or partial on disk. The tab stays dirty and retries every 5 s. On quit the dialog asks 'Close anyway and lose unsaved changes?'. Answering yes, or a crash before the retry succeeds, loses the whole note, not just the unsaved changes.
- evidence given: The editor saves with writeTextFile(path, content) at editor.service.ts:168. Upstream plugins-workspace v2 fs/src/commands.rs write_file_inner opens with truncate:true and calls write_all, with no temp file and no sync (fetched). The failure path is editor.service.ts:174-177 and the retry is :192. The close dialog is tauri-listeners.service.ts:55-61. The atomic Rust writer write_atomic (utils/fs.rs:16-32) is not used for editor saves.

## cross-cutting-10: Overlapping saves of the same path are not serialized and can interleave bytes
- claimed severity: corruption
- anchor: src/lib/core/editor/editor.service.ts:161
- scenario: A Properties edit (updateNoteFrontmatter, which calls saveFileByPath) lands while the 2 s body save of the same note is in flight. Two truncate-and-write_all calls at offset 0 can leave the shorter content followed by the longer one's tail, while the store records one version as saved.
- evidence given: READ: there is no per-path guard in saveFileByPath (editor.service.ts:161-176). The callers are at :183-194, :234-247 and frontmatter-write.service.ts:129. The plugin-fs write is in place and async (fetched by peers). INFER: interleaving. Same as SP-14.

## save-pipeline-14: Same-path saves are not serialized; overlapping truncate+write can interleave, and failing retries multiply
- claimed severity: minor
- anchor: src/lib/core/editor/editor.service.ts:192
- scenario: A Properties edit (updateNoteFrontmatter -> saveFileByPath) lands while the 2 s body save of the same note is in flight with different content. Two truncating opens plus write_all at offset 0 can leave the shorter content followed by the longer one's tail. Under a persistent failure, each debounce run starts another endless 5 s retry chain.
- evidence given: READ: callers saveDirtyTabs 183-194, retry setTimeout 192, saveAllDirtyTabs 234-247, frontmatter-write.service.ts:129; no per-path lock; resetEditor (412-417) does not cancel retries. FETCHED: write_text_file is async fn with blocking std::fs inside. Parallel dispatch of the two commands is not verified.
