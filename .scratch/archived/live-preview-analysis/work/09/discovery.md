# Issue 09 discovery: legacy decorations only in source mode; right click does not navigate

## Files that change
- `src/lib/core/markdown-editor/setup/editor-extensions.ts:19-21,44,67-69,84-85`: drop `wikilinkDecoration()` / `calloutDecoration()` from the always-on list; add an exported `sourceModeExtensions()` = `[lineNumbers(), highlightActiveLineGutter(), wikilinkDecoration(), calloutDecoration()]`; the existing `lineNumbersCompartment` becomes `sourceModeCompartment` (it already holds exactly the source-mode-only set, so it is renamed rather than duplicated).
- `src/lib/core/markdown-editor/setup/index.ts`: re-export `sourceModeExtensions`.
- `src/lib/core/markdown-editor/MarkdownEditor.svelte:45,192,421-423`: pass `sourceModeCompartment`, reconfigure it with `enabled ? [] : sourceModeExtensions()` on mode toggle (otherwise toggling to source would lose the legacy decorations, or toggling to LP would keep them).
- `src/lib/core/markdown-editor/MarkdownEditor.svelte:57-59` + `wikilink-click-target.ts`: right button. Add `findWikilinkClickTarget(e: MouseEvent)` that returns `null` when `e.button !== 0`, else `findWikilinkElement(e.target)`; `handleEditorClick` calls it. Gives the handler a unit-testable seam without mounting the component.

## Plan
1. Test-first in `src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts`: build an `EditorView` in LP and in source mode; assert `view.plugin(...)` / DOM classes: source mode renders `.cm-wikilink-target` and `.cm-callout` line, LP does not. Also a reconfigure test (LP -> source -> LP) through `sourceModeCompartment.reconfigure(sourceModeExtensions())`. Rename option in `makeOptions`. Then implement. Commit.
2. Test-first in `src/tests/lib/core/markdown-editor/wikilink-click-capture.test.ts`: `findWikilinkClickTarget` returns null for button 2 / 1 on a wikilink, the element for button 0; the mirrored capture handler uses it and a right-button mousedown on a wikilink does not reach the "navigate" call and still reaches CodeMirror. Then implement. Commit.

## Prior-art tests
- `editor-extensions.test.ts` "suppresses onDocChanged..." (real EditorView in jsdom).
- `wikilink-click-capture.test.ts` capture-phase contract (mirrored handler).

## Risks / defaults taken
- In live preview, a revealed raw `[[link]]` (cursor on it) loses the legacy `.cm-wikilink-*` color and is no longer click-to-navigate, since `WIKILINK_SELECTOR` only matched it through the legacy classes. Default: accept; a revealed element is being edited, clicking places the cursor (Obsidian behavior). Non-revealed links keep `.cm-lp-wikilink` and still navigate.
- LP callouts are styled by `calloutField` (`cm-lp-callout` line deco, always on), so removing the legacy `.cm-callout` line deco only drops the doubled border/background.
- macOS ctrl+click arrives as `button === 0` with `ctrlKey`; not handled (out of scope, the issue names the right button).
- Manual check (look in LP) cannot be done by the agent; left for the human.
