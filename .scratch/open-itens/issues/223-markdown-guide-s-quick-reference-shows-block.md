# 223: The Markdown guide's Quick Reference shows block math in the three-line $$ form the editor renders

**Origin:** `audit-2026-11-05` Issue 74, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** help/documentation/04-markdown.md:748 lists `$$formula$$` as Block math, but blockMathParser (src/lib/core/markdown-editor/extensions/lezer/math-extension.ts:66-68) opens only on a line that is `$$` alone, and inlineMathParser (:19-23) rejects a `$` next to another `$`, so a one-line `$$...$$` produces no node and no widget. The parser behavior is deliberate and pinned by src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/math.test.ts:49-53 ('does not match $$ with content on the same line'); the Math section of the guide (04-markdown.md:464-510) already uses the three-line form. Fix the Quick Reference row to show `$$` / formula / `$$` (or a note that the delimiters go on their own lines). Supporting single-line display math would be a parser change against a pinned test and needs an owner decision first; it is out of scope here.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first: not applicable, this is a docs-only change to help/documentation/04-markdown.md:748; the parser contract stays pinned by src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/math.test.ts:49-53.
- [ ] The Quick Reference row for block math shows the delimiters on their own lines, consistent with the Math section at 04-markdown.md:464-510.
- [ ] No other doc in help/documentation presents single-line `$$...$$` as block math.
- [ ] Gate: docs only, no test run needed (gate-matches-what-changed).

## Notes

- **Priority:** polish (bucket 3-polish). Re-rated polish: a docs-only fix. The parser contract stays pinned by math.test.ts:49-53.
- **Trigger:** Following the Quick Reference row, type `$$E=mc^2$$` on one line (also the Obsidian habit); it stays raw text.
- **Evidence (verified by reading code at `5f8003d67`):** help/documentation/04-markdown.md:748 '| `$$formula$$` | Block math |'; src/lib/core/markdown-editor/extensions/lezer/math-extension.ts:66-68 requires /^\$\$\s*$/ on the opening line; :19-23 inline parser rejects `$` preceded or followed by `$`; src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/math.test.ts:49-53 pins no BlockMath for '$$ x^2 $$'; src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.test.ts:215-216 comment states the single-line form is rejected; help/examples/markdown-editor-vault/16-math.md:170 lists it as an open edge case.
- **Second opinion:** upheld (polish, low). 04-markdown.md:748 lists `$$formula$$` as Block math. blockMathParser requires /^\$\$\s*$/ on the opening line, and math.test.ts:49-53 pins that a one-line `$$ x^2 $$` is not block math. This is a docs-only mismatch, with no data effect. Corrections to apply while implementing: Category content -> polish (docs-only fix).
- **Source:** audit 2026-11-05, domain `live-preview`, finding `N-live-preview-08` (from live-preview-spec-5). Size S.

## Comments
