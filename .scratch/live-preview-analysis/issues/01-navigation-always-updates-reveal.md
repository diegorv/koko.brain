# 01: Arrow navigation always updates the reveal

**What to build:** Moving the cursor with ArrowUp/ArrowDown must always reveal the new line and hide the old one. Today a selection change that also scrolls the viewport is treated as a pure scroll: `checkUpdateAction` returns `'none'` on `viewportChanged` before it looks at `selectionSet`, so the old line stays revealed and the new one hidden until the scroll debounce forces a rebuild (~150 ms). The same early return also swallows `forceDecorationRebuild` / reconfigure when they arrive with a viewport change. Separately, the mouse-drag flag is cleared only by a `mouseup` on the content DOM; releasing the mouse outside the editor leaves it set, and every later keyboard selection change is skipped until the next click inside.

**Context:** Analysis run 2026-10-29 (40 haiku + 15 opus over `src/lib/core/markdown-editor`, plus 20 haiku over seven reference editors). Evidence and decisions: `.scratch/live-preview-analysis/findings-2026-10-29.md`; verified findings with file:line: `.scratch/live-preview-analysis/report-markdown-editor.md`. Target model: one shared line-based reveal predicate (every line touched by the selection), rebuild on every selection change with no cross-update state, instant swaps with no CSS animation, heading line height independent of the cursor.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts` (modify; viewport early return at :21, selection branch at :31)
- `src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts` (modify; :19-25)
- `src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts`, `src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts` (read; their viewport guards at :72 / :160)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [x] Test: an update with both `viewportChanged` and `selectionSet` rebuilds
- [x] Test: `forceDecorationRebuild` and reconfigure rebuild even when the viewport also changed
- [x] Test: a `mouseup` outside the content DOM clears the drag flag (one-shot listener on the owner document registered at mousedown)
- [x] A pure scroll still does not rebuild

## Comments

- 2026-10-29 17:16 — discovery — plan: reorder checkUpdateAction, document-level one-shot mouseup — b68ace05
- 2026-10-29 17:19 — implement — checkUpdateAction reorder + document mouseup; pnpm check 0 errors, markdown-editor tests 1281 passed — 53190461
