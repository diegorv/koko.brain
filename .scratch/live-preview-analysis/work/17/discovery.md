# Issue 17 discovery: cap collection rows in the editor widget

## Files that change
- `src/lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget.ts`
  - new exported constant `COLLECTION_ROW_CAP = 50` with JSDoc (why: every `toDOM()` rebuilds the DOM synchronously, so an unfiltered block over a ~10k-note vault froze the main thread).
  - `buildCollectionTable` (:352-390): the tbody loop (:369) iterates `result.records` only up to the cap.
  - `renderView` (:105-132): after the table, when `result.records.length > COLLECTION_ROW_CAP`, append `div.cm-lp-collection-footer` reading `Showing 50 of N`. The header (:109) keeps `result.records.length`.
  - The cache entry (:96) keeps the full `QueryResult`; only rendering is bounded.
- `src/lib/core/markdown-editor/extensions/live-preview/styles.ts` (:554 area): `.cm-lp-collection-footer` (small, muted, reuses `--lp-collection-empty`). No new theme variable.

## Plan
1. Test-first in `src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget.test.ts`:
   - `buildCollectionTable` with 10,000 records renders exactly `COLLECTION_ROW_CAP` body rows.
   - widget over a real `collectionStore` index of 10,000 records: header `All (10000)`, `COLLECTION_ROW_CAP` body rows, footer `Showing 50 of 10000`.
   - widget at exactly the cap (50 records) and under it (existing 2-record fixture): every row, no footer.
   Run, see red. Implement. Run green. One commit.

## Prior-art tests
- Same file: `CollectionBlockWidget - query data cache` block (real `collectionStore`, `recordAt` fixture, only `openFileInEditor` mocked).

## Risks / defaults taken
- Cap applies to `type: table` (and the default/other non-calendar types that fall through to the table) only; calendar and linear-calendar untouched, per the Issue.
- Footer text uses the constant and the full count (`Showing ${COLLECTION_ROW_CAP} of ${N}`); no "show more" control (not asked).
- Footer sits outside the `<table>` so the table's row striping and `tr` click handling are unaffected.
- Not verified here: the actual freeze on the owner's vault; the jsdom test proves the DOM is bounded, not the in-app timing.
