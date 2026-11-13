# file card src-tauri/src/semantic/chunker.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/semantic/chunker.rs ' codemap/files
file src-tauri/src/semantic/chunker.rs rust L944 module src-tauri/src/semantic in1 t2 t:inline
## imports
imp src-tauri/src/semantic/chunker.rs:3 -> src-tauri/src/semantic/types.rs Chunk
## imported-by
imp src-tauri/src/commands/semantic.rs:4 -> src-tauri/src/semantic/chunker.rs chunk_markdown,ChunkOptions
## reach
in2 src-tauri/src/semantic/chunker.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/semantic/chunker.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/semantic_chunker_test.rs imports src-tauri/src/semantic/chunker.rs
test src-tauri/tests/semantic_commands_test.rs imports src-tauri/src/semantic/chunker.rs
## symbols
sym src-tauri/src/semantic/chunker.rs:6 struct ChunkOptions L16 | Options for controlling chunk size and overlap.
by src-tauri/src/semantic/chunker.rs:ChunkOptions <- src-tauri/src/commands/semantic.rs:583 in build_semantic_index_inner lexical +1
sym src-tauri/src/semantic/chunker.rs:61 fn chunk_markdown(path: &str, content: &str, options: &ChunkOptions) -> Vec<Chunk> L59 | Chunks a markdown file by heading boundaries.
by src-tauri/src/semantic/chunker.rs:chunk_markdown <- src-tauri/src/commands/semantic.rs:586 in build_semantic_index_inner lexical +1
## locals
local src-tauri/src/semantic/chunker.rs:24 fn ChunkOptions::default() -> Self L14
local src-tauri/src/semantic/chunker.rs:124 fn tail_overlap(text: &str, budget: usize) -> String L13
local src-tauri/src/semantic/chunker.rs:151 fn window_chunks(path: &str, body_lines: &[&str], start_offset: usize, options: &ChunkOptions,) -> Vec<Chunk> L69
local src-tauri/src/semantic/chunker.rs:223 fn char_index_to_byte(s: &str, char_idx: usize) -> usize L6
local src-tauri/src/semantic/chunker.rs:236 fn split_into_sections(lines: &[&str], start_line: usize) -> Vec<RawSection> L44
local src-tauri/src/semantic/chunker.rs:282 fn merge_short_sections(sections: Vec<RawSection>, min_chars: usize) -> Vec<RawSection> L19
local src-tauri/src/semantic/chunker.rs:312 fn strip_code_blocks(lines: &[String]) -> Vec<String> L32
local src-tauri/src/semantic/chunker.rs:349 fn emit_chunk(path: &str, text: &str, heading: &Option<String>, parent_headings: &[String], line_start: usize, line_end: usize, opti… L59
local src-tauri/src/semantic/chunker.rs:411 fn skip_frontmatter(lines: &[&str]) -> usize L14
local src-tauri/src/semantic/chunker.rs:429 fn heading_level(line: &str) -> Option<usize> L12
local src-tauri/src/semantic/chunker.rs:443 fn extract_heading_text(line: &str) -> String L6
local src-tauri/src/semantic/chunker.rs:451 fn hash_content(content: &str) -> String L6
local src-tauri/src/semantic/chunker.rs:459 fn hex_encode(bytes: &[u8]) -> String L3
## calls
call src-tauri/src/semantic/chunker.rs:65 in chunk_markdown -> src-tauri/src/semantic/chunker.rs:skip_frontmatter call
call src-tauri/src/semantic/chunker.rs:71 in chunk_markdown -> src-tauri/src/semantic/chunker.rs:heading_level call
call src-tauri/src/semantic/chunker.rs:73 in chunk_markdown -> src-tauri/src/semantic/chunker.rs:window_chunks call
call src-tauri/src/semantic/chunker.rs:77 in chunk_markdown -> src-tauri/src/semantic/chunker.rs:split_into_sections call
call src-tauri/src/semantic/chunker.rs:80 in chunk_markdown -> src-tauri/src/semantic/chunker.rs:merge_short_sections call
call src-tauri/src/semantic/chunker.rs:87 in chunk_markdown -> src-tauri/src/semantic/chunker.rs:strip_code_blocks call
call src-tauri/src/semantic/chunker.rs:94 in chunk_markdown -> src-tauri/src/semantic/chunker.rs:tail_overlap call
call src-tauri/src/semantic/chunker.rs:104 in chunk_markdown -> src-tauri/src/semantic/chunker.rs:emit_chunk call
call src-tauri/src/semantic/chunker.rs:130 in tail_overlap -> src-tauri/src/semantic/chunker.rs:char_index_to_byte call
call src-tauri/src/semantic/chunker.rs:158 in window_chunks -> src-tauri/src/semantic/chunker.rs:strip_code_blocks call
call src-tauri/src/semantic/chunker.rs:169 in window_chunks -> src-tauri/src/semantic/chunker.rs:emit_chunk call +1
call src-tauri/src/semantic/chunker.rs:192 in window_chunks -> src-tauri/src/semantic/chunker.rs:char_index_to_byte call +1
call src-tauri/src/semantic/chunker.rs:245 in split_into_sections -> src-tauri/src/semantic/chunker.rs:heading_level call
call src-tauri/src/semantic/chunker.rs:256 in split_into_sections -> src-tauri/src/semantic/chunker.rs:extract_heading_text call
call src-tauri/src/semantic/chunker.rs:389 in emit_chunk -> src-tauri/src/semantic/chunker.rs:hash_content call
call src-tauri/src/semantic/chunker.rs:455 in hash_content -> src-tauri/src/semantic/chunker.rs:hex_encode call
