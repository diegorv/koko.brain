# 13: The empty space under a document that ends with a block, and a drag into a band, keep the block rendered

**Status:** resolved

Priority: P3 (found by Issue 09's coverage; two more paths around `blockBandClick`)

**What to build:** Two cases `blockBandClick` (`src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts`) does not handle yet. Owner rule (2026-11-03): blank space around a widget never reveals it.

1. **Empty editor space under the document.** When a note ends with a block widget (code block, image embed), a press in the empty `.cm-content` area below the last line hits `DIV.cm-content`; `bandClickTarget` finds no line there (`lineAtY`, `block-band-click.ts:53,82-84`) and returns `null`, so CodeMirror maps the press to the document end, inside the widget's replaced range, and the widget reveals. Expected: the widget stays rendered; the cursor goes to the end of the last visible text line before it, or stays where it was if there is none (record the choice in Notes).
2. **A drag from text into a band.** A drag that starts on "After line." and moves up into the band below a code block selects the whole block and reveals it: `blockBandClick` only takes over when the press starts in a band (`block-band-click.ts:113-115`), and CodeMirror's default style maps the band into the replaced range. Expected: the selection stops at the block's edge (the start of the line after it), as the drag into the band ABOVE a block already does.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview` (E2E)

**Source:** Issue 09 Notes (known bugs 2 and 3), `e2e/specs/live-preview/click-reveal/doc-edge-widgets.spec.ts:90`, `e2e/specs/live-preview/click-reveal/drag-select.spec.ts:79`, src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts

- [x] `doc-edge-widgets.spec.ts` "... on the last line: the empty editor space under the document keeps it rendered" (code block and image embed) pass with `test.fail()` removed
- [x] `drag-select.spec.ts` "a drag from the end of "After line." up into the band below a code block stops before the block" passes with `test.fail()` removed
- [x] Failing first: `block-band-click.test.ts` (jsdom) cases for both paths
- [x] The other `drag-select.spec.ts` tests stay green, including the drag onto the right half of a code block body, which selects into the block and reveals it by design
- [x] A press below the last line of a note that ends with plain text still puts the cursor at the document end

## Notes

- Found by Issue 09 (2026-11-03). Both paths live in the same file, so they are one Issue.
- Choice for path 1 (2026-11-03): a press in the empty space under a note that ends with a block widget keeps the cursor where it was, as the band below a last-line widget does. The E2E fixture puts a blank line right before the block, so "the end of the last visible text line before it" would move the cursor off "End line.", which the spec asserts against.
- Path 2 is handled by `bandDragHead` (`Prec.lowest` mouse style in `block-band-click.ts`), which reproduces CodeMirror's single-click selection for plain presses and stops a drag head at the block's edge in a band: the start of the line after the block below it, the start of the block's own line above it. A head in a keep-selection zone (padding beside the widget, a band between two blocks, the space under the document) stays where the drag last put it.

## Comments

- 2026-11-03, branch `issue/13-band-click-doc-end-and-drag`: a press in the empty space under a note that ends with a block widget keeps the cursor where it was; a text drag into a block's band stops at the block edge (`bandDragHead`, `block-band-click.ts`); `test.fail()` dropped from the doc-end and band-drag E2E specs; JSDoc corrected in round 1's fix. Tests: `pnpm check` 0 errors; `block-band-click.test.ts` 34/34; full suite (`pnpm vitest run && pnpm build`) exit 0, 459 files, 10634 passed, 1 skipped, 1 todo, build OK. Reviews: round 1 APPROVED, round 2 APPROVED (no findings).
