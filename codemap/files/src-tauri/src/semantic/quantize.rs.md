# file card src-tauri/src/semantic/quantize.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/semantic/quantize.rs ' codemap/files
file src-tauri/src/semantic/quantize.rs rust L238 module src-tauri/src/semantic in1 t0 t:inline | Symmetric int8 quantization for the in-memory embedding cache (`SEARCH_CACHE` in `commands/semantic.rs`).
## imported-by
imp src-tauri/src/commands/semantic.rs:9 -> src-tauri/src/semantic/quantize.rs QuantizedVector
## reach
in2 src-tauri/src/semantic/quantize.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/semantic/quantize.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/semantic/quantize.rs:25 struct QuantizedVector L6 | A cached embedding stored as int8 with one symmetric per-vector scale.
by src-tauri/src/semantic/quantize.rs:QuantizedVector <- src-tauri/src/commands/semantic.rs:116 in (module) ref +1
sym src-tauri/src/semantic/quantize.rs:47 method QuantizedVector::from_f32(vector: &[f32]) -> Self L21 | Quantizes an f32 vector with a symmetric absmax scale.
by src-tauri/src/semantic/quantize.rs:QuantizedVector::from_f32 <- src-tauri/src/commands/semantic.rs:193 in get_or_load_cache lexical
sym src-tauri/src/semantic/quantize.rs:75 method QuantizedVector::dot(&self, query: &[f32]) -> f32 L23 | Similarity against an f32 query: `dot(query, values) * scale`.
