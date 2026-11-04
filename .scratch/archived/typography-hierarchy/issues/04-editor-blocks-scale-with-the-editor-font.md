# 04: Blocks inside a note scale with the editor font, and code does not jump size on reveal

**What to build:** Everything rendered inside a note sizes itself relative to the editor font setting, so changing the setting changes the whole note in proportion. Today the body follows the setting (18px default, 18.9px rendered) while code blocks, note embeds, collections, meta-bind controls and QueryJS blocks use fixed px, so the note has four base sizes. Code blocks also jump from 13px to body size when the cursor enters them.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] A fenced code block keeps one text size whether it is rendered or revealed. Today the widget is `13px` (`live-preview/styles.ts:310`) and `code-block-field.ts:29` swaps it for raw source lines at body size when the cursor enters, a 45% jump that reflows the note on every enter and leave. Code renders at 0.85em of body in the widget and on the revealed fence lines (owner decision, Notes).
- [x] Code block chrome uses `em`: language label and copy button (`styles.ts:283,289`), mermaid label (`:777`).
- [x] Note embeds use `em`: `.cm-lp-embed` 13px (`styles.ts:590`), header 12px (`:600`), content 13px (`:620`).
- [x] Collection blocks use `em`: `.cm-lp-collection-block` 13px (`styles.ts:520`), header and table 12px, error/loading/empty 12px and footer 11px (`:558-577`), and the inline styles in `collection-block-widget.ts` (12/11/10/9px at `:180,219,233,241,275,288,293,308,315,350`).
- [x] Meta-bind inline controls use `em`: select (`styles.ts:639`), button (`:666`), input (`:730`), errors (`:711,743`).
- [x] QueryJS blocks use `em`: the container is fixed at `16px` (`styles.ts:830`) with children at 15/13/12/11px (`:835,846,856,871,880,899,924,934,944`), and `kb-ui.ts` sets inline px (28/20/16/15/14/13/11px, tag cloud 14-26px at `:250-251,279`). The `em` values already in `kb-ui.ts` (`:736-884`) resolve against the fixed 16px today; the heatmap cell text comes out at about 7.8px (`:736`, `:779`) and gets a readable floor.
- [x] Error and label text inside blocks uses `em`: mermaid error (`styles.ts:795`), math error (`:815`), callout type popover options (`:476`, 12px under a label that inherits body size).
- [x] The collection widget and the Svelte collection views agree for the same view: linear-calendar day numbers are 9px in the widget (`collection-block-widget.ts:293`) and `text-[11px] font-medium` in `CollectionLinearCalendarView.svelte:150`; weekday headers have no size in the widget (`:190-196`) and `text-xs font-medium uppercase` in `CollectionCalendarView.svelte:119`.
- [x] Timeline event bar titles (`collection-block-widget.ts:350`, 9px white on a property color) meet the readable floor and pick a text color that contrasts with the bar color.
- [x] Tests: assert the theme rules and widget styles resolve in `em` (no `px` font sizes left in the touched rules except borders and fixed controls), and that the code block widget and its revealed lines use the same size.

## Notes

- **Created 2026-11-04** from the owner's typography review (claims C14-C17, C19-C20 and the opus refuters' missed findings).
- **Owner decision (2026-11-04):** code is smaller in both states: 0.85em of body in the widget, and the revealed fence lines (opening fence, code, closing fence) get the same 0.85em from a line decoration, so entering or leaving a block changes nothing in size. Read CLAUDE.md "Live Preview" rule 1 first: the editor freeze fixed in `b4aa9028` came from a `font-size` mark, so the size must come from a line decoration (`Decoration.line`), never a mark, and the change is profiled with the LP-PROFILE logs on a long note with many code blocks; record the numbers in the Issue's Comments.
- **Tables** do the same at a smaller scale (`.cm-lp-table` 0.9em widget vs 1em source); apply the same rule: the revealed table lines get the table's 0.9em from a line decoration.
- **Do not** change the em values that already scale (`.cm-lp-table`, footnote ref, link ref def, list markers).
- **Out of scope:** heading sizes and the `.cm-content` `1.05em` (Issue 05), font families (Issue 01).
- **Size:** L.

## Comments

- **2026-11-04, build (profile of the reveal line decoration):** `computeCodeBlocks` timed in vitest (node, not the running app: the LP-PROFILE logs need `pnpm tauri dev`), a 110,400-char note with 300 fenced `ts` blocks of 10 lines, 200 runs after 20 warm-up runs, two runs each. Before: 1.381 / 1.383 ms with the cursor outside every block, 1.375 / 1.381 ms with it inside one. After: 1.388 / 1.392 ms outside, 1.390 / 1.383 ms inside. No measurable change: a revealed block adds one point decoration per line (12 here) and drops its widget and hidden lines. The in-app LP-PROFILE run on a long note is still to do.
- **2026-11-04, deliver (branch `issue/04-editor-blocks-scale-with-the-editor-font`):** code blocks render at 0.85em in the widget and on revealed lines; code chrome, embeds, collection blocks (incl. em timeline bar geometry and contrast-picked bar text), meta-bind controls, QueryJS blocks and `kb-ui.ts` defaults, and block error/label text size in em. Review round 1 APPROVED (fixes: em bar geometry, day numbers below month label, class-name tests, comment wording); round 2 APPROVED (remaining: in-app LP-PROFILE run and a visual check at 8px/32px fonts, both owed to the owner). Tests: `pnpm check` 0 errors; full suite at ee8ff345 exit=0, 464 files, 10810 passed, 1 skipped, 1 todo, build OK.
