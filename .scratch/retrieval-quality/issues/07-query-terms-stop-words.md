# Issue 07: `hybrid::query_terms` keeps stop words, so the chunk picker favours the longest chunk

Status: ready-for-agent
Source: retrieval-quality plan 2026-09-09, Task 7 A/B/A latency finding
(`c86a2694`)

## What

`query_terms` (`src-tauri/src/search/hybrid.rs:51-64`) keeps every token of 2
or more characters, and `term_hits` (:68-78) tests each with
`haystack.contains(...)`, a substring match with no word boundary - so in a
long Portuguese paraphrase "de", "para" and "que" are terms and they match
inside "desde" and "grande". The tie break in `assemble_candidates` (:87-136)
is "most term hits wins", so a bag of high-frequency short tokens degenerates
towards "the longest chunk wins". Measured in the 2026-09-09 A/B/A re-run:
hybrid b09 went from 3.2 s to 7.5 s (+130%) with the same 30-pair pool, only
the per-pair length changed; and the chunk in front of the cross encoder, and
in the snippet, may not be the passage that matches.

Bounded blast radius: `query_terms` has one caller
(`commands/semantic.rs:900`), feeding only `assemble_candidates` (:901-912),
which picks a representative chunk for paths RRF has *already* fused. A
dropped term costs a worse representative chunk, snippet and reranker input,
never an FTS leg or a path.

## Fix

Keep a token when it is 3 or more characters **and** not in a literal
stop-word list. Function stays pure, dedupe stays; the list is a `const`
slice matched after lowercasing (`query_terms` does not fold diacritics, so
the accented forms are what appear):

- en: `the and for with that this from are was you your what how when which
  not but can`
- pt: `que para com uma dos das por como não mais sobre pelo pela ser isso
  quando onde mas`

The 3-char minimum also drops 2-char identifiers ("ai", "go", "js", "kb",
"id") from the hit count - acceptable for the reason above: bucket A's rare
exact terms still reach the fused list through the FTS leg Task 2 was
written to stop losing, they only lose a say in which chunk represents them.

## Tests

`cargo test --manifest-path src-tauri/Cargo.toml`. Two existing tests move
with the change: `query_terms_lowercases_splits_and_dedupes` (:166-171)
expects `"the"`, which the list removes;
`query_terms_drops_single_char_tokens_and_handles_empty` (:174-178) is named
after the 1-char rule and its `"a b c ok"` case now yields an empty vec.
Add: a Portuguese paraphrase keeping only content words; a 2-char token
dropped while `query_terms_keeps_code_identifiers_whole` (:181-183) still
passes; an all-stop-word query returning no terms, which `term_hits` already
handles by returning 0 for every chunk, so `assemble_candidates` falls back
to the cosine tie break.

## Done when

Agent side: `cargo test` green, `query_terms` yielding only content words on
a long Portuguese paraphrase. Owner-side acceptance (eval from
`docs/SEARCH.md` § "Evaluating retrieval changes", `--compare` against
`.kokobrain/eval/report-branch-sigmoid.json`): bucket B hybrid p50 latency
drops with b09 moving off 7.5 s back toward its 3.2 s baseline, the
per-query regressions list is empty, and bucket A and B recall@10 and MRR@10
do not move. A latency mean that moved without a per-query story is noise.
