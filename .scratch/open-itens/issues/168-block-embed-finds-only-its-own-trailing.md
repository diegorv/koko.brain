# 168: A block embed `![[Note#^id]]` shows only the line whose trailing block ID is `id`

**Origin:** `audit-2026-11-05` Issue 163, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** `extractBlockContent` (src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:40-50), used by the note-embed widget (widgets.ts:612-616), finds the block with `line.includes('^' + blockId)`. So `![[Note#^ab]]` picks the first line that contains `^ab` anywhere: a line ending in `^abc`, a line that links `[[Other#^ab]]`, or an exponent like `x^ab`. It then strips the ID with a loose `/\s*\^[^\s]+\s*$/`. Match each line with `BLOCK_ID_RE` (src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:14) and take the line where `match[1] === blockId`; strip only that trailing ID. Issue 44 aligned the copy-block-link side with this rule; this does the same on the embed side.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.test.ts: with content 'see [[Other#^ab]]\nlong line ^abc\nthe block ^ab', extractBlockContent(content, 'ab') returns 'the block'. It fails today (it returns the first line).
- [ ] A line whose text contains `x^ab` but whose trailing ID is another one is not matched, and a missing ID returns null (existing null case stays green).
- [ ] Only the trailing block ID is removed from the returned text; a `^` inside the text stays.
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Notes

- **Source:** review finding 1 of Issue 44 (`.scratch/archived/audit-2026-11-05/work/44/review.md`), older than that branch and outside its criteria. Size S.
- Not in the first wave. BLOCK_REF_RE in the live-preview parser also differs from BLOCK_ID_RE (Issue 44, nit 3); aligning it is optional and not part of this Issue.

## Comments

- 2026-11-06: filed by the main session from Issue 44's review.
