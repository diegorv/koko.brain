# module card src-tauri/src/utils
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src-tauri/src/utils ' codemap/modules
module src-tauri/src/utils rust files 5 in-modules 6 out-modules 0 pub 17/33 ipc 0/0 card ~1.8k
## neighbors
dep src-tauri/src -> src-tauri/src/utils 1
dep src-tauri/src/commands -> src-tauri/src/utils 16
dep src-tauri/src/db -> src-tauri/src/utils 3
dep src-tauri/src/quick_capture -> src-tauri/src/utils 2
dep src-tauri/src/semantic -> src-tauri/src/utils 3
dep src-tauri/src/vault -> src-tauri/src/utils 4
in2 src-tauri/src/utils 1 modules: src-tauri/src/search(1)
out2 src-tauri/src/utils 0 modules: -
## entry files
entry src-tauri/src/utils/logger.rs ext-in18 src-tauri/src/commands/db.rs src-tauri/src/commands/debug.rs src-tauri/src/commands/files.rs src-tauri/src/commands/history.rs src-tauri/src/commands/search_index.rs more importers 13 not shown: src-tauri/src/commands(3) src-tauri/src/db(3) src-tauri/src/semantic(3) +3 modules: q importers src-tauri/src/utils/logger.rs
entry src-tauri/src/utils/fs.rs ext-in8 src-tauri/src/commands/db.rs src-tauri/src/commands/files.rs src-tauri/src/commands/search_index.rs src-tauri/src/commands/semantic.rs src-tauri/src/commands/vault.rs more importers 3 not shown: src-tauri/src/vault(2) src-tauri/src/quick_capture(1): q importers src-tauri/src/utils/fs.rs
entry src-tauri/src/utils/resource_usage.rs ext-in2 src-tauri/src/commands/debug.rs src-tauri/src/commands/semantic.rs
entry src-tauri/src/utils/main_heartbeat.rs ext-in1 src-tauri/src/commands/debug.rs
## files
file src-tauri/src/utils/fs.rs rust L351 module src-tauri/src/utils in8 t2 t:inline
file src-tauri/src/utils/logger.rs rust L111 module src-tauri/src/utils in20 t4 t:inline
file src-tauri/src/utils/main_heartbeat.rs rust L151 module src-tauri/src/utils in1 t0 t:inline | Native main-thread heartbeat.
file src-tauri/src/utils/mod.rs rust L4 module src-tauri/src/utils in0 t0
file src-tauri/src/utils/resource_usage.rs rust L179 module src-tauri/src/utils in2 t2 | Process CPU and memory samples for the embedder's debug log.
## public
sym src-tauri/src/utils/fs.rs:16 fn write_atomic(path: &str, content: &str) -> Result<(), String> L21 | Writes `content` to `path` atomically: the bytes go to a temp file in the same directory (same filesystem, so the rename is atomic), then the temp file is rena…
sym src-tauri/src/utils/fs.rs:62 fn validate_vault_path(vault_path: &str) -> Result<PathBuf, String> L9 | Validates and canonicalizes a vault path.
sym src-tauri/src/utils/fs.rs:107 fn collect_markdown_paths_with_mtime(vault_root: &Path, excluded_folders: &[&str],) -> Result<Vec<MarkdownEntryWithMtime>, String> L8 | The search walk: collects only the files `is_search_indexed_filename` accepts (`.md` / `.markdown`, no `.view`), with the modification times from the metadata …
sym src-tauri/src/utils/fs.rs:121 fn collect_markdown_paths_with_metadata(vault_root: &Path, excluded_folders: &[&str],) -> Result<Vec<MarkdownEntryWithMetadata>, String> L8 | Like `collect_markdown_paths` (the same file set, `.view` included) but also captures mtime, ctime and size.
sym src-tauri/src/utils/fs.rs:143 fn is_markdown_filename(file_name: &str) -> bool L4 | Returns true when `file_name` ends with `.md`, `.markdown` or `.view`, case-INSENSITIVELY: a file that belongs in the VaultIndex.
sym src-tauri/src/utils/fs.rs:149 fn is_view_filename(file_name: &str) -> bool L3 | Returns true when the filename has a `.view` extension (case-insensitive).
sym src-tauri/src/utils/fs.rs:155 fn is_search_indexed_filename(file_name: &str) -> bool L3 | True for a file that gets FTS5 rows and embeddings.
sym src-tauri/src/utils/logger.rs:23 struct DebugLogPayload L8 dto:DebugLogPayload | Payload emitted to the frontend for each debug log event.
sym src-tauri/src/utils/logger.rs:35 fn set_log_sink(sink: LogSink) L3 | Installs the sink that `debug_log` forwards to after writing stderr.
sym src-tauri/src/utils/logger.rs:40 fn set_debug_mode(enabled: bool) L3 | Sets whether debug logging is enabled.
sym src-tauri/src/utils/logger.rs:45 fn is_debug_enabled() -> bool L3 | Returns whether debug logging is currently enabled.
sym src-tauri/src/utils/logger.rs:54 fn debug_log(tag: &str, msg: impl Display) L14 | Logs a debug message.
sym src-tauri/src/utils/main_heartbeat.rs:57 fn set_enabled(enabled: bool, post: impl Fn(MainTask) -> bool + Send + 'static) L24 | Starts the heartbeat thread with `post` as the main-thread poster, or stops it.
sym src-tauri/src/utils/resource_usage.rs:109 fn describe_memory() -> String L6 | One-line memory summary: `rss X MB footprint Y MB`, or `memory n/a`.
sym src-tauri/src/utils/resource_usage.rs:118 struct EmbedPass L4 | Measures one embed pass: wall time, CPU time and major faults between `start` and `finish`, plus the footprint at `finish`.
sym src-tauri/src/utils/resource_usage.rs:125 method EmbedPass::start() -> Self L6 | Samples the clock and CPU usage at the start of a pass.
sym src-tauri/src/utils/resource_usage.rs:166 fn ensure_periodic_sampler() L14 | Starts the periodic memory line (`[RESOURCES] rss X MB footprint Y MB` every 10 s) on its own thread.
## effects
fx-count rust-fs.remove_file 2
fx-count rust-fs.rename 1
fx-count rust-fs.write 1
fx-count rust-timer.sleep 2
## debt
-
