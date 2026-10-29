# 07: Callouts are robust

**What to build:** A nested callout (`> [!warning]` containing `> > [!note]`) no longer throws inside the callout field (today the inner header is added at a lower position, `RangeSetBuilder` throws and every callout decoration disappears). A header with trailing spaces no longer hides the first characters of the title (the marker end is computed from the trimmed title). One callout matcher replaces the three divergent regexes (callout logic, `CALLOUT_HEADER_RE`, blockquote parser), which also removes the double styling of callout content lines.

**Context:** Analysis run 2026-10-29 (40 haiku + 15 opus over `src/lib/core/markdown-editor`, plus 20 haiku over seven reference editors). Evidence and decisions: `.scratch/live-preview-analysis/findings-2026-10-29.md`; verified findings with file:line: `.scratch/live-preview-analysis/report-markdown-editor.md`. Target model: one shared line-based reveal predicate (every line touched by the selection), rebuild on every selection change with no cross-update state, instant swaps with no CSS animation, heading line height independent of the cursor.

**Blocked by:** 05 (block-decorators-shared-reveal)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts` (modify; :171, :213)
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts` (modify; :48-52, :72-95)
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts` (modify; :12)
- `src/lib/core/markdown-editor/extensions/callout/callout.logic.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [x] Test: nested callout renders both callouts without throwing
- [x] Test: `> [!note] Title   ` shows the full title
- [x] One callout regex/matcher remains; all three call sites use it
- [x] Test: callout content lines get one style, not blockquote + callout

## Comments

- 2026-10-29 18:08 — discovery — plan in work/07/discovery.md: one matcher in callout.logic.ts, sorted set + innermost-owner lines in callout-field, ancestor callout check in blockquote parser — a5e16246
- 2026-10-29 18:13 — implement — one matcher (matchCalloutHeader) used by callout parser, blockquote parser and source-mode decoration; nested callouts on a sorted set with innermost line ownership; trailing-space title fixed; callout lines excluded from blockquote styling; extensions vitest 94 files/1296 pass, pnpm check 0 errors — 642a6edc
