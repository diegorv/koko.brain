# Issue 11 discovery: off-screen block re-render keeps the visible text in place

No `spec.md` exists for this feature; the Issue is the source.

## What re-renders when another note changes (code read)

- Collection: `collectionStore.version` bumps after the watcher's property update; `collectionBlockRenderer.rebuildOn` (`features/collection/collection-block-widget.ts:393`) drives the `forceDecorationRebuild` effect in `MarkdownEditor.svelte:566-573`; the new widget's `eq()` (`:374`) is false on the version, so CodeMirror replaces the decoration and re-estimates the off-screen line. The real candidate.
- Queryjs: the watcher clears the result cache (`queryjs-cache` listener), but no rebuild follows: `eq()` (`plugins/queryjs/queryjs-block-widget.ts:158`) compares only `jsContent` + `isIndexReady`, so an off-screen block re-runs only when it re-enters the viewport. Expected: no shift.
- Note embed: `WikilinkNoteEmbedWidget.eq()` (`live-preview/widgets.ts:~700`) compares target/heading/blockId only, and the plugin only decorates `expandedVisibleRanges`, so nothing changes for a far-above embed. Expected: no shift.

## Plan

1. One E2E spec `e2e/specs/live-preview/offscreen-block-rerender-keeps-scroll.spec.ts`, three tests (collection, queryjs `always` mode, note embed). Each: block near the top of the open note, ~300 filler lines, an anchor line near the bottom, cursor on the anchor line, scrolled so the anchor sits mid-screen; write ANOTHER note through `window.__e2e.fs.writeFile` + `vault-files-changed` (as `collection-block.spec.ts` does); wait past the watcher + index bump; assert the anchor's y inside `.cm-scroller` moves < 5 px. Log the shift (`console.log`) to record it in Notes.
2. Collection probe also asserts the re-render happened (scroll back up, header count changed) so the test cannot pass on a no-op.
3. If a probe fails: fix at the cause (likely a `scrollSnapshot()` around the `forceDecorationRebuild` dispatch, or a widget `estimatedHeight` cached from the last measured height), probe as failing-first test. Otherwise record the numbers and close as wontfix in Notes.

## Prior-art tests

- `.scratch/live-preview-click-reveal/work/10` + `e2e/specs/live-preview/frontmatter-write-keeps-scroll.spec.ts` on the Issue 10 branch (not on main yet): `screenY`, `settle`, scroll-to-anchor helpers are copied, not imported (that file is not on main).
- `e2e/specs/collection-block.spec.ts` (watcher-driven re-render), `e2e/specs/queryjs-basic.spec.ts` (queryjs settings).

## Risks and defaults

- Cursor parked on the bottom anchor line (Issue: "the cursor and the viewport at the bottom").
- Queryjs probe uses `autoRunQueries: 'always'` so the block shows a result above, not a Run button; the script reads another note's property so the data really changes.
- jsdom has no layout: no vitest seam for a height re-estimate.
