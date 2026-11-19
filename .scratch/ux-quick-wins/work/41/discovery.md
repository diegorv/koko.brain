# Issue 41 discovery

No `spec.md` exists for ux-quick-wins; the Issue file is the spec.

## Files that change

- `src/lib/plugins/word-count/WordCount.svelte:33`: the fixed "{words} words | {characters} characters | {readingTime} min read" string.
- `src/lib/plugins/graph-view/graph-view.logic.ts` (end of file): add `formatGraphStats(noteCount, linkCount)`.
- `src/lib/plugins/graph-view/GraphView.svelte:556-557`: footer renders `formatGraphStats(simNodes.length, simLinks.length)`.
- `src/lib/plugins/graph-view/GraphControls.svelte:44-63`: `aria-pressed={graphViewStore.mode === 'global'}` / `'local'` on the two mode buttons.
- Tests: `src/tests/lib/plugins/graph-view/graph-view.logic.test.ts` (new describe), new `src/tests/lib/plugins/word-count/WordCount.test.ts`, `GraphView.test.ts:73`, `GraphControls.test.ts` ('panel' describe, next to `:290-296`).

## Plan (test-first)

1. `formatGraphStats` tests (0/0, 1/1, 2/3) fail, then the helper: "N note(s) · N link(s)" with `·` (U+00B7, what `&middot;` renders). GraphView footer uses it; fix `GraphView.test.ts:73` to `toContain('1 link')` + `not.toContain('1 links')`.
2. `WordCount.test.ts` fails, then the component: `{words} {words === 1 ? 'word' : 'words'}`, same for characters, and the reading-time segment with its leading `.sep` inside `{#if words > 0}`. `estimateReadingTime` untouched.
3. `GraphControls.test.ts`: aria-pressed follows store mode and flips after a click; then add the attribute.

## Prior art

- Component mount with real stores + jsdom: `GraphView.test.ts:1-60` (mount/unmount/flushSync, `editorStore.reset()`, `editorStore.addTab`).
- Fake timers: `vi.useFakeTimers()` + `vi.advanceTimersByTime(500)` then `flushSync()`.
- Non-markdown tab: a `.canvas` path (not virtual, not `.md`) renders nothing.

## Risks / defaults

- Whitespace-only note: 0 words, N characters, no "min read" (follows the "0 words" rule; the Issue only names empty content).
- "1 character" when the count is 1 (Issue item 1); covered by the "hello" case for plural and a one-char case for singular.
- E2E `word-count.spec.ts` counts stay above 1, so selectors are unchanged; E2E is the deliver gate, not run here.
