# Issue 13 discovery: clippy clean-up, then a CI gate

## Recount (2026-11-01, rustc/clippy 1.98.1 locally, CI pins 1.98.0)

`cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings` exits 101
with 43 errors in `kokobrain` (lib test; the lib alone has 34). Under 60, so the fix path applies:
no `[lints.clippy]` allow table. The lib failing stops clippy before the integration tests, bin and
examples are linted, so more may surface once the lib is clean; they are fixed the same way.

Errors by module (file:line from the recount):
- commands: semantic.rs:154,159,495,499,630,1235; vault.rs:1154,1164,1211
- db: semantic_repo.rs:97
- search: fts_logic.rs:96,104,129; fuzzy.rs:16
- semantic: chunker.rs:244,347,414; embedder.rs:338; quantize.rs:85,86
- vault: entry.rs:722; parsing.rs:41,519,1288,1378,1788,1789,2318,2742-2791; task.rs:50

Lints: unnecessary_sort_by (8), chunks_exact_to_as_chunks, needless_borrow, manual_strip,
needless_range_loop, redundant_closure, doc_lazy_continuation, unnecessary_get_then_check,
too_many_arguments (2), question_mark, unnecessary_map_or, derivable_impls, let_and_return,
manual_div_ceil, manual_is_multiple_of, len_zero, items_after_test_module, useless_conversion,
approx_constant, enum_variant_names.

## Plan
1. One commit per module (commands, db, search, semantic, vault, then tests/others if any):
   `cargo clippy --fix` where it applies, hand edits for the rest. Non-mechanical lints
   (too_many_arguments on Tauri commands, enum_variant_names on a serialized enum,
   approx_constant in test data) get a local `#[allow(clippy::...)]` with a one-line reason
   instead of an API or behaviour change.
2. `.github/actions/setup/action.yml:52`: `components: llvm-tools, clippy`, plus a one-line note
   at the pinned toolchain that a bump must fix any new clippy lints in the same change.
3. `.github/workflows/ci.yml` rust job: a "Clippy" step running the Issue's clippy command
   (without the local nice/jobs throttling) before "Run tests".
4. GITHUB-WORKFLOW.md "What CI tests" rust bullet: mention clippy and the bump rule.

## Tests
No new tests: lint fixes are refactors with no behaviour change. Gate is `cargo test` green and
clippy exit 0, read separately.

## Risks / defaults
- No toolchain-bump Issues exist in .scratch today; the "fix new lints with the bump" note goes
  next to the pinned toolchain (action.yml) and GITHUB-WORKFLOW.md, where a bump is made.
- No cargo workspace exists (Issue 29 not built), so no `--workspace`.
- Local clippy is 1.98.1 vs CI 1.98.0; patch releases do not add lints.
