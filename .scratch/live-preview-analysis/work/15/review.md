VERDICT: CHANGES_REQUESTED

# Review: Issue 15, one "open" modifier for every link; ctrl+click on macOS does not navigate

Reviewed `git diff main...HEAD` at d174f4b9 (commits 5328db85, c9919546, 86c725af, d174f4b9).

## Checks I ran

- `vitest run src/tests/lib/utils/platform.test.ts src/tests/lib/core/markdown-editor/wikilink-click-capture.test.ts src/tests/lib/core/markdown-editor/extensions/live-preview/click-handler.test.ts`: 3 files, 38 tests pass.
- `vitest run src/tests/lib/core/markdown-editor src/tests/lib/utils`: 118 files, 1812 tests pass. This covers the tests of the changed code and the rest of the editor.
- `pnpm check`: 211 files, 0 errors, 0 warnings.
- Probe (a temporary test file, deleted and not committed): mount a real `TableWidget` whose header holds `[[Target]]` inside an `EditorView`. Put the real `resolveWikilinkClickPosition(e, view, true)` in a capture-phase listener on the parent, the same way `MarkdownEditor.svelte` does, and mock `openWikilinkTarget`. Then dispatch a macOS Ctrl+click and a right click on the cell's `.cm-lp-wikilink`. Result: the resolver returns `null` for both clicks, and `openWikilinkTarget('Target')` is called **twice**. See finding 1.
- I did not run the full gate. The deliver step runs it.

My test verdict rests on `src/tests/lib/utils/platform.test.ts`, `src/tests/lib/core/markdown-editor/wikilink-click-capture.test.ts` and `src/tests/lib/core/markdown-editor/extensions/live-preview/click-handler.test.ts`. The markdown-editor and utils suite run above is the regression check.

## Acceptance criteria

- [ ] **"What to build" table, row "Ctrl+click on macOS: does not navigate" (wikilink).** Not met for wikilinks rendered inside a table cell (finding 1). It is met for inline rendered wikilinks: `wikilink-click-target.ts:48` and `wikilink-click-capture.test.ts` (`rendered wikilink`, and `macOS Ctrl+clicking a wikilink does not navigate and still reaches CodeMirror`).
- [x] **Tests cover every row of the table for both platforms, wikilink and external link.** Met for the inline paths.
  - Wikilinks: `wikilink-click-capture.test.ts`, "rendered wikilink" block. It covers plain, Cmd/Ctrl, macOS Ctrl, Cmd+Ctrl, and right and middle clicks on both platforms.
  - External links: `click-handler.test.ts`, "platform modifiers" block. It covers Cmd/Ctrl, macOS Ctrl, Cmd+Ctrl, Meta on Windows/Linux, plain clicks, and right clicks with and without the modifier.
  - No test covers the widget-rendered wikilink anchor, which is why finding 1 went unnoticed.
- [x] **Test: with the cursor on the wikilink's line (revealed source), the open modifier opens the note and a plain click does not.** Met at the resolver level. The tests are in `wikilink-click-capture.test.ts`, "revealed source" block:
  - The modifier returns a position inside the link.
  - A plain click returns null.
  - The other platform's modifier returns null.
  - Modifier + right click returns null.
  - Plain text returns null.
  - An unmapped pointer returns null.

  jsdom has no layout, so `posAtCoords` is stubbed. Someone still has to Cmd+click a revealed link in the app by hand.
- [x] **Plain click on a rendered wikilink still opens the note.** Met. `renderedClick()` returns `INSIDE_LINK` on both platforms. The capture-phase contract tests still pass.
- [x] **Detect the platform once, reuse a helper if one exists.** Met. A grep of `src/lib` for `navigator.platform`, `isMac`, `userAgent` and `plugin-os` finds no existing helper. `IS_MAC` is computed once at module load (`platform.ts:23`). It is SSR-safe through the `typeof navigator` guard.
- [x] **Do not add "open in new tab".** Met.

## Decisions, rules and scope

- CodeMirror calls `domEventHandlers` as `handler.call(plugin, event, view)` with two arguments (`node_modules/@codemirror/view/dist/index.js`, `bindHandler`). So the default parameter `mac = IS_MAC` in `handleLivePreviewLinkMousedown` is never overridden in production.
- The behavior changes listed in the build report are all consequences of the Issue's table, not scope creep:
  - Meta+click on Windows/Linux no longer opens external links.
  - Cmd+Ctrl+click on macOS is treated as a context-menu click.
  - Ctrl+right-click no longer opens external links.
- Layer rules are fine. `utils/platform.ts` is pure apart from reading `navigator` once, and `core/` imports only `utils/` and the wikilink logic.
- Tabs, JSDoc on the new exports and interface fields, and the `.js` extension on `#lib/` imports are all fine.
- Every changed source file has its test file updated.
- No docs refer to the removed `findWikilinkClickTarget` or to the old `metaKey || ctrlKey` rule. The archify HTML matches are unrelated keyboard handlers.

## Findings

1. **Medium.** In a rendered table cell, a macOS Ctrl+click on a wikilink still navigates. So does a right click on every platform. File: `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:303`.
   - Cause: `renderCellContent` gives each cell wikilink anchor its own `mousedown` listener, and that listener calls `openWikilinkTarget(target)` without checking the button or the modifier. The capture handler in `MarkdownEditor.svelte` now returns early for a macOS Ctrl+click (and for any non-primary button since issue 09) without stopping propagation, so the event reaches the anchor and the anchor navigates. If the note does not exist, it creates it. The probe above confirms this.
   - Fix: at the top of the anchor's listener, return early when `e.button !== 0 || isMacContextClick(e, IS_MAC)`. Do not call `preventDefault` or `stopPropagation` in that case, so the context menu still opens.
   - Test: add one to `table-widget.test.ts` that mocks `wikilink-navigation`, dispatches a primary mousedown, a macOS Ctrl mousedown and a right mousedown on the cell's `.cm-lp-wikilink`, and asserts the navigation calls.
   - Related: the QueryJS result link in `src/lib/plugins/queryjs/kb-api.ts:418` (`.cm-lp-qjs-link`) has the same unconditional `mousedown` → `openFileInEditor`. Apply the same guard there if "every link" is meant to include QueryJS output.
2. **Medium.** The modifier path through `posAtCoords` ignores block context, so Cmd/Ctrl+click on `[[x]]` text inside a revealed fenced or indented code block opens note `x`, or creates it if it does not exist. File: `src/lib/core/markdown-editor/wikilink-click-target.ts:53-56`.
   - Cause: the resolver runs `findWikilinkInfoAtPosition` on the raw line text. The decoration path never treats that text as a link, because `inline-formatting-plugin.ts:123` skips lines where `isInsideBlockContext` is true (FencedCode, CodeBlock, HTMLBlock, CommentBlock, BlockMath, Frontmatter).
   - Impact: on macOS, Cmd+click is also CodeMirror's add-cursor gesture. A user placing multiple cursors in a code sample that mentions `[[...]]` would instead create a stray note on disk.
   - Fix: on the `posAtCoords` path, return null when `isInsideBlockContext(syntaxTree(view.state).resolveInner(pos))` (from `extensions/live-preview/core/is-inside-block-context.ts`).
   - Test: in the "revealed source" block, use a document with ```` ```\n[[x]]\n``` ```` and assert that the modifier there returns null.
3. **Low.** Cmd/Ctrl+click in the empty space to the right of a line that ends in `]]` opens that link. File: `src/lib/core/markdown-editor/wikilink-click-target.ts:53-56`.
   - Cause: `posAtCoords` maps a click past the end of a line to `line.to`, and `findWikilinkInfoAtPosition` accepts `docPos <= end` (`decoration.logic.ts:109`). The inclusive end is right for the element path, where `posAtDOM` returns the element start, but too generous for a coordinate lookup.
   - Fix: on the coordinates path, reject a position at `line.to` when `e.clientX` is to the right of `view.coordsAtPos(line.to)?.right`. Otherwise accept and document it as a known quirk.
   - Optional.

## Notes (not findings of this Issue)

- Unverified, and worth a manual check or a follow-up Issue: for a plain click on a table-cell wikilink, the capture handler finds `.cm-lp-wikilink`, calls `preventDefault` and `stopImmediatePropagation`, and resolves the position through `posAtDOM(anchor)`. Inside a block widget, `posAtDOM` returns a widget boundary, which is probably not inside the cell's `[[...]]`. In that case `findWikilinkInfoAtPosition` returns null and the click does nothing, and the anchor's own handler never runs. In jsdom the probe got `pos=28` and `info=null`, but jsdom does not mount the widget the way CodeMirror does, so this is not proof. This predates Issue 15.
- Still needs a manual check in the app: Cmd+click on a revealed `[[link]]` (macOS) and Ctrl+click (Windows/Linux) open the note.
