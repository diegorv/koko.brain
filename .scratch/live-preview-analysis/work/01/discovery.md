# Issue 01 discovery: arrow navigation always updates the reveal

## Files that change
- `src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:17-41`: the `viewportChanged` early return at :21 runs before `reconfigured` (:22), `forceDecorationRebuild` (:23) and `selectionSet` (:31).
- `src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:19-28`: `mouseup` is only heard on the content DOM.
- Tests: `src/tests/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.test.ts`, `.../core/mouse-selecting.test.ts`.

## Plan
1. `checkUpdateAction`: drop the early viewport return. Order becomes doc -> reconfigured -> forceDecorationRebuild -> drag -> selectionSet -> `'none'`. A pure scroll (no selection, no effect, no reconfigure) falls through to the final `'none'`, so scroll still defers to `scrollDebouncePlugin`.
2. `mouseSelectingHandlers.mousedown`: also register a one-shot (`{ once: true }`) `mouseup` listener on `view.dom.ownerDocument` that clears the flag. Keep the content-DOM `mouseup` handler (a widget could stop the bubble); both go through one release helper that dispatches only while the flag is set, so a normal release dispatches once.

## Prior-art tests
- `check-update-action.test.ts` `mockUpdate` stand-in (jsdom never produces a real viewport change).
- `block-decorator.test.ts` `mount()` for a real `EditorView` in jsdom; reuse that shape in `mouse-selecting.test.ts` to dispatch `mousedown` on the content DOM and `mouseup` on `document.body`.

## Risks
- A drag that scrolls the viewport now returns `'skip'` instead of `'none'`; every caller only compares to `'rebuild'`, so no behavior change.
- CodeMirror ignores dispatches on a destroyed view (`view/dist/index.js` update: `if (this.destroyed) { ...; return }`), so a late document `mouseup` after the editor closes is harmless.

## Defaults taken
- The viewport guards in `block-decorator.ts:72` and `inline-formatting-plugin.ts:160` stay as they are (the Issue lists them as read). They already let selection+viewport updates through; `block-decorator.test.ts:80` pins that a viewport update without selection skips even with a `rebuildOn` effect. So a `forceDecorationRebuild` / reconfigure that arrives with a viewport change but no selection change is still dropped by those two guards; the fix here is at the `checkUpdateAction` level, which every other plugin (the four inline ViewPlugins, legacy plugins) calls directly.
- Not verified in the app whether CodeMirror sets `viewportChanged` in the same update as an arrow move.
