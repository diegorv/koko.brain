VERDICT: APPROVED

Re-review, round 2. Fix commit reviewed: 0a864d78 ("docs: correct the band-click mouse selection JSDoc"), diff `1b37c93f..HEAD`. It changes only two JSDoc blocks in `block-band-click.ts` and appends `## Resolution` to `review.md`. No code, test or spec line changed.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | nit | resolved | `block-band-click.ts:122-123` now reads "Any other press falls through: a plain single click to `bandDragHead`, double and triple clicks to CodeMirror's default." That matches the code: `bandDragHead` returns `null` for `event.button !== 0 \|\| event.detail > 1` (`block-band-click.ts:174`), so those presses reach the default. |
| 2 | nit | resolved | The `bandDragHead` JSDoc (`block-band-click.ts:163-164`) names `@codemirror/view` 6.43.15 and asks for a re-check on a bump. `node_modules/@codemirror/view/package.json` is 6.43.15, and `package.json:32` pins `^6.43.15`, so the version is right. |
| 3 | nit | rejection stands | It was optional. The doc-end-with-text path returns `null` from `bandClickTarget` into the copied default single-click mapping, and the jsdom test at `block-band-click.test.ts:261` pins that. The test still passes (see Checks). |
| 4 | nit | rejection stands | This is a pre-existing mermaid flake on main. The review asked for no change, and the fix commit made none. |

## Acceptance criteria re-checked

- [met] `doc-edge-widgets.spec.ts` "... on the last line: the empty editor space under the document keeps it rendered" (code block and image embed) pass with `test.fail()` removed — The fix round did not touch the spec or any runtime code. The comment-only diff cannot change round 1's passing E2E run (tests 55 and 58). `test.fail()` is still gone (`git diff main...HEAD` on `doc-edge-widgets.spec.ts`: -2 lines).
- [met] `drag-select.spec.ts` "a drag from the end of "After line." up into the band below a code block stops before the block" passes with `test.fail()` removed — No spec or code change since round 1's pass. `test.fail()` is still removed (`drag-select.spec.ts`: -2 lines vs main).
- [met] Failing first: `block-band-click.test.ts` (jsdom) cases for both paths — The test file was not changed by the fix commit. I re-ran it on HEAD: 34/34 pass. Round 1's red check against main's source still applies.
- [met] The other `drag-select.spec.ts` tests stay green, including the drag onto the right half of a code block body, which selects into the block and reveals it by design — The comment-only change leaves round 1's green run of tests 59-64 valid.
- [met] A press below the last line of a note that ends with plain text still puts the cursor at the document end — The code path is unchanged. The jsdom case at `block-band-click.test.ts:261` passes in my run.

## Findings

None open or new. The fix commit has no scope creep, deletes or weakens no test, and adds no layer-baseline entry or composition root.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.test.ts`: exit 0, 34/34.
- Not run: E2E (the fix touched no runtime code), the full vitest suite and `pnpm build` (deliver runs them).
