# 062: Rendered table cells show links, line breaks and escaped pipes as formatted content

**Origin:** `audit-2026-11-05` Issue 11, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here. On 2026-11-12 the emphasis half (`==x==`, `_x_`, `__x__`, `***x***`) moved to Issue 249.

**What to build:** `TableWidget.toDOM` renders every cell through `renderCellContent` (src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:286-328), which splits only on wikilinks and passes the rest to `renderInlineSegments` (:226-278). That function uses `renderInlineMarkdown`, whose `INLINE_RE` (parsers/inline-markdown.ts:17) knows only backtick code, `**`, `*` and `~~`. Everything else becomes a text node. The app's own TSV paste writes `\\`, `\|` and `<br>` into cells (handlers/paste-tsv.logic.ts:129-130), and splitRow (parsers/table.ts:72-81) keeps the backslashes, so once the cursor leaves the table those cells show a raw `\|`, `\\` and `<br>`. Markdown links stay `[t](u)`, have no `cm-lp-link` styling and cannot be opened.

Extend the cell renderer to cover exactly what the app writes itself, plus markdown links:

- **Links.** `[text](url)`, where text has no `]` and url has no whitespace. The text renders as plain text in a `span.cm-lp-link`. Never use `<a href>` and never set an href. A primary-button mousedown with the platform open modifier (`isOpenLinkModifier`, utils/platform.ts:30) calls `preventDefault` and `stopPropagation`, then opens the url through `host.openExternal` only if `isSafeUrl(url)`. Stop the event even for an unsafe url: otherwise the editor-level `handleLivePreviewLinkMousedown` (click-handler.ts:17-41, registered at :68-70) falls back to the link text, and `isSafeUrl('Docs')` is true for a scheme-less string (sanitize-url.ts:12-14), so it would open `Docs`. With no modifier, a right click or a macOS Ctrl+click (`isMacContextClick`), the handler does nothing and the event bubbles as for other cell text. This follows Live Preview rule 11. Bare URLs and `<url>` autolinks in cells stay plain text.
- **Line breaks.** `<br>`, `<br/>` and `<br />`, in any letter case, become a `<br>` element. Inside a code span they stay literal.
- **Backslash escapes** follow CommonMark: a `\` before an ASCII punctuation character renders that character and takes away its markup meaning, so `\|` shows `|`, `\\` shows one `\` and `\*a\*` shows `*a*` with no em. A `\` before anything else stays literal. Inside a code span only `\|` becomes `|` (the GFM table rule); nothing else is unescaped there. Escapes apply only to the non-wikilink text (the `renderInlineSegments` path), so wikilinks render exactly as before.

Segments do not nest: link text is plain text. Do not render cell text as HTML (no innerHTML). Leave splitRow and findAllTables unchanged: their raw output is pinned by table.test.ts:189-191 and combined-inline-in-containers.test.ts:118-125. Do not touch paste-tsv.logic.ts or click-handler.ts.

**Blocked by:** none

**Status:** resolved

**Answered:** cells render links, `<br>` and escaped pipes (owner, 2026-11-06). On 2026-11-12 the owner took the lower-risk cut from the deep dive: this Issue keeps what the app's own TSV paste writes (`\|`, `\\`, `<br>`) plus markdown links; `==x==`, `_x_`, `__x__` and `***x***` move to Issue 249. Nothing open.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [x] Failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts: render a TableWidget whose body cell is '[Docs](https://x.dev) a \\| b<br>next' and assert that the cell has an element with class cm-lp-link and text 'Docs', a <br> element, and textContent 'Docs a | bnext' with no '[', '](' or backslash. The same link and `<br>` in a header cell (th) render too. It fails today.
- [x] Through the real parser: mount `| h |\n| --- |\n| x \\| y<br>z |` with `mountMarkdownView` and the cursor after the table, take the TableWidget from `computeTables` (the `clickAdd` helper at table-widget.test.ts:243 shows how), call toDOM, and assert that the td holds `x | y`, a `br` and `z`. This proves the raw `\|` that splitRow keeps is unescaped at render time.
- [x] Link press, with the widget DOM mounted under a parent that has a bubbling `mousedown` spy (in jsdom the widget sits outside `contentDOM`, so a "selection unchanged" assertion passes with or without the fix):
  - With the open modifier (`platform.mac = true` + `metaKey`, and `platform.mac = false` + `ctrlKey`, as in the existing `cell wikilink click` describe), a primary-button mousedown on the link calls `host.openExternal` exactly once with `'https://x.dev'`, sets `defaultPrevented` and does not reach the parent spy.
  - With no modifier, `openExternal` is not called, `defaultPrevented` is false and the parent spy fires.
  - A right click (button 2) and a macOS Ctrl+click are not opened and not stopped.
  - `[x](javascript:alert(1))` with the modifier is not opened, and the event is still stopped.
- [x] Escapes: the cell source `a \\ b` (two backslash characters, what TSV paste writes for one) renders `a \ b`; `\*a\*` renders `*a*` with no em; `` `x \| y` `` renders a code element with text `x | y`; `` `a<br>b` `` renders a code element with that literal text. `<BR>` and `<br />` render a `br`.
- [x] No HTML: a cell `<b>x</b> <img src=x onerror=alert(1)>` renders that literal text, with no `b` or `img` element.
- [x] The existing cases in src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.test.ts pass unchanged, including :60 (`==highlight==` stays text), :65, :70, :87-94 (`**bold***italic*` adjacency) and :97-103 (`***text***`). Issue 249 changes :60 and :97-103, not this one.
- [x] Wikilinks, inline code and meta-bind INPUT controls in cells render as before (existing table-widget and combined-table-meta-bind tests).
- [x] Gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Medium-high for this owner: tables are daily, and every table pasted from a spreadsheet with a pipe or a multi-line cell shows raw `\|` and `<br>` once the cursor leaves it. Display only: the source on disk is right and one click reveals it. Wikilinks in cells already render and open (widgets.ts:296-322).
- **Trigger:** a table with `a \| b`, `C:\\Users` or a `<br>` line break (all written by the app's TSV paste), or a `[Docs](https://x.dev)` cell. The user moves the cursor out of the table and the cells show raw syntax.
- **Evidence (verified by reading code at `5f8003d67`, re-checked unchanged at `318b6e9b5` by the 2026-11-12 deep dive):** widgets.ts:352-391 TableWidget.toDOM calls renderCellContent for each th (:364) and td (:378); widgets.ts:286-328 splits only on WIKILINK_DECORATION_RE; widgets.ts:226-278 handles only bold, italic, strikethrough and code, and everything else is createTextNode; parsers/inline-markdown.ts:17 INLINE_RE; parsers/table.ts:78-80 skips but keeps backslash escapes in cells; handlers/paste-tsv.logic.ts:129-130 writes `\\`, `\|` and `<br>`; help/examples/markdown-editor-vault/10-tables.md:43-55 expects a link in a cell to render.
- **Blast radius:** `renderInlineMarkdown` has one production caller, widgets.ts:232, so only table cells change. No CSS change is needed: `.cm-lp-link` (styles.ts:143-155) already exists in the editor theme.
- **Implementation pointers:** extend `InlineSegmentType` with `'link'` and `'break'` and add an optional `href` field (with JSDoc). Keep code spans first in the INLINE_RE alternation so links, escapes and `<br>` never parse inside backticks; meta-bind INPUT detection runs on the code-span text (widgets.ts:253-266). Merge adjacent text segments so `a \| b` stays one text node. `view` is already an optional parameter of `renderInlineSegments`; use `view.state.facet(editorHost).openExternal(url)` and report a rejected promise with `reportError('LIVE-PREVIEW', ...)`, as click-handler.ts:36-39 does. Update the JSDoc of `INLINE_RE`, `renderInlineMarkdown` (inline-markdown.ts:10-23), `renderInlineSegments` (widgets.ts:222-225) and `renderCellContent` (widgets.ts:280-285), which list the supported syntax.
- **Out of scope:** `[[Target\|alias]]` inside a table (the widget does not unescape inside a wikilink); math and footnotes in cells; the lax `\*(.+?)\*` that italicizes `5 * 3 * 2` (pre-existing).
- **Optional:** add rows for `<br>` and `\|` to help/examples/markdown-editor-vault/10-tables.md:43-55. Optional targeted e2e: `e2e/specs/live-preview/tables.spec.ts` (`bash scripts/e2e.sh`); no e2e spec pins the changed cells.
- **Series:** 061 part 2, 063, 007 and 158 also edit widgets.ts. 061 part 2's guard (widgets.ts:41-47) does not overlap this Issue's hunk (:226-278) and has no blocker on 062; do not run two widgets.ts Issues in the same checkout at once. Issue 249 is blocked by this one.
- **Second opinion:** upheld (ux). Category content -> ux: wrong rendering, not wrong data.
- **Source:** audit 2026-11-05, domain `live-preview`, finding `N-live-preview-04` (from live-preview-ux-2, live-preview-spec-1). Size M before the split; S-M now.

## Comments

- 2026-11-06: owner decision recorded from the 2026-11-06 survey; status ready-for-agent.
- 2026-11-12: deep dive (`research/deep-dive-2026-11-12/refute-062.md`, `critique.md` M2) applied. Split by owner decision: this Issue keeps links, `<br>`, `\|` and `\\`; `==x==`, `_x_`, `__x__` and `***x***` moved to new Issue 249 (blocked by 062). Added the escape and link grammar, a parent-spy link-press criterion in place of the untestable "selection unchanged" check, a parser-chain test, a no-HTML test and the header-cell case. The inline-markdown.test.ts pins at :60 and :97-103 now stay green here and change in 249. Impact set to medium-high.
- 2026-11-12: delivered from branch issue/062-rendered-table-cells-show-links-highlight-underscore. Table cells render links (modifier press opens the url, unsafe or empty urls are not opened), `<br>`, `\|` and `\\` escapes, with no raw HTML. Fix round: empty-url link press no longer calls openExternal. Tests: targeted table-widget + inline-markdown 106 passed; pnpm check 0 errors; full suite at f22439752 632 files / 16495 tests passed, exit 0. Reviews: round 1 APPROVED (review.md), round 2 APPROVED (review-2.md).
