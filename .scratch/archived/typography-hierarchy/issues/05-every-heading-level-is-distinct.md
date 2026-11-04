# 05: Every heading level is distinct, and the font size setting is the size on screen

**What to build:** H4, H5 and H6 can be told apart from each other and from bold body text in every theme, the canvas renders headings with the same hierarchy as the editor, and the editor font size setting is the size the body renders at.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Default heading scale: H4, H5 and H6 differ in size or style. Today `settings.store.svelte.ts:84-86` gives all three `1.0em`, bold, line height 1.6, letter spacing 0, the same as bold body text. New defaults: H4 1.125em bold, H5 1em bold, H6 0.9em semibold in a muted color (owner decision, Notes).
- [x] Themes built through `buildTheme` give each heading level its own color. Today `theme-builder.logic.ts:255-256` sets `heading1` to `heading6` all to `p.heading`, so catalog themes, user themes and tokens derived by `mergeThemeWithDefaults` (`theme.logic.ts:59-81`) color every level the same; only the two built-ins override h2-h6.
- [x] Bold body text is told apart from body text in every built-in theme: Lavender Haze sets `inlineFg` (`theme.logic.ts:228`) equal to `fg` (`:211`), so `strong` is body-colored.
- [x] The editor font size setting is the rendered body size: `.cm-content` applies `fontSize: '1.05em'` (`editor-theme.ts:33`) on top of the setting, so "18" renders 18.9px and the settings field does not match the screen. The multiplier is removed and saved sizes are migrated once (owner decision, Notes).
- [x] Canvas markdown follows the editor heading hierarchy: `canvas-markdown.css:26-31` uses its own scale (1.4/1.2/1.1/1.05/1/0.95em, h6 smaller than body) and weight 600 (`:22`) where the editor uses the `--heading-hN-*` variables and 700 (`heading-typography.logic.ts:5`). Inline code (`:60`, 0.9em vs 1em in the editor) and table cells (`:121`, fixed 12px) follow the editor too.
- [x] Tests: `heading-typography.logic.ts` and the theme-builder tests assert six distinct heading tokens; a canvas test asserts the headings read the shared variables; `editor-theme.test.ts` asserts the body size equals the setting.

## Notes

- **Created 2026-11-04** from the owner's typography review (claims C13, C14, C21 and the opus refuters' missed findings).
- **Owner decisions (2026-11-04):**
  1. Heading values: H4 1.125em bold, H5 1em bold, H6 0.9em semibold in a muted color. H1-H3 keep 2.058 / 1.618 / 1.272em.
  2. The `1.05em`: removed. A saved editor font size is migrated once to `round(size x 1.05)` (18 becomes 19), and the default becomes 19, so notes look the same and the setting is the real size. The migration must run exactly once (a settings version or a one-shot flag): re-running it on every load would grow the size each start.
  3. Existing heading settings: a level whose saved values equal the old default (`1.0em`, bold, line height 1.6, letter spacing 0 for H4-H6) moves to the new default; a level the user customized is left as is. Same one-shot rule as the font size.
- **Existing users:** heading typography is persisted per level (`settings.logic.ts:149-164`), so without decision 3 the new defaults would reach only users who never changed them or who reset.
- **Depends on** remote-themes Issue 05 (another folder, so not in `Blocked by`): it reduces the built-in themes to two and touches the same theme code.
- **Out of scope:** embedded block sizes (Issue 04).
- **Size:** M.

## Comments

- **2026-11-04, branch `issue/05-every-heading-level-is-distinct`:** H4-H6 defaults are now 1.125em bold / 1em bold / 0.9em semibold. `buildTheme` ramps H2-H6 from the heading color to `mutedFg`. Lavender Haze bold is `#843C7E`. The `.cm-content` 1.05em multiplier is removed and the default font size is 19. A one-shot `typeScaleMigrated` flag migrates saved font sizes and H4-H6 levels that still hold the old default. Canvas markdown reads the shared `--heading-hN-*` variables. Review round 1: APPROVED, 5 findings (2 minor, 3 nits), resolved in `work/05/review.md` with no source change. Left to the owner: the built-in themes' H6 colors (finding 1) and the Lavender Haze bold color (finding 4). Saved user themes keep one color for every level until they are re-derived in the Theme Editor (finding 2). Full suite at a81e1e20: 467 files, 10800 tests passed, 1 skipped, 1 todo; `pnpm build` ok (log `test-logs/typography-hierarchy/05-deliver.log`). E2E not run.
