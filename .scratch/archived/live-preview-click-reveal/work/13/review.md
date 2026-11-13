VERDICT: APPROVED

## Acceptance criteria

- [met] `doc-edge-widgets.spec.ts` "... on the last line: the empty editor space under the document keeps it rendered" (code block and image embed) pass with `test.fail()` removed — `test.fail()` is gone at `doc-edge-widgets.spec.ts:90` (commit 90eee3b8). My run of `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal` (exit 0): tests 55 (fenced code block) and 58 (wikilink image embed) "on the last line: the empty editor space under the document keeps it rendered" both passed on the first try. The fix is in `bandClickTarget` (`block-band-click.ts:93-95`): a press on `.cm-content` below the last laid-out line returns `{ pos: null }` when that line holds a sole block widget.
- [met] `drag-select.spec.ts` "a drag from the end of "After line." up into the band below a code block stops before the block" passes with `test.fail()` removed — `test.fail()` is gone at `drag-select.spec.ts:79`. It passed on the first try in my click-reveal run (test 60): the selected text is `'\nAfter line.'` and the block stays rendered. The fix is `bandDragHead` (`block-band-click.ts:169-201`), installed at `Prec.lowest` in `live-preview.ts:85`.
- [met] Failing first: `block-band-click.test.ts` (jsdom) cases for both paths — I put main's `block-band-click.ts` and `live-preview.ts` back temporarily, with an inert `bandDragHead` export so the import resolves, and ran the file. 5 tests failed, including "a press in the empty space under a document that ends with a block ...", "keeps the selection for a press under every line when the last line is a block" (path 1), and "a drag from the end of a text line up into the band below a block ..." (path 2). Then I restored HEAD (`git status` clean). The "band above" drag test pins `blockEdge`: without it the head would be `line(2).to`, not the stubbed `blockStart`. On HEAD: 34/34 pass.
- [met] The other `drag-select.spec.ts` tests stay green, including the drag onto the right half of a code block body, which selects into the block and reveals it by design — every drag-select test passed in my click-reveal run (tests 59-64). That includes "a drag from "Above line." onto the right half of the code block body selects into the block and reveals it" (test 63). The reason is in the code: a head over the widget body is not a band (`bandClickTarget` returns `null` when the target is inside the widget), so it gets `posAndSideAtCoords`, exactly as before.
- [met] A press below the last line of a note that ends with plain text still puts the cursor at the document end — `bandClickTarget` returns `null` when the last laid-out line has no sole block widget (`block-band-click.ts:95`), so `bandDragHead` maps the press with `posAndSideAtCoords`, as CodeMirror's default does. Unit tests: "a press in the empty space under a document that ends with text puts the cursor at the document end" (`block-band-click.test.ts:261`) and the existing "returns null for a press under every line" on `DOC`. Both pass. See finding 3 for the gap.

## Findings

1. nit — `src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:122`: the `blockBandClick` JSDoc still says "Any other press gets CodeMirror's default." In live preview, any other plain single click now goes to `bandDragHead`; only double and triple clicks still get the default. Fix: say that other presses fall through to `bandDragHead` (single clicks) or CodeMirror's default (double and triple clicks).
2. nit — `src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:162-201`: `bandDragHead` is a hand copy of `basicMouseSelection` (`@codemirror/view` 6.43.15). I checked it line by line against `node_modules/@codemirror/view/dist/index.js`, and it matches:
   - the anchor/head order;
   - shift-extend with `extend(pos, pos, assoc)`;
   - `removeRangeAround` with the same `mainIndex` rule;
   - `addRange`;
   - `EditorSelection.range(start, pos, assoc)`, which passes `assoc` in the `goalColumn` slot, as upstream does;
   - the `update` mapping.

   Two differences, both harmless: `event.detail > 1` stands in for `getClickType`, which only differs on IE11, and a `detail === 0` press is treated as a single click, where upstream treats it as a triple click. No test would catch a future upstream change to this path. Fix (optional): name the `@codemirror/view` version the copy follows in the JSDoc, so a dependency bump knows to re-check it.
3. nit — `src/tests/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.test.ts:261`: the plain-text doc-end criterion is covered only in jsdom, with `posAndSideAtCoords` stubbed to the doc end. There is no E2E press below a note that ends with text. The code path is a plain `null` return into the copied default, so the risk is low. Fix (optional): add a doc-edge E2E case for a note that ends with text.
4. nit (pre-existing, not this diff) — `e2e/specs/live-preview/click-reveal/mermaid.spec.ts:79` "clicking the line after the diagram moves the cursor there" failed once in my run with active line `''` and passed on retry. Reviews 01, 03 and 07 of this feature recorded the same flake on main. No change asked.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.test.ts`: exit 0, 34/34.
- `pnpm vitest run src/tests/lib/core/markdown-editor/extensions/live-preview src/tests/lib/core/markdown-editor/editor-host.test.ts src/tests/lib/features/collection/collection-block-click.test.ts`: exit 0, 102 files, 1621 passed, 1 skipped. These are the test files of the changed code and every test that imports `livePreviewExtensions`.
- Red check: the new tests against main's source, 5 failed as expected (see criterion 3).
- `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal`: exit 0, 205 passed, 1 flaky (finding 4). The two audio-player ✘ lines are existing `test.fail()` cases.
- `bash scripts/e2e.sh e2e/specs/live-preview/*.spec.ts e2e/specs/editor.spec.ts e2e/specs/wikilink-navigation.spec.ts e2e/specs/collection-block.spec.ts e2e/specs/embed-widgets.spec.ts`: exit 0, 128 passed. Run because `bandDragHead` now handles every plain single click in live preview. Together with the run above, this covers the whole `e2e/specs/live-preview` gate folder.
- Not run: the full vitest suite and `pnpm build` (deliver runs them).

The verdict rests on `block-band-click.test.ts`, the live-preview unit folder, `editor-host.test.ts`, `collection-block-click.test.ts`, and the E2E runs above. No layer-baseline or composition-root changes. Scope is limited to `block-band-click.ts`, `live-preview.ts`, their test, the two spec markers and the Issue's own records.

## Resolution

1. Fixed: the `blockBandClick` JSDoc now says a plain single click falls through to `bandDragHead` and double and triple clicks to CodeMirror's default.
2. Fixed: the `bandDragHead` JSDoc names `@codemirror/view` 6.43.15 as the version the copy follows and asks for a re-check when that dependency moves.
3. Not done (optional): the doc-end-with-text path is a plain `null` return into the copied default, pinned by the jsdom test at `block-band-click.test.ts:261`; an E2E case adds cost for little risk. Left for a follow-up if wanted.
4. No change (pre-existing flake on main, no change asked).
