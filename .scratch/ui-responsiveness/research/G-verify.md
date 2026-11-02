# G verify: adversarial review of G-deep-dive.md

Read-only, 2026-11-02. I re-read the code and grepped only `2026-11-02_14-52-43.log`. I did not
open the vault note (my task names no vault path), so the frontmatter-line reading of the
day-02 sizes is checked against byte deltas only. Paths are relative to `src-tauri/src/` unless
they start with `src/` or `.scratch/`.

**Verdict: partially confirmed.** Root causes 1-3 hold. The waste arithmetic holds. Impact 3 holds.
Corrections below: one wrong safety argument for fix 1, overstated RSS attribution, three small
log misreads, a units trap in fix 3 (rusage), and two related open issues the report does not cite.

## Root cause

### RC1, line-keyed identity: CONFIRMED

- Key is `format!("{}#{}-{}", path, heading_slug, line_start)` (`semantic/chunker.rs:395`).
  `line_start` is the absolute 1-indexed line (`:242`, `:262`). Frontmatter is skipped from the
  text (`:65`, `skip_frontmatter` `:411-424`) but still counts toward the line number. VERIFIED.
- The diff is key-matched: `existing_hashes.get(&chunk.key) != Some(&chunk.content_hash)`
  (`commands/semantic.rs:1238-1242`). VERIFIED.
- `content_hash` hashes the same string `embed_text()` builds: `emit_chunk`'s `hash_input`
  (`chunker.rs:380-389`) matches `heading_prefixed_text` (`types.rs:117-127`). So a hash match
  means the model input is the same. VERIFIED.
- Log, VERIFIED. Snapshot bytes are 3140 at 17:54:36.552 ("all 6 chunks unchanged"), 3163 at
  37.548 (6 of 6), and 3184 at 38.552. The chars go 3050, then 3073, then 3094.
  - +23 bytes is exactly `life_track_energy: "3"` plus a newline.
  - +21 bytes is exactly `life_track_mood: "4"` plus a newline.
  - The bytes match the claim. That the lines sit in the frontmatter is INFERRED: meta-bind writes
    frontmatter. I did not read the note.
- I accept the frequency argument, and it is stronger than the report says. Any typed newline in a
  non-last section shifts every later key. So ordinary journaling re-embeds the tail of the note on
  the next autosave, not only tracker clicks.

### RC2, read-before-lock and commit-after-unlock: CONFIRMED, with one more window

- Hashes are read at `:1233-1235`. `ensure_embedder_loaded` takes and releases `EMBEDDER`
  (`:245`, `:1264`). Then `:1266` locks it again. The guard is dropped at `:1288`, before the
  commit transaction at `:1299`. VERIFIED.
- The report misses one window. Each update takes `EMBEDDER` twice: once in
  `ensure_embedder_loaded`, once at `:1266`. Another waiter can win between those two takes,
  which is a reorder window that has nothing to do with mutex fairness. The log also shows the
  unlocked commit directly: day-02 call 2 logged "File update" at 17:54:59.106, 1 ms before call
  1's "Search cache invalidated" at 59.107.
- Create plus watcher: the FTS leg logged twice per weekly note: week-40 at 53.060 (create) and
  54.040 (watcher), week-43 at 56.811 and 57.715. The semantic call sits on the same leg
  (`src/lib/core/filesystem/note-change.service.ts:240-253`). `create` has `mark: false` (`:90`).
  Embed order was week-40, week-43, week-43, week-40. VERIFIED.
- Correction: "the week-40 *watcher* call ran last" is INFERRED. The log cannot tell which of the
  two week-40 calls ran first. What the log does prove: one week-40 call ran after both week-43
  calls, and those were queued later.
- The correctness risk is understated. "Self-healing on the next save" holds only if the note is
  saved again. Here is how it goes wrong:
  - An older call that commits last writes its own rows.
  - It deletes only the keys missing from its own stale snapshot, so the newer call's extra keys
    survive as orphans.
  - It stores the current disk mtime (`:1333`), so `build_semantic_index` will skip the file at
    every later startup (`:517-519`).
  - Stale or duplicate chunks then persist for as long as the note is not edited.
  - INFERRED. Rare, and it needs 3 or more calls queued for one path.

### RC3, no idle unload on the startup path: CONFIRMED

- `init_semantic_search` loads through `ensure_embedder_loaded` (`:373-374`). That is why the log
  says "Lazy-reloading embedder" at 17:52:46.749.
- The no-change build returns at `:543-553` with no unload and no timer.
- The changed branch unloads at once (`:761`). Timers are armed only at `:1289`, `:802` and
  `:962`. VERIFIED.

### RC4, 21.5 s outlier: the timing is confirmed, the candidate list is incomplete

- The pass ran from "File update" at 17:54:37.583 to "Output" at 59.105. The next pass with the
  same shape took 1.777 s. No "Lazy-reloading" line appears in the window. The only reload in the
  session is at 17:52:46.749. VERIFIED.
- Rust work in the window: the slow commands were 7 `scan_vault` calls (554 ms total, max 281 ms).
  Everything else was 0-6 ms. VERIFIED.
- Missed candidate, in-app: the webview's WebContent process. 17:54:41-17:54:57 is a burst of tab
  opens: 31 `docReplace` calls, 6 heartbeat stalls, `activeTabLinks` callbacks of up to 309 ms. ORT
  workers run at utility QoS, which "prefers efficiency cores" (`semantic/qos.rs:5-8`).
  Foreground webview and WebKit work outranks them. The report blames only "external" load.
  Foreground work from the app's own UI belongs on the list too. A 10x slowdown still looks too
  large for that alone, so this stays unproven either way.

## Measured impact: numbers re-checked

| claim | check | result |
|---|---|---|
| 9 passes, 47 chunks, 34.4 s | 0.67+1.13+0.61+21.52+1.78+1.92+2.21+2.33+2.24 = 34.41; 5+4+2+6×6 = 47 | holds |
| avoidable 27.8 s (81%), 24 chunks (51%), 6.3 of 12.9 s without the outlier | 21.52+1.78+2.33+2.24 = 27.87; 24/47 | holds |
| 0.84 s model load | 46.749 to 47.591 | holds |
| 13 cache invalidations, 0 cache loads | grep | holds |
| 156,860 chunks | `totalChunks":156860` at log lines 405, 413 | holds |
| "7 stalls inside the slow pass" | the stall at 17:54:37.182 is 0.4 s *before* the pass began (37.583) | **6 inside, 1 before** |
| "RSS stayed at 1,010-1,029 MB for 16 s of the pass" | only two samples in the pass, at +16.5 s (54.043) and +20.1 s (57.716); none at its start | **unsupported**: the 567 MB drop happened somewhere in 17:53:44 to 17:54:54 |
| "+1.0-1.3 GB from the model" (283 to 1,577 MB) | see below | **INFERRED, not measured** |
| "semantic results lag up to ~30 s" | worst submit-to-commit: day-02 call at 38.55, committed about 17:55:00.9 | **about 22 s** |

RSS attribution:
- The 283 MB sample (17:52:43.743) comes before most of startup: the FTS build, the
  `get_tasks_in_section_v2` read of every note, tag indexing.
- RSS is sampled on watcher events (`src/lib/utils/debug.ts:144`). Both high samples come right
  after whole-vault scans:
  - 1,577.5 MB at 53:44.432, after `scan_vault` ×2 and `scan_vault_v2_cached` (44.051-44.333)
  - 1,415 MB at 55:16.589, after a 188 ms `scan_vault` and five back-to-back embeds
- No RSS sample was taken after the unload at 17:57:09.
- So the model's share of RSS is not isolated in this log. ~1 GB for an INT8 bge-m3 session plus
  the ORT arena is plausible (from memory), but the "1.0-1.3 GB" figure is a guess.

UI-thread claims hold:
- `update_semantic_file` is `async` with `spawn_blocking` (`:1211-1216`).
- The indirect paths exist as described:
  - `ensure_embedder_loaded` then `try_lock`: `:788`/`:792`, `:952`/`:954`.
  - `get_or_load_cache` holds `SEARCH_CACHE` and then the `DB` mutex for the whole load
    (`:152-194`, `db/mod.rs:17`).
  - `save_snapshot` is sync and takes the same DB (`commands/history.rs:56-77`).
  - `shutdown_semantic` is sync and locks `EMBEDDER` (`:1158-1162`).
- Small citation nit: utility QoS is entered at `:1261`, not at `:1210-1216`.

Impact score 3 stands. Background only, no measured UI freeze, and the default search mode is text.

## Fixes

### 1. Hash-matched vector reuse: VALID, but "quick-win" understates it

- The gain holds. The 3140 -> 3163 and 3163 -> 3184 transitions keep every content hash, so all
  12 embeds become row rewrites.
- **Wrong safety argument.** The report says "Embed-recipe changes already change content_hash
  (types.rs:131-133)". They do not:
  - `EMBED_RECIPE_VERSION` (`:1462`) feeds the *model* hash (`compute_model_hash`, `:1479-1480`).
  - `check_and_update_model_hash` runs only in the build's Phase 1 (`:500-507`), which clears all
    chunks.
  - `update_semantic_file` never checks the model hash.
  - Reuse is still safe, for a different reason: today's unchanged-hash skip already keeps old
    vectors under the same conditions, and the startup build always runs right after init and
    clears on a recipe change (`src/lib/app/lifecycle/app-lifecycle.service.ts:450-464`). Fix 1
    adds no new exposure, but the report should cite this reason, not the one it gives.
- Missed detail: `embedded_at`. `get_file_index_info` drives the status-bar "last embedded"
  (`:1144-1154`). Decide whether re-keyed rows keep the old timestamp or get `now`.
- Effort is "small", not "quick-win". It needs:
  - a new repo read that returns blobs per path
  - a planner module
  - a transaction loop that inserts from two sources
  - tests
- Test plan is valid. The existing no-model pattern is at `tests/semantic_commands_test.rs:594-648`.
  With no model, today's code reaches `ensure_embedder_loaded` and returns Err (no `VAULT_PATH`,
  or the model is missing).

### 2. Serialize end to end, latest wins: VALID direction, heavier than needed

- A smaller option covers both RC2 and `embedder-memory/02`:
  - Load-if-missing under one `EMBEDDER` guard.
  - Re-read the path's hashes *after* taking that guard.
  - Hold the guard through the commit and mtime write.
- That removes the create + watcher duplicate and the stale-snapshot embed, and makes commit order
  follow lock order. The per-path generation map then only saves a hash diff, and the CLAUDE.md
  simplicity rule argues against adding it.
- Lock order would become `EMBEDDER -> DB`. Grep finds no site that takes the DB mutex and then
  `EMBEDDER`. The build's batch closure takes `EMBEDDER` alone (`:642-646`).
- Missed risk: serializing makes calls wait longer on `spawn_blocking`. Nothing checks a
  vault or shutdown generation before the commit, so a call parked across a vault switch can write
  into the next vault's DB. The report lists this as an open question; fix 2 widens that window.
  `embedder-memory/07` records that `shutdown_semantic` does not clear `VAULT_PATH`.
- Missed overlap: `.scratch/embedder-memory/issues/03-double-semantic-embed-per-save.md` already
  tracks "one save can embed the same file twice". Its open checkbox ("confirm whether the second
  call reaches ONNX") is answered by this log: yes, when the calls overlap. Fold fix 2 into 03,
  together with 02 and `embedder-burst-cpu/04`.

### 3. rusage instrumentation: VALID quick-win, with a units trap

- From memory, not checked: on Apple-silicon macOS, `proc_pid_rusage` `ri_user_time` and
  `ri_system_time` are in Mach absolute-time ticks, not nanoseconds (psutil hit this on M1).
- The planned "~6 CPU-s" comparison would then be off by the timebase factor (125/3 on M1), and
  the proposed monotonic unit test would not catch it.
- Use `getrusage(RUSAGE_SELF)` for CPU time (a timeval) and `ru_majflt`. Keep `proc_pid_rusage`
  only for `ri_phys_footprint`, or convert with `mach_timebase_info`.

### 4. Arm the idle unload at startup: VALID quick-win, lower risk than stated, gain unmeasured

- The `embedder-memory/07` risk is small:
  - Both callers run `build_semantic_index` right after `init_semantic_search`
    (`app-lifecycle.service.ts:450-464`, `src/lib/features/search/SearchSection.svelte:78-81`).
  - `schedule_embedder_unload` re-arms while `BUILD_LOCK` is held (`:340-343`).
  - Only the no-change branch (`:543-553`) needs the call. Arming in init as well is redundant.
- The gain ("~1.0-1.3 GB 120 s after open") is not measured in this log. See the RSS section.

### 5. Patch the search cache in place: VALID medium

- It only helps users of the semantic or hybrid mode. The 11.5 s figure is from another session
  and is still not re-checked.

### 6. ORT tuning: VALID as measurement-gated

- `session_builder` is shared with the reranker (`semantic/mod.rs:35-49`). The report notes this.

## Open questions, status

- Sysinfo RSS semantics, and the model file name (`compute_model_hash` reads
  `.kokobrain/models/bge-m3/model.onnx`, `:1467-1472`, not `model_quantized.onnx`): still open.
- The JS chunker port was not diffed against the Rust chunker: still open. The byte deltas are
  consistent with it.

Not checked: no app run, no cargo, no DB query, no vault file read.
