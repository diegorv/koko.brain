# file card src-tauri/src/vault/entry.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/vault/entry.rs ' codemap/files
file src-tauri/src/vault/entry.rs rust L1127 module src-tauri/src/vault in4 t8 t:inline | Per-note metadata entry shape.
## imports
imp src-tauri/src/vault/entry.rs:12 -> src-tauri/src/utils/fs.rs is_view_filename
imp src-tauri/src/vault/entry.rs:13 -> src-tauri/src/vault/parsing.rs extract_outgoing_links,extract_tags_strict,extract_tasks_and_headings,normalize_type_casing,parse_frontmatter,parse_frontmatter_raw_yaml,strip_frontmatter
imp src-tauri/src/vault/entry.rs:17 -> src-tauri/src/vault/task.rs Task,TaskHeading
## imported-by
imp src-tauri/src/commands/vault.rs:4 -> src-tauri/src/vault/entry.rs NoteEntry,NoteRecord,OutgoingLink,OutgoingUnlinkedMention,RelationshipBacklink
imp src-tauri/src/vault/index.rs:14 -> src-tauri/src/vault/entry.rs NoteEntry,OutgoingLink,OutgoingUnlinkedMention,RelationshipBacklink
imp src-tauri/src/vault/index_cache.rs:10 -> src-tauri/src/vault/entry.rs NoteEntry
imp src-tauri/src/vault/parsing.rs:17 -> src-tauri/src/vault/entry.rs WikiLink
## reach
in2 src-tauri/src/vault/entry.rs 3 files in 2 modules: src-tauri/src/vault(2) src-tauri/src(1)
out2 src-tauri/src/vault/entry.rs 3 files in 2 modules: src-tauri/src/vault(2) src-tauri/src/utils(1)
## tests
test src-tauri/tests/commands/vault_test.rs imports src-tauri/src/vault/entry.rs
test src-tauri/tests/vault_cache_test.rs imports src-tauri/src/vault/entry.rs
test src-tauri/tests/vault_event_frontmatter_test.rs imports src-tauri/src/vault/entry.rs
test src-tauri/tests/vault_file_ops_test.rs imports src-tauri/src/vault/entry.rs
test src-tauri/tests/vault_frontmatter_parity_test.rs imports src-tauri/src/vault/entry.rs
test src-tauri/tests/vault_index_test.rs imports src-tauri/src/vault/entry.rs
test src-tauri/tests/vault_task_headings_parity_test.rs imports src-tauri/src/vault/entry.rs
test src-tauri/tests/vault_task_test.rs imports src-tauri/src/vault/entry.rs
## symbols
sym src-tauri/src/vault/entry.rs:35 struct WikiLink L12 dto:WikiLink | One outgoing wikilink in a note's body.
by src-tauri/src/vault/entry.rs:WikiLink <- src-tauri/src/vault/parsing.rs:1081 in extract_outgoing_links ref +2
sym src-tauri/src/vault/entry.rs:54 struct OutgoingLink L13 dto:OutgoingLink | One outgoing wikilink already resolved against the `VaultIndex` — returned by `get_outgoing_links_v2` to the `OutgoingLinksPanel`.
by src-tauri/src/vault/entry.rs:OutgoingLink <- src-tauri/src/commands/vault.rs:522 in get_outgoing_links_v2 ref
by src-tauri/src/vault/entry.rs:OutgoingLink <- src-tauri/src/vault/index.rs:859 in VaultIndex::lookup_outgoing_links ref +1
sym src-tauri/src/vault/entry.rs:80 struct NoteRecord L26 dto:NoteRecord | One per-note record returned by `get_all_property_records` — the projection consumed by the TS `collection.service` / kb-api.
by src-tauri/src/vault/entry.rs:NoteRecord <- src-tauri/src/commands/vault.rs:1000 in project_note_record ref +4
sym src-tauri/src/vault/entry.rs:113 struct OutgoingUnlinkedMention L8 dto:OutgoingUnlinkedMention | One unlinked mention of a vault note in the active note's body — returned by `get_outgoing_unlinked_mentions_v2`.
by src-tauri/src/vault/entry.rs:OutgoingUnlinkedMention <- src-tauri/src/commands/vault.rs:545 in get_outgoing_unlinked_mentions_v2 ref
by src-tauri/src/vault/entry.rs:OutgoingUnlinkedMention <- src-tauri/src/vault/index.rs:893 in VaultIndex::lookup_outgoing_unlinked_mentions ref +2
sym src-tauri/src/vault/entry.rs:127 struct RelationshipBacklink L8 dto:RelationshipBacklink | A backlink from a frontmatter relationship field.
by src-tauri/src/vault/entry.rs:RelationshipBacklink <- src-tauri/src/commands/vault.rs:503 in get_relationship_backlinks_v2 ref
by src-tauri/src/vault/entry.rs:RelationshipBacklink <- src-tauri/src/vault/index.rs:776 in VaultIndex::lookup_relationship_backlinks ref +4
sym src-tauri/src/vault/entry.rs:145 struct NoteEntry L72 dto:NoteEntry | Canonical per-note metadata used by the Rust `VaultIndex`.
by src-tauri/src/vault/entry.rs:NoteEntry <- src-tauri/src/commands/vault.rs:223 in collect_v2_entries ref +21
by src-tauri/src/vault/entry.rs:NoteEntry <- src-tauri/src/vault/index.rs:264 in (module) ref +9
by src-tauri/src/vault/entry.rs:NoteEntry <- src-tauri/src/vault/index_cache.rs:29 in (module) ref +1
sym src-tauri/src/vault/entry.rs:227 method NoteEntry::from_content(path: String, content: &str, modified_at: i64) -> Self L3 | Builds a `NoteEntry` from a file's path, raw content, and last- modified timestamp.
sym src-tauri/src/vault/entry.rs:239 method NoteEntry::from_content_full(path: String, content: &str, modified_at: i64, created_at: i64, size: u64,) -> Self L53 | Like `from_content` but takes the file's `created_at` and `size` directly.
by src-tauri/src/vault/entry.rs:NoteEntry::from_content_full <- src-tauri/src/commands/vault.rs:239 in collect_v2_entries lexical +4
sym src-tauri/src/vault/entry.rs:300 method NoteEntry::from_view_frontmatter(path: String, frontmatter: BTreeMap<String, JsonValue>, modified_at: i64, created_at: i64, size: u64,) -> Self L23 | Builds the entry of a `.view`: its YAML keys, path, timestamps, size and the lifecycle flags read from those keys.
by src-tauri/src/vault/entry.rs:NoteEntry::from_view_frontmatter <- src-tauri/src/commands/vault.rs:1368 in reparse_across_view_boundary lexical
sym src-tauri/src/vault/entry.rs:336 method NoteEntry::with_path(mut self, new_path: String) -> Self L5 | Returns this entry re-keyed to `new_path`, recomputing the path-derived `title`.
by src-tauri/src/vault/entry.rs:NoteEntry::with_path <- src-tauri/src/commands/vault.rs:1336 in rename_note_inner lexical-method +1
## locals
local src-tauri/src/vault/entry.rs:347 fn extract_title_from_path(path: &str) -> String L11
local src-tauri/src/vault/entry.rs:361 fn compute_word_count(body: &str) -> usize L3
local src-tauri/src/vault/entry.rs:376 fn compute_snippet(body: &str) -> String L24
local src-tauri/src/vault/entry.rs:405 fn extract_is_a(frontmatter: &BTreeMap<String, JsonValue>) -> Option<String> L8
local src-tauri/src/vault/entry.rs:416 fn extract_bool_flag(frontmatter: &BTreeMap<String, JsonValue>, key: &str) -> bool L6
local src-tauri/src/vault/entry.rs:425 fn extract_wikilink_targets(frontmatter: &BTreeMap<String, JsonValue>, key: &str) -> Vec<String> L15
local src-tauri/src/vault/entry.rs:443 fn extract_all_relationships(frontmatter: &BTreeMap<String, JsonValue>) -> BTreeMap<String, Vec<String>> L30
local src-tauri/src/vault/entry.rs:475 fn extract_wikilinks_from_str(s: &str) -> Vec<String> L7
## calls
call src-tauri/src/vault/entry.rs:228 in NoteEntry::from_content -> src-tauri/src/vault/entry.rs:NoteEntry::from_content_full call
call src-tauri/src/vault/entry.rs:246 in NoteEntry::from_content_full -> src-tauri/src/utils/fs.rs:is_view_filename lexical
call src-tauri/src/vault/entry.rs:247 in NoteEntry::from_content_full -> src-tauri/src/vault/parsing.rs:parse_frontmatter_raw_yaml lexical
call src-tauri/src/vault/entry.rs:248 in NoteEntry::from_content_full -> src-tauri/src/vault/entry.rs:NoteEntry::from_view_frontmatter call
call src-tauri/src/vault/entry.rs:250 in NoteEntry::from_content_full -> src-tauri/src/vault/entry.rs:extract_title_from_path call
call src-tauri/src/vault/entry.rs:251 in NoteEntry::from_content_full -> src-tauri/src/vault/parsing.rs:parse_frontmatter lexical
call src-tauri/src/vault/entry.rs:252 in NoteEntry::from_content_full -> src-tauri/src/vault/parsing.rs:extract_outgoing_links lexical
call src-tauri/src/vault/entry.rs:253 in NoteEntry::from_content_full -> src-tauri/src/vault/parsing.rs:extract_tags_strict lexical
call src-tauri/src/vault/entry.rs:254 in NoteEntry::from_content_full -> src-tauri/src/vault/parsing.rs:extract_tasks_and_headings lexical
call src-tauri/src/vault/entry.rs:255 in NoteEntry::from_content_full -> src-tauri/src/vault/entry.rs:extract_is_a call
call src-tauri/src/vault/entry.rs:260 in NoteEntry::from_content_full -> src-tauri/src/vault/entry.rs:extract_bool_flag call +1
call src-tauri/src/vault/entry.rs:262 in NoteEntry::from_content_full -> src-tauri/src/vault/entry.rs:extract_wikilink_targets call +2
call src-tauri/src/vault/entry.rs:265 in NoteEntry::from_content_full -> src-tauri/src/vault/entry.rs:extract_all_relationships call
call src-tauri/src/vault/entry.rs:266 in NoteEntry::from_content_full -> src-tauri/src/vault/parsing.rs:strip_frontmatter lexical
call src-tauri/src/vault/entry.rs:267 in NoteEntry::from_content_full -> src-tauri/src/vault/entry.rs:compute_word_count call
call src-tauri/src/vault/entry.rs:268 in NoteEntry::from_content_full -> src-tauri/src/vault/entry.rs:compute_snippet call
call src-tauri/src/vault/entry.rs:308 in NoteEntry::from_view_frontmatter -> src-tauri/src/vault/entry.rs:extract_title_from_path call
call src-tauri/src/vault/entry.rs:313 in NoteEntry::from_view_frontmatter -> src-tauri/src/vault/entry.rs:extract_bool_flag call +1
call src-tauri/src/vault/entry.rs:337 in NoteEntry::with_path -> src-tauri/src/vault/entry.rs:extract_title_from_path call
call src-tauri/src/vault/entry.rs:411 in extract_is_a -> src-tauri/src/vault/parsing.rs:normalize_type_casing lexical
call src-tauri/src/vault/entry.rs:430 in extract_wikilink_targets -> src-tauri/src/vault/entry.rs:extract_wikilinks_from_str call
call src-tauri/src/vault/entry.rs:458 in extract_all_relationships -> src-tauri/src/vault/entry.rs:extract_wikilinks_from_str call
call src-tauri/src/vault/entry.rs:476 in extract_wikilinks_from_str -> src-tauri/src/vault/parsing.rs:extract_outgoing_links lexical
