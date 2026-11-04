# 23: Editor autocomplete, tooltips and the callout type menu look like the app's menus

**What to build:** The editor's floating surfaces are a separate system. `.cm-tooltip` (`src/lib/core/markdown-editor/setup/editor-theme.ts` about lines 66-70) sets only background, color and border, and CodeMirror's base theme adds no radius or shadow, so wikilink and tag autocomplete are square, flat boxes next to `rounded-md shadow-md` shadcn menus. The callout type popover (`live-preview/styles.ts` about lines 483-509) fills with `var(--lp-frontmatter-bg, ...)`, borders with `--lp-frontmatter-border`, uses a 6px radius and `boxShadow: '0 4px 12px rgba(0,0,0,0.2)'`, and its options use 4px with a `--lp-table-alt` hover. Put both on the menu tokens:

1. `editor-theme.ts` `.cm-tooltip`: add `borderRadius: 'var(--radius-md)'` and `boxShadow: 'var(--shadow-md)'`. `.cm-tooltip-autocomplete`: give its `> ul` `padding: '4px'` and its `> ul > li` `borderRadius: 'var(--radius-sm)'`, so the highlighted row (the existing `aria-selected` accent rule, about lines 71-76) sits inside the rounded corners. Do not add `overflow: hidden` to `.cm-tooltip`: it would clip CodeMirror tooltip arrows.
2. `styles.ts` `.cm-lp-callout-type-popover`: `background: 'var(--popover)'`, `color: 'var(--popover-foreground)'`, `border: '1px solid var(--border)'`, `borderRadius: 'var(--radius-md)'`, `boxShadow: 'var(--shadow-md)'`. `.cm-lp-callout-type-option`: `borderRadius: 'var(--radius-sm)'`; `.cm-lp-callout-type-option:hover`: `background: 'var(--accent)'`, `color: 'var(--accent-foreground)'`.
3. Remove the `styles.ts` entry from the radius-scale baseline (it reaches 0).

Keep positioning, `zIndex`, `maxHeight`, padding and the option `fontSize` as they are, and do not touch `callout-field.ts`: the popover's controls must keep `stopPropagation` on `mousedown` (CLAUDE.md performance rule 11, ADR 0008).

**Blocked by:** 16, 19, 22

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first, in `src/tests/lib/core/markdown-editor/setup/editor-theme.test.ts`: through the existing `themeRule()` helper, the `.cm-tooltip` rule contains `border-radius: var(--radius-md)` and `box-shadow: var(--shadow-md)`, and the autocomplete `li` rule contains `border-radius: var(--radius-sm)`
- [ ] Failing first, in `src/tests/lib/core/markdown-editor/extensions/live-preview/styles.test.ts`: the `.cm-lp-callout-type-popover` rule contains `background: var(--popover)`, `border-radius: var(--radius-md)` and `box-shadow: var(--shadow-md)` and no `rgba(` or `--lp-frontmatter`; the option rule contains `border-radius: var(--radius-sm)`; the option hover rule contains `var(--accent)`
- [ ] The radius-scale ratchet has no `styles.ts` entry and passes
- [ ] Visual check in both themes, noted in the commit: wikilink autocomplete with a highlighted row and the callout type popover open
- [ ] Existing behavior specs are not changed by this ticket (`e2e/specs/live-preview/click-reveal/callout-controls.spec.ts`, `e2e/specs/wikilink-completion.spec.ts`)

## Notes

- **Other tickets:** The overlay anatomy pass (review Issue 6) also lists '.cm-tooltip and callout popover on menu tokens'; this ticket owns that change, so the overlay anatomy ticket should drop it to avoid two edits of the same rules.
- **Source:** review section 3 editor rows "Editor tooltips and callout popover are their own system" and "Autocomplete and tooltips square and flat"; `.scratch/ux-polish/work/shadow.md` P6, P7; `.scratch/ux-polish/work/overlays.md` P9, P19.
- **Out of scope:** the option text size (0.75em, overlay anatomy), the editor context menu, CodeMirror's dark flag (dark-mode work).
- **Size:** S.
