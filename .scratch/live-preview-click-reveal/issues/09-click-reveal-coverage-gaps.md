# 09: Click-reveal E2E coverage for the zones the first pass left out

**Status:** ready-for-agent

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

- [ ] Every zone listed above has a test, or Notes say why it cannot run in the E2E app (for example no media playback)
- [ ] Each new `test.fail()` fails at its bug assertion when the marker is removed (record the check in Notes), and each such bug is listed in Notes with its root cause file:line
- [ ] The low findings above are fixed
- [ ] The click-reveal folder gives the same per-test verdict in two runs; the rest of `e2e/specs/live-preview` stays green

## Notes

- Owner request (2026-11-03): turn the report's gaps into coverage.
