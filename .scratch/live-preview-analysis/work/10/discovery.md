# Issue 10 discovery: shared hidden-line helper and dead code

All paths under `src/lib/core/markdown-editor/` unless absolute. `LP` = `extensions/live-preview/`.

## Files that change
- New `LP/core/hide-lines.ts`: `hideLines(out, doc, firstLine, lastLine)` pushes `hiddenLineDeco` + `Decoration.replace({})` per line; `out` is a `RangeSetBuilder` or a `Range<Decoration>[]` (code-block collects ranges).
- Callers (loop -> helper): `LP/plugins/block-comment-field.ts:35-38`, `block-math-field.ts:30-36`, `code-block-field.ts:46-52,87-91`, `collection-block-field.ts:29-35`, `mermaid-field.ts:29-35`, `meta-bind-button-field.ts:29-35`, `queryjs-block-field.ts:31-37`, `table-field.ts:46-50`, `video-plugin.ts:35-38`, plus the same loop in `audio-plugin.ts:35-38` and `frontmatter-field.ts:21-24`.
- 3.8 `Decoration.set(ranges, true)`: `LP/plugins/code-block-field.ts:17-101`, `extensions/composition-aware-bracket-matching.ts:115-140`, `extensions/wikilink/decoration.ts:18-56`.
- 3.6 `LP/plugins/callout-field.ts:152` (`isFoldable = true`), `:242` (duplicate hidden line deco).
- 3.7 dead code, callers traced: `LP/parsers/frontmatter.ts` (`properties` field, its YAML parser, only tests read it), `LP/core/is-inside-block-context.ts:4` (`Frontmatter`), `LP/parsers/footnote.ts:52`, `LP/widgets.ts:274,701`, `setup/editor-extensions.ts:16,104`, `LP/inline/handlers/simple-widget-handlers.ts:66`, `extensions/date-shortcut/completion.logic.ts:13-14,35`, `LP/code-highlight.logic.ts:28-49`.
- Test gaps: `src/tests/.../core/reveal.test.ts`; source-mode toggle seam `setup/editor-extensions.ts` (`editorModeEffects`) used by `MarkdownEditor.svelte:411-424`, tested in `src/tests/.../setup/editor-extensions.test.ts`; new `e2e/specs/live-preview/arrow-reveal.spec.ts`.

## Plan (one commit each)
1. `hideLines` + test (`src/tests/.../core/hide-lines.test.ts`), then swap every loop; existing plugin tests prove no change.
2. 3.8 `Decoration.set` swaps (existing tests).
3. 3.6 + 3.7 removals, one commit, callers named per item; delete only tests of removed code.
4. reveal.test.ts gaps (tests only).
5. `editorModeEffects` seam + toggle test (LP -> source -> LP, one size owner each).
6. E2E arrow reveal spec, run alone with `bash scripts/e2e.sh <spec>`.

## Prior art
- Plugin tests in `src/tests/.../live-preview/plugins/*-field.test.ts` (iterate the DecorationSet).
- `editor-extensions.test.ts` "heading font size has one owner per mode".
- `e2e/specs/live-preview/tables.spec.ts`, `code-blocks.spec.ts`, `blockquotes-callouts.spec.ts` selectors.

## Risks / defaults taken
- Report 3.7 is partly stale or wrong: `fenceChar` was already removed by Issue 08; `CommentBlock` is NOT dead (`@lezer/markdown` emits it for `<!-- -->` HTML comment blocks), so only `Frontmatter` leaves the set.
- `callout-field` hides collapsed content with the line class only (no text replace) and is a fold, not a block swap; it keeps its own loop (only the duplicate deco goes). Adding a replace there would change cursor motion through folded lines.
- `Decoration.set` sorts by `from`/`startSide`, the old sorts by `from`/`to`; equal for these sets (no two marks of different length start at the same `from` with an order that matters).
- `highlightSelectionMatches` with `minSelectionLength: Infinity` and no word highlight never decorates (checked `@codemirror/search` dist, conditions at lines 426/436).
