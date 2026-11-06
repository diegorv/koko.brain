# 05: Live-preview controls change only the text the user asked to change: fence attributes, task markers and tab-indented pastes stay intact

**Migrated from:** `.scratch/file-io-audit/issues/52-live-preview-unrequested-rewrites.md` (audit 2026-11-05). Priority: content safety (bucket 1-content). Still present, content/medium. These are silent rewrites of note text from daily live-preview controls. They are undoable, so they rank below the caret and fence bugs.

**Audit check at `5f8003d67`:** still_present (content, medium). F101: src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:58-61 still slices the whole CodeInfo into `language` and uses its full bounds for languageFrom/languageTo. widgets/code-block-widget.ts:112 passes the whole string to highlightCode, :146-169 buildLanguageSelect prepends it as an exotic option, and :171-182 dispatchLanguageChange replaces the full range. plugins/code-block-field.ts:13,37 SPECIAL_LANGUAGES is still keyed on block.language. F92: widgets.ts:41-47 TaskCheckboxWidget mousedown still calls preventDefault and dispatches with no e.button or isMacContextClick check. The wikilink guard is at widgets.ts:311, the callout header guard at :646, and the imports at :21. Right-clicking a task to open the context menu toggles it, and the owner uses the editor context menu daily. F121: handlers/paste-tsv-handler.ts:19-40 still checks only clipboardToMarkdownTable, with no fence, inline-code or frontmatter check. handlers/paste-tsv.logic.ts:19-26 looksLikeTSV still accepts a first row with a leading empty cell. None of these files changed for these items since the Issue was written (git log: 575b84f2f, 325ce66fd, 9caed179c, 250d6eaf6 touched other code).

**Stale in the text below:** Line numbers drifted slightly. In code-block-widget.ts, highlightCode is at :112 (not :111), buildLanguageSelect at :146-169 and dispatchLanguageChange at :171-182. widgets.ts imports IS_MAC/isMacContextClick at :21 (not :18), the checkbox listener is at :41-47 and the wikilink guard at :311 (not :295). code-block-field.ts SPECIAL_LANGUAGES is at :13 and its use at :37 (not :12,27). fenced-code-block.ts CodeInfo handling is at :58-61.

**Status:** ready-for-agent

Priority: P2 (visible, undoable rewrites of the fence line, a task marker or pasted text; no existing text is lost beyond the fence attributes)

**What to build:** three small live-preview fixes. Each one makes a control change only what the user asked for.

1. **Code-block language switch keeps the rest of the info string (F101).** `findAllFencedCodeBlocks` (src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:59-62) takes the whole `CodeInfo` slice as `language` and its bounds as `languageFrom`/`languageTo`. Lezer's `CodeInfo` spans the whole info string after the fence (node_modules/@lezer/markdown/dist/index.js:462-465), so for ` ```python title="main.py" ` the language is `python title="main.py"`. `buildLanguageSelect` (src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:145-168) prepends that whole string as an exotic option, and `dispatchLanguageChange` (:170-181) replaces the full range, so picking `javascript` writes ` ```javascript ` and deletes `title="main.py"` (or `{1,3}`). `highlightCode(this.code, this.language)` (:111) also gets the whole string, so these blocks are never highlighted.

   Fix: treat the first whitespace-delimited token of `CodeInfo` as the language tag. Narrow `languageTo` to `languageFrom + token.length` so the replace touches only the tag, and give the widget the token for the dropdown, the preselection and `highlightCode`. Keep the `SPECIAL_LANGUAGES` skip in `computeCodeBlocks` (src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:12,27) keyed on the whole info string (keep it in its own field), because the special decorators claim only a fence whose tag stands alone (`MERMAID_OPEN_RE` parsers/mermaid.ts:19, `QUERYJS_OPEN_RE` parsers/queryjs-block.ts:19, `COLLECTION_OPEN_RE` parsers/collection-block.ts:19, `META_BIND_BUTTON_OPEN_RE` parsers/meta-bind-button.ts:19). Keyed on the token, ` ```mermaid title="x" ` would be skipped by the code-block decorator and claimed by no special decorator, so it would lose its rendering. Update the `FencedCodeBlockRange` JSDoc (fenced-code-block.ts:17-29) to say what each field holds.

2. **Only a primary click toggles a task checkbox (F92).** `TaskCheckboxWidget.toDOM` (src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:36-42) calls `preventDefault` and dispatches the `[ ]` / `[x]` change on every `mousedown`, whatever the button. A right-click to open the editor context menu (MarkdownEditor.svelte:84-89, :412), a middle-click, or a macOS Ctrl+click toggles the task, and the update listener (src/lib/core/markdown-editor/setup/editor-extensions.ts:170-188) autosaves it like a keystroke. The wikilink in the same file already guards this (widgets.ts:295).

   Fix: at the top of the listener add `if (e.button !== 0 || isMacContextClick(e, IS_MAC)) return;` before `preventDefault` (`IS_MAC` and `isMacContextClick` are already imported at widgets.ts:18).

3. **TSV paste leaves code and indented lines alone (F121).** `pasteTsvHandler` (src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts:18-40) converts any text that `clipboardToMarkdownTable` accepts, with no look at where the cursor is. `looksLikeTSV` (handlers/paste-tsv.logic.ts:19-26) accepts any text whose first row has two cells, so a leading tab (an empty first cell) passes. Tab-indented Go or Makefile code pasted into a ` ```go ` fence, and tab-indented nested list lines copied from this tab-indented editor, are turned into a pipe table.

   Fix, two parts: (a) in the handler, return `false` (default paste) when the selection head is inside a block context (`isInsideBlockContext`, live-preview/core/is-inside-block-context.ts:4,13, covers `FencedCode` and `CodeBlock`), inside `InlineCode`, or inside the frontmatter block (`findFrontmatterBlock`, parsers/frontmatter.ts:17). (b) In `looksLikeTSV`, return `false` when every row starts with an empty first cell (every line begins with a tab): that is indentation, not a table. A spreadsheet range whose top-left cell alone is blank still converts. Update the file header and `looksLikeTSV` JSDoc (paste-tsv.logic.ts:14-18) to match.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:17-29,59-62, src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:12,27,40-44, src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:111,145-181, src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:36-42, src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts:18-40, src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts:14-26, src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.test.ts, src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.test.ts, src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.test.ts, src/tests/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.test.ts

- [ ] Failing tests come first. Move the `F101`, `F92` and `F121` describes of `.scratch/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts` under `src/tests/` (next to the code-block widget, task checkbox and TSV paste tests; jsdom; fix the `test-helpers` import path) and see them fail. The `F105` describes in the same file belong to issue 46: leave them
- [ ] Switching ` ```python title="main.py" ` to `javascript` through the real `computeCodeBlocks` widget writes ` ```javascript title="main.py" `; ` ```js {1,3} ` keeps ` {1,3}` the same way; a fence with no info string still gets the tag inserted at `openFenceTo`
- [ ] The dropdown preselects `python` for that fence and `highlightCode` gets `python`
- [ ] ` ```mermaid title="x" ` (any special tag followed by more text) still renders as a code block, and ` ```mermaid ` alone is still skipped by the code-block decorator
- [ ] A `mousedown` with button 1 or button 2 on the real `TaskCheckboxWidget` input leaves the doc unchanged
- [ ] With `IS_MAC` true, a button-0 `mousedown` with `ctrlKey` leaves the doc unchanged; a plain button-0 `mousedown` still toggles `[ ]` to `[x]` and back
- [ ] A real paste event of `\tif err != nil {\n\t\treturn err\n\t}` inside a ` ```go ` fence inserts the code verbatim; the same paste into frontmatter or an indented code block is not converted either
- [ ] `clipboardToMarkdownTable('\t- child one\n\t- child two')` returns `null`; a TSV whose first row alone starts with a tab (blank top-left cell) still converts to a table
- [ ] Existing code-block widget, fenced-code parser, simple-widget-handler and TSV tests still pass

## Audit evidence (editor-data-safety, 2026-11-02)

Source: editor-data-safety audit (`.scratch/editor-data-safety/audit-2026-11-02.md`, P2 table), cross-referenced in `.scratch/editor-data-safety/xref-file-io-audit.md` (no existing issue covers the code-block dropdown range, the checkbox button check, or TSV paste context; issue 27's fenced-code item is the rename regex inside fences, issue 13 is a different paste trigger). Code re-read at 1351a35d; the line numbers above are current.

### F101: code-block language switch replaces the whole info string and drops text after the language

- Verdict: REPRODUCED (P2, likelihood occasional)

**How a user hits it.** A note has ` ```python title="main.py" ` (or ` ```js {1,3} `). The cursor is elsewhere, so the fence line is hidden behind the code-block widget. The user picks another language in the header dropdown; the attributes are deleted without a visible change on the fence line, and autosave writes it. Cmd+Z restores it while the editor history lives.

**Code trace.** @lezer/markdown index.js:462-465 emits one `CodeInfo` from the first non-space after the fence to the last non-space of the line. fenced-code-block.ts:59-62 slices it whole into `language` and keeps its bounds. code-block-field.ts:40-44 hands both to `CodeBlockWidget`. code-block-widget.ts:149-151 prepends `python title="main.py"` as an option (it is not in `COMMON_LANGUAGES`); :174-180 dispatch `changes: { from: languageFrom, to: languageTo, insert: newLanguage }`.

**Repro test.** `.scratch/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts`, describe `F101`. It first asserts `widget!.language` is `python title="main.py"` (passes), then fails on `expect(view.state.doc.line(1).text).toBe('```javascript title="main.py"')` with `expected '```javascript' to be '```javascript title="main.py"'`.

**Fix sketch.** Take the language as the first whitespace-delimited token of `CodeInfo`, set `languageTo = languageFrom + token.length`, and build the dropdown from that token. The `SPECIAL_LANGUAGES` caveat in "What to build" is from this review, not the audit.

### F92: right-click, middle-click and macOS Ctrl+click toggle a task checkbox and rewrite the note

- Verdict: REPRODUCED (P2, likelihood occasional)

**How a user hits it.** A note contains `- [ ] buy milk` with the cursor on another line, so the checkbox renders. The user right-clicks the checkbox to open the context menu (or middle-clicks on Windows and Linux, or Ctrl+clicks on macOS). The task flips to `[x]` and is saved; the context-menu handler then moves the cursor onto the line, which reveals the raw `[x]`.

**Code trace.** simple-widget-handlers.ts:19-31 build `TaskCheckboxWidget` for every unrevealed `TaskMarker` (the only creator). widgets.ts:36-42: `addEventListener('mousedown', (e) => { e.preventDefault(); ... view.dispatch(...) })` with no `e.button` check. widgets.ts:293-295, the wikilink in the same file, returns early on `e.button !== 0 || isMacContextClick(e, IS_MAC)`. `isMacContextClick` (src/lib/utils/platform.ts:38-40) is `mac && e.ctrlKey`. editor-extensions.ts:171 forwards the change to `onDocChanged` because neither suppress flag is set.

**Repro test.** `.scratch/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts`, describe `F92`. Both tests fail on `expect(view.state.doc.toString()).toBe(doc)`: the doc becomes `- [x] buy milk\n\ntext` for button 2 and for button 1. The macOS Ctrl+click case has no repro test; it is from the code trace (add it as the criterion above says).

**Fix sketch.** `if (e.button !== 0 || isMacContextClick(e, IS_MAC)) return;` at the top of the listener, before `preventDefault`.

### F121: TSV paste turns tab-indented code, even inside a fence, and tab-indented list lines into a table

- Verdict: PARTIAL (P2, likelihood occasional). The fence and indentation part is reproduced. The audit's backslash claim is not carried here: the deep dive found `\` to `\\` in `tsvRowsToMarkdownTable` (paste-tsv.logic.ts:129-130) is correct escaping for literal cell text and renders the same in GFM.

**How a user hits it.** The user copies Go or Makefile code whose lines start with tabs, or nested list lines from this editor, and pastes into a note or into a ` ```go ` fence. The text arrives as a pipe table with an empty first column. The paste is one transaction (`userEvent: 'input.paste'`), so Cmd+Z restores it and the clipboard still holds the original.

**Code trace.** live-preview.ts:101 installs `pasteHtmlLinkHandler` then `pasteTsvHandler`; the HTML handler returns `false` when the clipboard HTML has no anchor, so IDE copies fall through. paste-tsv-handler.ts:20-24 checks only `clipboardToMarkdownTable(clipboardText)`. paste-tsv.logic.ts:19-26: `text.includes('\t')` and `rows[0].length >= 2`; for `\tif err...` row 0 is `['', 'if err != nil {']`.

**Repro test.** `.scratch/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts`, describe `F121`. Both tests fail: the paste inside the fence inserts `|  | if err != nil { |  |` / `| --- | --- | --- |` / `|  |  | return err |` / `|  | } |  |` instead of the code (`expect(out).toBe('```go\n' + code + '\n```')`), and `expect(clipboardToMarkdownTable('\t- child one\n\t- child two')).toBeNull()` receives a 2-column table.

**Fix sketch.** In the handler, resolve the syntax tree at the selection and return `false` inside `FencedCode`, `CodeBlock` or `InlineCode` and inside the frontmatter range. In `looksLikeTSV`, reject input where every row starts with a tab.

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/52-live-preview-unrequested-rewrites.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
