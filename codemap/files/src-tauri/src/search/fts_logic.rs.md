# file card src-tauri/src/search/fts_logic.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/search/fts_logic.rs ' codemap/files
file src-tauri/src/search/fts_logic.rs rust L418 module src-tauri/src/search in1 t0 t:inline
## imported-by
imp src-tauri/src/commands/search_index.rs:2 -> src-tauri/src/search/fts_logic.rs extract_headings,extract_tags,extract_title,plan_reconcile,sanitize_fts_term
## reach
in2 src-tauri/src/search/fts_logic.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/search/fts_logic.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/search/fts_logic.rs:7 struct ReconcilePlan L10 | What a full-vault FTS reconcile has to do, derived from the disk state and the stored state alone.
sym src-tauri/src/search/fts_logic.rs:37 fn plan_reconcile(disk: &HashMap<String, i64>, stored: &HashMap<String, i64>) -> ReconcilePlan L22 | Diffs the disk's `path -> mtime` map against the one stored in `notes_content` and returns what has to change.
by src-tauri/src/search/fts_logic.rs:plan_reconcile <- src-tauri/src/commands/search_index.rs:72 in build_search_index_inner lexical
sym src-tauri/src/search/fts_logic.rs:61 fn extract_title(file_path: &str) -> String L7 | Extracts the title from a file path (filename without extension).
by src-tauri/src/search/fts_logic.rs:extract_title <- src-tauri/src/commands/search_index.rs:287 in rename_in_search_index_inner ref +1
sym src-tauri/src/search/fts_logic.rs:70 fn extract_headings(content: &str) -> String L19 | Extracts heading lines from markdown content.
by src-tauri/src/search/fts_logic.rs:extract_headings <- src-tauri/src/commands/search_index.rs:312 in index_entry lexical
sym src-tauri/src/search/fts_logic.rs:91 fn extract_tags(content: &str) -> String L99 | Extracts tags from markdown content (frontmatter `tags:` + inline `#tag`).
by src-tauri/src/search/fts_logic.rs:extract_tags <- src-tauri/src/commands/search_index.rs:313 in index_entry lexical
sym src-tauri/src/search/fts_logic.rs:193 fn sanitize_fts_term(term: &str) -> String L3 | Sanitizes a term for safe use in FTS5 queries.
by src-tauri/src/search/fts_logic.rs:sanitize_fts_term <- src-tauri/src/commands/search_index.rs:383 in build_fts_query lexical
