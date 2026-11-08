# Issue 01 discovery

No `spec.md` for architecture-stability; ADRs not needed (process doc only). Docs-only Issue.

## Files that change

- `CLAUDE.md:304-306` § Implementation process: add option (B), the post-delivery review rule run
  by the main session, with its skip rule and its follow-up rule.

Nothing else: the generated launch scripts are not edited (and `.agent-relay-lite/launch/` is not in
the checkout), `.agent-relay-lite/config.json` keeps its `rules` (option A was not chosen).

## How the review range is found (checked in history)

The squash commit body lists every branch sub-commit with its full SHA, in order (e.g. 06cd5f35,
Issue 38: `... fd754fd4 docs(...): Issue 38 review`, then `006ef2e8 test(...)`, then `... resolved`).
So the range is `<last "Issue NN review" SHA>..<last sub-commit SHA>`, read from the squash body.
The branch is gone after delivery, so these SHAs are dangling: only reachable until `git gc` prunes
them, hence "right after the delivery". `git diff <a> <b>` works on dangling commits while they exist.

## Plan

One paragraph plus a short list under § Implementation process:
1. When: right after each `/relay-lite:run` delivery, before any `git gc`.
2. What: opus sub-agent, adversarial (written to refute), on `git diff <review>..<head>` minus the
   Issue's own `.scratch` bookkeeping.
3. Skip: the diff changes only tests, docs or copy (user-visible strings).
4. Findings: a follow-up `.scratch` Issue, or added to an open Issue that touches the same code.
5. No re-review option in the plugin today (`reReviews` loops only on CHANGES_REQUESTED).

## Defaults taken

- "Opus" = the session's opus model, per the sub-agent model policy; not pinned to a version in CLAUDE.md.
- A delivery with no review commit after the last fix commit (no fix after review) needs no review.
- A null or failed reviewer is not a pass: rerun it.

## Left undone (not doable in this run)

- Asking the plugin author about a re-review-after-deliver option: owner action.
- Criterion 2 (next delivered source-changing Issue gets a non-null post-delivery review and its
  findings filed): verified on the next relay run by the main session, not here.

## Risks

- None to the app: no source change. Gate is the config JSON parse.
