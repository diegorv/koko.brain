# Issue 10: Rust one-liner simplifications and dead-code cuts

Status: ready-for-agent
Phase: P2
Source: PONY #48 #60 #34 #25 #56 #46 #12+B3 — plan-2026-08-12.md §P2 — Safe deletion batch (Rust one-liners)
Blocked by: none

## What

Land the seven small Rust simplifications and dead-symbol cuts that no ARCH refactor touches. Each is
independently committable. One ordering obligation leaves this issue: **#25 must land before issue
34-dead-vault-commands (#9)** — see §Sequencing constraints honored ("#25 before #9").

## How

- **#48** inline the `split_once` chain.
- **#60** use the method form of `is_char_boundary`; **keep the emoji comment**.
- **#34** apply the **primary `find("```")` form ONLY**. The `windows(3)` variant corrupts offsets —
  do not use it.
- **#25** replace with the 4-line wrapper over `extract_outgoing_links`; **keep the
  `.filter(!is_empty)`**. This item must precede #9 (issue 34).
- **#56** `with_batch_size`, and fix the now-wrong module doc at `semantic_reranker_test.rs:3-9`.
- **#46** three edits: `search_index.rs:198-207`, `lib.rs:321`, and
  `search_fts_test.rs:231-245` — **the finding's "no test reference" claim is false**, the test edit
  is mandatory or the crate breaks.
- **#12 + B3 together**: delete `debug_semantic_embeddings`, remove its line from the
  `generate_handler!` macro at `lib.rs:333`, and follow the `get_sample_chunks` / `ChunkSample`
  cascade to completion.

## Gate

`cargo test --manifest-path src-tauri/Cargo.toml` per commit. One commit per finding, except #12+B3
which land as a single commit (the pair is kept per §Sequencing constraints honored). Stage only the
related files, verify with `git diff --cached --stat`, and use the repo's full commit format (Context,
Problem, Solution, Behavior, Files with line ranges).

## Comments
