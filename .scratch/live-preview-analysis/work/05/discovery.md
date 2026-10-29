# Issue 05 discovery: blocks and embeds follow the same reveal rule

Template: Issue 04 (`work/04/discovery.md`). The predicate `core/reveal.ts::revealPredicate(state)` already exists; this Issue moves the remaining callers of `core/should-show-source.ts` onto it. Paths below are under `src/lib/core/markdown-editor/extensions/live-preview/`.

## Files that change
- Block decorators, one `shouldShowSource(state, a, b)` call each, becomes `isRevealed(a, b)` with `const isRevealed = revealPredicate(state)` once per compute: `plugins/table-field.ts:21`, `code-block-field.ts:26,59` (fenced + indented), `callout-field.ts:141`, `block-math-field.ts:17`, `mermaid-field.ts:23`, `queryjs-block-field.ts:24`, `collection-block-field.ts:23`, `meta-bind-button-field.ts:24`, `block-comment-field.ts:22`, `audio-plugin.ts:23`, `video-plugin.ts:23`.
- Inline ViewPlugins, same swap inside their `build*Decorations`: `image-plugin.ts:118`, `footnote-plugin.ts:78,84,90`, `wikilink-embed-plugin.ts:79`, `meta-bind-input-plugin.ts:76`. JSDoc "per-element cursor" lines become "line touched by the selection".
- `core/block-decorator.ts:34-35`: `compute` JSDoc states the reveal contract (call `revealPredicate`). No code change: the update gates stay until Issue 06.
- `core/should-show-source.ts` + its test: no caller left, deleted (orphaned by this change).
- Stale references to `shouldShowSource` in comments/docs: `widgets.ts:419`, `widgets/queryjs-block-widget.ts:153`, `core/check-update-action.ts:13,28`, `MarkdownEditor.svelte:68`, `src/tests/.../wikilink-click-capture.test.ts:76`, `CLAUDE.md` perf rule 11, `docs/LIVE-PREVIEW.md:11,35,124,151,224`.

## Plan
1. Test-first: new jsdom test `src/tests/.../live-preview/plugins/keyboard-reveal.test.ts` mounts table, fenced code, callout and wikilink-embed plugins in a real `EditorView`, moves with `cursorLineDown`/`cursorLineUp` (`@codemirror/commands`) into and out of each, asserting the widget/marker decorations disappear on entry and come back on exit. Embed case puts `![[note]]` mid-line and enters at column 0: fails on main (position overlap), passes with the line rule.
2. Swap block decorators; swap inline ViewPlugins (one commit each), adding a same-line test per inline plugin (cursor elsewhere on the embed/image/footnote/input line reveals it).
3. Delete `shouldShowSource`, update comments and docs.

## Prior-art tests
`plugins/*.test.ts` (compute over `createMarkdownState`), `plugins/queryjs-block-field.test.ts` (jsdom `EditorView` + `view.plugin(field).decorations`), `core/reveal.test.ts`.

## Risks
- Inline ViewPlugins change from per-element to per-line: a cursor anywhere on a line shows every image/embed/footnote/meta-bind input on it as source. Intended by the target model; meta-bind selects on the cursor line become text.
- Blocks span whole lines, so block behavior is unchanged except a non-empty selection ending exactly at a block's first line start no longer reveals it (the 04 line-start rule).
- During a mouse drag the predicate reveals nothing; a forced rebuild mid-drag (callout fold, scroll debounce) hides a revealed block until mouseup. Same as inline since 04.
- Widget caches (queryjs session store, math/mermaid markup, collection data) are not touched; only the reveal check before widget construction changes.

## Defaults taken
- `compute(state)` signature kept; each compute builds its own predicate, so the many `compute*(state)` tests stay untouched.
