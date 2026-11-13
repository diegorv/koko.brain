VERDICT: CHANGES_REQUESTED

## Acceptance criteria

- [met] The five alias-budget cases no longer depend on a 2 s wall-clock bound under load (chosen option recorded in the commit) — `src/tests/lib/core/frontmatter/properties.logic.test.ts:342-387` has no `performance.now()` or `elapsed` left (the only timer left in the file is the out-of-scope `isFrontmatterUnparseable` case at :1012-1018); each case goes through `parseLinear` (:347-353), which asserts `_lastAliasPassSteps() < 4 * (yaml.length + 10_000)`. Commit 20990bcc says "The owner picked option A at triage: count work instead of time".
- [not met] Each case still fails against the pre-Issue-43 alias pass (check with a scratch revert, not committed) — I replaced `foldUnquotedWikilinks` with the pre-43 pass from `7006c723^`, counted the same way (one full-document walk per `alias.resolve`, one step per `isScalarChain` node and per copied node, abort past 10M), then restored the file. Run as a batch, all five fail. Run alone with `-t "depth-1000 chain"`, the depth-1000 case PASSES against the old pass (exit 0). In the batch it fails only because it reads the 10,000,001 left over from the case before it. See finding 1.
- [met] `queryjs-globals.test.ts` passes under full-suite load (cheaper, or an explicit timeout with the reason in a comment) — both cases take `{ timeout: LOADED_RUN_TIMEOUT }` (30 s) and the comment at `src/tests/help/queryjs-globals.test.ts:38-42` gives the reason: each case builds a TS program with the DOM lib (the `diagnose` code at :16-36 confirms this). A scratch probe showed vitest 5 honours `{ timeout }` on `it` and `it.each`: a 100 ms option failed a 300 ms case, and an 8 s option passed a 6 s case. The file passes alone. Only deliver's full suite can show it passing under load.
- [met] `invariants-harness.test.ts` and `queryjs-contract.test.ts` pass under full-suite load the same way — `invariants-harness.test.ts:408-410` puts `{ timeout: 30_000 }` on the per-corpus `it.each` and comments why. `queryjs-contract.test.ts:449-454` adds `LOADED_RUN_TIMEOUT` with a reason comment, used on the per-example `it.each` (:460) and on the DataArray.sort case (:480, the Issue's :473). Both files pass alone. Under load is deliver's to check.

## Findings

1. **blocker** — `src/tests/lib/core/frontmatter/properties.logic.test.ts:366-370` (with `src/lib/core/frontmatter/properties.logic.ts:85-91,118`): the depth-1000 case never runs the alias pass, so its step assertion reads the count left over from the test before it.
   - In vitest, `parseDocument` on a 1000-deep flow sequence gives a `RESOURCE_EXHAUSTION` error ("Maximum call stack size exceeded"). `toFrontmatterValue` then throws on `doc.errors` before it calls `foldUnquotedWikilinks`. `aliasPassSteps` is reset only inside the pass, so `_lastAliasPassSteps()` still returns the previous pass's count.
   - I logged the count in `parseLinear` (scratch, reverted) over three filtered runs and one full-file run. Each time the case read `steps=40006`, the exact count of the 50,000-alias case before it. The bound is 51,188, so the case passes on the new code only because of that leftover number.
   - Against the pre-43 pass it "fails" only because the case before it left 10,000,001. Alone it passes. The build report's claim that "all five failed" is an artifact of this.
   - The stack overflow does not always happen: in a separate probe file the same depth-1000 input did reach the pass (20,042 steps). So what the case checks also depends on JIT and stack state.
   - Fix:
     - Reset the counter wherever a parse starts, for example `aliasPassSteps = 0` at the top of `computeAndCache` or in `_resetParseFrontmatterCache`.
     - Make `parseLinear` also assert that the pass ran, for example `expect(_lastAliasPassSteps()).toBeGreaterThan(lines.length)`.
     - Use a depth the parser always accepts. Depth 500 reaches the pass in every context I probed, and the non-chain case already uses 500. A depth-500 chain with 100 aliases is still past the copy budget and still super-linear on the old pass.
     - Then redo the scratch revert with that case run alone.
2. **minor** — `src/lib/core/frontmatter/properties.logic.ts:81-85,152-160`: the counter covers the first walk only, not the second `visit(doc, { Seq })` fold walk or any yaml library call.
   - The doc comment says "one per node of its document walk", but the pass has two walks.
   - Under the old timer, a super-linear regression anywhere in the parse failed the cases. Now one fails them only when it sits in the counted code. A future `alias.resolve(doc)` or an uncounted re-walk would pass.
   - This is the tradeoff that option A accepts. Still, count the second walk too (it is linear in document plus copies, so the bound still holds), or say in the comment which walks are not counted.
3. **nit** — `src/tests/lib/core/frontmatter/properties.logic.test.ts:343-346`: the comment says the old pass needed "millions of steps on these inputs". After finding 1, that is not true of the depth-1000 input in vitest, which never reaches either pass. Fix the comment together with the input.

## Checks run (by me)

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `./node_modules/.bin/vitest run` on `src/tests/lib/core/frontmatter/properties.logic.test.ts`, `src/tests/help/queryjs-globals.test.ts`, `src/tests/help/queryjs-contract.test.ts` and `src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts`: exit 0, 4 files, 403/403 passed. My test verdict rests on these four files.
- Scratch probes, all removed or reverted, with the worktree left clean:
  - the step-count probe per case
  - the pre-43 counted revert, run as a batch and with the depth-1000 case alone
  - the depth sweep from 300 to 1000
  - the vitest `{ timeout }` probe
- Full suite and `pnpm build` not run: deliver runs them.
- Scope: the diff touches only the alias pass counter, the four test files and this Issue's work folder. No ledger, baseline or composition-root change.

## Resolution

1. **blocker: fixed in e74ffc38.** `aliasPassSteps` is reset at the top of `computeAndCache` (`properties.logic.ts:260`), so a parse that fails before the pass reads 0. `parseLinear` asserts the count is above 0 (`properties.logic.test.ts:353`). `> lines.length` as suggested fails on the 50,000-alias case, which hits the budget after about 20k steps and throws, so the check is `> 0`. Since the reset now happens per parse, that is enough to catch a parse that never reached the pass. The chain case uses depth 500 (`:369-370`). Scratch revert to the counted pre-43 pass (one full-document walk per `alias.resolve`, one step per `isScalarChain` node, per copied node and per fold-walk list, abort past 10M), each case run alone with `-t`: all five fail. Depth-500 chain: 2,695,899 vs bound 47,188. 5,000 aliases: 10,004,998 vs 235,588. The other three hit the 10M cap. Restored, each case alone passes.
2. **minor: fixed in e74ffc38.** The fold walk counts one step per list (`properties.logic.ts:157`). The doc comment (`:81-88`) lists the counted walks and says yaml's own work (`parseDocument`, `createNode`, `toJS`) is not counted.
3. **nit: fixed in e74ffc38.** The comment now says "far past the bound on these inputs" and explains the lower bound (`properties.logic.test.ts:343-348`).
