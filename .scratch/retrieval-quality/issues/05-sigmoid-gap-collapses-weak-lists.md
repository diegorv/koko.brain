# Issue 05: The sigmoid gap filter collapses weak-top lists to one result

Status: needs-info
Source: retrieval-quality plan 2026-09-09, Task 8 residual (`f8112171`),
measured by the Task 7 eval (`c86a2694`)

Blocked by: the owner's vault, and issue 06. `MIN_PROB_GAP` is a judgement
call on the real vault (9,450 notes) with the real INT8 models, the only
place the eval runs; and a clamp alone trades this issue for 06.

## What

`ScoreKind::Logit` (`src-tauri/src/semantic/filtering.rs`) sigmoids the
reranker logits, then judges them by the same `COSINE_GAP_RATIO = 0.04`
fraction-of-top rule as cosine, so the threshold shrinks with the top. A
confident list (top +4, p = 0.982) needs a 0.039 probability gap; a weak one
(top -3, p = 0.047) needs 0.0019, which a 0.05-logit step already exceeds
(p = 0.0452, gap 0.0022), cutting at #1. The 2026-09-09 eval measured 14 of
19 queries at exactly one result in both modes (mean 1.5 hybrid, 1.5
semantic), and for b02, b05 and b10 that result is the wrong note. Recall@10
and MRR@10 matched the absolute-logit rule it replaced and no expected path
was cut by either, so the damage is only the count. A weak top is exactly
where the filter has no evidence separating #1 from #2 and should cut late
or not at all.

## Fix

Clamp the threshold from below, on the `Logit` arm only - `Cosine` was left
byte-for-byte unchanged by `f8112171`, `Rrf` returns before the rule.
Today's line has no kind guard, so the clamp must add one:

```rust
let gap_threshold = match kind {
	ScoreKind::Logit => (top_score * COSINE_GAP_RATIO).max(MIN_PROB_GAP),
	ScoreKind::Cosine | ScoreKind::Rrf => top_score.abs() * COSINE_GAP_RATIO,
};
```

Pick `MIN_PROB_GAP` from the observed weak-top distributions, not by taste;
the `mean - stddev` fallback then runs on those lists instead.

The trap: a bucket C tail sits at p = 7.5e-4 down to 1.1e-4, winning gap
2.8e-4 against a 3.0e-5 threshold (`logit_flat_negative_tail_is_cut_short`,
:366). The smallest clamp protecting the weak-but-real list above (2.2e-3)
is about 8x that gap, so the rule stops firing there and bucket C grows
back; issue 06's floor is what then cuts the tail.

## Tests

`cargo test --manifest-path src-tauri/Cargo.toml`. The `Logit` cases at
`filtering.rs:311-415` cover a near-zero top, a flat negative tail and a
tight cluster; every expected keep count is recomputed by hand for the clamp.

## Done when

Owner-side eval (`docs/SEARCH.md` § "Evaluating retrieval changes",
`--compare` against `.kokobrain/eval/report-branch-sigmoid.json`) shows mean
result count above the sigmoid baseline in every A/B cell - A semantic 2.0,
A hybrid 1.5, B semantic 1.3, B hybrid 1.5 - an empty per-query regressions
list, no recall@10 or MRR@10 drop, and bucket C not grown back into a long
list of wrong notes.
