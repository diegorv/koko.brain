# Issue 02 discovery: rail, tag and icon palettes follow the theme

No `spec.md` in `.scratch/color-audit/`; the Issue, `report.md` and `research/` are the spec.

## Files that change

- `src/lib/utils/color.ts`: add `shiftLightness` (OKLab L step, the `oklch(from x calc(l - d) c h)` of app.css), `tint` (sRGB composite of a color at a share over a base, what `bg-x/25` and `color-mix(..., transparent)` resolve to) and `ensureContrastOn` (`ensureContrast` against several backgrounds).
- `src/lib/core/settings/applied-theme.store.svelte.ts`: add `vars` (the applied CSS variables) + `setVars`; `theme.service.ts:33-40` `applyMode` writes it next to `setDark`.
- New `src/lib/core/settings/theme-surfaces.logic.ts`: `themeSurface(theme, name)` resolves a theme var or the column tones app.css:381-393 derives (`rail-bg`, `nav-bg`, `list-bg`); `readableOn(theme, color, surfaces, min)` resolves `var(--x)` and lifts with `ensureContrastOn`, returning the input when nothing resolves.
- `src/lib/features/rail-shell/rail-items.logic.ts:143-170`: palette stays; add `railIconColor(hue, railSurface)`: `ensureContrast(hue, surface, 3)`, repeated until it also holds on its own 18% tint. Unparseable surface returns the hue.
- `src/lib/features/rail-shell/Rail.svelte:160-200, 380-395`: `--rail-c` from `railIconColor` on `themeSurface(appliedThemeStore, 'rail-bg')` for items, pins (resolved `var(--type-*)` too) and undeclared mod buttons; a declared mod color stays. Active row gets a 2px bar in `--rail-c` (`data-rail-active-bar`), tint and `aria-current` stay. Badge keeps `railBadgeColors` on the source hue.
- Presets (item 3), lifted at render, stored value unchanged: `TagColorDot.svelte:14` (3:1 on editor-bg), `PropertyField.svelte:173` (3:1 on input-bg), title color 4.5:1 at `FilesNavigator.svelte:566`, `TypesNavigator.svelte:294,424` (nav-bg), `NoteRow.svelte:127` (list-bg); their icon colors 3:1 on the row surface and the selected tint (item 4: `bg-file-explorer-primary/25` over nav-bg, `bg-primary/25` over list-bg).
- `QuickSwitcher.svelte:137-139`: icon color 3:1 on popover and accent (the selected row).
- `TagColorPicker.svelte:60,96-105`: active ring is an offset `box-shadow` in `--foreground` outside the fill (judged on the popover); hover border and none/custom fill from `--muted-foreground`/`--border` mixes instead of white rgba.
- `composition-aware-bracket-matching.ts:164`: fallback becomes `color-mix(in oklch, var(--editor-fg) N%, transparent)`, N chosen by measuring theme-tokens.json (fill visible, editor-fg on it 4.5).
- `components/ui/button/button.svelte:12`: `text-destructive-foreground`, and drop `dark:bg-destructive/60`: the builder pairs the token with the opaque fill (`READABILITY_PAIRS`), and on the /60 fill the token measures 2.7 on KokoBrain Default.
- `docs/adr/0033-...md:183-190` Palette paragraph rewritten.

## Tests (prior art)

- `rail-items.logic.test.ts` (contrastRatio already imported): every hue x `BUILTIN_THEMES` + new `src/tests/fixtures/hard-palette-themes.fixture.ts` (`buildTheme` from koko.brain-themes `zettlr-bielefeld-light.json`, `tolaria-light.json` v1.0.1).
- `Rail.test.ts` (uses `appliedThemeStore`): `applyTheme(LAVENDER_HAZE_THEME)` then `--rail-c` of favorites is not `#eab308`; active has `[data-rail-active-bar]`.
- `color.test.ts`, `applied-theme.store.test.ts`, `theme.service.test.ts`, new `theme-surfaces.logic.test.ts`; `TagItem.test.ts`, `PropertyField.test.ts`, `NoteRow.test.ts`, `FilesNavigator.test.ts`, `TypesNavigator.test.ts`, `QuickSwitcher.test.ts`; button class scan.

## Risks / defaults taken

- TS mirrors app.css column tones; `list-bg` light uses an OKLab mix where CSS mixes in oklch (exact for rail-bg and nav-bg, close for near-neutral surfaces).
- Before any theme is applied `vars` is empty, so colors render unlifted (same as today).
- EditorTabs `tabTitleColor` is not in the findings and stays as is.
- Destructive button on dark themes becomes the opaque `bg-destructive`, a visible change.
