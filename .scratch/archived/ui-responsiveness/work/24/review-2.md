VERDICT: APPROVED

Re-review, round 2, of the fix commit 172ee03f (`git diff 6ef1f99c..HEAD`): it changes only `docs/SEARCH.md:197` and appends `## Resolution` to `review.md`. No source or test file changed.

## Previous findings

| # | Severity | Status | Evidence |
|---|---|---|---|
| 1 | minor | resolved | `docs/SEARCH.md:197` now reads `` `timing mode=semantic\|hybrid ...` ``. With `\|` removed the row has exactly one pipe-delimited split per cell (2 cells, same as rows 195-196), so the row no longer overflows the two-column header. GFM treats `\|` inside a code span as a literal pipe. |
| 2 | minor | resolved (docs option) | The finding offered a doc note as one fix and marked the code move optional. The row now says `total` starts inside the blocking task and leaves out the blocking-pool wait and IPC hop. That matches the code: `let started = Instant::now();` is the first line inside the `spawn_blocking` closure in both commands (`src-tauri/src/commands/semantic.rs:803-804`, `:995-999`). |
| 3 | nit | rejection stands | Field doc in `search_timing.rs` already states `rerank_ms` covers texts + lock + inference; no change needed. |
| 4 | nit | rejection stands | `Reranker::DEFAULT_BATCH_SIZE` is the only batch size today; the drift only matters once a batch-size lever exists. |
| 5 | nit | rejection stands | Log-only change; the commands need the ONNX models, and the pure `summary()` is unit-tested. |

## Acceptance criteria re-checked

- [met] The `[TAURI:RUST:SEMANTIC]` row of the log table in `docs/SEARCH.md` (`:197`) names the timing line — `docs/SEARCH.md:197` names `timing mode=semantic\|hybrid ...` with every stage, and the escaped pipe keeps the row at two cells.
- [not met] Not verified by the agent: on device, a hybrid search of "OKR" logs the line and its stages account for the 19.8 s; record the numbers in Notes — owner-only on-device check; Notes still have no numbers. The new doc caveat (blocking-pool wait and IPC hop not in `total`) is the context the owner needs when comparing. Does not hold back APPROVED.

## Findings

None open or new.

## Checks run by the reviewer

- `cargo test --manifest-path src-tauri/Cargo.toml --test semantic_search_timing_test`: exit 0, 6 passed, 0 failed. The fix touches no Rust, so no other test is affected; the full `cargo test` is deliver's to run.
- No typecheck: the diff touches nothing under `src/` and no `#[ts(export)]` type.
- Scope: the fix diff is `docs/SEARCH.md` (one row) plus the workflow's own `review.md`. No test weakened or removed. Worktree clean before this file.
