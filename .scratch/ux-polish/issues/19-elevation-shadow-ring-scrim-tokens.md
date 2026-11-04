# 19: Floating surfaces lift: theme-aware shadow, ring and scrim tokens

**What to build:** `src/app.css` defines no shadow, ring or scrim token, so every `shadow-*` class is Tailwind's pure black at 5 to 10% (the built `.shadow-md` is `0 4px 6px -1px #0000001a, 0 2px 4px -2px #0000001a`), which cannot show on the Default theme's dark surfaces: menus read as holes (`references/ux-polish-2026-11-04/screens/default/13-more-menu.png`). The modal scrim is `bg-black/50` in both themes (`components/ui/dialog/dialog-overlay.svelte:16`) and turns Lavender Haze a muddy grey (`references/ux-polish-2026-11-04/screens/lavender/05-command-palette.png`). Sub-menus use `shadow-lg` while their parents use `shadow-md`.

1. `src/lib/core/settings/theme.logic.ts`, `themeColorsToCssVars` (about line 32): besides the flattened `ThemeColors`, emit five derived variables chosen by `isDarkColor(colors.ui.editorBg)` (`utils/color.ts:49`), treating `null` (unparseable, for example oklch) as dark:
   - dark: `--elev-shadow-1: #00000040`, `--elev-shadow-2: #00000073`, `--elev-shadow-3: #00000099`, `--elev-ring: #ffffff0f`, `--elev-scrim: #0000008c`
   - light: tinted from the theme's own ink with `alpha(colors.ui.foreground, a)` (`theme-builder.logic.ts:89`, which also handles non-hex colors): shadows `0f`, `1a`, `29`, ring `14`, scrim `40`
   `ThemeColors`, theme validation and export do not change. `applyTheme` (theme editor draft preview) and `applyActiveTheme` (localStorage mirror for the Quick Capture window) carry the new variables without further change.
2. `src/app.css`: static fallbacks for the five variables in `.dark` (equal to what Default emits) and in `:root` (equal to what Lavender emits), like the type palette tokens. Override Tailwind's `--shadow-xs`, `--shadow-sm`, `--shadow-md` and `--shadow-xl` so every existing `shadow-*` class keeps working:
   - xs `0 1px 2px 0 var(--elev-shadow-1)`
   - sm `0 1px 3px 0 var(--elev-shadow-1), 0 1px 2px -1px var(--elev-shadow-1)`
   - md `0 0 0 1px var(--elev-ring), 0 4px 12px -2px var(--elev-shadow-2), 0 2px 4px -2px var(--elev-shadow-1)`
   - xl `0 0 0 1px var(--elev-ring), 0 16px 40px -8px var(--elev-shadow-3), 0 4px 12px -4px var(--elev-shadow-2)`
   and make the four available as runtime variables on `:root` (CodeMirror themes will read `var(--shadow-md)`): `@theme static` or an equivalent, checked in the built CSS. Add `--color-scrim: var(--elev-scrim)` to `@theme inline` so `bg-scrim` exists.
3. Primitives: `dialog-overlay.svelte:16` `bg-black/50` to `bg-scrim`; `context-menu-sub-content.svelte:16` and `dropdown-menu-sub-content.svelte:16` `shadow-lg` to `shadow-md` (one level for the whole menu family); `dialog-content.svelte:30` `shadow-lg` to `shadow-xl`. After this no `shadow-lg` is left in `src/`.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first, in `src/tests/lib/core/settings/theme.logic.test.ts`: `themeColorsToCssVars(KOKOBRAIN_DEFAULT_THEME.colors)` has the five dark values; Lavender Haze has the light values tinted from its foreground (for example `--elev-scrim` is `#30284040`); a theme whose `editorBg` is `oklch(0.3 0.02 270)` gets the dark values; every key that existed before is unchanged
- [x] `src/tests/lib/core/settings/theme-css-contract.test.ts`: the "static fallback in :root and .dark" case also covers the five `--elev-*` names, and fails if `app.css` lacks them
- [x] The theme snapshot (`src/tests/lib/core/settings/__snapshots__/theme-snapshot.test.ts.snap`) is updated on purpose; its diff adds exactly the five keys per theme and changes nothing else
- [x] After `pnpm build`, the built CSS defines `--shadow-md` as a variable, `.shadow-md` reads `--elev-ring`, and `.bg-scrim` exists; the commit message records the grep
- [x] The three primitive files carry the class swaps above and no other change

## Notes

- **Other tickets:** Soft, not blocking: (1) if the dark-mode work (app theme drives html.dark) has landed a shared theme-mode helper built on isDarkColor(editorBg), use it instead of a local call; (2) the motion and focus foundations work edits the same class strings in dialog-content.svelte:30, dialog-overlay.svelte:16 and the two sub-content files (motion-reduce, outline-none), so rebase over it rather than run both at once.
- **Source:** review section 1 item 5, section 2 "Elevation" and "Scrim and z-index" rows, section 4 Issue 3; `.scratch/ux-polish/work/shadow.md` P1, P8, P11 and section 3; `.scratch/ux-polish/work/overlays.md` P6 and R2 (its visible popover border is `--elev-ring` inside `shadow-md`).
- **Layer rule:** `theme.logic.ts` is `core/` and imports only `utils/color.ts` and `theme-builder.logic.ts`; no new import edge.
- **Out of scope:** the popover fills (Issue 20, Issue 21); `SettingsPanel.svelte:115`'s arbitrary drawer shadow (Settings drawer chrome work); the canvas overlays' own scrims and shadows (`CanvasFilePicker.svelte:81/97`, `CanvasLinkInput.svelte:81/94`, `CanvasContextMenu.svelte:187`, `CanvasInner.svelte:761/765`), which the canvas work rebuilds on shadcn; the z-index scale; toasts.
- **Size:** M.

## Comments

- 2026-11-04, branch `issue/19-elevation-shadow-ring-scrim-tokens`: `theme.logic.ts` derives five `--elev-*` vars per theme (dark constants, light tints from the foreground); `app.css` holds static fallbacks, theme-aware `--shadow-xs/sm/md/xl` and `bg-scrim`; the dialog overlay uses `bg-scrim`, dialog content `shadow-xl`, the two sub-content menus `shadow-md`. Fix round: reworded the elevation-guard comment (review.md nit 1). Tests: pnpm check 0 errors; full suite run 2 exit=0, 492/492 files, 11674 passed, build ok (run 1 had one unrelated timeout in lib-specifier-convention.test.ts, passed alone). Reviews: round 1 APPROVED, round 2 APPROVED.
