# 30: Bound YAML nesting depth and anchor cost in the Rust frontmatter reader

**What to build:** The yaml-rust2 read path from Issue 26 (`src-tauri/src/vault/parsing.rs`) has two unbounded costs that a crafted note can hit:
- **Stack overflow.** `build_node` (parsing.rs:675), `YamlNode::size`, `project_value` (:740), the derived `Clone` and the drop of `YamlNode` all recurse once per nesting level, with no limit. yaml-rust2 0.13.0 caps only flow nesting (`[[[`), at 255, because `flow_level` is a `u8` (`scanner.rs:1455-1461` in the crate). A compact block sequence on one line, `a: - - - - … x`, nests one level per two bytes, so a note of about 100 KB reaches tens of thousands of levels. A Rust stack overflow aborts the process. The scan runs when a vault opens, so the app would crash on every launch until the note is removed.
- **Anchor cost outside the budget.** `Anchors::register` (:656-660) stores `node.clone()` and computes `node.size()` for every anchored node. `resolve` charges alias expansion to `MAX_ALIAS_EXPANSION_NODES` (:581), but `register` charges nothing, so nested anchors (`&a1 [&a2 [&a3 [...]]]`) cost time and memory quadratic in depth.

Fix:
- Track the depth in `build_node`. Past a fixed limit (128 is a suggestion; pick it with the test), treat the block as rejected: the same path as a yaml-rust2 error, which falls back to the subset parser for the whole block and writes one `FRONTMATTER` debug log. The subset parser is line-based and does not recurse.
- Store anchored nodes so that registering does not copy the subtree, for example as `Rc<YamlNode>` with the size computed once. Keep the existing alias budget and its "past the budget resolves to null" rule.

**Blocked by:** none

**Status:** resolved

**Gate:**
- `cargo test --manifest-path src-tauri/Cargo.toml`, one cargo build at a time (`CARGO_BUILD_JOBS=2`, `nice -n 19`).
- `pnpm vitest run src/tests/lib/features/properties/frontmatter-parity.test.ts` if the shared fixture changes.

**Source:**
- `src-tauri/src/vault/parsing.rs:581` (`MAX_ALIAS_EXPANSION_NODES`), `:587` (`parse_yaml_block`), `:650-670` (`Anchors`), `:675` (`build_node`), `:740` (`project_value`); line numbers as of f5b77e4e.
- `src-tauri/tests/vault_frontmatter_parity_test.rs`, `src/tests/fixtures/frontmatter-parity.fixture.json`.
- Found by the automated security review of the Issue 26 branch (commit 269775ef), 2026-11-01. Checked by reading the code and the yaml-rust2 0.13.0 scanner; not reproduced.

- [x] A failing test first: a frontmatter block nested well past the limit through a compact block sequence (`a: - - - … x`) returns without overflowing the stack and matches the subset parser's output. Run it in a thread with a small stack (`std::thread::Builder::new().stack_size(...)`) so the test cannot pass just because the test thread has a large stack.
- [x] A block nested exactly at the limit still parses through yaml-rust2.
- [x] Nested anchors (`&a1 [&a2 [&a3 ...]]`) at the limit build in time and memory linear in the input. Assert on the result; a test does not need to measure time.
- [x] The alias budget behaviour is unchanged: the existing tests for it pass unedited.
- [x] The depth fallback writes exactly one `FRONTMATTER` debug log, like the other fallbacks.
- [x] The ADR 0029 amendment lists the depth limit with the other fallback inputs.

Also in this Issue: the three low findings of the post-merge adversarial review of 56d9c6df (the multi-document fallback, merged unreviewed inside 3d656180):
- [x] Add a non-fallback fixture case `"yaml": "a: 1\n..."` (trailing `...`, nothing after) expecting `{a: 1}` and no `FRONTMATTER` log. Today an off-by-one in the `DocumentStart` count would still pass, because the subset parser also returns `{a: 1}`.
- [x] Cover the `.view` path: `parse_frontmatter_raw_yaml` gets the whole file, so `a: 1\n---\nb: 2\n` and `a: 1\n---\n` now fall back (the first gives `{a: 1, b: 2}` plus a log). TS `parseCollectionYaml` throws on both. Pin the current behaviour in a test, or decide it differently and record why.
- [x] Wording: the ADR 0029 amendment and the module comment (parsing.rs:551-557) say "when yaml-rust2 rejects the block". Say "rejects it or yields more than one document", and update the module comment's list of fallback examples.

## Notes

- **Impact:** the risk grows with notes that come from outside the app: clipping, a shared vault, or the planned P2P sync (`.scratch/p2p-sync`).
- **`INDEX_SCHEMA_VERSION`:** no bump needed. Only notes deeper than the limit change output, and a note that deep would have crashed the scan, so no cached snapshot holds it.
- **Size:** S.

## Comments

- 2026-11-01, branch `issue/30-bound-yaml-nesting-and-anchor-cost`: the Rust frontmatter reader bounds YAML nesting depth (an alias splice included) and falls back to the subset parser with one `FRONTMATTER` log past it; anchored nodes are shared so nested anchors build in linear time and memory. Fixture cases cover the `...` document end, the depth limit and the `.view` multi-document path; ADR 0029 amendment updated. Tests: vitest 379 files / 9180 passed, `pnpm build` ok, cargo test 1147 passed / 0 failed. Reviews: round 1 CHANGES_REQUESTED (fixed: alias depth bound, wording, extra fixtures), round 2 APPROVED.
