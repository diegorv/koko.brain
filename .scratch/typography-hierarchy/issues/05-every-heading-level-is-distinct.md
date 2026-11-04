# 05: Every heading level is distinct, and the font size setting is the size on screen

**What to build:** H4, H5 and H6 can be told apart from each other and from bold body text in every theme, the canvas renders headings with the same hierarchy as the editor, and the editor font size setting is the size the body renders at.

**Blocked by:** none

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Default heading scale: H4, H5 and H6 differ in size or style. Today `settings.store.svelte.ts:84-86` gives all three `1.0em`, bold, line height 1.6, letter spacing 0, the same as bold body text. Owner decision first: values in Notes.
- [ ] Themes built through `buildTheme` give each heading level its own color. Today `theme-builder.logic.ts:255-256` sets `heading1` to `heading6` all to `p.heading`, so catalog themes, user themes and tokens derived by `mergeThemeWithDefaults` (`theme.logic.ts:59-81`) color every level the same; only the two built-ins override h2-h6.
- [ ] Bold body text is told apart from body text in every built-in theme: Lavender Haze sets `inlineFg` (`theme.logic.ts:228`) equal to `fg` (`:211`), so `strong` is body-colored.
- [ ] The editor font size setting is the rendered body size: `.cm-content` applies `fontSize: '1.05em'` (`editor-theme.ts:33`) on top of the setting, so "18" renders 18.9px and the settings field does not match the screen. Owner decision first: see Notes.
- [ ] Canvas markdown follows the editor heading hierarchy: `canvas-markdown.css:26-31` uses its own scale (1.4/1.2/1.1/1.05/1/0.95em, h6 smaller than body) and weight 600 (`:22`) where the editor uses the `--heading-hN-*` variables and 700 (`heading-typography.logic.ts:5`). Inline code (`:60`, 0.9em vs 1em in the editor) and table cells (`:121`, fixed 12px) follow the editor too.
- [ ] Tests: `heading-typography.logic.ts` and the theme-builder tests assert six distinct heading tokens; a canvas test asserts the headings read the shared variables; `editor-theme.test.ts` asserts the body size equals the setting.

## Notes

- **Created 2026-11-04** from the owner's typography review (claims C13, C14, C21 and the opus refuters' missed findings).
- **Owner decisions for triage:**
  1. Heading values. Proposal: H4 1.125em bold, H5 1em bold, H6 0.9em semibold in a muted color (or uppercase small caps).
  2. The `1.05em`. Either remove it (every note renders 5% smaller until the user raises the setting) or fold it into the default (default 19px, multiplier gone).
- **Existing users:** heading typography is persisted per level (`settings.logic.ts:149-164`), so new defaults reach only users who never changed them or who reset. Decide whether a settings migration moves users still on the old defaults.
- **Depends on** remote-themes Issue 05 (another folder, so not in `Blocked by`): it reduces the built-in themes to two and touches the same theme code.
- **Out of scope:** embedded block sizes (Issue 04).
- **Size:** M.

## Comments
