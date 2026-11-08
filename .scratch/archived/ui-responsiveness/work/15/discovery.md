# Issue 15 discovery: TAB_SWITCH scroll logging

No `spec.md` for this feature. Logging only, no fix.

## Files that change

- `src/lib/core/markdown-editor/MarkdownEditor.svelte`
  - tab-switch effect `:321-419`: saved view state `:360`, doc replace `showTabState` `:377`, `view.focus()` `:390`, rAF chain `:400-415` (frame 1 = scroll restore `:403-407`, frame 2 = `forceDecorationRebuild` `:412`)
  - pending-scroll effect `:421-442`: double rAF dispatches `EditorView.scrollIntoView(pos, center)` `:434-437` (runs on a switch that carries an anchor, `open-note-at.service.ts:48`, `app/editor-host.ts:34`)
- `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts`: new `describe('tab-switch scroll log')`

## Plan

1. A helper `logTabScroll(step, path)` in the component: one `debug('TAB_SWITCH', ...)` line with path, `scrollDOM.scrollTop`, `view.viewport` from-to. It returns early unless `debugMode || debugLogToFile`, so the `scrollTop` read (a forced layout) never runs with the log off.
2. Lines: saved view state used (or `none (fresh tab)`), before replace, after replace, after focus, frame 1 (before restore), after restore, frame 2, frame 3 (a third rAF, so two frames follow the restore).
3. A `scroll` listener on `scrollDOM` (only with the log on), attached on the switch with the rAF chain's abort signal and removed in frame 3: logs every scroll event, so CodeMirror's own `scrollTop` writers show up even though they cannot be logged at the source.
4. The pending-scroll effect logs before and after its `scrollIntoView` dispatch.
5. No line carries note text: only path, numbers, step names.

## Other scrollTop writers / scrollIntoView on the switch path (for the Issue Notes)

- `MarkdownEditor.svelte:403-407` scroll restore (`scrollTo`): logged `after restore`
- `MarkdownEditor.svelte:434-437` pending-scroll `scrollIntoView`: logged `pending scroll before/after`
- `@codemirror/view` 6.43.15 `index.js:5297-5302` focus observer: on focus with `scrollTop == 0` it writes `inputState.lastScrollTop` back (inputState survives `setState`). Reached by `view.focus()` `:390` when the editor did not have focus (sidebar click). Logged by `after focus` and the scroll listener. Strong lead.
- `index.js:8296-8310` measure loop scroll-anchor correction (`scrollTop += diff`, or `= scrollHeight` when `scrollAnchorPos < 0`): logged by the scroll listener.
- `index.js:8289-8293` / `3482-3486` pending `scrollTarget` -> `docView.scrollIntoView`: logged by the scroll listener.
- Not on the switch path: `wikilink-navigation.ts:43` (same-note anchor), `onMount` restore `:283-287` (mount, not switch).

## Tests (prior art)

- `src/tests/lib/utils/debug.test.ts`: mocks `#lib/utils/log.service.js` `appendLog`, flips `settingsStore.updateDebugLogToFile`.
- `MarkdownEditor.test.ts` `openTab` helper for a switch. Stub `requestAnimationFrame` with a manual queue to step frames.

## Risks / defaults

- With the log on, the `scrollTop` reads force layout and can shift timing a little; off, nothing runs.
- Default: "next two animation frames" read as the two frames after the restore (frames 2 and 3); frame 1 is also logged.
