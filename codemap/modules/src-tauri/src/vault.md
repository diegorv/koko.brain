# module card src-tauri/src/vault
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src-tauri/src/vault ' codemap/modules
module src-tauri/src/vault rust files 9 in-modules 2 out-modules 1 pub 46/105 ipc 0/0 card ~3.9k
## neighbors
dep src-tauri/src -> src-tauri/src/vault 2
dep src-tauri/src/commands -> src-tauri/src/vault 8
dep src-tauri/src/vault -> src-tauri/src/utils 4
in2 src-tauri/src/vault 0 modules: -
out2 src-tauri/src/vault 0 modules: -
## entry files
entry src-tauri/src/vault/mod.rs ext-in2 src-tauri/src/commands/vault.rs src-tauri/src/lib.rs
entry src-tauri/src/vault/watcher.rs ext-in2 src-tauri/src/commands/watcher.rs src-tauri/src/lib.rs
entry src-tauri/src/vault/entry.rs ext-in1 src-tauri/src/commands/vault.rs
entry src-tauri/src/vault/index.rs ext-in1 src-tauri/src/commands/vault.rs
entry src-tauri/src/vault/index_cache.rs ext-in1 src-tauri/src/commands/vault.rs
entry src-tauri/src/vault/parsing.rs ext-in1 src-tauri/src/commands/vault.rs
entry src-tauri/src/vault/task.rs ext-in1 src-tauri/src/commands/vault.rs
entry src-tauri/src/vault/task_lines.rs ext-in1 src-tauri/src/commands/vault.rs
## files
file src-tauri/src/vault/aliases.rs rust L78 module src-tauri/src/vault in1 t1 t:inline | Frontmatter key alias resolution.
file src-tauri/src/vault/entry.rs rust L1127 module src-tauri/src/vault in4 t8 t:inline | Per-note metadata entry shape.
file src-tauri/src/vault/index.rs rust L2000 module src-tauri/src/vault in3 t10 t:inline | `VaultIndex`: the canonical Rust-side store for vault metadata.
file src-tauri/src/vault/index_cache.rs rust L285 module src-tauri/src/vault in1 t2 t:inline | Persistent snapshot codec for the `VaultIndex`.
file src-tauri/src/vault/mod.rs rust L26 module src-tauri/src/vault in2 t1 | Vault metadata module.
file src-tauri/src/vault/parsing.rs rust L3606 module src-tauri/src/vault in4 t5 t:inline | Markdown parsing primitives for the canonical `NoteEntry`.
file src-tauri/src/vault/task.rs rust L306 module src-tauri/src/vault in4 t8 t:inline | Task data types and IPC structs for the Tasks/Tags Phase 7 work.
file src-tauri/src/vault/task_lines.rs rust L403 module src-tauri/src/vault in1 t1 | Guarded edits of task lines located by their `🆔 td-…` anchor plus the line the caller expects there, never by line number (todoist-bisync design rule 12).
file src-tauri/src/vault/watcher.rs rust L800 module src-tauri/src/vault in2 t1 t:inline | Native Rust file watcher (Phase 9).
## public
sym src-tauri/src/vault/entry.rs:54 struct OutgoingLink L13 dto:OutgoingLink | One outgoing wikilink already resolved against the `VaultIndex` — returned by `get_outgoing_links_v2` to the `OutgoingLinksPanel`.
sym src-tauri/src/vault/entry.rs:80 struct NoteRecord L26 dto:NoteRecord | One per-note record returned by `get_all_property_records` — the projection consumed by the TS `collection.service` / kb-api.
sym src-tauri/src/vault/entry.rs:113 struct OutgoingUnlinkedMention L8 dto:OutgoingUnlinkedMention | One unlinked mention of a vault note in the active note's body — returned by `get_outgoing_unlinked_mentions_v2`.
sym src-tauri/src/vault/entry.rs:127 struct RelationshipBacklink L8 dto:RelationshipBacklink | A backlink from a frontmatter relationship field.
sym src-tauri/src/vault/entry.rs:145 struct NoteEntry L72 dto:NoteEntry | Canonical per-note metadata used by the Rust `VaultIndex`.
sym src-tauri/src/vault/entry.rs:239 method NoteEntry::from_content_full(path: String, content: &str, modified_at: i64, created_at: i64, size: u64,) -> Self L53 | Like `from_content` but takes the file's `created_at` and `size` directly.
sym src-tauri/src/vault/entry.rs:300 method NoteEntry::from_view_frontmatter(path: String, frontmatter: BTreeMap<String, JsonValue>, modified_at: i64, created_at: i64, size: u64,) -> Self L23 | Builds the entry of a `.view`: its YAML keys, path, timestamps, size and the lifecycle flags read from those keys.
sym src-tauri/src/vault/entry.rs:336 method NoteEntry::with_path(mut self, new_path: String) -> Self L5 | Returns this entry re-keyed to `new_path`, recomputing the path-derived `title`.
sym src-tauri/src/vault/index.rs:33 struct UpdateResult L22 dto:UpdateResult | Mirrors `kokobrain_lib::vault::entry` over IPC: the result of a single `VaultIndex::update_entry` call.
sym src-tauri/src/vault/index.rs:213 fn match_unlinked_mentions(note_name: &str, candidate_paths: Vec<String>) -> Vec<String> L24 | Reads each `candidate_paths` file from disk and returns the subset whose body contains a plain-text mention of `note_name` (after frontmatter / fenced-code str…
sym src-tauri/src/vault/index.rs:262 struct VaultIndex L52 | Canonical vault metadata index.
sym src-tauri/src/vault/index.rs:349 method VaultIndex::vault_root(&self) -> Option<&str> L3 | The canonical root of the vault the index was last built for by `build_with_root` (`scan_vault_v2*`), i.e. the open vault; `None` before the first scan or afte…
sym src-tauri/src/vault/index.rs:396 method VaultIndex::build_with_root(&mut self, vault_root: &str, entries: Vec<NoteEntry>) L3 | `build` for a vault at `vault_root`, the prefix every entry path starts with (no trailing `/`).
sym src-tauri/src/vault/index.rs:502 method VaultIndex::update_entry(&mut self, entry: NoteEntry) -> UpdateResult L248 | Inserts or updates a single note's metadata in-place.
sym src-tauri/src/vault/index.rs:760 method VaultIndex::lookup_backlinks(&self, path: &str) -> Vec<NoteEntry> L11 | Returns every `NoteEntry` whose outgoing links resolve to `path`, sorted by title (case-insensitive) for stable UI ordering.
sym src-tauri/src/vault/index.rs:776 method VaultIndex::lookup_relationship_backlinks(&self, target_path: &str) -> Vec<RelationshipBacklink> L61 | Returns notes that reference the target note via frontmatter relationship fields (`_belongs_to`, `_related_to`, `_has_many`, or custom fields in `relationships…
sym src-tauri/src/vault/index.rs:859 method VaultIndex::lookup_outgoing_links(&self, path: &str) -> Vec<OutgoingLink> L17 | Returns the outgoing wikilinks of the entry at `path`, each with its resolved target path filled in via the index's resolution caches.
sym src-tauri/src/vault/index.rs:889 method VaultIndex::lookup_outgoing_unlinked_mentions(&self, path: &str, content: &str,) -> Vec<OutgoingUnlinkedMention> L65 | Returns notes whose names appear as plain text in `content` but are NOT already linked from `path` via wikilinks.
sym src-tauri/src/vault/index.rs:988 method VaultIndex::unlinked_mentions_candidates(&self, path: &str) -> UnlinkedMentionsCandidates L27 | Phase 1 of the incoming-unlinked-mentions scan: produce the search term + candidate path list.
sym src-tauri/src/vault/index.rs:1023 method VaultIndex::lookup_entries(&self, paths: &[String]) -> Vec<NoteEntry> L6 | Phase 3 of the incoming-unlinked-mentions scan: clone the full `NoteEntry` for each path in `paths`.
sym src-tauri/src/vault/index.rs:1039 method VaultIndex::lookup_all_tags(&self) -> Vec<TagAggregate> L27 | Returns the flat list of tag aggregates (one per distinct tag, case-insensitive) sorted alphabetically.
sym src-tauri/src/vault/index.rs:1070 method VaultIndex::lookup_all_tasks(&self) -> Vec<FileTaskGroup> L15 | Returns every entry's tasks grouped by file, sorted by `modified_at` descending.
sym src-tauri/src/vault/index.rs:1099 method VaultIndex::remove_entry(&mut self, path: &str) -> UpdateResult L170 | Removes a single note from the index.
sym src-tauri/src/vault/index_cache.rs:18 const INDEX_SCHEMA_VERSION L1 | Bump on `NoteEntry` shape changes (field add/remove/reorder/type change) or on parser output changes: a cache hit reuses entries whose mtime matches without pa…
sym src-tauri/src/vault/index_cache.rs:47 fn cache_file_path(vault_path: &str) -> std::path::PathBuf L5 | Returns the path to the cache file for the given vault.
sym src-tauri/src/vault/index_cache.rs:82 fn read_snapshot(vault_path: &str) -> Result<Option<IndexSnapshot>, String> L11 | Reads the cache file from disk.
sym src-tauri/src/vault/index_cache.rs:95 fn write_snapshot(vault_path: &str, entries: &[NoteEntry]) -> Result<(), String> L11 | Writes a snapshot to the cache file atomically.
sym src-tauri/src/vault/mod.rs:26 type VaultIndexState L1 | Tauri-managed wrapper around `VaultIndex`.
sym src-tauri/src/vault/parsing.rs:103 fn rewrite_type_in_frontmatter(content: &str, old_type: &str, new_type: &str) -> Option<String> L22 | Rewrites the value of a top-level `_type:` / `type:` frontmatter key when its (unquoted, casing-normalized) value equals `old_type`.
sym src-tauri/src/vault/parsing.rs:1650 fn(crate) parse_task_line(line: &str, line_number: usize) -> Option<Task> L42 | Parses a single line as a task item.
sym src-tauri/src/vault/parsing.rs:1882 fn set_task_status_in_content(content: &str, line_number: usize, status: TaskStatus) -> String L29 | Sets the checkbox of the task at `line_number` (1-based) inside `content` to `status_checkbox_char(status)`.
sym src-tauri/src/vault/parsing.rs:1918 fn set_task_text_in_content(content: &str, line_number: usize, new_text: &str) -> String L21 | Replaces the text of the task at `line_number` (1-based) inside `content` with `new_text`: the line up to the start of `TASK_RE` / `ORDERED_TASK_RE` group 3 (i…
sym src-tauri/src/vault/task.rs:63 enum TaskStatus L10 dto:TaskStatus | Task status parsed from the checkbox character.
sym src-tauri/src/vault/task.rs:160 struct TagAggregate L9 dto:TagAggregate | Aggregate tag info returned by `VaultIndex::lookup_all_tags`.
sym src-tauri/src/vault/task.rs:174 struct FileTaskGroup L13 dto:FileTaskGroup | One file's worth of tasks, as returned by `VaultIndex::lookup_all_tasks`.
sym src-tauri/src/vault/task.rs:207 struct ToggleTaskResult L14 dto:ToggleTaskResult | Result of a single `toggle_task_status` mutation.
sym src-tauri/src/vault/task.rs:229 struct TaskTextWriteResult L15 dto:TaskTextWriteResult | Result of `write_task_text`: the note content after the call, the index diff, whether the line was stale, and the re-parsed task.
sym src-tauri/src/vault/task_lines.rs:84 struct TaskLineEdits L12 dto:TaskLineEdits | One note's batch, applied all or nothing.
sym src-tauri/src/vault/task_lines.rs:133 enum TaskLinesOutcome L12 dto:TaskLinesOutcome | What `write_task_lines` did.
sym src-tauri/src/vault/task_lines.rs:150 struct TaskLinesWriteResult L11 dto:TaskLinesWriteResult | Result of `write_task_lines`.
sym src-tauri/src/vault/task_lines.rs:164 enum TaskLineEditOutcome L6 | Result of [`apply_task_line_edits`].
sym src-tauri/src/vault/task_lines.rs:184 fn apply_task_line_edits(content: &str, edits: &TaskLineEdits) -> Result<TaskLineEditOutcome, String> L74 | Applies `edits` to `content`.
sym src-tauri/src/vault/watcher.rs:41 struct VaultFilesChangedPayload L3 dto:VaultFilesChangedPayload | Payload emitted with `vault-files-changed`.
sym src-tauri/src/vault/watcher.rs:159 type VaultWatcherState L1 | App-managed watcher state: `Option<VaultWatcher>` behind a `Mutex`.
sym src-tauri/src/vault/watcher.rs:318 fn replace_watcher(state: &VaultWatcherState, path: &str, on_change: F) -> Result<(), String> L15 | Starts (or replaces) the watcher held in `state`, rooted at `path`.
sym src-tauri/src/vault/watcher.rs:337 fn stop_watcher(state: &VaultWatcherState) -> Result<(), String> L9 | Stops the watcher held in `state` (if any) and joins its bridge thread, so no emit reaches the callback after this returns.
## effects
fx-count rust-fs.File::create 1
fx-count rust-fs.create_dir_all 1
fx-count rust-fs.rename 1
fx-count rust-spawn.spawn 1
## debt
-
