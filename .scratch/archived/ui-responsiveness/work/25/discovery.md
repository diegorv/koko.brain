# Issue 25 discovery: search_fts off the main thread

No `spec.md` for this feature. Same pattern as the async siblings in the same file
(`build_search_index`, `update_search_index_file`, `remove_from_search_index`).

## Files that change

- `src-tauri/src/commands/search_index.rs:147-160`: `search_fts` becomes `pub async fn`; the
  trim / empty / default-limit logic moves into the `spawn_blocking` closure (it needs an owned
  `String`), which calls `search_fts_inner` unchanged; join error mapped as
  `format!("search_fts task join error: {e}")`.
- `src-tauri/tests/search_fts_test.rs`: 24 sync call sites of `search_index::search_fts(...)`.
  They go through a test helper `search_fts_blocking` that `block_on`s the real async command on a
  current-thread runtime, so the existing sync tests keep their shape. New `#[tokio::test]` tests
  await `search_fts` directly.

Unchanged: `search_fts_inner` (`:164`), the hybrid caller, `FtsSearchResult`, `lib.rs:359`
registration (Tauri accepts async commands with the same macro), `search.service.ts`.

## Plan

1. Failing first: `#[tokio::test]` tests in `search_fts_test.rs`: awaited `search_fts` returns the
   same paths/order as `search_fts_inner` for the same query (fuzzy and non-fuzzy) on the seeded
   vault; empty and whitespace query return `[]`. Does not compile while the command is sync.
2. Make the command async; route existing sync call sites through the helper.
3. Gate: `cargo test --manifest-path src-tauri/Cargo.toml` (Rust only, no DTO change), clippy.

## Prior art

- `semantic_commands_test.rs:1-4,361`: `#[tokio::test]` holding the std `TEST_LOCK` guard across
  `.await`, with `#![allow(clippy::await_holding_lock)]` and the reason.

## Risks / defaults

- `FtsSearchResult` has no `PartialEq` assumption made: compare `(path, score)` / paths instead
  of deriving anything on the DTO (a derive would be an IPC DTO change).
- A `block_on` helper in a sync test needs its own runtime per call; cheap for a test.
