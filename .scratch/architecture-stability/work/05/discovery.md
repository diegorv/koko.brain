# Issue 05 discovery

Repeats the Issue 04 pattern (`work/04/`): pure helpers in `scripts/import-graph.mjs`, a ratchet
test over a JSON baseline, synthetic in-memory edges for the failure messages. Only the diffs below.
No `spec.md` for architecture-stability; ADR-0003 is the reference.

## Numbers at HEAD (40854d66), regenerated as the Notes ask

- 56 directed feature pairs (the Issue's 50 were at dad4c4c6).
- One SCC of 12 features: the 10 listed plus `canvas` and `rail-shell` (rail-shell landed with the
  sidebar redesign; `search -> rail-shell -> canvas -> quick-switcher -> properties -> tags -> search`).
- 33 intra-cycle pairs (the Issue's 24). No feature pair is type-only today.
- `search -> deep-link` is still a valid synthetic: `deep-link -> search` exists, deep-link is outside.

## Files that change

- `scripts/import-graph.mjs`: add `featurePairs(edges)`, `stronglyConnected(pairs)` (Tarjan,
  self-edges ignored), `cyclePath(pairs, from, to)`, `checkFeatureCycles(pairs, baseline)`;
  CLI guard at :272 wrapped in try/catch (error = not main).
- `src/tests/lib/architecture/import-graph.test.ts`: SCC unit tests (acyclic, 2-cycle, nested,
  self-edge) written first; CLI-guard test via `spawnSync(node -e import(...) extra-arg)`.
- `src/tests/lib/architecture/feature-cycle.test.ts` (new) + `feature-cycle-baseline.json` (new).
- `docs/adr/0003-four-layer-source-taxonomy.md:25`: describe the feature-cycle ratchet.

## Defaults taken

- The feature baseline is a separate file, `feature-cycle-baseline.json`, with keys
  `featureCycleEdges` and `featurePairs`. `layer-baseline.json` stays a string array untouched
  (the run's rules forbid adding to it).
- `featurePairs` (all 56) is synced by the test: when it differs from HEAD the test rewrites that
  key and passes, so a new acyclic pair appears in the git diff for review. This is the only way
  "shows up in the diff without failing" can hold. `featureCycleEdges` is never written by the test.
- `featureCycleEdges` is pinned by an exact size constant (33), like `BASELINE_SIZE`.
- Failure for an intra-SCC pair not in `featureCycleEdges` (new cycle, joining feature, new pair):
  cycle path `a -> b -> ... -> a` through that pair (shortest path back), plus both fixes.
- Stale: a listed pair that is gone or no longer inside an SCC fails with the delete instruction.
- Feature edges = any import from `features/x/...` to `features/y/...`, x != y, every kind
  (type-only, dynamic, re-export). command-palette (a composition root) is not exempt.

## Risks

- A test that writes a tracked file: in CI the rewrite is lost; the review signal is local only.
