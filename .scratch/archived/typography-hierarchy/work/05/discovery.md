# Issue 05 discovery

No `spec.md`; the Issue is the spec.

## Files that change

- `settings.store.svelte.ts:75,84-86`: default `fontSize` 18 -> 19; H4 1.125em bold, H5 1em bold, H6 0.9em semibold (line height 1.6, letter spacing 0 kept); new `editor.typeScaleMigrated: true` (a fresh file needs no migration).
- `settings.types.ts:127-142`: `typeScaleMigrated` on `EditorSettings`.
- `settings.logic.ts`: pure `migrateTypeScale(savedEditor)`: when the saved editor lacks `typeScaleMigrated: true`, `fontSize` -> `round(size x 1.05)`, and an H4-H6 level equal to the old default (merged over it) is dropped so the new default fills it; sets the flag. `settings.service.ts:84-95` runs it on `parsed.editor` before the merge (the merge would otherwise pull `true` from the defaults).
- `editor-theme.ts:38`: drop `.cm-content` `fontSize: '1.05em'`.
- `theme-builder.logic.ts:255-256`: heading ramp from `heading` (H1) to `mutedFg` (H6), mixed in OKLab in steps of 1/5. `utils/color.ts:127` `mixColors` gains an optional weight (default 0.5, so existing calls are unchanged).
- `theme.logic.ts:228`: Lavender Haze `inlineFg` gets its own color (a dark shade of its `emphasis` magenta), so `strong` is not body-colored.
- `canvas-markdown.css:15-31,60,121`: headings read `--heading-hN-font-size/-font-weight/-line-height/-letter-spacing` (fallbacks = new defaults); inline code 1em (the 0.9em moves to `pre code`, so code blocks keep their size: blocks are Issue 04); table text 0.9em on `table` like `.cm-lp-table`, cell 12px removed.
- `live-preview/styles.ts:134-153`, `highlight-styles.ts:25-57`: H4/H6 `var()` fallbacks follow the new defaults (test: `heading-fallbacks.test.ts`).
- E2E fixtures that save `fontSize: 14` without the flag now load as 15 (was 14.7 on screen): left as is.
- `help/documentation/19-settings.md:42`: default font size 19.

## Plan (test-first)

1. Theme: `theme-builder.logic.test.ts` six distinct heading tokens for a derived palette, every built-in and `mergeThemeWithDefaults`; no heading equals `strong`, `strong` != `editorFg` in every built-in. `color.test.ts` weighted mix.
2. Settings: `heading-typography.logic.test.ts` six distinct var sets from `DEFAULT_SETTINGS`; `settings.logic.test.ts` migration cases; `settings.service.test.ts` load migrates once (second load of the written file keeps 19).
3. Editor: `editor-theme.test.ts` body (`.cm-content`/`.cm-scroller`) size equals the setting, no `em` multiplier.
4. Canvas: source test `canvas-markdown-css.test.ts` (prior art `chrome-type-scale.test.ts`, readFileSync).

## Defaults taken

- "Muted color" for H6 = derived `heading6` equals `mutedFg` for themes built by `buildTheme`. The two built-ins keep their own h2-h6 overrides (already distinct per level).
- Lavender Haze bold color is not owner-picked: `#843C7E` (6.36:1 on its editor background).
- Existing tests that load `{ editor: { fontSize: 18 } }` and expect 18 now model a pre-migration file: they expect 19 or carry the flag.

## Risks

- Saved user themes keep their saved heading tokens (only missing ones are derived); installed catalog packages are rebuilt on load, so their H2-H6 colors change (intended).
- Issue 04 (open, other worktree) edits `styles.ts` in other hunks; merge should be clean.
- jsdom does not apply CSS: the canvas test is a source assertion.
