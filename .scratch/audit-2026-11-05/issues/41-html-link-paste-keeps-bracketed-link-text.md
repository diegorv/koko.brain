# 41: HTML link paste keeps bracketed link text and table cells intact

**What to build:** `htmlLinksToMarkdown` (src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts:68-97) has two defects. (1) :90 builds `[${text}](${href})` without escaping `[` and `]` in the anchor text. Anchor text `[1]` becomes `[[1]](url)`, which WIKILINK_DECORATION_RE (src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:2) renders as a wikilink to a note named `1`. A click then creates `1.md` through followWikilink (live-preview/wikilink-navigation.ts:17-22). Escape the brackets (and backslashes) in the label. (2) `blockAwareText` (:34-57) separates TR rows but not TD or TH cells, because BLOCK_TAGS (:21-26) has neither. The cells of a row are fused (`NameStatus`). The handler has already called preventDefault (paste-html-link-handler.ts:30), so the TSV handler registered after it (live-preview.ts:104) never sees the tabbed plain text. When the fragment holds a table, emit a cell separator and build a markdown table from the rows, reusing `tsvRowsToMarkdownTable` (paste-tsv.logic.ts:118-140, which escapes `|`). A link in a cell stays a markdown link.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.test.ts: htmlLinksToMarkdown('<p>Fact<sup><a href="https://w.org/#c1">[1]</a></sup> and <a href="https://x.dev">more</a></p>', 'Fact[1] and more') returns text that does not contain '[[' and contains the label as escaped brackets linking to https://w.org/#c1. It fails today.
- [ ] Same file: '<table><tr><th>Name</th><th>Link</th></tr><tr><td>Task</td><td><a href="https://j.io/1">JIRA-1</a></td></tr></table>' with plain 'Name\tLink\nTask\tJIRA-1' converts to a two-column markdown table whose second body cell is [JIRA-1](https://j.io/1). It fails today.
- [ ] A `|` in a cell or in link text is escaped as \| in the table output.
- [ ] Existing Slack, multi-line and null-fallthrough cases in that file still pass.
- [ ] Gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/low. Mangled paste text is visible right away and can be undone.
- **Trigger:** The user copies web content where the URLs exist only in the HTML flavor and pastes it into a note. Two cases: a paragraph with bracketed anchor text, such as Wikipedia citation markers `[1]`, or a table (GitHub, Jira, Confluence, Notion) where at least one cell is a link.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts:75-79 takes over when any href is missing from text/plain; :90 interpolates the text unescaped; :21-26 BLOCK_TAGS has TABLE and TR but no TD or TH; :50-53 adds boundaries only for block tags; handlers/paste-html-link-handler.ts:28-42 preventDefaults and dispatches; live-preview.ts:104 registers pasteHtmlLinkHandler before pasteTsvHandler; wikilink/decoration.logic.ts:2 matches `[[1]]`; live-preview/wikilink-navigation.ts:17-22 creates a note for an unresolved target; the existing tests in paste-html-link.logic.test.ts have no bracket or table case.
- **Second opinion:** upheld (ux, low). paste-html-link.logic.ts:90 interpolates the anchor text unescaped, so `[1]` becomes `[[1]](url)`, which WIKILINK_DECORATION_RE matches. BLOCK_TAGS (:21-26) has TABLE and TR but no TD or TH, so cells in a row are fused. The handler runs before pasteTsvHandler (live-preview.ts:104). Re-rated to ux: the mangled text appears right away at paste time and can be undone, and the source text is not lost. Corrections to apply while implementing: Category content -> ux.
- **Source:** audit 2026-11-05, domain `live-preview`, finding `N-live-preview-02` (from live-preview-content-2, live-preview-content-3). Size S.

## Comments
