# 03: A click above the first body line does not land inside the hidden frontmatter

**Status:** ready-for-agent

Priority: P2 (a click and then Enter breaks the frontmatter)

**What to build:** With frontmatter hidden in live preview, a click in the 16 px top padding of `.cm-content`, above the first body line, puts the cursor on a hidden frontmatter line (position 0) instead of the first body line. Pressing Enter there inserts a newline at position 0: the frontmatter stops parsing and all its lines appear. `plugins/frontmatter-field.ts:22` calls `hideLines` (`core/hide-lines.ts:15-19`), which adds a CSS-hidden line plus a plain `Decoration.replace({})` per line. `posAtCoords` maps the padding click to position 0, the start of the first hidden range. Making the ranges atomic alone does not fix it: position 0 is still a valid cursor spot at the edge of an atomic range, and the per-line replaces do not cover the line breaks. The cursor must land on the first body line and the frontmatter must stay hidden.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview` (E2E)

**Source:** `.scratch/live-preview-click-reveal/report.md` section 2.2, `e2e/specs/live-preview/click-reveal/frontmatter.spec.ts`, src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:22, src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:17-18

- [ ] `frontmatter.spec.ts` "clicking the 16px padding above the first body line moves the cursor there and keeps the frontmatter hidden" passes with `test.fail()` removed
- [ ] Failing first: a test that a click in the padding followed by Enter leaves the frontmatter bytes unchanged
- [ ] Arrow up from the first body line still reaches the frontmatter the way it does today (check what it does today first and record it in Notes)
- [ ] Other users of `hideLines` (table, code block, math, mermaid) keep their behavior; the folder stays green

## Notes

- If the fix makes the hidden ranges atomic, check it against Issue 01's choice for the block widgets, which hide their source lines with the same helper.
