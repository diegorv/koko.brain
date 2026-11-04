# 46: A success color token in every theme

**What to build:** Themes have `warning` and `destructive` but no success color, so "up to date", sync and done states use the raw `green-*` palette (1.55 to 2.02:1 on Lavender). Add a `success` UI token the same way `warning` is wired:
- `src/lib/core/settings/theme.types.ts`: `success: string` in `UIColors` after `warning` (about line 120), with JSDoc.
- `theme-builder.logic.ts`: derive `success: p.green` (next to `warning: p.yellow`, about line 254) and add `['ui', 'success', 'ui', 'fileExplorerBg', 4.5]` and `['ui', 'success', 'ui', 'editorBg', 4.5]` to `READABILITY_PAIRS` (about line 124).
- `src/app.css`: `--color-success: var(--success);` in `@theme inline` next to `--color-warning` (about line 64), and a static `--success` fallback in `:root` (the built Lavender value) and `.dark` (the built Default value), next to `--warning` (about lines 153 and 218).
- `theme-editor.logic.ts`: add `'success'` after `'warning'` in the Type Palette group (about line 88).

**Blocked by:** 42

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first, `src/tests/lib/core/settings/theme-builder.logic.test.ts`: a theme built from `CORE` with `sidebarBg: '#ffffff'` and a pale `green` has `ui.success` at 4.5:1 or more on `fileExplorerBg` and `editorBg`, and both pairs are in `READABILITY_PAIRS`.
- [ ] `mergeThemeWithDefaults` of a saved theme with no `success` derives it from that theme's own green (new case in `theme.logic.test.ts`).
- [ ] `theme-css-contract.test.ts`'s fallback test (about line 62) includes `--success` in its names, and passes.
- [ ] The regenerated theme snapshot only adds `success`; the theme editor tests stay green.

## Notes

- **Blocking note:** snapshot file only, no code dependency.
- **Source:** review-2026-11-04.md section 3 row 99 and the color rules row; `work/color.md` H4 and standard 3.
- **Out of scope:** consumers (Issue 48); `info` and diff tokens (no consumer needs them).
- **Size:** S.
