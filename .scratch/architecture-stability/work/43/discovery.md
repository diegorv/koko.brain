# Issue 43 discovery

No `spec.md` for architecture-stability. Follows `work/41` (same function, same test block); only the
alias pass and the panel guard change.

## Files that change

- `src/lib/features/properties/properties.logic.ts:39-81` (`isScalarChain`, `foldUnquotedWikilinks`):
  replace the `Alias` visitor (which calls `alias.resolve(doc)` with no ctx, a full document walk per
  alias) with one `Node` visitor holding a `Map<anchor, node>`. Non-alias node with an anchor: record it.
  Alias: `anchors.get(alias.source)`. Same visit order as yaml 2.9.1 `Alias.resolve`
  (`dist/nodes/Alias.js`, which collects anchored nodes with the same `visit` and takes the last one
  before the alias), so "most recent preceding anchor" holds. A returned copy is re-visited by `visit`;
  its anchors are cleared first, so it records nothing.
- Same function: a budget of 10,000 copied nodes per document (`isScalarChain` becomes
  `scalarChainSize`, counted before cloning). Past it, throw: `computeAndCache` catches and caches `[]`.
- `:166-179` and `:259-268` (`computeAndCache`, `isFrontmatterUnparseable`): a failed parse (throw, or
  a root that is neither null nor a mapping) caches a shared frozen `UNPARSEABLE` sentinel instead of a
  fresh `[]`. `isFrontmatterUnparseable` goes through `cachedParse` and checks for the sentinel, so a
  panel commit after the panel's own parse is a cache hit and an over-budget note costs one parse.
- `docs/adr/0029-frontmatter-yaml-canonical-form.md:107` (Issue 41 amendment): state the budget; the
  "now parses" sentence about >100 aliases gets the cap.

## Tests (`src/tests/lib/features/properties/properties.logic.test.ts`, `unquoted wikilinks` block)

- Failing first: 50k aliases to `&x X` (over budget -> `[]`), 5k aliases (under budget, all resolve),
  a depth-1000 chain with 100 aliases (-> `[]`), an alias chain of L=600 (-> `[]`); each under 2 s.
- 13 anchor/alias cases checked against `yaml.parse` (re-defined anchors, anchors in keys, anchor on
  a null, alias before its anchor, map and multi-item list targets, ...). The review's own list is not
  in the repo, so these are reconstructed; the ones already present are not duplicated.
- `isFrontmatterUnparseable` after `parseFrontmatterProperties` on a `!foo` block logs the warning once
  (a second parse would log it twice): real observable signal of the shared parse.

## Risks / defaults

- Budget default 10,000 (the review's prototype). A legit note copies a handful of nodes.
- `isFrontmatterUnparseable` now logs YAML warnings on a cache miss, like `parseFrontmatterProperties`.
- Not checked: the Rust path (out of scope per the Issue's notes).
