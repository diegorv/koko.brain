# 01: update_semantic_file has no queue: bursts pile up, repeat work and embed deleted notes

**Status:** ready-for-agent

Priority: P2 (a burst of writes to new content keeps ONNX busy for many minutes and memory near 2 GB, with no way to stop it; the main thread stays responsive)

**What to build:** Make incremental embedding hold at most one pending update per note, with the newest content, and stop working on notes that no longer exist. Today every save spawns its own `spawn_blocking` task in `update_semantic_file` (`src-tauri/src/commands/semantic.rs:1305`), and each task runs to the end whatever happened since.

## The three defects

1. **No coalescing.** N saves of one note run N tasks. Each reads the stored hashes and computes its plan (`semantic.rs:1329-1331`) **before** it waits for the embedder lock (`semantic.rs:1375`), so a task that waited embeds chunks an earlier task already stored.
2. **No bound and no cancel.** Tasks queue on the lock with their whole note content in memory. Nothing can stop them short of quitting the app.
3. **No existence check.** A task whose note was deleted while it waited still embeds it and commits its chunks. Only then does `update_stored_mtime` (`semantic.rs:1466`, `1491`) fail with `Cannot resolve path`, which the front end logs at debug level as a skipped update. The chunks stay as orphans until `cleanup_orphaned_chunks` runs at the next vault open.

## Evidence

Session `2026-11-06_15-41-38.log` (log clock is UTC). **A debug build (`rust_profile=debug`) with every debug log on**, so the rate below is not a release number. The vault has 10,747 notes, median note 13.5 KB.

| What | Measured |
|---|---|
| 120 new notes of 13.5 KB through `ctx.vault.create` | 6.1 s of JS, 49 ms per note |
| Embedding backlog those notes started | still running 18.5 minutes later, when the session stopped logging |
| Rate | 91 notes with chunks after about 16.5 minutes: about 11 s per note, with 25 to 29 chunks each |
| Memory | RSS peak 2,021 MB at 18:51:48, from a baseline near 520 MB |
| Main thread during the backlog | 25 s sampled: 2 blocks over 50 ms (130 ms in total), 5 of 1,479 frames over 34 ms |
| Notes deleted at 19:03:32 | still being embedded at 19:09:55; 2,843 orphan chunks of 91 notes counted at about 19:08 |
| Cleanup | the next vault open removed the orphans of 116 notes, and 0 chunks remain |

Repeated work, session `2026-11-06_16-27-45.log`: one save of `vault/_inbox/Vault health.md` at 20:21:28 ran three identical tasks. All three logged `File update - 2 changed of 5 total chunks` and embedded, at 0.98 s, 0.81 s and 0.90 s, and footprint rose from 1,156 MB to 1,241 MB. The three tasks themselves came from duplicated after-save observers (see Notes), but the waste is this Issue's: the second and third had nothing left to embed.

A frontmatter-only rewrite of a note already embedded looks cheap: it logged `Reusing N stored vector(s) for re-keyed chunks` (27 of the first 28 updates). That run overlapped the backlog above, so its clean cost was not measured.

## Options

Owner decision (2026-11-06): build the first option; the other two are recorded as the alternatives.

- **A per-path pending map with one worker.** A save replaces the pending content of its path; one worker takes a path, computes the plan, embeds, stores. Fixes defects 1 and 2 together, and a delete can drop the pending entry. Cost: a new owner for this state in Rust, and the order of `update_semantic_file` calls no longer maps to tasks.
- **Recompute the plan after taking the lock, and check the file exists there.** Small and local. Fixes the repeated embedding and most of defect 3, but tasks still pile up, with every note's content held in memory, and N saves still wake N tasks.
- **A debounce per path on the front end.** Collapses repeated saves of one note only. Does nothing for a burst across many notes or for deleted notes, and does not help the watcher path.

## Acceptance

- N updates of one path while the embedder is busy embed at most twice: the one running and the newest.
- A pending update of a path that was then removed, or whose file is gone, embeds nothing and writes no chunk.
- The newest content wins: after a burst, the stored chunks match the last update, whatever the order the tasks ran in.
- An update whose chunks are all stored stays a no-op, and re-keyed chunks still reuse their vectors.
- The bulk `build_semantic_index` path is unchanged.

**Blocked by:** none

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` (Rust only, if the front end does not change)

**Source:** src-tauri/src/commands/semantic.rs:1305-1336,1375,1466,1484-1491, src/lib/core/filesystem/note-change.service.ts:247-254, src/lib/features/search/search.service.ts:320-328, docs/agents/indexing-watcher-rules.md rules 6 and 10

## Notes

- **Search during a backlog (read in the code, not run):** semantic and hybrid search take the embedder with `try_lock` (`semantic.rs:823`, `1013`) and return "Semantic search is temporarily unavailable while indexing is in progress" while an update holds it. A long backlog can therefore make those searches fail, not only slow down. Each commit also invalidates the search cache (`ui-responsiveness` Issue 26, wontfix).
- **Not measured:** the rate in a release build; how often a search hits that error during a backlog; where the memory goes (per-task content, thread stacks or the ONNX arena).
- **Footprint after unload:** the embedder unloads after 120 s idle, yet footprint then stayed at 680 to 990 MB in `2026-11-06_16-27-45.log`, against 361 MB after the first open. The origin was not identified, and that session had duplicated observers.
- **Duplicated after-save observers, probably dev only:** that session went from 4 to 8 observers, with `initializeVault complete` at 20:08:08 and 20:19:12, right after two merges into the checkout `pnpm tauri dev` runs from. The cause is inferred from the timing and was not reproduced. If it also happens without a dev reload, it is a separate bug: every save would write its snapshot and search updates several times.
- **Mods:** the `bulk-tag` mod paces its writes for a different limit, the whole-vault read above `INCREMENTAL_REFRESH_MAX_PATHS`. Pacing does not fix this Issue.
