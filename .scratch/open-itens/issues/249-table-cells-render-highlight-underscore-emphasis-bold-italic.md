# 249: Rendered table cells show highlight, underscore emphasis and bold italic

**Origin:** split from Issue 062 on 2026-11-12 by owner decision, after the deep dive (`.scratch/open-itens/research/deep-dive-2026-11-12/critique.md` M2, `refute-062.md` M1, M2 and M5). This is 062's part (b); 062 keeps links, `<br>`, `\|` and `\\`.

**What to build:** After Issue 062, table cells render code, `**`, `*`, `~~`, markdown links, `<br>` and backslash escapes through `renderInlineMarkdown` (src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts) and `renderInlineSegments` (live-preview/widgets.ts). `==highlight==`, `_x_` and `__x__` still show as raw text, and `***x***` renders as bold `*x` followed by a stray `*`, because `\*\*(.+?)\*\*` matches first. Extend the same tokenizer and renderer:

- `==x==` renders as an element with class `cm-lp-highlight` (styles.ts:19 and :265). Do not use `<mark>`: its user-agent colors override the theme. Flanking follows the editor's own highlight parser (lezer/highlight-extension.ts:22-27): `==` opens only before a non-space and closes only after a non-space, so `a == b == c` stays plain text.
- `_x_` renders as `em` and `__x__` as `strong`. `_` is a delimiter only at a word boundary: an opener is not preceded by a letter, digit or `_`, a closer is not followed by one, and both checks use Unicode classes (`\p{L}\p{N}` with the `u` flag), so accented words count. The content starts and ends with a non-space.
- `***x***` and `___x___` render as `strong > em` with no `*` or `_` left in the cell. This is the only nesting: bold, italic and highlight content is otherwise plain text.

Keep code spans first in the INLINE_RE alternation, so none of this parses inside backticks. 062's escapes still apply: `\_x\_` and `\=\=x\=\=` render literally with no markup. Do not render cell text as HTML (no innerHTML).

**Blocked by:** 062

**Status:** ready-for-agent

**Answered:** cells render `==highlight==` and underscore emphasis (owner, 2026-11-06 survey, recorded in 062); `***x***` was in 062's What to build. On 2026-11-12 the owner split it from 062 as a ready-for-agent follow-up. This reverses two pinned parser tests, covered by that decision. Nothing open.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts: a body cell `==key== _note_ __bold__ ***both***` renders a `.cm-lp-highlight` with text `key`, an `em` with text `note`, a `strong` with text `bold`, and a `strong > em` with text `both`, with no `=`, `_` or `*` left in the cell's textContent. It fails today.
- [ ] No false emphasis: cells `a_case_b`, `snake_case_name`, `_notes/2026/_journal-day`, `__init__x`, `ação_x_y` and `a == b == c` render as plain text, with no `em`, `strong` or `.cm-lp-highlight`.
- [ ] `` `==x== _y_` `` renders a code element with that literal text; `\_x\_` renders `_x_` with no em.
- [ ] Update the pinned cases in src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.test.ts to the new contract: :60 ('renders ==highlight== as plain text (not supported)') and :97-103 (the `***text***` case that expects bold `*text` plus a trailing `*`). Keep :65 (`[[wikilink]]` stays text: wikilinks are split before this parser runs), :70 (`%%comment%%` stays text) and :87-94 (`**bold***italic*` stays bold then italic) unchanged and green. Name both reversed cases and the 2026-11-06 owner decision in the commit message.
- [ ] 062's cases (links, `<br>`, escapes), wikilinks, inline code and meta-bind INPUT controls in cells render as before (existing table-widget and combined-table-meta-bind tests).
- [ ] Gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** low-medium. Display only; the source on disk is right and one click reveals it. The app never writes this syntax into a table, so it shows only in cells typed by hand or imported.
- **Risk:** low-medium. `renderInlineMarkdown` has one production caller (widgets.ts:232), so only table cells change, but a loose `_` or `==` rule would italicize or highlight text in every cell. This vault's paths use leading underscores (`[[_notes/2026/02-Feb/_journal-day-16-02-2026|Mon 16]]`, a fixture at combined-inline-in-containers.test.ts:139; `_type` at table-widget.test.ts:487). The no-false-emphasis criterion guards this.
- **Implementation pointers:** add `'highlight'` (and a bold-italic type, or nested rendering) to `InlineSegmentType`. Put `\*\*\*(.+?)\*\*\*` before `\*\*(.+?)\*\*` in the alternation, and check that `**bold***italic*` still parses as bold then italic. Update the JSDoc of `INLINE_RE`, `renderInlineMarkdown`, `renderInlineSegments` and `renderCellContent`, which list the supported syntax. No CSS change is needed: `.cm-lp-highlight` already exists (styles.ts:265).
- **Alternative design (not required):** parse the cell with the editor's own Lezer markdown config, with HighlightExtension, instead of a longer regex. That gives the same flanking as outside tables for free, at the cost of a parse per cell in toDOM, which runs again on every viewport re-entry (Live Preview rule 2). Keep the regex unless the false-emphasis criterion gets hard to meet.
- **Optional:** add rows for `==x==` and `_x_` to help/examples/markdown-editor-vault/10-tables.md:43-55.
- **Series:** edits the same functions in widgets.ts and inline-markdown.ts as 062, which is why it is blocked by 062. Do not run it beside another widgets.ts Issue (061 part 2, 063, 007, 158) in the same checkout.
- **Out of scope:** bare URLs and `<url>` autolinks in cells, math and footnotes in cells.

## Comments

- 2026-11-12: created from Issue 062's part (b) by owner decision after the 2026-11-12 deep dive. Carries refute-062's M1 (the second pinned test at :97-103), M2 (no-false-emphasis guard with Unicode word boundaries and `==` flanking) and the highlight class and `strong > em` shape from M5.
