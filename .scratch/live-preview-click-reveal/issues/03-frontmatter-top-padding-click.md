# 03: A click above the first body line does not land inside the hidden frontmatter

**Status:** resolved

Priority: P2 (a click and then Enter breaks the frontmatter)

**What to build:** With frontmatter hidden in live preview, a click in the 16 px top padding of `.cm-content`, above the first body line, puts the cursor on a hidden frontmatter line (position 0) instead of the first body line. Pressing Enter there inserts a newline at position 0: the frontmatter stops parsing and all its lines appear. `plugins/frontmatter-field.ts:22` calls `hideLines` (`core/hide-lines.ts:15-19`), which adds a CSS-hidden line plus a plain `Decoration.replace({})` per line. `posAtCoords` maps the padding click to position 0, the start of the first hidden range. Making the ranges atomic alone does not fix it: position 0 is still a valid cursor spot at the edge of an atomic range, and the per-line replaces do not cover the line breaks. The cursor must land on the first body line and the frontmatter must stay hidden.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview` (E2E)

**Source:** `.scratch/live-preview-click-reveal/report.md` section 2.2, `e2e/specs/live-preview/click-reveal/frontmatter.spec.ts`, src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:22, src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:17-18

- [x] `frontmatter.spec.ts` "clicking the 16px padding above the first body line moves the cursor there and keeps the frontmatter hidden" passes with `test.fail()` removed
- [x] Failing first: a test that a click in the padding followed by Enter leaves the frontmatter bytes unchanged
- [x] Arrow up from the first body line still reaches the frontmatter the way it does today (check what it does today first and record it in Notes)
- [x] Other users of `hideLines` (table, code block, math, mermaid) keep their behavior; the folder stays green

## Notes

- If the fix makes the hidden ranges atomic, check it against Issue 01's choice for the block widgets, which hide their source lines with the same helper.
- ArrowUp today (probed in Chromium before the fix): from "First body line." it moves the cursor onto the first hidden frontmatter line (that line gets `cm-activeLine`); further ArrowUp presses stay there and the frontmatter stays hidden. Typing a character then lands at the start of "First body line.". The fix is a mouse-only remap (`frontmatterClick` in `plugins/frontmatter-field.ts`), so this is unchanged; `frontmatter.spec.ts` "ArrowUp from the first body line moves the cursor onto the hidden frontmatter, which stays hidden" pins it.
- The hidden ranges were not made atomic and `hideLines` is unchanged, so Issue 01's band remap and the table/code block/math/mermaid hidden lines are not affected.

## Comments

- 2026-11-03, branch `issue/03-frontmatter-top-padding-click`: a mouse click in the top padding of `.cm-content` is remapped (`frontmatterClick` in `plugins/frontmatter-field.ts`) to the first body line, so the hidden frontmatter is never the click target and Enter no longer breaks it; round-2 fix keeps a block widget right after the frontmatter rendered (`isBlockWidgetLine`). Tests: full suite at 26cae900 exit=0 (459 files, 10605 passed, 1 skipped, 1 todo, build passed); `pnpm check` 0 errors; `bash scripts/e2e.sh e2e/specs/live-preview` 237 passed. Reviews: round 1 APPROVED, round 2 APPROVED (two nits, no changes: WebKit/E2E coverage for a block right after frontmatter is optional; mermaid.spec.ts flake is unrelated).
