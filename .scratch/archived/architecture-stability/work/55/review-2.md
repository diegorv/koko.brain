VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | `aliasPassSteps = 0` now sits at the top of `computeAndCache` (`src/lib/core/frontmatter/properties.logic.ts:260`) and is gone from inside `foldUnquotedWikilinks`, so a parse that throws on `doc.errors` before the pass reads 0, not the previous case's count. `parseLinear` resets the parse cache first (`properties.logic.test.ts:350`), so no case can be a cache hit that skips the reset, and it asserts `toBeGreaterThan(0)` (`:353`). The chain case uses depth 500 (`:369-370`). I ran each of the five cases alone with `-t`: 5/5 pass, so with the `> 0` check each one reaches the pass by itself and no longer depends on a leftover count. The fix step's revert numbers line up with the bound: depth-500 chain bound `4 * (yaml.length + 10_000)` = 47,188 for a yaml of about 1.8k chars, and an uncapped pass that walks the whole growing document once per alias (100 aliases, up to 50k copied nodes) gives about 2.5M steps, the reported 2,695,899. Rejecting `> lines.length` holds: the 50,000-alias case throws at the copy budget after about 40k steps, which is fewer than its 50,001 lines. |
| 2 | minor | resolved | The fold walk counts one step per `Seq` (`properties.logic.ts:157`). The doc comment (`:81-88`) lists the counted walks and says yaml's own `parseDocument` / `createNode` / `toJS` are not counted, which is the tradeoff option A accepts. |
| 3 | nit | resolved | The comment now says "far past the bound on these inputs" and explains the lower bound (`properties.logic.test.ts:343-348`). |

## Acceptance criteria

- [met] Each case still fails against the pre-Issue-43 alias pass (check with a scratch revert, not committed) — the depth-1000 case that passed alone against the old pass is now depth 500 and asserts the pass ran (`> 0`, with a per-parse reset). Alone, it passes on the new code. The fix step's scratch revert, each case run alone, reports all five failing: 2,695,899 vs 47,188 and 10,004,998 vs 235,588, and the other three hit the 10M cap. Those numbers match the bound arithmetic. Nothing from the revert is committed: `git diff main...HEAD --stat` lists only the logic file, the four test files and the work folder.
- [met] The five alias-budget cases no longer depend on a 2 s wall-clock bound under load (chosen option recorded in the commit) — the fixes add no timer. `parseLinear` still asserts only step counts (`properties.logic.test.ts:349-356`). Option A is recorded in 20990bcc.

## Findings

None open or new.

- Regressions: the fixes do not change behaviour. The counter is a module-level number written in `computeAndCache` and in the pass, and production code never reads it. No test was deleted or weakened: the upper bound is unchanged, and the depth change keeps the case past the copy budget (100 x 500 > 10,000) and still unparseable.
- Scope: the fix commits touch only `properties.logic.ts`, its test file and `work/55/review.md`. No baseline, `BASELINE_SIZE` or composition-root change.

## Checks run (by me)

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `./node_modules/.bin/vitest run src/tests/lib/core/frontmatter/properties.logic.test.ts`: exit 0, 242/242 passed.
- Each of the five budget cases alone with `-t`: exit 0 each.
- I did not redo the scratch revert in this round. Criterion 2 rests on the fix step's numbers, which I checked against the bound arithmetic. The full suite and `pnpm build` are deliver's to run.
