# 44: Copy Block Link reuses only a real trailing block ID; a line ending in [[Note#^id]] or x^2 gets a new ID

**What to build:** BLOCK_ID_RE = /\^([^\s]+)\s*$/ (src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:9) needs no whitespace before `^` and accepts any non-space id, so `[[Meeting#^abc123]]` yields 'abc123]]' and `m^2` yields '2'. detectBlockElement (copy-block-link/copy-block-link.logic.ts:35-36) reports it as existingBlockId, copyBlockLink (src/lib/features/copy-block-link/copy-block-link.service.ts:46-47) skips appending a new ID, and the copied link (`[[Note#^abc123]]]]`, `[[Note#^2]]`) never resolves. extractBlockIdsFromContent (completion.logic.ts:104-114) offers the same bogus IDs. The live-preview parser already uses the stricter ` \^([\w-]+)$` (live-preview/parsers/block-reference.ts:2). Fix direction: one shared regex requiring start of line or whitespace before `^`, an id of [\w-]+, and optional trailing whitespace or \r.

**Blocked by:** none

**Status:** resolved

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [x] Failing test first, in src/tests/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.test.ts: detectBlockElement('- Source: [[Meeting#^abc123]]').existingBlockId is null, and so is detectBlockElement('Area is 5 m^2').existingBlockId. It fails today ('abc123]]' and '2').
- [x] 'Some text ^my-block', '- Task item ^todo1', '## My Heading ^abc123' and a line holding only '^abc123' still report their IDs (existing cases at :30, :85, :90).
- [x] extractBlockIdsFromContent and findBlockIdPosition use the same rule (cases in completion.logic.test.ts and navigation.logic.test.ts).
- [x] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/low. A broken link lands on the clipboard, and the note on disk is untouched.
- **Trigger:** Cursor on a line ending with a block link (`- Source: [[Meeting#^abc123]]`, `![[Meeting#^abc123]]`) or with `5 m^2`, then Cmd+Shift+L / context menu Copy block link; or `[[ThatNote#^` autocomplete in a note with such a line.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:9 BLOCK_ID_RE -> src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:35-36 existingBlockId -> src/lib/features/copy-block-link/copy-block-link.service.ts:46-53 reuse branch, no ' ^id' appended. Same regex: completion.logic.ts:104-114, navigation.logic.ts:36-50. Stricter parser: src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts:2. Help 05-wikilinks.md (Creating a block link) promises an appended ID.
- **Second opinion:** upheld (ux, low). Confirmed. BLOCK_ID_RE = /\^([^\s]+)\s*$/ (navigation.logic.ts:9) matches 'abc123]]' in `[[Meeting#^abc123]]` and '2' in `m^2`. detectBlockElement then reports it as existingBlockId, and copy-block-link.service.ts:46-47 reuses it without appending a new ID. The result is a broken link on the clipboard, while the note on disk is untouched, so this is ux rather than content. Corrections to apply while implementing: Category content -> ux.
- **Source:** audit 2026-11-05, domain `editor`, finding `N-editor-05` (from editor-spec-1). Size S.

## Comments

- 2026-11-06, branch issue/44-copy-block-link-reuses-only-real-trailing: BLOCK_ID_RE (navigation.logic.ts) now takes only a real trailing ` ^id` token of letters, digits, `_` and `-`, so a line ending in `[[Note#^id]]`, `![[Note#^id]]` or `m^2` reports no existing ID and Copy Block Link appends a new one; detectBlockElement, extractBlockIdsFromContent and findBlockIdPosition share the rule. Ids with non-ASCII letters or trailing punctuation (`^café`, `^id.`) are no longer recognized, in line with Obsidian's id charset. Tests: new cases in copy-block-link.logic.test.ts, completion.logic.test.ts, navigation.logic.test.ts; full suite 547 files, 12995 passed, 1 skipped, 1 todo, and `pnpm build` pass (exit 0). Review round 1: APPROVED (1 minor, 3 nits, no code change; extractBlockContent in embed-resolver.logic.ts keeps its own loose match, follow-up Issue).
