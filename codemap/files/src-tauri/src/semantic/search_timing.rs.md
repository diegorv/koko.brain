# file card src-tauri/src/semantic/search_timing.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/semantic/search_timing.rs ' codemap/files
file src-tauri/src/semantic/search_timing.rs rust L110 module src-tauri/src/semantic in1 t1 | Per-stage timing of one `search_semantic` / `search_hybrid` call, written as a single `[SEMANTIC] timing ...` log line so `grep "timing"` over a session log re…
## imported-by
imp src-tauri/src/commands/semantic.rs:11 -> src-tauri/src/semantic/search_timing.rs CacheTiming,HybridTiming,RerankTiming,SearchTiming
## reach
in2 src-tauri/src/semantic/search_timing.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/semantic/search_timing.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/semantic_search_timing_test.rs imports src-tauri/src/semantic/search_timing.rs
## symbols
sym src-tauri/src/semantic/search_timing.rs:9 struct CacheTiming L6 | Search-cache lookup (`get_or_load_cache`).
by src-tauri/src/semantic/search_timing.rs:CacheTiming <- src-tauri/src/commands/semantic.rs:839 in search_semantic ref +1
sym src-tauri/src/semantic/search_timing.rs:18 struct HybridTiming L8 | Stages only `search_hybrid` runs.
by src-tauri/src/semantic/search_timing.rs:HybridTiming <- src-tauri/src/commands/semantic.rs:1190 in search_hybrid ref
sym src-tauri/src/semantic/search_timing.rs:29 enum RerankTiming L13 | Cross-encoder rerank stage.
by src-tauri/src/semantic/search_timing.rs:RerankTiming <- src-tauri/src/commands/semantic.rs:876 in search_semantic lexical +3
sym src-tauri/src/semantic/search_timing.rs:45 struct SearchTiming L20 | Stage durations of one search.
by src-tauri/src/semantic/search_timing.rs:SearchTiming <- src-tauri/src/commands/semantic.rs:928 in search_semantic ref +1
sym src-tauri/src/semantic/search_timing.rs:69 method SearchTiming::other(&self) -> Duration L10 | `total` minus every measured stage, saturating at zero: time spent outside the named stages.
sym src-tauri/src/semantic/search_timing.rs:81 method SearchTiming::summary(&self) -> String L29 | The one-row log line, `key=value` tokens separated by spaces.
## calls
call src-tauri/src/semantic/search_timing.rs:107 in SearchTiming::summary -> src-tauri/src/semantic/search_timing.rs:SearchTiming::other call
