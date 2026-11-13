# Issue 04 discovery: one reveal rule for inline formatting

## Files that change (paths under src/lib/core/markdown-editor/extensions/live-preview/)
- `core/reveal.ts` (new): `revealPredicate(state)` computes the line intervals touched by every selection range once (empty while `mouseSelectingField` is set) and returns `isRevealed(from, to = from)`: true when any line from `lineAt(from)` to `lineAt(to)` is touched. Line intervals instead of a Set so select-all on a big note stays O(ranges).
- `inline/inline-formatting-plugin.ts:22-25,43-46,88`: `isTouched` arg becomes `isRevealed`, built once per build from `revealPredicate`; drop the `shouldShowSource` import.
- `inline/handlers/*.ts`: every `isTouched(...)` call becomes `isRevealed(...)`; JSDoc that says "cursor inside the X" now says "line touched by the selection". Handlers still pass the construct range so a multi-line construct (setext heading, emphasis across a soft break) reveals as a unit; the line mapping lives in the predicate only.
- `parsers/blockquote.ts:51-55`: `markFrom` = first QuoteMark `from`, not the line start.
- `inline/handlers/blockquote-handler.ts:48`: range starts at `range.markFrom`, so `- > quote` keeps its ListMark bullet widget.
- `core/should-show-source.ts`: untouched; block decorators and plugins still call it until Issue 05.

## Plan
1. Test-first `core/reveal.test.ts`: single cursor, multi-cursor, multi-line selection, drag in progress, multi-line range.
2. Test-first: `**one** and **two**` with the cursor on "and" emits no replace (mark-handlers test); `- > quote` keeps the bullet widget and the hidden range starts at the `>` (blockquote-handler test with listMarkHandler); same-line reveal tests for link, wikilink, inline comment, autolink, escape.
3. Wire the predicate, rename, fix blockquote, update tests that encoded per-node reveal.

## Prior-art tests
`src/tests/.../live-preview/inline/handlers/*.test.ts` (`build()` over `buildInlineDecorations`), `core/should-show-source.test.ts` (multi-cursor state helpers), `core/mouse-selecting.test.ts`.

## Risks
- The plugin's `lastCursorLine` gate (main head line) can leave a stale reveal when a multi-line selection collapses onto the same head line. Removing the gate is Issue 06; not done here.
- Per-node behavior is intentionally gone: a cursor anywhere on a line reveals all inline syntax on it. Tests asserting the old per-node behavior get updated, not deleted.
- e2e specs are not in the gate; any that assert per-node reveal are edited by reading only.

## Defaults taken
- New file instead of rewriting `shouldShowSource`, so block decorators do not change behavior before Issue 05.
- A range `[from, to]` reveals when any of its lines is touched (construct-level, line-granular).
