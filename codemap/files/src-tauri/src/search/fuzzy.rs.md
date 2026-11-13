# file card src-tauri/src/search/fuzzy.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/search/fuzzy.rs ' codemap/files
file src-tauri/src/search/fuzzy.rs rust L195 module src-tauri/src/search in1 t2 t:inline
## imports
imp src-tauri/src/search/fuzzy.rs:58 -> src-tauri/src/db/fts_repo.rs expand_vocab_terms
## imported-by
imp src-tauri/src/commands/search_index.rs:5 -> src-tauri/src/search/fuzzy.rs self
## reach
in2 src-tauri/src/search/fuzzy.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/search/fuzzy.rs 1 files in 1 modules: src-tauri/src/utils(1)
## tests
test src-tauri/tests/search_fts_test.rs imports src-tauri/src/search/fuzzy.rs
test src-tauri/tests/search_fuzzy_test.rs imports src-tauri/src/search/fuzzy.rs
## symbols
sym src-tauri/src/search/fuzzy.rs:5 fn levenshtein(a: &str, b: &str) -> usize L28 | Computes Levenshtein edit distance between two strings (case-insensitive).
sym src-tauri/src/search/fuzzy.rs:35 fn auto_distance(term: &str) -> usize L7 | Auto-selects max edit distance based on term length (character count, not bytes).
sym src-tauri/src/search/fuzzy.rs:46 fn expand_fuzzy_terms(conn: &Connection, term: &str) -> Result<Vec<String>, String> L24 | Expands a query term to include fuzzy matches from the FTS5 vocabulary.
by src-tauri/src/search/fuzzy.rs:expand_fuzzy_terms <- src-tauri/src/commands/search_index.rs:389 in build_fts_query lexical
## calls
call src-tauri/src/search/fuzzy.rs:47 in expand_fuzzy_terms -> src-tauri/src/search/fuzzy.rs:auto_distance call
call src-tauri/src/search/fuzzy.rs:58 in expand_fuzzy_terms -> src-tauri/src/db/fts_repo.rs:expand_vocab_terms lexical
call src-tauri/src/search/fuzzy.rs:64 in expand_fuzzy_terms -> src-tauri/src/search/fuzzy.rs:levenshtein call
