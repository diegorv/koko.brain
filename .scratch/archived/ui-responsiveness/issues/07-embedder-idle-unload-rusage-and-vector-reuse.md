# 07: The embedder unloads after an idle open, reports its CPU cost, and reuses vectors whose text did not change

**Status:** resolved

Priority: P3 (background CPU and memory; no measured UI freeze)

**What to build:**

1. **Idle unload after a no-change build** (quick win): call `schedule_embedder_unload()` in the no-change branch of `build_semantic_index` (`src-tauri/src/commands/semantic.rs:543-553`). `init_semantic_search` loads the model (`:373-374`), and today only the changed branch unloads (`:761`), so an idle open keeps the model resident. Arming it in init too is redundant: both callers run the build right after init (`app-lifecycle.service.ts:450-464`, `SearchSection.svelte:78-81`).
2. **Per-pass resource line** (diagnostic quick win): around `embed_batch` (`semantic.rs:1285`), log CPU time and major faults from `getrusage(RUSAGE_SELF)` (timeval units), plus `phys_footprint`. Do not use `proc_pid_rusage` `ri_*_time` for CPU: on Apple silicon those may be Mach ticks, not ns (from memory, unchecked; convert with `mach_timebase_info` if used). Add one RSS sample right after "Embedder unloaded" and a periodic one (every 10 s) from a Rust thread gated by `DEBUG_ENABLED` (`src-tauri/src/utils/logger.rs:11`), so this Issue stays Rust-only. This decides whether the 21.5 s pass at 17:54:37 was CPU starvation or paging.
3. **Hash-matched vector reuse:** chunk keys include the absolute `line_start` (`semantic/chunker.rs:395`) and the diff matches by key (`semantic.rs:1238-1242`), so any newline above a heading re-embeds every later chunk although its `content_hash` is unchanged. 51% of chunk embeds and 81% of embed wall time in the baseline session were avoidable. Reuse the stored vector for a new key whose `content_hash` matches an old row of the same path. Decide `embedded_at` for re-keyed rows (it drives the status-bar "last embedded", `:1144-1154`).

**Blocked by:** none

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` (Rust)

**Source:** src-tauri/src/commands/semantic.rs:340-343,373-374,543-553,761,1144-1154,1233-1299, src-tauri/src/semantic/chunker.rs:242,262,380-395, src-tauri/src/semantic/qos.rs, src-tauri/tests/semantic_commands_test.rs:594-648

- [x] The unload generation advances after a no-change build, if `semantic_commands_test.rs` can build an all-mtimes-match fixture without a model; otherwise record the manual check ("Embedder unloaded" about 120 s after an idle open)
- [x] Unit test: reported CPU time is non-decreasing across a busy loop and in the expected unit (compare with the wall time of a 100 ms spin)
- [x] Failing first: a pure planner given old rows and new chunks returns reuse for a re-keyed chunk with a matching hash and embed for a changed one, with no model (pattern at `semantic_commands_test.rs:594-648`)
- [x] Not verified by the agent: the model's real RSS share (the "1.0-1.3 GB" figure is inferred)

## Notes

- The reuse is safe for a reason the deep dive got wrong: recipe changes do not change `content_hash`. Today's unchanged-hash skip already keeps old vectors under the same conditions, and the startup build clears all chunks on a recipe change (`semantic.rs:500-507`).
- Serializing overlapping `update_semantic_file` calls (read hashes and commit under one `EMBEDDER` guard) belongs to the existing `.scratch/embedder-memory/issues/03-double-semantic-embed-per-save.md`, not here. A comment there records this session's evidence.
- The deep dive lists `embedder-memory/07` (`shutdown_semantic` does not clear `VAULT_PATH`) as a risk for item 1; the verifier rates it small because `schedule_embedder_unload` re-arms while `BUILD_LOCK` is held (`semantic.rs:340-343`).
- Related open Issues: `embedder-memory/02`, `embedder-memory/07`, `embedder-burst-cpu/04`.
- Research: `.scratch/ui-responsiveness/research/G-deep-dive.md`, `G-verify.md`.

## Comments

- 2026-11-02, branch `issue/07-embedder-idle-unload-rusage-and-vector-reuse`: the embedder unload is scheduled after a no-change build, debug mode starts a periodic CPU/RSS sampler (`getrusage`), and `update_semantic_file` reuses stored vectors for re-keyed chunks with a matching hash. Review round 1 APPROVED with four findings, fixed (hash-checked `get_chunk_embedding`, `periodic_sampler_started()` test, CPU floor `wall / 10`, `finish()` skipped when debug is off); round 2 APPROVED with no findings. Full suite at 28d8c08e: exit=0, vitest 444 files / 10195 tests, build ok, cargo tests 0 failed.
