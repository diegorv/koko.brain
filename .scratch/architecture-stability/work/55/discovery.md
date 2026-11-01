# Issue 55 discovery

No `spec.md` in the feature folder. The Issue's paths are stale: Properties moved to `core/frontmatter/`.

## Files that change

- `src/lib/core/frontmatter/properties.logic.ts:64-138` (`scalarChainSize`, `foldUnquotedWikilinks`): a module-level step counter and a test-only `_lastAliasPassSteps()` export, next to `_resetParseFrontmatterCache` (:311).
- `src/tests/lib/core/frontmatter/properties.logic.test.ts:341-395` (`describe('alias copy budget')`): drop the `ms()` timer and the `elapsed < 2000` asserts; assert the step count instead.
- `src/tests/help/queryjs-globals.test.ts:38`: explicit timeout on the describe.
- `src/tests/help/queryjs-contract.test.ts:449-487`: explicit timeout on the per-example loop and the sort-sensitivity case (:473).
- `src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts:408`: explicit timeout on the per-corpus loop.

## Plan

1. Option A (owner pick): count the alias pass's steps, one per node of its document walk, one per node it sizes (`scalarChainSize` call), one per node it copies (the anchor-clearing walk over a copy). Reset at the start of each pass. Each of the five cases asserts the count stays under a small constant times the frontmatter length (linear), no timer. The pre-Issue-43 pass (`alias.resolve(doc)` walks the whole document per alias, `isScalarChain` re-walks the target per alias, no copy budget) is quadratic or worse on every one of the five inputs.
2. Scratch revert (not committed): put the pre-43 `foldUnquotedWikilinks` back with the same counting (a resolve counts a full document walk) and an abort past 10M steps, and confirm each of the five cases fails.
3. Timeouts: 30 s on the queryjs-globals, queryjs-contract and invariants-harness loops, with the reason in a comment (each case runs in 0.2 to 1.6 s alone, was seen at 6 to 9 s under a full suite on a loaded machine; 5 s is the vitest default). vitest 5 takes `{ timeout }` as the second argument of `describe`/`it`.

## Prior art

- `_resetParseFrontmatterCache` (test-only export, underscore prefix) in the same module.
- Issue 43's work folder (`work/43/`) for the five inputs and their old timings (21 s to 543 s).

## Risks and defaults

- The counter is a module-level `let` in a `.logic.ts`; it is not reactive state and holds only the last pass's count, like the parse cache holds module state.
- The bound constant is picked from measured counts with a wide margin on both sides (new code well under it, old code over it by 10x or more).
- Not changed: `isFrontmatterUnparseable`'s relative-time test (:1018, `checkMs < parseMs / 4`), which is outside the Issue; noted in the report.
