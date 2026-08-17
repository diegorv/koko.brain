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

**2026-08-17 — done.** All seven findings landed as seven commits, one per finding, each gated by
`cargo test` (green, 0 failed) and a fable adversarial review (verdict "could not refute" on all
seven; each reviewer attacked equivalence, missed call sites, orphans, and test vacuity):

- #48 `20f71a6` — split_once chain inlined; equivalence checked per input class.
- #60 `5fd52a9` — method-form is_char_boundary; reviewer proved truth-table equivalence empirically
  (exhaustive index sweep over 6 string classes). Emoji comment kept as mandated.
- #34 `9275b16` — primary find("```") form only, offsets re-added at both sites; reviewer ran a
  differential fuzz (36 adversarial cases + all 19,531 strings up to length 6 over a 5-symbol
  multibyte alphabet), zero mismatches.
- #25 `ece94ef` — 4-line wrapper over extract_outgoing_links, .filter(!is_empty) kept. Review found
  one LOW gap (nothing pinned the filter); closed with
  from_content_empty_wikilink_targets_are_dropped, proven red via mutation check (filter removed →
  FAILED) before restore. Known alignment: [[a]b]] no longer yields "a]b" (matches canonical
  scanner/TS regex; the old frontmatter path was the inconsistent one). Ordering obligation
  satisfied: landed before issue 09's #9.
- #56 `58942c4` — with_batch_size deleted; semantic_reranker_test.rs module doc fixed as mandated.
  chunks(0) unreachable (batch_size written once from DEFAULT_BATCH_SIZE, pinned nonzero).
- #46 `073daf5` — three edits incl. the mandatory test deletion (the audit's "no test reference"
  claim was indeed false). No coverage loss: count_entries and total_documents remain asserted
  elsewhere (fts_repo_test, 8 remaining search_fts_test assertions).
- #12+B3 (this commit) — debug_semantic_embeddings + registration + full get_sample_chunks /
  ChunkSample cascade incl. their two tests. 145 deletions, 0 insertions; cargo check
  --all-targets warning-free; no frontend/CI/script harness ever invoked the command.
