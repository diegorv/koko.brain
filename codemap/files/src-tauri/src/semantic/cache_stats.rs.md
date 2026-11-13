# file card src-tauri/src/semantic/cache_stats.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/semantic/cache_stats.rs ' codemap/files
file src-tauri/src/semantic/cache_stats.rs rust L155 module src-tauri/src/semantic in1 t0 t:inline | Resident-memory estimate for the in-memory embedding cache (`SEARCH_CACHE` in `commands/semantic.rs`).
## imported-by
imp src-tauri/src/commands/semantic.rs:3 -> src-tauri/src/semantic/cache_stats.rs self
## reach
in2 src-tauri/src/semantic/cache_stats.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/semantic/cache_stats.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/semantic/cache_stats.rs:12 struct ChunkFootprint L13 | Per-chunk sizes the caller reads off its cache entry.
by src-tauri/src/semantic/cache_stats.rs:ChunkFootprint <- src-tauri/src/commands/semantic.rs:207 in get_or_load_cache ref
sym src-tauri/src/semantic/cache_stats.rs:28 struct CacheFootprint L11 | Aggregate estimate over the whole cache.
sym src-tauri/src/semantic/cache_stats.rs:42 method CacheFootprint::total_bytes(&self) -> usize L3 | Sum of the three components.
sym src-tauri/src/semantic/cache_stats.rs:48 method CacheFootprint::describe(&self) -> String L9 | One-line summary for the load log, e.g. `~91.3 MB (vectors 87.1 MB, text 3.7 MB, overhead 0.5 MB)`.
sym src-tauri/src/semantic/cache_stats.rs:60 fn format_mb(bytes: usize) -> String L3 | Formats a byte count as `x.y MB` (decimal megabytes, one decimal).
sym src-tauri/src/semantic/cache_stats.rs:65 fn estimate_footprint(items: I) -> CacheFootprint L14 | Sums per-chunk footprints into a `CacheFootprint`.
by src-tauri/src/semantic/cache_stats.rs:estimate_footprint <- src-tauri/src/commands/semantic.rs:207 in get_or_load_cache lexical
## calls
call src-tauri/src/semantic/cache_stats.rs:51 in CacheFootprint::describe -> src-tauri/src/semantic/cache_stats.rs:CacheFootprint::total_bytes call
call src-tauri/src/semantic/cache_stats.rs:51 in CacheFootprint::describe -> src-tauri/src/semantic/cache_stats.rs:format_mb call +3
