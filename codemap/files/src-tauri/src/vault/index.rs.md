# file card src-tauri/src/vault/index.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/vault/index.rs ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src-tauri/src/vault/index.rs rust L2000 module src-tauri/src/vault in3 t10 t:inline | `VaultIndex`: the canonical Rust-side store for vault metadata.
## imports
imp src-tauri/src/vault/index.rs:13 -> src-tauri/src/utils/fs.rs is_view_filename
imp src-tauri/src/vault/index.rs:14 -> src-tauri/src/vault/entry.rs NoteEntry,OutgoingLink,OutgoingUnlinkedMention,RelationshipBacklink
imp src-tauri/src/vault/index.rs:15 -> src-tauri/src/vault/parsing.rs find_plain_text_mention_positions,strip_non_body_content
imp src-tauri/src/vault/index.rs:16 -> src-tauri/src/vault/task.rs display_name,FileTaskGroup,TagAggregate
## imported-by
imp src-tauri/src/commands/vault.rs:5 -> src-tauri/src/vault/index.rs match_unlinked_mentions,UpdateResult,VaultIndex
imp src-tauri/src/vault/task.rs:216 -> src-tauri/src/vault/index.rs UpdateResult
imp src-tauri/src/vault/task.rs:236 -> src-tauri/src/vault/index.rs UpdateResult
imp src-tauri/src/vault/task_lines.rs:6 -> src-tauri/src/vault/index.rs UpdateResult
## reach
in2 src-tauri/src/vault/index.rs 3 files in 2 modules: src-tauri/src/vault(2) src-tauri/src(1)
out2 src-tauri/src/vault/index.rs 2 files in 2 modules: src-tauri/src/utils(1) src-tauri/src/vault(1)
## tests
test src-tauri/tests/commands/vault_test.rs imports src-tauri/src/vault/index.rs
test src-tauri/tests/ipc_contracts_test.rs imports src-tauri/src/vault/index.rs
test src-tauri/tests/utils_fs_test.rs imports src-tauri/src/vault/index.rs
test src-tauri/tests/vault_file_ops_test.rs imports src-tauri/src/vault/index.rs
test src-tauri/tests/vault_frontmatter_parity_test.rs imports src-tauri/src/vault/index.rs
test src-tauri/tests/vault_index_test.rs imports src-tauri/src/vault/index.rs
test src-tauri/tests/vault_task_lines_test.rs imports src-tauri/src/vault/index.rs
test src-tauri/tests/vault_task_test.rs imports src-tauri/src/vault/index.rs
test src-tauri/tests/vault_task_text_test.rs imports src-tauri/src/vault/index.rs
test src-tauri/tests/vault_type_rename_test.rs imports src-tauri/src/vault/index.rs
## symbols
sym src-tauri/src/vault/index.rs:33 struct UpdateResult L22 dto:UpdateResult | Mirrors `kokobrain_lib::vault::entry` over IPC: the result of a single `VaultIndex::update_entry` call.
by src-tauri/src/vault/index.rs:UpdateResult <- src-tauri/src/commands/vault.rs:329 in update_note_in_index_inner ref +13
by src-tauri/src/vault/index.rs:UpdateResult <- src-tauri/src/vault/task.rs:216 in (module) lexical +1
by src-tauri/src/vault/index.rs:UpdateResult <- src-tauri/src/vault/task_lines.rs:159 in (module) ref
sym src-tauri/src/vault/index.rs:61 method UpdateResult::absorb(&mut self, later: UpdateResult) L19 | Folds `later`, a result produced after this one by the same command (a rename's remove + insert, a type rename's member loop), into this one: `changed` and `fu…
sym src-tauri/src/vault/index.rs:194 struct UnlinkedMentionsCandidates L9 | Cheap snapshot for an incoming-unlinked-mentions scan: just the search term and the candidate paths.
sym src-tauri/src/vault/index.rs:213 fn match_unlinked_mentions(note_name: &str, candidate_paths: Vec<String>) -> Vec<String> L24 | Reads each `candidate_paths` file from disk and returns the subset whose body contains a plain-text mention of `note_name` (after frontmatter / fenced-code str…
by src-tauri/src/vault/index.rs:match_unlinked_mentions <- src-tauri/src/commands/vault.rs:618 in get_unlinked_mentions_v2 lexical
sym src-tauri/src/vault/index.rs:241 struct VaultShape L12 | Vault size counts that drive the cost of the index consumers, logged once per vault (`VaultIndex::shape`).
sym src-tauri/src/vault/index.rs:262 struct VaultIndex L52 | Canonical vault metadata index.
by src-tauri/src/vault/index.rs:VaultIndex <- src-tauri/src/commands/vault.rs:64 in log_vault_shape_once ref +7
sym src-tauri/src/vault/index.rs:317 method VaultIndex::entries(&self) -> &HashMap<String, NoteEntry> L3 | Returns a read-only view of the per-path entry map.
sym src-tauri/src/vault/index.rs:322 method VaultIndex::by_path(&self) -> &HashMap<String, String> L3 | Returns a read-only view of the lowercase-name resolution cache.
sym src-tauri/src/vault/index.rs:327 method VaultIndex::backlinks(&self) -> &HashMap<String, BTreeSet<String>> L3 | Returns a read-only view of the reverse-link index.
sym src-tauri/src/vault/index.rs:332 method VaultIndex::tags_index(&self) -> &HashMap<String, BTreeSet<String>> L3 | Returns a read-only view of the reverse tag index.
sym src-tauri/src/vault/index.rs:337 method VaultIndex::properties_index(&self) -> &HashMap<String, HashMap<String, BTreeSet<String>>> L3 | Returns a read-only view of the reverse property index.
sym src-tauri/src/vault/index.rs:342 method VaultIndex::version(&self) -> u64 L3 | Current monotonic version.
sym src-tauri/src/vault/index.rs:349 method VaultIndex::vault_root(&self) -> Option<&str> L3 | The canonical root of the vault the index was last built for by `build_with_root` (`scan_vault_v2*`), i.e. the open vault; `None` before the first scan or afte…
by src-tauri/src/vault/index.rs:VaultIndex::vault_root <- src-tauri/src/commands/vault.rs:807 in write_task_lines_inner lexical-method +1
sym src-tauri/src/vault/index.rs:354 method VaultIndex::len(&self) -> usize L3 | Total number of indexed entries.
sym src-tauri/src/vault/index.rs:359 method VaultIndex::is_empty(&self) -> bool L3 | Whether the index has no entries.
sym src-tauri/src/vault/index.rs:366 method VaultIndex::shape(&self) -> VaultShape L19 | Counts notes, notes with tasks, tag tree roots and pairs, and note directories.
sym src-tauri/src/vault/index.rs:389 method VaultIndex::resolve(&self, target: &str) -> Option<String> L3 | Resolves a wikilink target string to an absolute path via the resolution caches.
sym src-tauri/src/vault/index.rs:396 method VaultIndex::build_with_root(&mut self, vault_root: &str, entries: Vec<NoteEntry>) L3 | `build` for a vault at `vault_root`, the prefix every entry path starts with (no trailing `/`).
by src-tauri/src/vault/index.rs:VaultIndex::build_with_root <- src-tauri/src/commands/vault.rs:1474 in scan_vault_v2_inner lexical-method +2
sym src-tauri/src/vault/index.rs:412 method VaultIndex::build(&mut self, entries: Vec<NoteEntry>) L3 | Rebuilds the index from a fresh batch of entries.
sym src-tauri/src/vault/index.rs:502 method VaultIndex::update_entry(&mut self, entry: NoteEntry) -> UpdateResult L248 | Inserts or updates a single note's metadata in-place.
by src-tauri/src/vault/index.rs:VaultIndex::update_entry <- src-tauri/src/commands/vault.rs:343 in update_note_in_index_inner lexical-method +1
sym src-tauri/src/vault/index.rs:760 method VaultIndex::lookup_backlinks(&self, path: &str) -> Vec<NoteEntry> L11 | Returns every `NoteEntry` whose outgoing links resolve to `path`, sorted by title (case-insensitive) for stable UI ordering.
by src-tauri/src/vault/index.rs:VaultIndex::lookup_backlinks <- src-tauri/src/commands/vault.rs:494 in get_backlinks_v2 lexical-method
sym src-tauri/src/vault/index.rs:776 method VaultIndex::lookup_relationship_backlinks(&self, target_path: &str) -> Vec<RelationshipBacklink> L61 | Returns notes that reference the target note via frontmatter relationship fields (`_belongs_to`, `_related_to`, `_has_many`, or custom fields in `relationships…
by src-tauri/src/vault/index.rs:VaultIndex::lookup_relationship_backlinks <- src-tauri/src/commands/vault.rs:508 in get_relationship_backlinks_v2 lexical-method
sym src-tauri/src/vault/index.rs:859 method VaultIndex::lookup_outgoing_links(&self, path: &str) -> Vec<OutgoingLink> L17 | Returns the outgoing wikilinks of the entry at `path`, each with its resolved target path filled in via the index's resolution caches.
by src-tauri/src/vault/index.rs:VaultIndex::lookup_outgoing_links <- src-tauri/src/commands/vault.rs:527 in get_outgoing_links_v2 lexical-method
sym src-tauri/src/vault/index.rs:889 method VaultIndex::lookup_outgoing_unlinked_mentions(&self, path: &str, content: &str,) -> Vec<OutgoingUnlinkedMention> L65 | Returns notes whose names appear as plain text in `content` but are NOT already linked from `path` via wikilinks.
by src-tauri/src/vault/index.rs:VaultIndex::lookup_outgoing_unlinked_mentions <- src-tauri/src/commands/vault.rs:550 in get_outgoing_unlinked_mentions_v2 lexical-method
sym src-tauri/src/vault/index.rs:971 method VaultIndex::lookup_incoming_unlinked_mentions(&self, path: &str) -> Vec<NoteEntry> L8 | Returns every `NoteEntry` whose body contains a plain-text mention of `path`'s note name (basename without `.md`/`.markdown`) but does NOT have a wikilink to i…
sym src-tauri/src/vault/index.rs:988 method VaultIndex::unlinked_mentions_candidates(&self, path: &str) -> UnlinkedMentionsCandidates L27 | Phase 1 of the incoming-unlinked-mentions scan: produce the search term + candidate path list.
by src-tauri/src/vault/index.rs:VaultIndex::unlinked_mentions_candidates <- src-tauri/src/commands/vault.rs:609 in get_unlinked_mentions_v2 lexical-method
sym src-tauri/src/vault/index.rs:1023 method VaultIndex::lookup_entries(&self, paths: &[String]) -> Vec<NoteEntry> L6 | Phase 3 of the incoming-unlinked-mentions scan: clone the full `NoteEntry` for each path in `paths`.
by src-tauri/src/vault/index.rs:VaultIndex::lookup_entries <- src-tauri/src/commands/vault.rs:627 in get_unlinked_mentions_v2 lexical-method
sym src-tauri/src/vault/index.rs:1039 method VaultIndex::lookup_all_tags(&self) -> Vec<TagAggregate> L27 | Returns the flat list of tag aggregates (one per distinct tag, case-insensitive) sorted alphabetically.
by src-tauri/src/vault/index.rs:VaultIndex::lookup_all_tags <- src-tauri/src/commands/vault.rs:645 in get_all_tags_v2 lexical-method
sym src-tauri/src/vault/index.rs:1070 method VaultIndex::lookup_all_tasks(&self) -> Vec<FileTaskGroup> L15 | Returns every entry's tasks grouped by file, sorted by `modified_at` descending.
by src-tauri/src/vault/index.rs:VaultIndex::lookup_all_tasks <- src-tauri/src/commands/vault.rs:659 in get_all_tasks_v2 lexical-method
sym src-tauri/src/vault/index.rs:1099 method VaultIndex::remove_entry(&mut self, path: &str) -> UpdateResult L170 | Removes a single note from the index.
by src-tauri/src/vault/index.rs:VaultIndex::remove_entry <- src-tauri/src/commands/vault.rs:1252 in remove_note_from_index lexical-method +1
## locals
local src-tauri/src/vault/index.rs:87 fn note_name_from_target(target: &str) -> &str L7
local src-tauri/src/vault/index.rs:99 fn is_link_target(path: &str) -> bool L3
local src-tauri/src/vault/index.rs:109 fn canon_value_key(value: &JsonValue) -> String L3
local src-tauri/src/vault/index.rs:115 fn file_name_key(path: &str) -> String L3
local src-tauri/src/vault/index.rs:126 fn find_exact_file(candidates: &'a [String], exact: &str, vault_root: Option<&str>) -> Option<&'a String> L13
local src-tauri/src/vault/index.rs:151 fn resolve_with_cache(target: &str, cache: &HashMap<String, String>, by_file_name: &HashMap<String, Vec<String>>, vault_root: Option<&str>,)… L29
local src-tauri/src/vault/index.rs:416 fn VaultIndex::rebuild(&mut self, vault_root: Option<String>, entries: Vec<NoteEntry>) L69
local src-tauri/src/vault/index.rs:839 fn VaultIndex::resolves_to(&self, target: &str, expected_path: &str, expected_name_lower: &str) -> bool L12
## calls
call src-tauri/src/vault/index.rs:100 in is_link_target -> src-tauri/src/utils/fs.rs:is_view_filename lexical
call src-tauri/src/vault/index.rs:128 in find_exact_file -> src-tauri/src/vault/index.rs:file_name_key call
call src-tauri/src/vault/index.rs:162 in resolve_with_cache -> src-tauri/src/vault/index.rs:note_name_from_target call +1
call src-tauri/src/vault/index.rs:165 in resolve_with_cache -> src-tauri/src/vault/index.rs:find_exact_file call
call src-tauri/src/vault/index.rs:223 in match_unlinked_mentions -> src-tauri/src/vault/parsing.rs:strip_non_body_content lexical
call src-tauri/src/vault/index.rs:230 in match_unlinked_mentions -> src-tauri/src/vault/parsing.rs:find_plain_text_mention_positions lexical
call src-tauri/src/vault/index.rs:390 in VaultIndex::resolve -> src-tauri/src/vault/index.rs:resolve_with_cache call
call src-tauri/src/vault/index.rs:397 in VaultIndex::build_with_root -> src-tauri/src/vault/index.rs:VaultIndex::rebuild call
call src-tauri/src/vault/index.rs:413 in VaultIndex::build -> src-tauri/src/vault/index.rs:VaultIndex::rebuild call
call src-tauri/src/vault/index.rs:430 in VaultIndex::rebuild -> src-tauri/src/vault/index.rs:is_link_target call
call src-tauri/src/vault/index.rs:431 in VaultIndex::rebuild -> src-tauri/src/vault/index.rs:note_name_from_target call
call src-tauri/src/vault/index.rs:434 in VaultIndex::rebuild -> src-tauri/src/vault/index.rs:file_name_key call
call src-tauri/src/vault/index.rs:446 in VaultIndex::rebuild -> src-tauri/src/vault/index.rs:canon_value_key call
call src-tauri/src/vault/index.rs:517 in VaultIndex::update_entry -> src-tauri/src/vault/index.rs:VaultIndex::resolve call +1
call src-tauri/src/vault/index.rs:528 in VaultIndex::update_entry -> src-tauri/src/vault/index.rs:is_link_target call
call src-tauri/src/vault/index.rs:529 in VaultIndex::update_entry -> src-tauri/src/vault/index.rs:note_name_from_target call
call src-tauri/src/vault/index.rs:531 in VaultIndex::update_entry -> src-tauri/src/vault/index.rs:file_name_key call
call src-tauri/src/vault/index.rs:568 in VaultIndex::update_entry -> src-tauri/src/vault/index.rs:canon_value_key call +1
call src-tauri/src/vault/index.rs:792 in VaultIndex::lookup_relationship_backlinks -> src-tauri/src/vault/index.rs:VaultIndex::resolves_to call +3
call src-tauri/src/vault/index.rs:846 in VaultIndex::resolves_to -> src-tauri/src/vault/index.rs:VaultIndex::resolve call
call src-tauri/src/vault/index.rs:848 in VaultIndex::resolves_to -> src-tauri/src/vault/index.rs:note_name_from_target call
call src-tauri/src/vault/index.rs:871 in VaultIndex::lookup_outgoing_links -> src-tauri/src/vault/index.rs:VaultIndex::resolve call
call src-tauri/src/vault/index.rs:909 in VaultIndex::lookup_outgoing_unlinked_mentions -> src-tauri/src/vault/index.rs:note_name_from_target call +1
call src-tauri/src/vault/index.rs:920 in VaultIndex::lookup_outgoing_unlinked_mentions -> src-tauri/src/vault/parsing.rs:strip_non_body_content lexical
call src-tauri/src/vault/index.rs:929 in VaultIndex::lookup_outgoing_unlinked_mentions -> src-tauri/src/vault/index.rs:is_link_target call
call src-tauri/src/vault/index.rs:940 in VaultIndex::lookup_outgoing_unlinked_mentions -> src-tauri/src/vault/parsing.rs:find_plain_text_mention_positions lexical
call src-tauri/src/vault/index.rs:973 in VaultIndex::lookup_incoming_unlinked_mentions -> src-tauri/src/vault/index.rs:VaultIndex::unlinked_mentions_candidates call
call src-tauri/src/vault/index.rs:974 in VaultIndex::lookup_incoming_unlinked_mentions -> src-tauri/src/vault/index.rs:match_unlinked_mentions call
call src-tauri/src/vault/index.rs:975 in VaultIndex::lookup_incoming_unlinked_mentions -> src-tauri/src/vault/index.rs:VaultIndex::lookup_entries call
call src-tauri/src/vault/index.rs:989 in VaultIndex::unlinked_mentions_candidates -> src-tauri/src/vault/index.rs:note_name_from_target call
call src-tauri/src/vault/index.rs:1006 in VaultIndex::unlinked_mentions_candidates -> src-tauri/src/vault/index.rs:is_link_target call
call src-tauri/src/vault/index.rs:1077 in VaultIndex::lookup_all_tasks -> src-tauri/src/vault/task.rs:display_name lexical
call src-tauri/src/vault/index.rs:1152 in VaultIndex::remove_entry -> src-tauri/src/vault/index.rs:canon_value_key call
call src-tauri/src/vault/index.rs:1183 in VaultIndex::remove_entry -> src-tauri/src/vault/index.rs:file_name_key call
call src-tauri/src/vault/index.rs:1192 in VaultIndex::remove_entry -> src-tauri/src/vault/index.rs:note_name_from_target call +1
call src-tauri/src/vault/index.rs:1199 in VaultIndex::remove_entry -> src-tauri/src/vault/index.rs:is_link_target call
