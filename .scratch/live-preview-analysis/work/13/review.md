VERDICT: APPROVED

# Issue 13 review: meta-bind-button fences use FencedCode detection

Reviewed `git diff main...HEAD` (main 958d8491 to 6728125b). Paths below are under `src/lib/core/markdown-editor/extensions/live-preview/` and tests under `src/tests/lib/core/markdown-editor/extensions/live-preview/`.

## Acceptance criteria

- [x] **Characterization tests for the current meta-bind-button scanner land first.** Met. Commit a981040a adds 11 cases to `plugins/meta-bind-button-field.test.ts` (range and label, decoration count, empty block error widget, spaces and longer fence, shorter and info-string fences do not close, unclosed / extra words / indented / blockquote / tilde render nothing, two blocks) before any source change. I checked out a981040a (pre-switch source) and ran the file: 17/17 passed.
- [x] **Test: a meta-bind-button fence nested in a ````md fence is not rendered.** Met. `plugins/meta-bind-button-field.test.ts` "meta-bind-button fenced code awareness" covers the nested fence with and without an `md` code language (the app mounts a nested markdown tree for `md`). I ran the d0521615 version of the file against the a981040a source: those 3 tests failed and the other 17 passed, so the tests catch the bug. `parsers/meta-bind-button.test.ts` adds the same case at parser level.
- [x] **A top-level meta-bind-button fence still renders; existing tests pass.** Met. "still renders a top-level meta-bind-button fence next to a ````md fence" asserts `['Top']`, and every characterization case passes on the new source unchanged.

## Code checks

- `parsers/meta-bind-button.ts:18-30`: `findAllMetaBindButtonBlocks(state)` follows the mermaid / queryjs / collection pattern from Issue 08 exactly (`findSpecialFenceBlocks` + rename `content` to `yamlContent`). It keeps the old opening regex, so backtick-only, column-0 and exact-info-string rules are unchanged. `MetaBindButtonBlock` keeps its fields.
- `plugins/meta-bind-button-field.ts:12-38`: same loop shape as `plugins/mermaid-field.ts:11-38`. Blocks come in document order from `tree.iterate` and do not overlap (mounted nested trees are not entered), so `RangeSetBuilder` gets sorted ranges. An empty block hides only the closing fence line, which matches the old output (characterization test checks the error widget range).
- The removed `findMetaBindButtonBlock` had no other callers (grep over `src/` and `docs/`). The `getAllLines` import is dropped. Other users of `getAllLines` are unaffected.
- `plugins/code-block-field.ts:12` still skips the `meta-bind-button` language, so the generic code-block decorator does not claim these fences. Nothing changed there.
- Layer rules: unchanged (parser in `core/markdown-editor`, no new imports across layers). No error handling paths involved. Performance: one Lezer tree walk instead of a line scan, the same cost model as the other three special fences. `blockDecorator` still supplies the viewport guard.
- Behavior shifts (closing fence indented up to 3 spaces now closes, a fence inside an HTML block no longer renders, detection waits on the Lezer parse) are the ones Issue 08 accepted for the other special fences. They are documented in the build report and the d0521615 commit message.
- Scope: the diff touches only the files the Issue lists plus their tests. No scope creep.
- Commits: each has Context / Problem / Solution / Behavior / Files and the Co-Authored-By line.

## Test verdict basis

I ran these myself; the verdict rests on them:
- `plugins/meta-bind-button-field.test.ts`, `parsers/meta-bind-button.test.ts`, `parsers/combined-block-structures.test.ts`, `plugins/block-reveal.test.ts`, `plugins/special-fence-detection.test.ts`, `parsers/fenced-code-block.test.ts`: 6 files, 164/164 passed.
- The whole `src/tests/lib/core/markdown-editor/extensions/live-preview/` folder (includes `plugins/code-block-field.test.ts` and `parsers/combined-table-meta-bind.test.ts`): 90 files, 1257/1257 passed.
- Probe on the pre-switch source (a981040a): characterization file 17/17 passed. The final field test file there: 3 nested-fence tests failed, 17 passed.
- `pnpm check`: 211 files, 0 errors, 0 warnings.

I did not run the full gate (`pnpm vitest run` over the whole suite + `pnpm build`). The deliver step runs it.

## Findings

1. **Low (optional), `parsers/fenced-code-block.ts:105`.** The JSDoc on `SpecialFenceBlock` reads "claimed by a specialized decorator (mermaid, queryjs, collection)". meta-bind-button is now a fourth user, so the list is out of date. Fix: add `meta-bind-button` to the list, or drop the list ("claimed by a specialized decorator"). This does not block approval. The Issue lists the file as read-only, so leaving it as is would also be fine.
2. **Info, commit 7bc3b04d message.** The Files section gives `discovery.md (L1-29, new)` but the file is 24 lines. This is commit text only and needs no change. Do not rewrite history for it.

## Resolution

1. Fixed: the `SpecialFenceBlock` JSDoc in `parsers/fenced-code-block.ts:105` now lists meta-bind-button.
2. Accepted as info only: commit 7bc3b04d is not rewritten.
