# Discovery: 01 embedder thread cap + intra-op spinning off

## Files that change
- `src-tauri/src/semantic/embedder.rs:49-54`: comment + `min(8)` -> `min(4)` (fallback stays `unwrap_or(4)`).
- `src-tauri/src/semantic/mod.rs:24-39` (`session_builder`): append
  `.with_intra_op_spinning(false)` after `.with_intra_threads(..)`; doc comment says
  every session (embedder and reranker) is built with spinning off.
- `src-tauri/src/semantic/reranker.rs:48-49`: comment only. It says "Same cap as the
  embedder (min(8))", which becomes false once the embedder drops to 4. The reranker cap
  itself stays `min(8)` (out of scope: interactive, short runs).
- `src-tauri/tests/semantic_session_builder_test.rs`: extend the smoke-test comment to
  cover the spinning setter (same `is_ok()` assertion proves it does not error).

## API check
- `ort 2.0.0-rc.15` (`Cargo.lock:3610`) has `SessionBuilder::with_intra_op_spinning(bool)`
  at `src/session/builder/impl_config_keys.rs:135`, which writes config entry
  `session.intra_op.allow_spinning`. It returns `BuilderResult`, so map the error like the
  other setters.
- ort exposes no getter for config entries (`with_config_entry` is write-only), so the
  test can only prove the call does not error. The effect is verified by measurement only.

## Plan
1. One commit: the three source edits + the test comment. Run
   `cargo test --manifest-path src-tauri/Cargo.toml --test semantic_session_builder_test`
   and the embedder/reranker unit tests that exist.

## Prior-art tests
- `src-tauri/tests/semantic_session_builder_test.rs::session_builder_constructs`.

## Risks
- Spinning off can add per-op wake-up latency (slightly slower per-file embed). That is
  the intended trade: less CPU burn while the UI is in use.
- Reranker inherits spinning-off through the shared builder; wanted (fewer busy cores
  during query rerank too), and the commit says so.

## Defaults taken
- Manual `top` measurement (before/after replay of ~20 files) needs the running app and a
  Readwise-like replay; an agent cannot do it. Left for the human, noted in the Issue.
