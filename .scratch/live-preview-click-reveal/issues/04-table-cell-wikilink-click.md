# 04: A click on a wikilink inside a table cell opens the note

**Status:** ready-for-agent

Priority: P2 (links in tables do nothing on click; the owner uses tables)

**What to build:** A wikilink rendered inside a table cell (`a.cm-lp-wikilink` in a `td`) does nothing on click: no tab opens and no note is created. The same link in a paragraph works. The capture-phase mousedown handler in `src/lib/core/markdown-editor/MarkdownEditor.svelte:309` calls `resolveWikilinkClickPosition`, which returns `view.posAtDOM(el)` (`wikilink-click-target.ts:56`); for a link inside the table widget that position is the table's header line, which holds no wikilink, so following the link fails. The handler still calls `stopImmediatePropagation` (`MarkdownEditor.svelte:263`), so the cell's own mousedown handler in `widgets.ts` never runs. A click must open the link target, the same way as outside a table, and leave the source note's table rendered.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview e2e/specs/wikilink-navigation.spec.ts e2e/specs/wikilink-create-on-click.spec.ts` (E2E)

**Source:** `.scratch/live-preview-click-reveal/report.md` section 2.2, `e2e/specs/live-preview/click-reveal/table-cell-controls.spec.ts`, src/lib/core/markdown-editor/MarkdownEditor.svelte:263,309, src/lib/core/markdown-editor/extensions/live-preview/wikilink-click-target.ts:56

- [ ] `table-cell-controls.spec.ts` "clicking a wikilink inside a table cell follows it and the source note keeps its table" passes with `test.fail()` removed
- [ ] A wikilink to a missing note inside a cell behaves like one outside a table (the create-on-click path)
- [ ] Wikilink clicks outside tables keep working (`wikilink.spec.ts` in the folder, `wikilink-navigation.spec.ts`, `wikilink-create-on-click.spec.ts`)

## Notes

- Check the wikilink-anchors case (`[[note#heading]]`) inside a cell too, if the fix goes through the cell handler.
