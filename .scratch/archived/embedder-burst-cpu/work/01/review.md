VERDICT: CHANGES_REQUESTED

# Review: 01 embedder thread cap + intra-op spinning off

Reviewed `git diff main...HEAD` (main 45e2577e, HEAD de3e2e56; source commit 2217134b).

The code change is correct. `with_intra_op_spinning(false)` exists in the resolved ort
2.0.0-rc.15 (`src/session/builder/impl_config_keys.rs:135`, writes
`session.intra_op.allow_spinning`). Its error is mapped like the other setters.
`ort_environment()` (`src-tauri/src/semantic/mod.rs:13-22`) builds no global thread pool,
so each session has its own intra-op pool and the per-session config entry applies.
Only the embedder (`embedder.rs:60`) and the reranker (`reranker.rs:58`) build sessions,
and both go through `session_builder`.

The changes requested are: one test gap, two inaccurate comments, one wrong sha, and the
delivery path for the measurement criterion, which no agent can satisfy.

## Tests run (the test verdict rests on these)

`CARGO_BUILD_JOBS=2 nice -n 19 cargo test --manifest-path src-tauri/Cargo.toml --test semantic_session_builder_test --test semantic_reranker_test --test semantic_model_test --test semantic_commands_test`, exit 0:
- `src-tauri/tests/semantic_session_builder_test.rs`: 2 passed
- `src-tauri/tests/semantic_reranker_test.rs`: 4 passed
- `src-tauri/tests/semantic_model_test.rs`: 6 passed
- `src-tauri/tests/semantic_commands_test.rs`: 43 passed

None of these tests builds an `Embedder` or reads its thread count. A revert of the cap
to `min(8)` would still pass all of them (finding 2).

## Acceptance criteria

- [x] **embedder.rs caps at 4, fallback 4, comment says why.** Met:
  `embedder.rs:55-57` is `.min(4)` / `.unwrap_or(4)`, and `:49-54` names background
  bursts and the UI in use. The last sentence of the comment overstates the bound
  (finding 3).
- [x] **session_builder disables intra-op spinning for every session; doc comment says
  so.** Met: `mod.rs:44-45`, doc at `:32-36`. The wording of the doc is inaccurate
  (finding 4).
- [x] **Commit confirms spinning-off is wanted for the reranker.** Met: the 2217134b
  Solution paragraph says the reranker shares `session_builder` (reranker.rs:58) and
  that this is intended.
- [x] **semantic_session_builder_test.rs passes; commit says measurement only if no
  getter.** Met: 2/2 passed. The commit's Behavior paragraph and the test comment
  (`semantic_session_builder_test.rs:12-15`) say ort has no getter.
- [ ] **Manual measurement noted (top before/after, ~20-file replay, per-file embed
  time).** Not met. The Issue comment and the commit body only record it as TODO. No
  agent can run it (it needs the running app and a replay), so see finding 1.
- [ ] **Gate green; one commit in full format.** Partly met. 2217134b has Context,
  Problem, Solution, Behavior and Files with line ranges, and the ranges match the diff.
  The deliver step has not run the gate yet.

No scope creep. The reranker comment edit (`reranker.rs:50-52`) is needed because the
old text claimed it matched the embedder cap. Error handling propagates through
`map_err` and `?`. No layer or frontend rules apply.

## Findings

1. **Medium, delivery: `.scratch/embedder-burst-cpu/issues/01-embedder-thread-cap-no-spinning.md:22`.**
   The measurement criterion is unmet, and the default `merge` delivery deletes the Issue
   file. That file is the only record that 01's before/after numbers are owed. Issue 02
   says `Blocked by: 01 (measure each change separately)`, and issue 04 is gated on
   "measurements after 01-03". Closing 01 now lets 02 start, and its change would
   then mix into an unmeasured 01.
   **Fix:** Do not add the closing commit that deletes the file. After the gate passes,
   either (a) merge the code and set the Issue to `Status: ready-for-human`, with a
   comment that names the measurement (baseline = main before the merge, after = the
   merge commit; `top -pid <pid> -stats cpu,rss,th` during a ~20-file replay at
   ~10/min, plus per-file embed time from the `EMBEDDER` log lines), or (b) hold
   delivery at `ready-for-human`. Either way the main session must stop and ask the
   user. Neither option needs a source change.

2. **Medium, tests: `src-tauri/src/semantic/embedder.rs:55-57`.**
   The behavior this Issue exists for (cap 4, fallback 4) has no test. The only test
   edit is a comment. CLAUDE.md rule 11 says no source change ships without a test
   change, and a revert to `min(8)` passes every test.
   **Fix:** Add a small pure helper in `src-tauri/src/semantic/embedder.rs`, for example
   `pub fn embedder_intra_threads(available: Option<usize>) -> usize { available.map(|n| n.min(4)).unwrap_or(4) }`,
   and call it with `std::thread::available_parallelism().ok().map(|n| n.get())`.
   Test it in a `src-tauri/tests/` file: `Some(16)` gives 4, `Some(2)` gives 2, `None`
   gives 4. Keep the reranker unchanged; it is out of scope.

3. **Low, comment accuracy: `src-tauri/src/semantic/embedder.rs:53-54`.**
   "this cap bounds the embedder's total CPU use" is false. `embed_batch` tokenizes with
   `encode_batch` (`embedder.rs:128`). In tokenizers 0.23.2 that runs `into_maybe_par_iter`
   on rayon's global pool, one thread per core, unless `TOKENIZERS_PARALLELISM` is set
   (`utils/parallelism.rs:41-48` defaults to parallel). Nothing in `src-tauri/src` sets
   it. The cap bounds ONNX inference threads only.
   **Fix:** Reword to "so this cap bounds the embedder's ONNX inference threads". Do not
   change tokenizer parallelism in this Issue; if measurement shows tokenization
   matters, it can become a follow-up.

4. **Low, comment accuracy: `src-tauri/src/semantic/mod.rs:33-35`.**
   "spins intra-op threads in a busy-wait between ops by default, which burns idle cores
   at 100%" overstates what ORT does. The ort doc for this setter
   (`impl_config_keys.rs:132-133`) says the threads "spin for a short period before
   blocking". The cost is repeated short spins at 100% between ops during a burst, not
   permanent idle burn.
   **Fix:** Reword to "ORT lets idle intra-op threads spin for a short period before
   blocking (on by default); during a burst those spins keep cores busy between ops.
   With spinning off they block at once."

5. **Nit, Issue log: `.scratch/embedder-burst-cpu/issues/01-embedder-thread-cap-no-spinning.md:26`.**
   The discovery comment cites `a293e4bf`, which is `docs(scratch): add embedder-burst-cpu
   issues 01-04` on main, not the discovery commit `e8a24bf1`.
   **Fix:** Change the sha to `e8a24bf1`.

6. **Nit, doc layout: `src-tauri/src/semantic/mod.rs:36`.**
   "Every session must start here so the policy cannot drift per call site." now sits at
   the end of the spinning paragraph, so it reads as if it covers only spinning.
   **Fix:** Put a blank `///` line before it and say "policies" (CPU EP and spinning).

## Resolution

All six findings accepted.

1. Accepted, option (a): the code is merged into main after the gate, but the closing
   commit is skipped. The Issue file stays, set to `Status: ready-for-human`, with a
   comment naming the owed before/after measurement.
2. Fixed: `embedder_intra_threads(available: Option<usize>) -> usize` in
   `src-tauri/src/semantic/embedder.rs`, tested in
   `src-tauri/tests/semantic_embedder_threads_test.rs` (Some(16) -> 4, Some(2) -> 2,
   None -> 4).
3. Fixed: the comment now says the cap bounds ONNX inference threads and that
   tokenization on rayon's global pool is not bounded by it.
4. Fixed: `session_builder` doc reworded to "spin for a short period before blocking".
5. Fixed: discovery comment sha is now `e8a24bf1`.
6. Fixed: blank `///` line and "these policies".
