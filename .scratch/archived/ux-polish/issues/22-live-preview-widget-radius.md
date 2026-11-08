# 22: Live-preview blocks, controls and chips use the radius ladder

**What to build:** `src/lib/core/markdown-editor/extensions/live-preview/styles.ts` hardcodes 23 `borderRadius` literals. Blocks in one note disagree (code block, embed and mermaid 6px against collection and queryjs 8px) and controls use 3, 4 and 6px while the same property edited in the Properties panel is an 8px field. Move them onto the runtime radius variables from Issue 16, by role:

- `var(--radius-md)` (8px), blocks: `.cm-lp-codeblock` (about line 293, 6 to 8), `.cm-lp-embed` (617, 6 to 8), `.cm-lp-mermaid` (794, 6 to 8), `.cm-lp-collection-block` (548), `.cm-lp-qjs-block` (858)
- `var(--radius-md)`, controls: `.cm-lp-codeblock-copy` (319, 3 to 8), `.cm-lp-meta-bind-select` (667), `.cm-lp-meta-bind-btn` (695), `.cm-lp-meta-bind-button-error` (744), `.cm-lp-meta-bind-input` (758), `.cm-lp-qjs-run` (899), all 6 to 8, and `.cm-lp-qjs-table-nav-btn` (964, 4 to 8)
- `var(--radius-xs)` (4px), inline chips and small parts: `.cm-lp-highlight` (231, 2 to 4), `.cm-lp-tag` (239), `.cm-lp-code` (264, 3 to 4), `.cm-lp-callout-type-label` (476, 3 to 4), `.cm-lp-task-checkbox` (200), media `.cm-lp-image` / `.cm-lp-audio` / `.cm-lp-video` (272, 281, 285), and `.cm-lp-qjs-error-stack` (890, nested inside the 8px queryjs block, so one step smaller)

`.cm-lp-callout-type-popover` (497) and `.cm-lp-callout-type-option` (509) stay for Issue 23. Lower the radius-scale baseline for `styles.ts` from 23 to 2.

**Blocked by:** 16

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first, in `src/tests/lib/core/markdown-editor/extensions/live-preview/styles.test.ts`: a `radiusOf(selector)` helper next to `fontFamilyOf` (built on the existing `themeRules()`), and `it.each` cases asserting the blocks and controls above emit `border-radius: var(--radius-md)` and the chips and small parts emit `border-radius: var(--radius-xs)`. They fail before the change
- [x] The radius-scale ratchet reports exactly the two callout popover literals left in `styles.ts`
- [x] The code block header's corners still follow the block (it relies on `overflow: hidden`, `.scratch/ux-polish/work/radius.md` section 4 quick win 6): checked in the app or a screenshot, noted in the commit
- [x] No other property in `styles.ts` changes; no decoration, widget or `toDOM()` code is touched

## Notes

- **Other tickets:** The editor chrome work (context menu, heading ramp) also edits live-preview/styles.ts; different rules, but rebase rather than run in parallel.
- **Source:** review section 3 editor row "Block widgets and controls drift in radius" and section 4 Issue 12; `.scratch/ux-polish/work/radius.md` P4 and the section 3 role table.
- **Constraints:** ADR-0002 line 43 (radii from `app.css` tokens). CLAUDE.md performance rule 1 and ADR 0008 forbid animated `font-size` or `max-width` hiding marks; a radius value is not affected. Tabs.
- **Out of scope:** `canvas-markdown.css` and canvas node literals (canvas work), `collection-block-widget.ts:244/372` pills and bars (event chip unification), `kb-ui.ts` (KBAPI output).
- **Size:** S.

## Comments

- 2026-11-04, branch issue/22-live-preview-widget-radius: 21 live-preview block, control and chip radii in styles.ts moved to var(--radius-md) / var(--radius-xs); radiusOf() tests added in styles.test.ts; radius-scale ratchet baseline 23 -> 2. Review round 1 APPROVED (one nit, test comment wording, fixed); review round 2 APPROVED (no findings). Tests: pnpm check 0 errors; styles.test.ts 66 passed; full suite at f4a8d57ca 493 files / 11708 tests passed, pnpm build ok (exit=0).
