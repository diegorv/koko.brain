# 17: Collection blocks in the editor render a capped number of rows

**What to build:** A `collection` block in live preview renders at most a fixed number of table rows (default 50), followed by a "Showing 50 of N" footer; the header keeps the full count. Today `buildCollectionTable` (`extensions/live-preview/widgets/collection-block-widget.ts`, the loop over `result.records`) creates one `<tr>` per matching note, synchronously, on every `toDOM()`. On the owner's vault (~10,600 notes) opening `help/examples/markdown-editor-vault/20-collection.md` froze the app: its first block has no filter ("All Notes", 4 columns), and several others match almost every note (`progress != null`, `status != 'backlog'`, `!file.hasTag('bug')`), so the note builds hundreds of thousands of DOM nodes on the main thread. The app log ends at the tab-switch doc replace for that file. Not a regression of this feature. Apply the cap to the table view only (calendar and linear-calendar already bound their own output); keep the cached query data unchanged so the full result is still available to the dedicated collection view.

**Context:** Reported 2026-10-29 by the owner testing the example notes in the nightly `3.0.13-nightly.628.4f358626`. Log `~/Library/Logs/com.diegorv.kokobrain/2026-10-29_20-52-57.log`, last lines at 00:03:34. A jsdom mount of the same note with an empty collection store does not hang, which points at the row count, not at the decorator.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget.ts` (modify; `buildCollectionTable`, `renderView`)
- `src/lib/core/markdown-editor/extensions/live-preview/styles.ts` (modify; footer style, if needed)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] Test, written and seen failing first: a query result with 10,000 records renders at most the cap of `<tr>` body rows plus a footer reading "Showing 50 of 10000"
- [ ] Test: a result at or under the cap renders every row and no footer
- [ ] Header still shows the full count
- [ ] The cap is one named constant with a JSDoc saying why it exists
