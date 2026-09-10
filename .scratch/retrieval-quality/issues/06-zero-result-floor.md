# Issue 06: No zero-result floor, so a nonsense query returns wrong notes

Status: needs-info
Source: retrieval-quality plan 2026-09-09, Task 8 residual (`f8112171`),
measured by the Task 7 eval (`c86a2694`)

Blocked by: the top-score distribution. A floor is a number and the eval
reports carry none - `ModeOutcome` in `examples/retrieval_eval.rs` stores
`paths`, `result_count` and latency, no scores. Harvest the tops (see Tests)
before choosing a value.

## What

`filtering::adaptive_filter` decides only *where* to cut a list, never
whether it should exist: the gap rule is a fraction of the top, the
`mean - stddev` fallback is scale-free. A query with nothing relevant still
returns its best candidate. The 2026-09-09 eval measured bucket C (three
nonsense queries, `expected: []`) at c01/c02/c03 = 1/1/2 in hybrid (mean
1.3) and 1/1/1 in semantic (mean 1.0) - far better than the pre-sigmoid 13.7
and 6.7, but the correct answer is zero, and the reranker has the evidence:
the list sits on the flat -7..-11 logit tail recorded in `f8112171`,
p < 0.001 after the sigmoid.

## Fix

An absolute floor on the top score in probability space: if
`sigmoid(top) < FLOOR`, `keep_count = 0`, next to the gap rule in
`adaptive_filter` so both modes inherit it once.

- `Logit` only. `Cosine` is another model's scale and `Rrf` (reranker off) a
  rank artefact with no relevance magnitude, so hybrid gets the floor only
  when the reranker ran. Say so in the doc comment.
- `FilterOutcome.keep_count = 0` is a value no caller has produced yet.
  Check `finalize_results`, both call sites in `commands/semantic.rs` (:788
  and :971) and the front end read an empty list as "no results", not as an
  error or a stale render.
- The floor must sit below the weakest *correct* top in buckets A and B, or
  it silently turns a miss into a regression.
- Issue 05's clamp stops the gap rule firing on this tail (2.8e-4 gaps
  against a 3.0e-5 threshold), so if both ship the floor cuts bucket C and
  the clamp only decides where a surviving list ends.

## Tests

`cargo test --manifest-path src-tauri/Cargo.toml`. Harvest the real tops
with the eval's `--verbose` first. Semantic logs them via
`format_score_distribution` (`commands/semantic.rs:794`), whose `max=` is a
raw logit - sigmoid it before comparing. Hybrid has no such line; its
gap-filter message prints `threshold` already in probability units, so the
top is `threshold / COSINE_GAP_RATIO`. Blind spot: `threshold` prints only
on the gap branch - the fallback prints `dynamic_min`/`mean`/`stddev`
instead, and a list under 3 candidates prints nothing.

## Done when

Bucket C mean result count is 0.0 in both modes, the per-query regressions
list is empty, and bucket A and B recall@10 and MRR@10 are unchanged
(owner-side eval, `docs/SEARCH.md` § "Evaluating retrieval changes",
`--compare` against `.kokobrain/eval/report-branch-sigmoid.json`). If no
floor separates bucket C from the weakest correct top, close as wontfix with
the two numbers that overlap.
