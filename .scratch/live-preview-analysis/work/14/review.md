VERDICT: APPROVED

# Issue 14 review: native text drag leaves the mouse-selecting flag set

Reviewed `git diff main...HEAD` at c5474d14 (commits f0f75a06, 5ffc7631, c5474d14). Source change: one `dragstart` handler in `mouseSelectingHandlers` plus JSDoc (`core/mouse-selecting.ts:33-38,52-55`). Tests: two new cases in `mouse-selecting.test.ts:104-158`.

## Checks run by the reviewer

- `vitest run src/tests/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.test.ts`: 9/9 pass with the fix.
- Same file with `mouse-selecting.ts` restored to `main`: the 2 new tests fail (`clears the drag flag and runs the release rebuild`, `reveals the cursor line on a selection change after the drop`), the other 7 pass. File restored afterwards; worktree clean.
- `vitest run src/tests/.../live-preview/core/` (8 files, includes `check-update-action.test.ts` and `reveal.test.ts`): 87/87 pass.
- `vitest run src/tests/.../live-preview/` (covers `queryjs-block-field`, the other reader of `mouseSelectingField`): 91 files, 1290/1290 pass.
- `pnpm check`: 0 errors, 0 warnings.
- Not run: full `pnpm vitest run` and `pnpm build` (deliver's gate).

The test verdict rests on `mouse-selecting.test.ts`, `check-update-action.test.ts`, `reveal.test.ts` and the rest of the live-preview test folder.

## Acceptance criteria

- [x] **Test: after a mousedown followed by `drop`/`dragend` with no `mouseup`, `mouseSelectingField` is `false` and the release rebuild runs.** Met. `mouse-selecting.test.ts:134-143` fires mousedown, dragstart, drop and dragend on the content DOM with no mouseup. It asserts the field is `false`, that `checkUpdateAction` answered `'rebuild'` exactly once, and that the last update was that rebuild. Fails on `main`.
- [x] **Test: after that drop, a selection change reveals the cursor's line.** Met. `mouse-selecting.test.ts:145-157`: a selection move to line 2 gives `['rebuild']`, `revealPredicate` is true for line 2 and false for line 1. Fails on `main`.
- [x] **Fix: clear the flag when a native drag ends so the release rebuild runs.** Met. `mouse-selecting.ts:52-55` releases on `dragstart`, which the Issue lists as an option. Checked against `@codemirror/view` 6.43.15 (`dist/index.js`):
  - `computeHandlers` (l.4750) puts plugin handlers before the built-in ones, so the release dispatch runs before CM's `handlers.dragstart` (l.5117).
  - The release is effect-only, so the `state.selection.main` that CM stores as `draggedContent` does not change.
  - `releaseMouseSelecting` is guarded, so the one-shot document `mouseup` listener still armed after a drag is a no-op when it finally fires.
- [x] **Related `isPureScroll` case (optional, "consider").** Left unchanged, with the reason recorded in `work/14/discovery.md`. I agree with it. `scroll-debounce-plugin.ts:32-40` dispatches `forceDecorationRebuild` 150 ms after any viewport change without a doc change. By then the flag is false, so `checkUpdateAction` (`check-update-action.ts:31-32`) rebuilds and `isPureScroll` (l.57-59) lets that update through. This fix also makes the release rebuild cover any forced rebuild skipped mid-drag.

## CLAUDE.md rules

- Layer rules: the change stays inside `core/markdown-editor/extensions/live-preview/core/`. No new imports.
- Tests for every changed source file: `mouse-selecting.ts` has tests in `mouse-selecting.test.ts`. The tests use the real field, real handlers, the real `checkUpdateAction` and the real `revealPredicate`, with nothing mocked.
- Tabs, JSDoc and English are respected. The JSDoc explains why the release is on dragstart and does not narrate the change.
- Performance guidelines: no new rebuild path. The release dispatch already existed and is guarded to run once per drag.
- Scope: no unrelated edits. `check-update-action.ts` is untouched.
- The commit message follows docs/COMMITS.md (Context, Problem, Solution, Behavior, Files with line ranges, trailer).

## Findings

1. **Low, unverified in the real app (no code change required)**, `src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:52-55`. The release dispatch, and any decoration DOM update it causes, runs synchronously inside `dragstart`. Browsers can cancel a native drag when its source DOM is replaced during `dragstart`. In the target scenario I expect the rebuild to change nothing:
   - The mousedown landed inside the primary selection, so CM did not move the selection (`MouseSelection.dragging === null`, l.4808).
   - The selection's lines were already revealed by the rebuild that followed the selection.
   - The mousedown's own update answered `'skip'`, so the release recomputes the same reveal set and CM's range compare leaves the source DOM in place.

   The jsdom tests use plain `Event`s with no `dataTransfer`, so this path is not exercised. Fix: in `pnpm tauri dev`, drag selected text within a note and into another pane, and confirm the drag completes and the cursor's line shows source afterwards. If a drag cancels, defer the release with `queueMicrotask`/`setTimeout(0)` inside the handler.
2. **Nit, no change required**, `src/tests/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.test.ts:106-121`. `mountWithActions` does not destroy its views. With no mouseup, CM's `MouseSelection` document listeners and the one-shot `mouseup` listener stay on `document` for the rest of the file. The file's existing `mount` helper has the same leak, and the new block runs last, so no other test is affected today. Optional fix: call `view.destroy()` in the block's teardown.

## Resolution

1. Finding 1 (dragstart release in the real app): accepted as a manual check, no code change. The deliver step cannot drive a native drag in `pnpm tauri dev`, so it is left for the user. If a drag cancels there, defer the release in the `dragstart` handler with `queueMicrotask`.
2. Finding 2 (test views not destroyed): fixed. `mouseSelectingHandlers` tests record every mounted view and destroy it in `afterEach`, for both the `mount` and `mountWithActions` helpers.
