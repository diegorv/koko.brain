# 44 discovery

No `spec.md` in `.scratch/audit-2026-11-05/` (only PRD.md); the Issue is self-contained.

## Files that change

- `src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:9` BLOCK_ID_RE
  `/\^([^\s]+)\s*$/` -> `/(?:^|\s)\^([\w-]+)\s*$/` and its JSDoc. Its three users
  (findBlockIdPosition :41, copy-block-link.logic.ts:35 detectBlockElement,
  completion.logic.ts:108 extractBlockIdsFromContent) pick it up with no code change.
- Tests:
  - `src/tests/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.test.ts`:
    `- Source: [[Meeting#^abc123]]` and `Area is 5 m^2` give existingBlockId null
    (red first); a line holding only `^abc123` reports `abc123`.
  - `src/tests/lib/core/markdown-editor/extensions/wikilink/completion.logic.test.ts`
    (extractBlockIdsFromContent ~:201) and `navigation.logic.test.ts`
    (findBlockIdPosition ~:72): same two negative lines, plus a CRLF line `text ^id\r`.

## Plan

1. Add failing tests in the three test files, run them, see red.
2. Change BLOCK_ID_RE, run the three files plus copy-block-link.service.test.ts, see green.
3. Targeted checks: `pnpm check`, the four test files above.

## Prior art

Existing cases in the same describe blocks (copy-block-link.logic.test.ts:84-91,
navigation.logic.test.ts:104-117, completion.logic.test.ts:215-223).

## Risks and defaults

- `\w` without the `u` flag is ASCII-only: an id with accented letters (`^cafe-é`)
  stops matching. Default taken: Obsidian block ids are letters, digits and dashes,
  generateBlockId emits [0-9a-z], and the live-preview parser
  (parsers/block-reference.ts:2) already uses `[\w-]+`, so this aligns the rules.
- Live-preview BLOCK_REF_RE is left alone: it returns a range used by decorations
  (leading space included, no trailing whitespace), and changing it is a
  live-preview change outside the acceptance criteria.
- The heading strip at copy-block-link.logic.ts:43 keeps its own regex; it only runs
  when existingBlockId is set, and then it removes the same ` ^id` tail.
