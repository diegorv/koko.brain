# Issue 16 discovery: empty link text crashes the inline plugin

## Files that change
- `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:38-52`: return (show source) when the label is empty (`marks[0].to === marks[1].from`), before any push.
- `src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:108-110,125-127` (`buildInlineDecorations`): run each node and line handler through one guard that records `decorations.length`, catches a throw, truncates back to that length (drops the handler's partial pushes for that node/line) and logs once per handler with `appendLog('LP-INLINE', ...)`.
- Tests: `inline/handlers/markdown-link-handlers.test.ts`, `inline/inline-formatting-plugin.test.ts`, `inline/pipeline-dom.test.ts` (all under `src/tests/lib/core/markdown-editor/extensions/live-preview/`).

## Why there is no separate "drop empty mark ranges" filter
CodeMirror throws `Mark decorations may not be empty` in `MarkDecoration.range()` itself (`@codemirror/view` dist/index.js:316-318), i.e. inside the handler, before the range reaches `decorations`. An empty mark range can never be in the array, so a post-filter would be dead code. The handler guard is what keeps the plugin alive: it catches that RangeError (and any other throw) and rolls back the node's partial pushes, so `[` is not left hidden while `](url)` shows.

## Plan (test-first)
1. Red: pipeline-dom test mounting `[](https://example.com)` + `# Heading` (cursor on another line) asserts the `#` is hidden and `console.error` never got "CodeMirror plugin crashed"; same test mounts `help/examples/markdown-editor-vault/06-links.md` (read with `node:fs`) and asserts no crash.
2. Red: link handler test, `[](url)` and `[][ref]` emit no zero-length range (and no throw).
3. Red: plugin test, a node handler that throws on one node (after pushing a partial range) leaves the other nodes' decorations and none of the partial ones; a throwing line handler skips only that line; `appendLog` (mocked log.service, a side-effect service) called once for repeated throws of the same handler.
4. Green: the two source changes above.

## Prior art
- `mountView` + `console.error` spy pattern in `pipeline-dom.test.ts:35-47`.
- `build()` helper in `markdown-link-handlers.test.ts:13-32` and `inline-formatting-plugin.test.ts:30-35`.

## Risks
- Swallowing handler errors hides bugs; the `appendLog` line keeps them visible in the session log. Logged once per handler name per app session so a rebuild per keystroke does not flood the log.

## Defaults for open questions
- Empty-label link shows its source (not fully hidden): an all-hidden `[](url)` would render as nothing, and showing source is the smaller change.
- Log key is the handler's `nodeType` / `name`; the dedupe set is module-level.
