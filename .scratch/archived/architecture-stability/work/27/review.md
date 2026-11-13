VERDICT: APPROVED

# Issue 27 review

## Acceptance criteria

- [met] New test: on a temp vault with no model, the inner `build_semantic_index` called with a recording callback returns the same result the command returns today. Where a model fixture exists, `chunking` arrives before `embedding`. — `src-tauri/tests/semantic_commands_test.rs:904` (empty temp vault, no model: `Ok(stats)` equal to `get_semantic_stats()`, no events recorded) and the following test (one note, no model: `Err("Embedder not initialized")`, phases exactly `[Chunking]` with 1/1 and "Chunked 1 files", no chunks stored). The command bodies moved unchanged apart from `app.emit` becoming `on_progress` (diff of `commands/semantic.rs`), so the inner result is what the command returned before the change. The repo has no model fixture, so the ordering clause has nothing to apply to. Both tests passed when I ran them.
- [met] The `semantic-index-progress` payload JSON keys are unchanged (`phase,current,total,message`) — `SemanticProgress` (semantic/types.rs) is untouched. `semantic_progress_payload_keeps_its_json_keys` pins the sorted keys to `current,message,phase,total` and `phase` to `"chunking"`, and it passes. The wrapper emits through `emit_progress` on `SEMANTIC_INDEX_PROGRESS = "semantic-index-progress"` (`commands/semantic.rs:396-402`), which matches the frontend listener at `src/lib/features/search/search.service.ts:93`.
- [met] `cargo test -- --list 2>/dev/null | grep -c ': test$'` matches the count before the change, plus the new tests — on the branch I counted 1204 lines in the saved `--list` output (`/tmp/issue27-review/list.log`, exit 0). `git diff main...HEAD -- src-tauri` adds exactly 5 `#[test]`/`#[tokio::test]` attributes and removes none, and adds no `#[cfg(test)]` or macro-generated tests. `semantic_commands_test.rs` goes from 43 attributes on main to 48 on the branch. So the count is the baseline (1199) plus the 5 new tests.

## Checks run by the reviewer

- `cargo test --manifest-path src-tauri/Cargo.toml --test semantic_commands_test`: exit 0, 48 passed, 0 failed (the 5 new seam tests included). Log: `/tmp/issue27-review/sct.log`.
- `cargo test --manifest-path src-tauri/Cargo.toml --lib semantic`: exit 0, 139 passed, 0 failed. This covers `db::semantic_repo::tests::audit_finding_12_malformed_blob_is_rejected_by_deserializer` (the moved call site) and the `semantic::embedder` and `commands::semantic` unit tests. Log: `/tmp/issue27-review/lib.log`.
- `cargo test -- --list`: exit 0, 1204 tests.
- `pnpm check`: exit 0, 0 errors, 0 warnings. No frontend file changed.
- After cargo test, `git status` is clean: nothing under `src/lib/contracts/generated` changed.
- My test verdict rests on `src-tauri/tests/semantic_commands_test.rs` and the lib unit tests in `src-tauri/src/db/semantic_repo.rs`, `src-tauri/src/semantic/embedder.rs` and `src-tauri/src/commands/semantic.rs`. Deliver runs the full Issue gate (`cargo test --manifest-path src-tauri/Cargo.toml`).
- Other checks:
  - The reverse reference is gone: `grep` finds no `commands::semantic::deserialize_embedding` anywhere, and `db/semantic_repo.rs:709,715` now use `crate::semantic::embedder`.
  - Layers and roots: no change to the layer baseline, `BASELINE_SIZE` or the composition roots.
  - Docs: none of `docs/SEARCH.md`, ADR 0012 or ADR 0018 names `deserialize_embedding` or the command signatures, and what they say about `build_semantic_index` is still accurate.
  - Issue-11 const: `grep` finds no shared const for the event name, so the private const matches the Issue's fallback.
  - Scope: the `semantic/service.rs` move was deferred to issue 29 as the Issue asked. Nothing else in the diff is scope creep.

## Findings

1. minor — `src-tauri/src/commands/semantic.rs:425,455`: no test runs the download progress closures, which map `progress * 100` to `current`/`total`/`message` under `downloading`/`downloading-reranker`. The two download tests at `src-tauri/tests/semantic_commands_test.rs:956,968` only cover the `is_model_available` short-circuit. The Issue does not require it, and a real download needs the network. Fix: none needed for this Issue. If `ModelManager::download_model` later gets an injectable source, add a test that records the downloading phase and its percentages.
2. nit — `src-tauri/tests/semantic_commands_test.rs:904`: the empty-vault test checks the inner result against `get_semantic_stats()` on the same DB. That proves equality with today's command only because the moved body is otherwise unchanged, which the diff confirms. Fix: optional. Also assert `stats.total_sources == 0` and `!stats.model_loaded` as absolute values, so a regression in `get_semantic_stats_inner` cannot pass on both sides.

## Resolution

1. Rejected (no change): the reviewer marks it "none needed for this Issue". The download closures only run inside `ModelManager::download_model`, which fetches from the network and has no injectable source, so a test would need a network call or a new seam outside this Issue's scope.
2. Fixed: `build_semantic_index_inner_on_empty_vault_returns_stats_and_reports_nothing` in `src-tauri/tests/semantic_commands_test.rs` now also asserts `total_sources == 0` and `!model_loaded` as absolute values.
