# 062: Rendered table cells show links, highlight, underscore emphasis, line breaks and escaped pipes as formatted content

**Origin:** `audit-2026-11-05` Issue 11, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** `TableWidget.toDOM` renders every cell through `renderCellContent` (src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:286), which handles only wikilinks and passes the rest to `renderInlineSegments` (:226). That function uses `renderInlineMarkdown`, whose INLINE_RE (parsers/inline-markdown.ts:17) knows only backtick code, `**`, `*` and `~~`. Everything else becomes a text node. Markdown links stay `[t](u)`, have no `cm-lp-link` styling and cannot be opened. `<br>` and the backslash of `\|` show literally, because splitRow (parsers/table.ts:72-81) keeps escapes. `***x***` renders as bold `*x` plus a stray `*`. Extend the cell renderer to cover markdown links (styled as `cm-lp-link`, opened with the platform open modifier through `host.openExternal` after `isSafeUrl`, the same rule as handleLivePreviewLinkMousedown in click-handler.ts:17-41, and with mousedown stopped so the table is not revealed), `==highlight==`, `_x_` and `__x__`, `***x***`, `<br>` as a line break, and `\|` and other backslash escapes shown without the backslash. Do not render cell text as HTML (no innerHTML). Math and footnotes in cells are out of scope unless trivial.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

**Owner decision (2026-11-06):** cells render links, ==highlight==, underscore emphasis, <br> and escaped pipes. Reverse the inline-markdown test that pins ==highlight== as unsupported, and say so in the commit message.

- [ ] Failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts: render a TableWidget whose body cell is '[Docs](https://x.dev) a \\| b<br>next' and assert that the cell has an element with class cm-lp-link and text 'Docs', a <br> element, and textContent 'Docs a | bnext' with no '[', '](' or backslash. It fails today.
- [ ] Cmd+mousedown (Ctrl on non-mac) on that link calls host.openExternal('https://x.dev') and leaves the editor selection unchanged. A plain click behaves as clicks on other cell text do today. A javascript: URL is not opened.
- [ ] `==key==` renders as a highlight mark with the class the inline pipeline uses; `_note_` and `__bold__` render as em and strong; `***both***` renders as bold italic with no stray asterisk.
- [ ] Update the inline-markdown.test.ts case at :60 ('renders ==highlight== as plain text (not supported)') to the new contract, and record the change in the commit message.
- [ ] Wikilinks, inline code and meta-bind INPUT controls in cells render as before (existing table-widget and combined-table-meta-bind tests).
- [ ] Gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/high. Tables are daily, and links, <br> and escaped pipes written by the app's own TSV paste show as raw text. The fix reverses a pinned test.
- **Trigger:** A table the user works with daily has a cell with `[Docs](https://x.dev)`, `==key==`, `_note_`, `__bold__`, `***both***`, `a \| b`, or a `<br>` line break. The app's own TSV paste writes `<br>` and `\|`. The user moves the cursor out of the table and the cells show raw syntax.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:341-390 TableWidget.toDOM calls renderCellContent for each th and td; widgets.ts:286-328 splits only on WIKILINK_DECORATION_RE; widgets.ts:226-278 handles only bold, italic, strikethrough and code, and everything else is createTextNode; parsers/inline-markdown.ts:17 INLINE_RE; parsers/table.ts:78-80 skips but keeps backslash escapes in cells; handlers/paste-tsv.logic.ts:129-130 writes \| and <br>; help/examples/markdown-editor-vault/10-tables.md:43-55 expects a link in a cell to render; the test at src/tests/.../parsers/inline-markdown.test.ts:60 pins highlight as unsupported in the parser only.
- **Second opinion:** upheld (ux, high). renderCellContent (widgets.ts:286-328) splits only on wikilinks. renderInlineSegments uses INLINE_RE (inline-markdown.ts:17), which knows only code, **, * and ~~. splitRow keeps backslash escapes, and the app's own TSV paste writes `\|` and `<br>` (paste-tsv.logic.ts:130). Markdown links in cells therefore show as raw text. The help example 10-tables.md expects a link in a cell to render. This is rendering only, and the doc on disk is fine, so it is ux. Corrections to apply while implementing: Category content -> ux: wrong rendering, not wrong data.
- **Source:** audit 2026-11-05, domain `live-preview`, finding `N-live-preview-04` (from live-preview-ux-2, live-preview-spec-1). Size M.

## Comments

- 2026-11-06: owner decision recorded from the 2026-11-06 survey; status ready-for-agent.
