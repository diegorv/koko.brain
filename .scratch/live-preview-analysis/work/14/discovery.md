# Issue 14 discovery: native text drag leaves the mouse-selecting flag set

## Files that change
- `src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:25-45`: add a `dragstart` handler to `mouseSelectingHandlers` that calls `releaseMouseSelecting(view)`; extend the JSDoc.
- `src/tests/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.test.ts`: new cases in the `mouseSelectingHandlers` block.
- `check-update-action.ts`: no change (see Defaults).

## Plan
1. Release on `dragstart`, not on `drop`/`dragend`. Once the browser starts a native drag no mouse selection is in progress, and the sequence ends in `drop`/`dragend` with no `mouseup`.
   - `dragstart` fires on the source, which is still in the content DOM. `dragend` also fires on the source node, but a same-editor move drop deletes that text first, so `dragend` would reach a detached node and never bubble to the content DOM.
   - A drop into another pane never fires `drop` in the source editor.
   - Releasing before the drop also means the drop's doc change (`move.drop`) rebuilds with the cursor's line revealed. A release on `drop` would come after that rebuild.
   - CodeMirror runs custom `domEventHandlers` before its own `dragstart` (input.ts `runHandlers`). An effect-only dispatch leaves `state.selection` as it was, so CM's `draggedContent` is the same range.
2. The one-shot document `mouseup` listener armed on mousedown stays armed until the next mouseup. `releaseMouseSelecting` does nothing when the flag is already false, so that later call is a no-op.

## Tests (test-first, copy the `mount`/`mouse` helpers in mouse-selecting.test.ts)
- mousedown, dragstart, drop, dragend on the content DOM with no mouseup: the flag is `false`, and an update listener running `checkUpdateAction` records a `'rebuild'` for the release update (before the fix it records only a `'skip'`).
- After that drop, a selection move to another line: `checkUpdateAction` returns `'rebuild'` (not `'skip'`) and `revealPredicate(view.state)` is true for the cursor's line.
- jsdom has no `DragEvent`: use `new Event('dragstart', { bubbles: true })`. CM's built-in dragstart and drop handlers check for `dataTransfer` before using it.

## Risks
- A drag that starts with no mousedown in this editor (a drag from outside) never set the flag, so the guarded release dispatches nothing.

## Defaults for open questions
- Related `isPureScroll` case: left unchanged. `scrollDebouncePlugin` (`core/scroll-debounce-plugin.ts:32`) arms a `forceDecorationRebuild` 150 ms after any viewport change without a doc change. A release that rides a viewport change therefore gets a forced rebuild once that change settles, and by then the flag is false. The case the Issue describes ("lost until ... scroll settle") already ends on its own, so an exemption adds code for no visible gain.
