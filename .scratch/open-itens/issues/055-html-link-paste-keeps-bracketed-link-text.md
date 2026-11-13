# 055: HTML link paste keeps bracketed link text and table cells intact

**Origin:** `audit-2026-11-05` Issue 41, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** `htmlLinksToMarkdown` (src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts:68-97) has two defects. (1) :90 builds `[${text}](${href})` without escaping `[` and `]` in the anchor text. Anchor text `[1]` becomes `[[1]](url)`, which WIKILINK_DECORATION_RE (src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:2) renders as a wikilink to a note named `1`. A click then creates `1.md` through followWikilink (live-preview/wikilink-navigation.ts:17-22). Escape the brackets (and backslashes) in the label. (2) `blockAwareText` (:34-57) separates TR rows but not TD or TH cells, because BLOCK_TAGS (:21-26) has neither. The cells of a row are fused (`NameStatus`). The handler has already called preventDefault (paste-html-link-handler.ts:30), so the TSV handler registered after it (live-preview.ts:104) never sees the tabbed plain text. The fix for (2) is the owner's narrowed scope below: when the fragment holds a `<table>`, `htmlLinksToMarkdown` returns null, so the handler returns false (paste-html-link-handler.ts:28) and the TSV handler builds the table from the tabbed plain text. Converting the cell links is audit Issue 158, now 167 in this folder.

**Blocked by:** none

**Status:** resolved

**Answered:** scope narrowed by the owner on 2026-11-06 (below); approved as a deep-dive addition to the queue on 2026-11-12. Nothing open.

**First wave:** yes, picked by the owner on 2026-11-06.

**Scope (owner, 2026-11-06):** escape [ ] and backslashes in the anchor text, and leave any fragment that contains a <table> to the TSV paste handler (htmlLinksToMarkdown returns null), so the table arrives through the existing path. Converting HTML tables with their links moved to Issue 158.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [x] Failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.test.ts: htmlLinksToMarkdown('<p>Fact<sup><a href="https://w.org/#c1">[1]</a></sup> and <a href="https://x.dev">more</a></p>', 'Fact[1] and more') returns text that does not contain '[[' and contains the label as escaped brackets linking to https://w.org/#c1. It fails today.
- Moved to Issue 158 on 2026-11-06: Same file: '<table><tr><th>Name</th><th>Link</th></tr><tr><td>Task</td><td><a href="https://j.io/1">JIRA-1</a></td></tr></table>' with plain 'Name\tLink\nTask\tJIRA-1' converts to a two-column markdown table whose second body cell is [JIRA-1](https://j.io/1). It fails today.
- Moved to Issue 158 on 2026-11-06: A `|` in a cell or in link text is escaped as \| in the table output.
- [x] A fragment that contains a <table> returns null from htmlLinksToMarkdown, so pasteTsvHandler builds the table (a test in the same file). The test's table holds a cell link whose URL is not in the plain text, so it fails today. Existing Slack, multi-line and null-fallthrough cases in that file still pass.
- [x] Gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/low. Mangled paste text is visible right away and can be undone. The deep dive of 2026-11-12 rates it low-medium: a copied web table with a link goes to this handler before the TSV handler and its cells fuse, and the owner pastes into tables daily (validate-s7+s8). 167 in this folder (the table-link conversion) is blocked by it.
- **Trigger:** The user copies web content where the URLs exist only in the HTML flavor and pastes it into a note. Two cases: a paragraph with bracketed anchor text, such as Wikipedia citation markers `[1]`, or a table (GitHub, Jira, Confluence, Notion) where at least one cell is a link.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts:75-79 takes over when any href is missing from text/plain; :90 interpolates the text unescaped; :21-26 BLOCK_TAGS has TABLE and TR but no TD or TH; :50-53 adds boundaries only for block tags; handlers/paste-html-link-handler.ts:28-42 preventDefaults and dispatches; live-preview.ts:104 registers pasteHtmlLinkHandler before pasteTsvHandler; wikilink/decoration.logic.ts:2 matches `[[1]]`; live-preview/wikilink-navigation.ts:17-22 creates a note for an unresolved target; the existing tests in paste-html-link.logic.test.ts have no bracket or table case.
- **Second opinion:** upheld (ux, low). paste-html-link.logic.ts:90 interpolates the anchor text unescaped, so `[1]` becomes `[[1]](url)`, which WIKILINK_DECORATION_RE matches. BLOCK_TAGS (:21-26) has TABLE and TR but no TD or TH, so cells in a row are fused. The handler runs before pasteTsvHandler (live-preview.ts:104). Re-rated to ux: the mangled text appears right away at paste time and can be undone, and the source text is not lost. Corrections to apply while implementing: Category content -> ux.
- **Source:** audit 2026-11-05, domain `live-preview`, finding `N-live-preview-02` (from live-preview-content-2, live-preview-content-3). Size S.

## Comments

- 2026-11-06: narrowed by the owner after the challenge review; HTML table conversion moved to Issue 158.
- 2026-11-12: deep dive (sweep-s3, validate-s3+s4, validate-s7+s8) confirmed both defects at `635b4af36`. Approved as an addition. What to build now matches the 2026-11-06 scope (the table-building sentence went with audit Issue 158, now 167), and the table criterion names a link missing from the plain text so it is red first.
- 2026-11-12: delivered from branch `issue/055-html-link-paste-keeps-bracketed-link-text`. `htmlLinksToMarkdown` escapes `[`, `]` and backslashes in anchor labels, so `[1]` pastes as `[\[1\]](url)` instead of a wikilink, and returns null for any fragment that contains a `<table>`, so the TSV paste handler builds the table. Review round 1: APPROVED with two nits, both deferred to Issue 167 (unreachable TABLE/TR block tags; layout tables in HTML emails lose link URLs). Tests: `pnpm check` 0 errors; full `pnpm vitest run` 633 files passed, 16515 tests passed, 54 skipped, 1 todo, exit 0.
