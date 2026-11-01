# 16: Live-preview invariants harness over a markdown corpus

**What to build:** One jsdom test file that mounts the full `livePreviewExtensions()` stack the same way `inline/pipeline-dom.test.ts:37` does (`createMarkdownState` with a full parse). It runs over a fixed list of about 15 help files (one per block kind) plus a fixture file of edge documents taken from past fixes. Running all 208 help files (17k lines, about 122k steps) cannot fit the time budget.

Set `autoRunQueries` to `'manual'` and stub collection IPC and mermaid, so no user script runs in jsdom. For each document it moves the cursor to the lines at block boundaries and runs a scripted sequence:
- type a character
- select a range that ends at a line start
- a triple-click range
- mousedown, then mouseup outside the editor
- dragend
- forceDecorationRebuild
- a scroll with a reconfigure

After each step it checks invariants over every decoration source. Walk `view.state.facet(EditorView.decorations)`: in @codemirror/view 6.43.15 it is `Facet<DecorationSet | ((view) => DecorationSet)>`, so evaluate each entry with `typeof d === 'function' ? d(view) : d`.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:**
- Code: `src/lib/core/markdown-editor/extensions/live-preview/` (core/check-update-action.ts, core/mouse-selecting.ts, core/reveal.ts, inline/inline-formatting-plugin.ts, plugins/callout-field.ts, widgets.ts)
- Commits: a404aebb, 15c8cf12, f7638b13, 121db924, 72ed67a8, 98c0df49, 4e411d1b, d7c9bd66, 22efab4f, ed94de37, 32f2e5f4, a81edad6, e5be43d7, f4ef1aba, 8d01b605, 92815cde

- [x] The edge corpus contains at least:
  - `[a](\n/url)`, `![a](\n/url)`, `[a\nb](/url)`
  - nested callouts, and `> > >` inside a callout
  - `%%` lines inside a fenced block
  - a queryjs fence inside a ```` md fence
  - a hard break followed by a line
  - a bullet list under frontmatter
- [x] Invariants:
  - building and dispatching never throw (no cross-line plugin replace, no unsorted ranges), and no inline handler failure disables the pipeline
  - no source emits two identical (from, to, class) marks from overlapping expanded ranges (checked per source: HighlightStyle and live-preview marks overlap legitimately)
  - lines touched by the selection carry no hidden-syntax replace, and a range ending at a line start does not reveal that line
  - after the drag flag is released (mouseup outside, dragend), the decorations equal those of a freshly mounted view on the same state. Compare (from, to, class or widget constructor name) within the visible ranges only
  - no live-preview widget other than code-block decorates inside a FencedCode node
  - mounting and destroying a view with callout, table and meta-bind widgets leaves the document listener count unchanged (92815cde), counted with a spy on `document.addEventListener`/`removeEventListener`
- [x] Mutation check on the fixes that still reverse-apply cleanly (121db924, e5be43d7, 8d01b605, 92815cde): with each reverted locally, the harness fails. Record them in the commit message
- [x] Runtime is under 10 s

## Notes

- **Why:** about 20 of 51 live-preview fixes are fix-of-fix, in three chains: hide-syntax, the QueryJS cache, and the update gate. The gate has 26 unit cases, but no test checks invariants across the whole extension stack.
- **`widgets.ts`** (967 LOC) has no test file of its own, although 7 test files import it.
- **Flakiness:** comparing decorations is viewport-dependent in jsdom, so keep the comparison to the visible ranges.
- **Size:** M.

## Comments

- 2026-11-01, branch `issue/16-live-preview-invariants-harness`: added `invariants-harness.test.ts` and `fixtures/edge-corpus.md`, a jsdom harness that mounts the full live-preview stack over the markdown corpus and checks the invariants after a scripted step sequence at boundary lines; the four mutation checks are recorded in the harness commit. Review round 1: APPROVED with one minor finding and two nits, all fixed (every console.error now fails a step, mousedown must arm the drag flag, listener accounting keys on capture). Tests: `pnpm check` 0 errors; full suite 382 files, 9253 passed, 1 skipped, 1 todo; `pnpm build` ok (log `test-logs/architecture-stability/16-deliver.log`).
