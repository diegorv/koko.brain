# file card src-tauri/src/utils/resource_usage.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/utils/resource_usage.rs ' codemap/files
file src-tauri/src/utils/resource_usage.rs rust L179 module src-tauri/src/utils in2 t2 | Process CPU and memory samples for the embedder's debug log.
## imports
imp src-tauri/src/utils/resource_usage.rs:16 -> src-tauri/src/utils/logger.rs debug_log,is_debug_enabled
## imported-by
imp src-tauri/src/commands/debug.rs:1 -> src-tauri/src/utils/resource_usage.rs self
imp src-tauri/src/commands/semantic.rs:18 -> src-tauri/src/utils/resource_usage.rs self,EmbedPass
## reach
in2 src-tauri/src/utils/resource_usage.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/utils/resource_usage.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/commands/debug_test.rs imports src-tauri/src/utils/resource_usage.rs
test src-tauri/tests/utils_resource_usage_test.rs imports src-tauri/src/utils/resource_usage.rs
## symbols
sym src-tauri/src/utils/resource_usage.rs:23 struct CpuUsage L8 | CPU time and major page faults of the whole process (every thread).
sym src-tauri/src/utils/resource_usage.rs:34 method CpuUsage::total(&self) -> Duration L3 | User plus system CPU time.
sym src-tauri/src/utils/resource_usage.rs:41 struct MemoryUsage L6 | Resident size and physical footprint of the process, in bytes.
sym src-tauri/src/utils/resource_usage.rs:49 fn cpu_usage() -> Option<CpuUsage> L20 | Reads the process CPU usage, or `None` off unix or when the call fails.
sym src-tauri/src/utils/resource_usage.rs:71 fn memory_usage() -> Option<MemoryUsage> L26 | Reads the process memory usage, or `None` off macOS or when the call fails.
sym src-tauri/src/utils/resource_usage.rs:109 fn describe_memory() -> String L6 | One-line memory summary: `rss X MB footprint Y MB`, or `memory n/a`.
by src-tauri/src/utils/resource_usage.rs:describe_memory <- src-tauri/src/commands/semantic.rs:241 in unload_embedder lexical
sym src-tauri/src/utils/resource_usage.rs:118 struct EmbedPass L4 | Measures one embed pass: wall time, CPU time and major faults between `start` and `finish`, plus the footprint at `finish`.
by src-tauri/src/utils/resource_usage.rs:EmbedPass <- src-tauri/src/commands/semantic.rs:670 in build_semantic_index_inner lexical +1
sym src-tauri/src/utils/resource_usage.rs:125 method EmbedPass::start() -> Self L6 | Samples the clock and CPU usage at the start of a pass.
by src-tauri/src/utils/resource_usage.rs:EmbedPass::start <- src-tauri/src/commands/semantic.rs:670 in build_semantic_index_inner lexical +1
sym src-tauri/src/utils/resource_usage.rs:135 method EmbedPass::finish(&self) -> String L18 | Returns the pass line, e.g. `wall 1.78s cpu 6.20s (3.5x wall) majflt +0 rss 1010.3 MB footprint 1029.1 MB`.
sym src-tauri/src/utils/resource_usage.rs:159 fn periodic_sampler_started() -> bool L3 | Returns whether the periodic memory sampler thread is running.
sym src-tauri/src/utils/resource_usage.rs:166 fn ensure_periodic_sampler() L14 | Starts the periodic memory line (`[RESOURCES] rss X MB footprint Y MB` every 10 s) on its own thread.
by src-tauri/src/utils/resource_usage.rs:ensure_periodic_sampler <- src-tauri/src/commands/debug.rs:15 in set_tauri_debug_mode lexical
## locals
local src-tauri/src/utils/resource_usage.rs:99 fn mb(bytes: u64) -> String L3
local src-tauri/src/utils/resource_usage.rs:104 fn format_memory(m: MemoryUsage) -> String L3
## calls
call src-tauri/src/utils/resource_usage.rs:105 in format_memory -> src-tauri/src/utils/resource_usage.rs:mb call +1
call src-tauri/src/utils/resource_usage.rs:110 in describe_memory -> src-tauri/src/utils/resource_usage.rs:memory_usage call
call src-tauri/src/utils/resource_usage.rs:111 in describe_memory -> src-tauri/src/utils/resource_usage.rs:format_memory call
call src-tauri/src/utils/resource_usage.rs:128 in EmbedPass::start -> src-tauri/src/utils/resource_usage.rs:cpu_usage call
call src-tauri/src/utils/resource_usage.rs:138 in EmbedPass::finish -> src-tauri/src/utils/resource_usage.rs:cpu_usage call
call src-tauri/src/utils/resource_usage.rs:147 in EmbedPass::finish -> src-tauri/src/utils/resource_usage.rs:memory_usage call
call src-tauri/src/utils/resource_usage.rs:149 in EmbedPass::finish -> src-tauri/src/utils/resource_usage.rs:format_memory call
call src-tauri/src/utils/resource_usage.rs:173 in ensure_periodic_sampler -> src-tauri/src/utils/logger.rs:is_debug_enabled lexical
call src-tauri/src/utils/resource_usage.rs:174 in ensure_periodic_sampler -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/utils/resource_usage.rs:174 in ensure_periodic_sampler -> src-tauri/src/utils/resource_usage.rs:describe_memory call
## effects
fx src-tauri/src/utils/resource_usage.rs:172 rust-timer.sleep in ensure_periodic_sampler
