# G: Background embedder re-embeds whole notes, 22 s outlier, RSS 1.0-1.6 GB (deep dive)

Read-only investigation, 2026-11-02. Log: `~/Library/Logs/com.diegorv.kokobrain/2026-11-02_14-52-43.log`
(only this log was grepped). Tags: VERIFIED = read in code or log; INFERRED = reasoned, not observed.
Simulation: `/tmp/ui-resp-bench/G/chunk-sim.mjs` (a JS port of the heading path of
`src-tauri/src/semantic/chunker.rs` plus the diff in `commands/semantic.rs:1233-1245`), run on the
one vault file the task names (`vault/notes/2026/11-Nov/_journal-day-02-11-2026.md`).
Paths are relative to `src-tauri/src/` unless they start with `src/`.

## Summary

- The embedder never runs on the webview thread or the app main thread. `update_semantic_file` is
  `async` and runs its body on `spawn_blocking` (`commands/semantic.rs:1210-1216`). ORT workers run
  at utility QoS (`semantic/qos.rs:124-141`). The heartbeat logged 0 stalls during 8 of the 9
  embed passes. All 7 stalls fall inside the one slow pass, next to tab-open bursts. VERIFIED.
  G is a CPU, memory and staleness problem, not a UI freeze. **impact 3/10.**
- Root cause 1 (VERIFIED, reproduced in simulation): a chunk's identity is
  `path#heading-slug-<absolute line_start>` (`semantic/chunker.rs:395`, line numbers from
  `:242`, `:262`). The diff matches by key (`commands/semantic.rs:1238-1241`). So adding one
  frontmatter line, or pressing Enter above a heading, renames every later chunk, and each one is
  re-embedded even though its text and `content_hash` did not change.
  - The two 6-of-6 day-02 saves at 17:54:37 and 17:54:38 were exactly this. Their snapshot sizes
    (3140, 3163, 3184 bytes) match the note with its `life_track_energy: "3"` and
    `life_track_mood: "4"` frontmatter lines removed one at a time (meta-bind trackers).
  - Simulation: each of those saves is 6 to embed today and 0 with hash-matched reuse.
- Root cause 2 (VERIFIED from code and log timing): calls overlap. Each call reads the stored
  hashes (`:1233`) before it waits on `EMBEDDER` (`:1264-1266`) and commits only after its embed
  (`:1299`). A call queued behind an embed therefore diffs against pre-commit rows.
  - create + watcher both embedded week-40 and week-43 in full (4 passes, 2 redundant).
  - The day-02 save at 17:54:38 re-embedded 6 of 6.
  - `std::sync::Mutex` is not FIFO. The week-40 watcher call, queued at 17:54:54.04, ran last
    (17:55:07), after two week-43 calls queued later. So for one path an older content can commit
    after a newer one (INFERRED correctness risk, self-healing on the next save).
- Waste in this 4.5-minute session: 9 passes and 47 chunk embeds. Fixes 1 and 2 remove 4 passes
  and 24 chunks (51%), 27.8 s of 34.4 s embed wall time (81%; 6.3 of 12.9 s, or 49%, without the
  outlier).
- The 21.5 s pass (17:54:37.583 to 17:54:59.105, shape [6,458]; the next identical shape took
  1.78 s) is inside `embed_batch`. Nothing in the app explains it. RSS stayed at 1,010-1,029 MB
  for 16 s of it, then reached 1,415 MB after it. INFERRED: the session was barely scheduled, or
  was paging its weights back in, under external CPU or memory pressure. Not provable from this
  log, so instrument it first (fix 4).
- RSS: `init_semantic_search` loads the model eagerly at vault open (`:373-374`). The no-change
  startup build returns before any unload or idle timer (`:543-553`). Only an embed or search
  arms the 120 s timer (`:1289`, `:802`, `:962`). So the ~1.3 GB model stays resident for the
  whole session if no note is edited. With edits, every save re-arms the timer. VERIFIED.

## Evidence

### Code (VERIFIED)

- Trigger: `registerSearchIndexHook` fires `update_semantic_file` on every `.md` save, fire and
  forget (`src/lib/features/search/search.service.ts:301-330`, IPC at `:327`). `notifyAfterSave`
  calls `applyNoteChange` with `source: 'save'` and no `vaultPath`
  (`src/lib/core/editor/editor.hooks.ts:81`). So the owner's semantic leg
  (`src/lib/core/filesystem/note-change.service.ts:242-253`) does not fire on save. It fires for
  watcher, create, fs and restore, and it is not gated by `SOURCE_POLICY` or the dedupe map.
- Save cadence: body 2000 ms debounce, 10 s maxWait (`src/lib/core/editor/editor.service.ts:202`).
  Frontmatter 500 ms (`:205`).
- `create` has `mark: false` (`note-change.service.ts:90`), so the watcher echo of a created note
  is not a dedupe hit. The watcher self-save guard only knows saves
  (`src/lib/app/lifecycle/watcher-handler.service.ts:41`). The log shows
  "Incremental update for 1 file(s)" for both created notes (17:54:54.026, 17:54:57.712).
- Diff and lock order inside the `spawn_blocking` closure:
  1. chunk (`commands/semantic.rs:1218`)
  2. read `key -> hash` (`:1233-1235`)
  3. key-matched diff (`:1237-1248`)
  4. if anything changed: utility QoS (`:1261`), `ensure_embedder_loaded` (blocks on `EMBEDDER`,
     `:242-247`), `EMBEDDER.lock()` (`:1266`), "File update" log (`:1283`), `embed_batch`
     (`:1285`), drop (`:1288`)
  5. transaction (`:1299-1330`), mtime (`:1333`), full search-cache invalidation (`:1335`)
- `content_hash` is the hash of `embed_text()` (`semantic/chunker.rs:380-389`,
  `semantic/types.rs:117-136`). Equal hash means equal model input. A stored vector whose hash
  matches is therefore exactly the vector a new embed would produce, whatever its key.
- Frontmatter is outside chunk text (`semantic/chunker.rs:65`, `skip_frontmatter` `:411-424`),
  but line numbers count from the top of the file (`:242`, `:262`). Headless notes use a
  synthetic `start_offset + 1 + window_idx` (`:174`, `:196-198`), which also moves with
  frontmatter lines.
- Inference: `embed_batch` -> `run_inference` -> tokenize (rayon, used by no app code: grep finds
  `rayon` only in a comment at `semantic/embedder.rs:17`) -> `session.run` (`:189-202`) -> the
  "Output" log (`:214`). 4 intra-op threads (`:18-20`), spinning off (`semantic/mod.rs:46`),
  utility QoS workers (`semantic/embedder.rs:26-30`, `semantic/qos.rs:124-141`).

### Log, `2026-11-02_14-52-43.log` (VERIFIED)

| lock taken ("File update") | output | wall | shape | file / source | needed? |
|---|---|---|---|---|---|
| 17:53:01.239 | 01.908 | 0.67 s | [5,234] | day-02 save (1888 B) | yes |
| 17:53:06.718 | 07.851 | 1.13 s | [4,454] | day-02 save (3112 B) | partly (line shift) |
| 17:53:10.345 | 10.956 | 0.61 s | [2,458] | day-02 save (3120 B) | partly |
| 17:54:37.583 | 59.105 | **21.52 s** | [6,458] | day-02 save 3163 B (+`life_track_energy`) | **no**, 0 text change |
| 17:54:59.106 | 00.883 | 1.78 s | [6,458] | day-02 save 3184 B (+`life_track_mood`) | **no**, 0 text change |
| 17:55:00.884 | 02.808 | 1.92 s | [6,343] | week-40 (create or watcher) | one of two |
| 17:55:02.809 | 05.016 | 2.21 s | [6,343] | week-43 | one of two |
| 17:55:05.017 | 07.344 | 2.33 s | [6,343] | week-43 | duplicate |
| 17:55:07.346 | 09.581 | 2.24 s | [6,343] | week-40 | duplicate |

- Skips work when calls do not overlap: 9 "all N chunks unchanged" lines (e.g. 17:54:36.552).
- 13 "Search cache invalidated" lines, 0 cache loads (no semantic search ran; the default mode is
  `'text'`, `src/lib/features/search/search.store.svelte.ts:21`).
- Heartbeat stalls: 17:54:37.182 (307), 42.076 (336), 50.362 (462), 50.708 (346), 51.605 (356),
  53.825 (430), 54.458 (358). None from 17:53:01 to 17:53:11 (3 embeds) or 17:54:59 to 17:55:10
  (5 back-to-back embeds). In the slow window the log shows 31 `docReplace` and 15
  `openFileInEditor` calls, but only two Rust actions longer than 5 ms: full `scan_vault` at 281 ms
  and 273 ms (finding B).
- RSS (host process only, `commands/debug.rs:17-31`): 283.3 MB (17:52:43) -> model load
  17:52:46.749-47.591 -> 1,577.5 (17:53:44) -> 1,010.3 (17:54:54, mid slow pass, nothing
  unloaded) -> 1,029.1 (17:54:57) -> 1,415.0 (17:55:16) -> unload at 17:57:09.746, exactly 120 s
  after the last embed.

### Simulation (`/tmp/ui-resp-bench/G/chunk-sim.mjs`, VERIFIED by run)

The port produces the logged 6 chunks for the 3184-byte note: H1-10, morning-16, intention-24,
reflection-72, body-&-mind-78, tomorrow-prep-86. Removing frontmatter lines reproduces the logged
byte sizes exactly:

| transition | embed today (key match) | embed with hash reuse |
|---|---|---|
| 3140 -> 3163 (+`life_track_energy` line) | 6 | 0 |
| 3163 -> 3184 (+`life_track_mood` line) | 6 | 0 |
| 3140 -> 3184 (stale snapshot, the overlap race) | 6 | 0 |
| blank line under the H1 (one Enter) | 6 | 1 |
| change a frontmatter value, same line count | 0 | 0 |

Limit: the port omits the >3000-char truncation edge and the headless path. Neither applies to
this note.

## Root cause

1. **Line-keyed chunk identity plus a key-matched diff.** `update_semantic_file` treats a renamed
   key as a new chunk (`commands/semantic.rs:1238-1241`). It also already holds a hash that would
   prove the vector unchanged. Any edit that changes the line count above a section (a meta-bind
   tracker writing a new frontmatter key, a template insert, an Enter) re-embeds every later chunk.
   On a daily note with trackers, that is the whole note on every new tracker.
2. **Read-diff before lock, commit after embed, no per-path ordering.** Concurrent calls for one
   path diff against the same stale rows. The 500 ms frontmatter debounce and the
   create-then-watcher echo produce them by design. Each overlapping call repeats the full embed.
   Commit order follows a non-FIFO mutex, not save order.
3. **No unload on the idle startup path.** The model load at vault open (`:373-374`) is never
   paired with an idle timer when the startup build finds no changes (`:543-553`).
4. **Outlier, cause unknown.** 21.5 s for a pass that takes 1.8 s. Candidates, all INFERRED:
   - utility-QoS workers starved by other load on the Mac
   - the weights compressed or swapped while idle for 87 s (the 567 MB RSS drop with no free
     path in code, then a slow climb during the pass)
   - both of the above

   A plain in-app cause is ruled out: no lock wait (the lock is taken before the log line), no
   model reload, no first-shape cost, and no heavy Rust work in the window.

## Impact

- **Thread:** background (`spawn_blocking` plus 4 ORT utility-QoS workers). No direct
  webview-thread or main-thread blocking from the save path. VERIFIED.
- **CPU:** one pass is ~0.6-2.3 s of 4-thread inference. Writing a journal with trackers
  triggers a full-note pass for each new tracker line, and any Enter re-embeds all later chunks.
  Overlapping saves double that. The machine-wide cost is real (utility QoS keeps it off the P
  cores only when they are busy), but this log shows no UI stall correlated with it.
- **Memory:** about +1.0-1.3 GB RSS while the model is resident, which after startup is always
  (root cause 3). This adds to system memory pressure, the likely amplifier of the 21.5 s outlier.
  A re-key-only save after an idle unload reloads the model (0.84 s, +1 GB) just to recompute
  identical vectors.
- **User-visible, indirect** (VERIFIED code paths, not observed in this log):
  - Semantic or hybrid search issued during an embed blocks in `ensure_embedder_loaded`
    (`:788`, `:952` -> `:245`) until the in-flight embed ends. A non-FIFO mutex can make it wait
    for several queued embeds. Then `try_lock` (`:792`, `:954`) can fail with "temporarily
    unavailable". Only for users who switch the search mode to semantic or hybrid.
  - Every embed drops the whole search cache (`:1335`). The next semantic search reloads all
    156,860 chunks holding the DB mutex and `SEARCH_CACHE` (`:152-194`). Sync main-thread commands
    that take the DB mutex (`save_snapshot`, `commands/history.rs:56-77`, on every save;
    `get_semantic_file_status`, `:1144-1154`, on tab change) wait for it. The scouts report an
    11.5 s reload in another session; that log was not re-checked here.
  - Vault switch during an embed: `shutdown_semantic` is sync (`:1158-1170`) and blocks the main
    thread on `EMBEDDER` (`:1162`) until the embed ends.
  - Semantic results lag the editor by up to the queue length (about 30 s in this window).
- **Frequency:** daily for the owner (daily-note trackers through meta-bind, see the owner
  feature-usage memory). The 21.5 s outlier appeared once in this session.
- **Magnitude:** about 2x the needed embed work on edit-heavy notes; +1.3 GB resident.
- **impact_score 3:** background cost with no measured UI freeze. Higher only if fix 4 shows the
  outlier comes from the app's own memory footprint.

## Fixes (ranked by gain)

### 1. Reuse stored vectors by content hash (quick-win)

- **Change.** In `update_semantic_file`, read `key, content_hash, embedding` for the path (one new
  repo fn next to `get_chunk_hashes_for_path`, `db/semantic_repo.rs:136`). Plan in three groups:
  - unchanged: key and hash match. No write.
  - re-key: the hash exists under another key. Write the row with the new key and lines and the
    old blob.
  - embed: new hash.

  `keys_to_delete` stays as it is. Take `ensure_embedder_loaded` and `EMBEDDER` only when the
  embed group is non-empty. Put the planner in a pure fn (`semantic/` module) so it is
  unit-testable.
- **Gain.** In this session, 12 of 47 chunk embeds (2 passes, 23.3 s wall) become a ~1 ms row
  rewrite. Generally, an edit costs only the edited chunk (+1 for overlap) instead of every later
  chunk. Re-key-only saves no longer reload an unloaded model.
- **Files.** `src-tauri/src/commands/semantic.rs:1231-1330`, `src-tauri/src/db/semantic_repo.rs`,
  new planner in `src-tauri/src/semantic/` (e.g. `update_plan.rs`),
  `src-tauri/tests/semantic_commands_test.rs`.
- **Risks.**
  - The DB end state equals today's (same keys, `line_start`, `line_end`, `content`). Only the
    vector is copied instead of recomputed, and it is bit-identical in theory (deterministic
    model; tiny float drift across runs aside).
  - Duplicate hashes inside one file (identical sections) map to the same vector, which is
    correct.
  - Model change: `check_and_update_model_hash` clears chunks on model change, so a stale-model
    blob cannot be reused. Verify that path still runs before any update.
  - Recipe changes already flow through `content_hash` (`types.rs:131-133`).
  - Still invalidates the search cache when rows change (`line_start` moved).
  - No TS change, so the `applyNoteChange` ownership and the `save`-stays-synchronous invariant
    are untouched.
- **Test (failing first, no ONNX needed).**
  - In `semantic_commands_test.rs`, seed rows for content A with `chunk_markdown` and dummy blobs,
    with no model loaded, the same pattern as
    `update_semantic_file_unchanged_hashes_skip_embedding_entirely` (`:594`).
  - Call `update_semantic_file` with A plus one extra frontmatter line.
  - Today it reaches `ensure_embedder_loaded` and returns Err. Expected after the fix: `Ok`, rows
    re-keyed to the new `line_start`, blobs byte-equal to the seeds, old keys gone.
  - Plus planner unit tests: Enter above section k re-keys k+1..n and embeds at most 2.

### 2. Serialize each update end to end, latest wins per path (small)

- **Change.** Add a `static SEMANTIC_WRITE: Mutex<()>` held from the hash read through the commit
  and mtime write. Add a `HashMap<path, u64>` generation map:
  - Bump the path's generation on entry.
  - After taking `SEMANTIC_WRITE`, return `Ok(())` if a newer generation for the path is queued.
  - `remove_semantic_file` (`:1188-1206`) bumps the generation and takes the same lock, so a
    queued update cannot resurrect a deleted note.
- **Gain.**
  - The create + watcher echo becomes one embed plus a hash skip (2 passes, ~4.5 s here).
  - The stale-snapshot 6-of-6 disappears.
  - Bursts collapse to the newest content per path.
  - Commit order follows save order, which removes the stale-row risk.
- **Files.** `src-tauri/src/commands/semantic.rs` (`update_semantic_file`,
  `remove_semantic_file`), `src-tauri/tests/semantic_commands_test.rs`, a pure coalescer
  unit-tested with an injected closure (as `.scratch/embedder-burst-cpu/issues/04` sketches).
- **Risks.**
  - Lock order becomes `SEMANTIC_WRITE` -> DB, then `SEMANTIC_WRITE` -> `EMBEDDER`. The build
    takes `EMBEDDER` and DB but never `SEMANTIC_WRITE`, so no cycle; verify that no caller takes
    `EMBEDDER` while holding the DB mutex.
  - Cheap hash-skip calls for other paths now wait behind an in-flight embed (background only).
  - `update_semantic_file` still ignores `BUILD_LOCK`; decide whether a running build should defer
    updates.
  - A superseded call returns `Ok` with no work. Log it at debug level so the CLAUDE.md "never
    silently swallow" rule holds (it is not an error).
  - Interacts with issue `embedder-memory/02` (silent `Ok` when unloaded between load and lock,
    `:1266-1273`): fold the load into the same guard while touching this code.
- **Test.** Pure coalescer tests for latest-wins, delete-while-pending and the generation bump.
  An integration test that spawns two `update_semantic_file` calls for one path with a seeded DB
  and no model. With fix 1 in place both are re-key-only. Assert the final rows equal the newer
  content's plan.

### 3. Arm the idle unload on the startup paths (quick-win, after embedder-memory/07)

- **Change.** Call `schedule_embedder_unload()` after `init_semantic_search` loads the model
  (`:373-375`) and in the no-change build branch (`:543-553`). The changed branch already unloads
  (`:761`).
- **Gain.** About 1.0-1.3 GB RSS released 120 s after vault open in sessions with no edits. In
  this session the model was resident from 17:52:47; with no edit it would have stayed resident
  all session.
- **Files.** `src-tauri/src/commands/semantic.rs`.
- **Risks.**
  - A build started after the unload hits `embedder-memory/07` ("Embedder not initialized", the
    batch closure at `:643-644` never loads), so land 07 first.
  - The first save or search after the unload pays a 0.84 s background reload.
  - `MODEL_AVAILABLE` stays true (`:33-36`), so the UI status is unaffected.
- **Test.** Expose a read-only `embedder_unload_generation()` (or reuse `UNLOAD_GENERATION`
  through a test hook). Assert it advances after a no-change `build_semantic_index` run. That
  needs a fixture vault whose mtimes all match; check whether `semantic_commands_test.rs` can
  build one without a model. If it cannot, the gate is manual: watch for the "Embedder unloaded"
  log line about 120 s after an idle open.

### 4. Instrument the embed (quick-win, diagnosis)

- **Change.** Around `embed_batch` (`:1285`), log the following deltas from `proc_pid_rusage`
  (`RUSAGE_INFO_V4`):
  - `ri_user_time` and `ri_system_time` (process CPU)
  - `ri_pageins`
  - `ri_phys_footprint`

  Add the shape and wall time. One line per pass. macOS only; a no-op elsewhere, like `qos.rs`.
- **Gain.** Decides the 21.5 s outlier:
  - CPU about normal (~6 CPU-s) with 10x wall time means scheduling starvation, so revisit
    utility QoS.
  - High page-ins or a dropped footprint means memory pressure, so revisit residency (fix 3,
    fix 6).
  - It also gives `.scratch/embedder-burst-cpu/01` its owed before/after measurement.
- **Files.** `src-tauri/src/semantic/` (small `rusage.rs`), `src-tauri/src/commands/semantic.rs`.
- **Risks.** An FFI struct layout mistake; keep it behind `cfg(target_os = "macos")` with a unit
  test that two consecutive reads are monotone.
- **Test.** A unit test that the reader returns non-decreasing user time across a busy loop.

### 5. Patch the search cache in place instead of dropping it (medium)

- **Change.** On update or remove, rebuild the `Arc<Vec<CachedChunk>>` by filtering out the
  path's rows and appending the new quantized rows, instead of `*cache = None` (`:144-149`,
  `:1335`). Keep the full drop for builds, model change and shutdown.
- **Gain.** The first semantic or hybrid search after a save skips the full 156,860-chunk reload:
  the reported 11.5 s, ~0.6 GB transient f32 (INFERRED), and the DB-mutex hold that can stall
  sync main-thread commands.
- **Files.** `src-tauri/src/commands/semantic.rs`.
- **Risks.**
  - The cache must equal a fresh load. Test the patch against a reload.
  - Concurrency with an in-flight `get_or_load_cache`: patch under the `SEARCH_CACHE` lock, and
    skip when the cache is `None`.
  - Only benefits semantic or hybrid users (the default is text).
- **Test.** Seed the DB, load the cache, update one file (re-key path from fix 1, no model).
  Assert the cache contents equal a fresh `get_or_load_cache` after an invalidate.

### 6. ORT memory tuning (medium, measurement-gated)

- **Change.** Try `with_memory_pattern(false)`, arena off, or padding `max_len` to a multiple of
  64 (`semantic/embedder.rs:149-152`). Compare footprint and per-pass time with fix 4's
  instrumentation.
- **Gain.** Unknown. It can only lower the plateau of the 1.0-1.6 GB.
- **Risks.** Slower inference.
- **Test.** Manual A/B with the fix 4 numbers.

Not recommended without fix 4 data: reverting utility QoS (`993c3257`) or spinning off
(`82929d8d`). The outlier cannot yet be pinned on either.

## Quick wins

1. Fix 1, hash-matched vector reuse. The biggest gain, with a failing-first test that needs no
   model.
2. Fix 4, per-pass rusage line. Diagnoses the 21.5 s outlier and pays the measurement
   `embedder-burst-cpu/01` still owes.
3. Fix 3, unload on the startup paths. Lands after `embedder-memory/07`.

## Open questions

- What caused the 21.5 s? Needs fix 4 data from a session that reproduces it. This log has no
  per-thread CPU or page-in counters.
- RSS reads `process.memory()` from sysinfo 0.39.6. That it is `pti_resident_size`, which
  excludes compressed pages (explaining the 567 MB drop with nothing freed), is from memory, not
  checked against sysinfo source.
- The model file size (~568 MB for Xenova bge-m3 `model_quantized.onnx`) is from memory. The
  model dir (`<vault>/.kokobrain/models/bge-m3/`, `semantic/model.rs:67-75`) was not listed
  because the task does not name it.
- Should the semantic leg wait for a running `build_semantic_index` (`BUILD_LOCK`) instead of
  interleaving?
- Vault switch during a queued update: `shutdown_semantic` then `close_vault_db` run while
  `spawn_blocking` updates are parked. Can a parked update commit into the next vault's DB once
  it opens? Not traced.
- Is the 500 ms frontmatter debounce still right for meta-bind tracker clicks? With fix 1 it no
  longer costs embeds, only FTS and history writes.

Not checked: no app run, cargo, test, or DB query. The simulation is a port, not the Rust
chunker; it matches the logged chunk count and byte sizes but was not diffed against
`chunk_markdown` output.
