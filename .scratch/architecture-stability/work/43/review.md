VERDICT: CHANGES_REQUESTED

## Acceptance criteria

- [met] A failing test first, for each shape in the table: N aliases to one anchor, a deep chain with many aliases, and an alias chain. Each finishes well under a second (assert a bound loose enough not to flake on CI, for example 2 s), and the over-budget shapes parse to `[]`. — The test commit 4a2f6e05 comes before the fix f53a2d63. It adds `describe('alias copy budget')` (properties.logic.test.ts:340), with 5k aliases (resolve), 50k aliases, a depth-1000 chain x 100 aliases and an L=600 alias chain (the last three must give `[]`), each `< 2000` ms. I ran main's `properties.logic.ts` in a temp probe: 5,000 aliases took 5336 ms there, so that test fails on main. On main the 50k shape also parses fully instead of giving `[]`. All four pass on the branch.
- [met] The existing Issue 39 and 41 tests pass unedited, including the 13 anchor and alias cases the review ran (add the ones that are not already tests). — `git diff main...HEAD` on the test file only adds lines (hunks at :313 and :911); no existing test was touched. It adds 13 `it.each` cases ("resolves %s like yaml.parse"). I compared a sample of them, plus extra cases (`&k key: v`, re-defined anchor in a copy, `[&x X, *x]`, the folded `[[X]]` aliases), against `yaml.parse` in a probe and they match apart from the intended folds. properties.logic.test.ts passes.
- [met] `isFrontmatterUnparseable` does not pay the full cost a second time on a panel commit (share the parse, or reuse the cache). — properties.logic.ts:303-307 now goes through `cachedParse` and checks for the `UNPARSEABLE` value. A failed parse or a non-mapping root caches that value at :223 and :235, and an empty or null block still caches a separate frozen `[]` (:229). The test at properties.logic.test.ts:985 asserts the check takes under 1/4 of the first parse. The live-preview caller `dispatchMetaBindUpdate` (widgets.ts:788) gains the same reuse.
- [met] The ADR 0029 amendment states the budget and drops "harmless". — docs/adr/0029-frontmatter-yaml-canonical-form.md:107 now says "at most 10,000 copied nodes per block (`ALIAS_COPY_BUDGET`)", what happens past the cap and why. "harmless" is not in the file on main or on the branch (`grep -c harmless` gives 0). The "now parses (Rust has no such limit)" sentence that the Issue objected to is gone.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors and 0 warnings.
- My test verdict rests on these runs, each read from its own exit status:
  - `pnpm vitest run src/tests/lib/features/properties src/tests/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.test.ts src/tests/lib/features/collection/toolbar/properties-logic.test.ts`: exit 0, 15 files, 620 tests passed. This covers properties.logic.test.ts, properties.service.test.ts, frontmatter-parity.test.ts and the other properties tests.
  - `pnpm vitest run .../live-preview/meta-bind-writers.test.ts .../live-preview/meta-bind-input-widgets.test.ts` (callers of `isFrontmatterUnparseable`): exit 0, 41 passed, 1 skipped.
- I did not run the full suite or `pnpm build`; deliver runs those. Nothing under src-tauri changed, so cargo was not needed. Layer baseline and `BASELINE_SIZE` are untouched.
- The probes were temp files under src/tests/zz-probe/, deleted afterwards. The worktree is clean apart from this file.

## Findings

1. **blocker**, src/lib/features/properties/properties.logic.ts:89. The pass is still unbounded when an alias's target is a deep run of one-item lists that does not end in a scalar. `scalarChainSize(target)` walks the whole run on every alias, then returns 0, so none of that work is charged to `ALIAS_COPY_BUDGET`. The alias is left in place, and yaml's `maxAliasCount` only applies later, in `toJS`, after the visit has finished. Measured on the branch: one anchor `x: &x [[...[a, b]...]]` at depth D, then N lines `kI: *x`:
   - D=500, N=5,000 (50 KB): 493 ms
   - D=500, N=20,000 (210 KB): 1.9 s
   - D=500, N=50,000 (540 KB): 4.9 s
   - D=900, N=50,000: 8.4 s
   - `yaml.parse` on the same 540 KB input: 176 ms, then it throws "Excessive alias count".

   That is the same class of hang the Issue is about: a synced or clipped note blocks every save, watcher and calendar parse for seconds. The Issue's own 539 KB row was meant to drop to about 0.3 s. Fix: cache the result per target node in a `Map<Node, number>`. That is safe because a target's subtree is fully visited before any alias that follows it, and an alias inside its own target sees an alias, so 0, both times. Or charge the depth walked to the budget even when the result is 0. Add a test like the four existing ones: depth-500 non-chain target with 50,000 aliases, under 2 s, parses to `[]`.
2. **minor**, src/lib/features/properties/properties.logic.ts:306. `isFrontmatterUnparseable` can now throw. On main it parsed inside its own `try` and returned `false` for `a: &x [*x]` (a self-referencing alias). It now calls `cachedParse`, and `computeAndCache` throws there: `convertToProperty` calls `JSON.stringify` on the circular array (:130), outside the `try`. The crash itself predates this branch: `parseFrontmatterProperties` throws on the same input on main, which I checked with a probe against main's file. So callers (`commitChanges`, `dispatchMetaBindUpdate`) end up throwing either way, just earlier. Fix: run the property build inside the `try` (or catch a circular value in `convertToProperty`), so such a block caches `UNPARSEABLE`. Or file it as a follow-up Issue, since it is a separate crash on a crafted note.
3. **nit**, src/tests/lib/features/properties/properties.logic.test.ts:340. No test pins the budget edge. A probe shows 10,000 aliases to one scalar parse and 10,001 give `[]`, so the `>` comparison is right, but nothing guards it. Fix: add a 10,000 / 10,001 pair.
4. **nit**, src/tests/lib/features/properties/properties.logic.test.ts:985. The reuse test depends on a timing ratio (`checkMs < parseMs / 4`). The discovery planned a check that does not depend on timing: a `!foo` block followed by `isFrontmatterUnparseable` logs the warning once. That would prove the parse is shared. Fix: add that assertion next to the timing one.

## Resolution

1. **Fixed** in b7a52d54. `foldUnquotedWikilinks` caches each target's `scalarChainSize` in a `Map<Node, number>`, so N aliases to one deep target walk it once. New test "reads 50,000 aliases to a depth-500 non-chain target as unparseable, quickly" (properties.logic.test.ts:386): it took 5059 ms and failed before the fix, and passes under 2 s with `[]` after it.
2. **Fixed** in 782b8ef4. The property build in `computeAndCache` runs in a `try` whose catch caches `UNPARSEABLE`, so `a: &x [*x]` parses to `[]` and `isFrontmatterUnparseable` returns true without throwing. New test "is true for a self-referencing alias instead of throwing" failed before the fix (it threw) and passes after it.
3. **Fixed** in b7a52d54. New test "resolves exactly 10,000 alias copies and reads 10,001 as unparseable" pins the `>` edge. It passed before the code change, as expected for a guard.
4. **Fixed** in 782b8ef4. New test "reuses the earlier parse, so a YAML warning is logged once": `!foo` block, parse, then check, `console.warn` called once. The timing test stays as it was.

Checks: `pnpm check` exit 0 (0 errors, 0 warnings). `pnpm vitest run` on src/tests/lib/features/properties, frontmatter-slice, collection/toolbar/properties-logic, meta-bind-writers and meta-bind-input-widgets: exit 0, 17 files, 665 passed, 1 skipped.
