# Issue 07 discovery

No `spec.md` in the feature folder; plan from the Issue. Rust-only (gate: `cargo test`).

## Files and plan (one commit per item)

1. Idle unload: `src-tauri/src/commands/semantic.rs:543-553` (no-change branch of `build_semantic_index_inner`) calls `schedule_embedder_unload()` before returning. Seam: a `pub fn embedder_unload_generation() -> u64` reading `UNLOAD_GENERATION` (same shape as `qos::utility_workers_started`). Test in `tests/semantic_commands_test.rs`: one note on disk, its real mtime stored via `upsert_mtimes`, no model; the generation after the build is greater than before. The fixture works without a model, so no manual check is needed.
2. Resource line: new `src-tauri/src/utils/resource_usage.rs`.
   - `cpu_time()` from `getrusage(RUSAGE_SELF)` (user + sys timevals) and `major_faults()` (`ru_majflt`), `cfg(unix)`.
   - `memory()` from `proc_pid_rusage(RUSAGE_INFO_V4)`: `ri_resident_size` and `ri_phys_footprint` (bytes, no tick trap), macOS only, `None` elsewhere.
   - `EmbedPass::start()` / `.finish()` returns one line: wall, CPU, CPU/wall, major faults, footprint. Wrapped around both `embed_batch` sites (`semantic.rs:642-646` build batch, `:1285` file update) and logged under `EMBEDDER`.
   - `log_memory(label)` after `unload_embedder` logs "Embedder unloaded" (`:231-238`).
   - `ensure_periodic_sampler()`: one `std::thread` (started once, from `set_tauri_debug_mode(true)` in `commands/debug.rs`), wakes every 10 s and logs only while `is_debug_enabled()`.
   - Adds `libc = "0.2"` to `Cargo.toml` (already in `Cargo.lock` at 0.2.191, so no new download).
   - Test: `tests/resource_usage_test.rs` (own process, less noise): CPU delta across a 100 ms spin is >= 50 ms and <= wall x cores x 2 (a unit error is 1000x); non-decreasing across samples; on macOS `memory()` is Some and > 0.
3. Vector reuse: new pure planner `src-tauri/src/semantic/update_plan.rs`: `plan_file_update(existing: &HashMap<key, hash>, chunks: &[Chunk]) -> UpdatePlan { embed, reuse: Vec<(&Chunk, source_key)>, delete }`. Same key + same hash stays untouched; otherwise a matching hash on any old row of the path is reuse; else embed. `update_semantic_file` (`semantic.rs:1233-1299`) reads the reuse source blobs with a new `semantic_repo::get_chunk_embeddings(conn, keys)` before embedding (a source gone by then falls back to embed), then the one transaction deletes, inserts reused rows, inserts embedded rows.
   - Tests: planner unit tests in `tests/semantic_update_plan_test.rs` (written first, fail first); repo fn test in the `semantic_repo.rs` module; command test in `semantic_commands_test.rs` copying `:594-648`: a blank line added above a heading re-keys the chunks, no model, call returns Ok and the new keys carry the prior bytes.

## Defaults taken

- `embedded_at` for re-keyed rows: keep the source row's timestamp. The vector was computed then, and today's unchanged-hash skip also leaves `embedded_at` alone, so "last embedded" keeps meaning "last ONNX run for this file".
- Reuse stays in `update_semantic_file` (the lines the Issue cites). `build_semantic_index`'s changed-file path still re-embeds every chunk of a changed file; out of scope.
- RSS is `ri_resident_size` from the same `proc_pid_rusage` call (no sysinfo on this path).

## Risks

- `RUSAGE_SELF` counts every thread, so the CPU test bounds are loose on purpose.
- Two old rows with the same hash: any one is a valid source (same `embed_text`, same model).
- Not verified: the model's real RSS share (the Issue's "1.0-1.3 GB" is inferred).
