VERDICT: CHANGES_REQUESTED

# Review: Issue 01, arrow navigation always updates the reveal

Reviewed `git diff main...HEAD` at efd90dcf (commits f14c4770, 5ffdf410, 53190461, efd90dcf).

## Test verdict rests on

- `src/tests/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.test.ts` (14 passed)
- `src/tests/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.test.ts` (7 passed)
- `src/tests/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.test.ts` (5 passed, unchanged; it pins the block-decorator viewport guard)
- `src/tests/lib/core/markdown-editor` as a whole: 97 files, 1281 tests passed.
- Red-first probe: I swapped `main`'s `check-update-action.ts` and `mouse-selecting.ts` into the worktree and ran the two changed test files. 4 failed (selection+viewport, reconfigure+viewport, force+viewport, and the release outside the editor), 17 passed. Then I restored both files from HEAD, and `git status` is clean.
- `pnpm check`: 0 errors, 0 warnings (`.claude/worktrees/test-logs/live-preview-analysis-01-review-check.log`).
- CodeMirror 6.43.15 `ViewState.update` (`node_modules/@codemirror/view/dist/index.js:6363-6372`) recomputes the viewport and the visible ranges inside the dispatch that moves the selection. When the scroll target falls outside the viewport, it sets `UpdateFlag.Viewport` on that same update. So the reported bug can happen, which the build report had left unverified.

## Acceptance criteria

- [x] **An update with both `viewportChanged` and `selectionSet` rebuilds.** Met. `check-update-action.ts:17-35` now reaches the `selectionSet` branch before the final `'none'`. Test: `check-update-action.test.ts` "returns "rebuild" when the selection changes in the same update as the viewport" (red on main). The block decorators and `inlineFormattingPlugin` already let selection+viewport updates through their guards (`block-decorator.ts:72`, `inline-formatting-plugin.ts:160`), so the fix does reach them. No test proves that at the plugin level (finding 2).
- [x] **`forceDecorationRebuild` and reconfigure rebuild even when the viewport also changed.** Met at the `checkUpdateAction` level (`check-update-action.ts:18-20`), with two tests that are red on main. This does not hold for the 11 block decorators or for `inlineFormattingPlugin`: their own guards still drop such an update when the selection did not change (finding 4).
- [x] **A `mouseup` outside the content DOM clears the drag flag (one-shot owner-document listener armed at mousedown).** Met. `mouse-selecting.ts:33-38` arms the listener. Test: "clears the drag flag when the mouse is released outside the editor" (red on main). The "one release per drag" test checks the `releaseMouseSelecting` guard: without the guard the count would be +2.
- [x] **A pure scroll still does not rebuild.** Met. `check-update-action.ts:41`, and the existing test "returns "none" when only viewport changes" still passes. The guards in block-decorator and inline-formatting are unchanged.

## Callers of `checkUpdateAction`

Every caller compares the result to `'rebuild'`: `block-decorator.ts:82`, `inline-formatting-plugin.ts:162-163`, `image-plugin.ts:63-64`, `footnote-plugin.ts:43-44`, `wikilink-embed-plugin.ts:45-46` and `meta-bind-input-plugin.ts:41-42`. A drag that scrolls now returns `'skip'` instead of `'none'`, which changes nothing for them. No scope creep, and the layer rules are respected (only `core/` files changed).

## Findings

1. **Low: comments and docs this change made wrong.** The claim "`checkUpdateAction` returns `'none'` on `viewportChanged`" is now true only for a pure scroll. It still appears in:
   - `src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts:8-9`
   - `CLAUDE.md:237` (Performance rule 4, last sentence)
   - `docs/LIVE-PREVIEW.md:134`, which also says the four inline ViewPlugins "get the same skip" as the hand-written guard. That is no longer exact: they now rebuild on a reconfigure, a `forceDecorationRebuild` or a drag end that arrives together with a viewport change, and the guarded plugins do not.
   - `docs/adr/0008-codemirror-live-preview-architecture.md:55`

   Fix: reword each one as "returns `'none'` on a pure viewport change (no selection change, reconfigure or `forceDecorationRebuild`)". In `LIVE-PREVIEW.md:134`, drop "the same". `docs/LIVE-PREVIEW.md:35` is still accurate.

2. **Medium: no plugin-level regression test for the user-visible path.** The reveal users see comes from `inlineFormattingPlugin` and the block decorators. They are fixed only because their guards (`block-decorator.ts:72`, `inline-formatting-plugin.ts:160`) let `selectionSet` through and `checkUpdateAction` then returns `'rebuild'`. If someone tightens either guard to `viewportChanged && !docChanged`, every test added here still passes and the bug comes back. Fix: in `block-decorator.test.ts`, add a test that calls `value.update(...)` with a stand-in like `viewportOnlyUpdate` that has `viewportChanged: true` and `selectionSet: true`, plus a `state` whose cursor sits on another line (dispatch the selection on a scratch state, or build `state` with `view.state.update({ selection }).state`). Assert `counter.scans` goes 1 -> 2 and `lastCursorLine` updates. Ideally add the same test for `inlineFormattingPlugin`.

3. **Low: the reason given in a comment is wrong.** `mouse-selecting.ts:29-30` says "The content handler stays because a widget may stop the event from bubbling to the document". A widget sits inside the content DOM, so a widget that stops propagation also blocks the content handler. The content handler only helps when an ancestor between the content DOM and the document (`view.dom`, a Svelte wrapper) stops the event. Fix: reword it to say that, or say the content handler is kept as the primary path and the document listener is the fallback.

4. **Low (follow-up, not blocking): `forceDecorationRebuild` / reconfigure combined with a viewport change is still dropped by the 11 block decorators and `inlineFormattingPlugin`.** Report item 13 (`report-markdown-editor.md:77-79`) names `block-decorator.ts:72` as a site of this loss. The Issue lists that file as read-only, so the scoping is defensible. The guard could also let through `forceDecorationRebuild` and `reconfigured` without breaking `block-decorator.test.ts:80`, since that test rides a `rebuildOn` effect (`toggleCalloutFold`), not `forceDecorationRebuild`. Fix: file a follow-up Issue rather than widening this one. If the fix step does widen it, add a test for force+viewport on `blockDecorator`.

## Noted, no action

- A one-shot listener armed by a mousedown whose mouseup never reaches the document (a native context menu, focus lost mid-drag) waits for the next mouseup anywhere. Extra listeners are bounded by the number of mousedowns and are harmless thanks to the `releaseMouseSelecting` guard. Dispatch on a destroyed view is a no-op. The flag is also set for non-primary buttons (right-click), as it was before this change. That is out of scope.
- I did not verify this in the running app.

## Resolution

1. Fixed. `scroll-debounce-plugin.ts`, `CLAUDE.md` rule 4, `docs/LIVE-PREVIEW.md` and ADR 0008 now say `checkUpdateAction` returns `'none'` on a pure viewport change (no selection change, reconfigure or `forceDecorationRebuild`); "the same" dropped.
2. Fixed. `block-decorator.test.ts` and `inline-formatting-plugin.test.ts` (now jsdom) each drive a viewport-changing update with `selectionSet` and the cursor on line 2 and assert one extra scan and `lastCursorLine === 2`; the inline file also pins that a pure viewport change does not rebuild. Red check: with both guards tightened to `viewportChanged && !docChanged`, both new selection tests fail; restored.
3. Fixed. The `mouse-selecting.ts` comment now names an ancestor between the content DOM and the document as the reason the content handler stays.
4. Deferred, as the review suggested: filed `.scratch/live-preview-analysis/issues/11-force-rebuild-through-viewport-guards.md`. Issue 01 scopes both guard files as read-only.
