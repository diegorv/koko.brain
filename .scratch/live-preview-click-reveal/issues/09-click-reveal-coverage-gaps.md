# 09: Click-reveal E2E coverage for the zones the first pass left out

**Status:** resolved

Priority: P3 (test coverage; the first pass found 39 bugs in the zones it did cover)

**What to build:** Tests only. Extend `e2e/specs/live-preview/click-reveal/` (shared helper `e2e/fixtures/click-reveal.ts`) to the gaps listed in `report.md` section 5, in the folder's style: each test asserts whether the element is still rendered (or revealed, when that is the design) AND where the cursor went, so a no-op click cannot pass. The expected outcome follows the owner's rule from the 2026-11-03 triage: blank space around a widget never reveals it; a click on a widget's body keeps today's behavior (see the passing tests); controls act without revealing.

Zones to add:
- A wikilink image embed of an existing image, and a note embed of an existing note, including clicks on content inside the embed (seed the files in the E2E vault).
- The meta-bind `date()` input, and an unknown `INPUT[...]` type (raw source fallback).
- Inline formatting marks (bold, italic, strikethrough, inline code), hard breaks, autolinks and bare URLs; Cmd/Ctrl+click on a link, asserting the opener mock was called (today only the cursor not moving is checked).
- A block reference `^blk` clicked directly, and the footnote definition line `[^1]: def`.
- Callouts: the title line, a collapsed callout (title and the line after), and a nested callout.
- Tables: a header-cell click, and cells holding formatting or a task checkbox.
- The wikilink alias `[[Target|alias]]`, and Cmd/Ctrl+click on a wikilink.
- Block widgets on the first or the last line of the document (the band above a widget at doc start, the band below one at doc end).
- A drag-select that starts or ends in a band or on a widget.
- The collection calendar and linear-calendar views and the empty and error states; the QueryJS output-text variant of a body click.
- The audio wrapper's own 4 px padding: report section 5 says a click there keeps the player but moves the cursor from "End line." to "Above line.".

Also fix the low findings of the coverage review (2026-11-03):
- `collection-block.spec.ts:28` relies on a `Daily-Note` row the spec never seeds: seed it.
- `meta-bind-text-input.spec.ts:23` says "number/date" but tests only number (the new date test fixes it); its file check right after a body edit (`readNote` equal to before) runs before the 2 s save debounce; the same applies to `meta-bind-inline-select.spec.ts:70`.
- Test titles that claim more than they check: `code-block-language-select`, `table-cell-controls` and `meta-bind-inline-select` use `selectOption`, which sends no mousedown; the "mouse click opens the dropdown" tests check focus only.

A new test that exposes an app bug keeps its assertion of the expected behavior, gets `test.fail()` with a one-line `// Known bug:` comment, and the bug is listed in Notes for a follow-up Issue. This Issue changes no app code.

**Blocked by:** none

**Gate:** `pnpm check` + `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal` (E2E, run twice: every test gives the same verdict both times)

**Source:** `.scratch/live-preview-click-reveal/report.md` section 5, the coverage review findings 8-12 (recorded in the 2026-11-03 session; summarized above), `e2e/specs/live-preview/click-reveal/`

- [x] Every zone listed above has a test, or Notes say why it cannot run in the E2E app (for example no media playback)
- [x] Each new `test.fail()` fails at its bug assertion when the marker is removed (record the check in Notes), and each such bug is listed in Notes with its root cause file:line
- [x] The low findings above are fixed
- [x] The click-reveal folder gives the same per-test verdict in two runs; the rest of `e2e/specs/live-preview` stays green

## Notes

- Owner request (2026-11-03): turn the report's gaps into coverage.
- Build (2026-11-03): every zone above has a test; none had to be skipped. Harness: `openMarkdownFile` / `openAndSettle` take `extraFiles` (seeded with the note), the opener mock records `window.__e2e.opener.urls`, and `click-reveal.ts` gains `clickTextInLine` and `editorSelection`.
- Zones that render differently from the Issue's wording: a table cell holding `[ ] todo` shows the text, not a checkbox (cells have no task widget), so its test asserts that and a body-cell reveal. A `^blk` is `display:none` off its line, so "clicked directly" is a click on it once its line is active.
- Observed, not filed: a drag that starts on the math glyphs selects nothing and keeps the block, but the cursor stays put in some runs and follows the release point in others (the browser's own selection decides); the test accepts both.
- Known bugs found (each test fails at its bug assertion with `test.fail()` removed, checked one test at a time on 2026-11-03: audio x2 at the cursor line, `Above line.` instead of `End line.`; doc-edge x2 at the widget count, 0 instead of 1; drag at the selection text, the whole block instead of `\nAfter line.`):
  1. Audio wrapper padding (`audio-player.spec.ts`, 2 tests): a press in the 4 px padding above or below the `<audio>` moves the cursor to the start of "Above line.". Root cause: `MediaWidget.ignoreEvent()` returns true (`src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:214`) and `toDOM` (`widgets.ts:195-205`) adds no mousedown `preventDefault` on the wrapper, so Chromium's native caret placement puts the DOM selection at offset 0 of the "Above line." text node and CodeMirror adopts it (a probe with a `preventDefault` listener on the wrapper kept the cursor on "End line."). The video player shares `MediaWidget` and its wrapper padding, so it very likely has the same bug (not tested): the follow-up Issue for this bug must include the video wrapper in its scope and tests.
  2. Empty editor space under a document that ends with a block widget (`doc-edge-widgets.spec.ts`, code block and image embed): the press hits `DIV.cm-content` below every line; `bandClickTarget` returns null there (`src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:82-84`, `lineAtY` finds no line), so CodeMirror maps it to the document end, inside the widget's replaced range, and the widget reveals.
  3. A drag from "After line." up into the band below a code block (`drag-select.spec.ts`) selects the whole block and reveals it. Root cause: `blockBandClick` takes over only when the press starts in a band (`block-band-click.ts:113-115`); a drag started on text keeps CodeMirror's default style, whose `posAtCoords` maps the band into the replaced range. The drag into the band above stops at the start of the block's line, which selects nothing of the block (normal test).
- Gate: `pnpm check` 0 errors; `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal --retries=0 --workers=2` twice: 206 passed both times (6 of them expected failures: these 5 plus meta-bind-toggle's), same per-test verdict; the other 16 `e2e/specs/live-preview` specs: 110 passed.

## Comments

- 2026-11-03, branch `issue/09-click-reveal-coverage-gaps`: E2E coverage added for the click-reveal zones the first pass missed (audio, doc-edge widgets, drag-select, table cells, block refs, math drag, collection-block, markdown-link, wikilink-image-embed), with harness helpers (`extraFiles`, opener URL recording, `clickTextInLine`, `editorSelection`). Three known bugs are pinned with `test.fail()` and root causes in Notes. Tests: full suite at a76b3272 had vitest 459 files / 10624 tests passing and `pnpm build` passing (exit=0); `pnpm check` 0 errors; the three touched specs passed 28/28 under 3 workers. Reviews: round 1 APPROVED, round 2 APPROVED (one nit: collection-block.spec.ts:136 failed once under 5 workers; file a flakiness Issue if it happens again).
