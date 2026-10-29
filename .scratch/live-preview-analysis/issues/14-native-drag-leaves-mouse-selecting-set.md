# 14: Native text drag leaves the mouse-selecting flag set

**What to build:** A native HTML5 drag of selected text (mousedown on a selection, drag, drop) ends in `drop`/`dragend`, not `mouseup`, so `mouseSelectingField` stays `true` after the drop. While it is set, `revealPredicate` reveals nothing and `checkUpdateAction` returns `'skip'` for every selection change and every non-doc `forceDecorationRebuild`; doc changes rebuild with nothing revealed. Clear the flag when a native drag ends, for example by dispatching the release on `dragstart` or on `drop`/`dragend` in `mouseSelectingHandlers`, so the release rebuild runs.

**Repro (from reading the code, not reproduced in the app):** select some text, drag the selection to another spot, drop it, then type or move with the arrow keys. The cursor's line stays rendered instead of showing raw markup, and forced rebuilds (index ready, collection version bump) are skipped, until the next mousedown + mouseup.

**Code path:**
- `src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:33-45`: `mousedown` sets the flag and arms a one-shot document `mouseup`; nothing clears it on `drop`/`dragend`.
- `src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:25`: `revealPredicate` returns `() => false` while the flag is set.
- `src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:23-26`: `isDragging` returns `'skip'` before the forced-rebuild and selection checks.

**Related (low):** `isPureScroll` (`core/check-update-action.ts:55-64`) does not exempt a drag release, so a release that arrives in the same update as a viewport change is still dropped by the block decorators and `inlineFormattingPlugin` before `checkUpdateAction` runs; a forced rebuild skipped mid-drag then stays lost until the next edit, cursor move or scroll settle. A `mouseup` dispatch rarely changes the viewport. Same root cause: the "the release rebuilds" promise in `checkUpdateAction` has more than one way to break. Consider exempting a `mouseSelectingField` true-to-false transition in `isPureScroll` when fixing the above.

**Context:** Review of Issue 11 (`.scratch/live-preview-analysis/work/11/review.md`, findings 1 and 2); the risk was first noted in Issue 11's implement comment and `work/11/discovery.md`.

**Blocked by:** 06 (remove-last-cursor-line), which rewrites `check-update-action.ts`.

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts` (modify)
- `src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts` (maybe, for the related case)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] Test: after a mousedown followed by `drop`/`dragend` with no `mouseup`, `mouseSelectingField` is `false` and the release rebuild runs
- [ ] Test: after that drop, a selection change reveals the cursor's line
