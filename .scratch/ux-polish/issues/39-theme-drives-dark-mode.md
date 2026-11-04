# 39: The active theme, not the macOS appearance, decides dark mode

**What to build:** Every theme renders with `<html class="dark">` (`src/app.html:2`), and `src/app.css` has no `@custom-variant dark`, so Tailwind 4's `dark:` utilities follow the macOS appearance, not the theme. Lavender Haze under a dark OS gets the dark shadcn variants (`components/ui/button/button.svelte:12` destructive at 60%, `switch.svelte:26` thumb), and Default under a light OS loses them. `plugins/queryjs/kb-ui.ts:596` and `:1006` read `classList.contains('dark')`, which is always true, so QueryJS charts and heatmaps on Lavender use the dark highlight `#fff` and the dark empty color `#333`. Make the applied theme the single mode source:
- New store `src/lib/core/settings/applied-theme.store.svelte.ts`: `appliedThemeStore` with an `isDark` getter (default `true`, because the default theme is dark) and a `setDark(value: boolean)` method, JSDoc on both.
- `src/lib/core/settings/theme.service.ts`: one private helper, called after `setRootVars` by `applyTheme` (about line 25), `applyStoredTheme` (about line 45, only on the path that applied vars) and `applyActiveTheme` (about line 56). It reads `--editor-bg` from the vars being applied, computes `isDarkColor(value) !== false` (`src/lib/utils/color.ts:49`; null for an unparseable value means dark, the fallback `mermaid-widget.ts:17` already uses), toggles the `dark` class on `document.documentElement`, sets `document.documentElement.style.colorScheme` to `dark` or `light`, and calls `appliedThemeStore.setDark`.
- `src/app.css`: add `@custom-variant dark (&:where(.dark, .dark *));` right after the two imports (lines 1-2). Keep the `:root` and `.dark` fallback blocks (pinned by `theme-css-contract.test.ts:62-71`).
- `src/app.html:2` keeps `class="dark"`: it is the pre-theme default and matches the default theme, so a dark-theme user sees no light flash before `applyActiveTheme` runs at boot (`settings.service.ts:242`).
- `kb-ui.ts` needs no code change: its class checks become correct once the class follows the theme.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh` for the new spec.

- [ ] Failing first, `src/tests/lib/core/settings/theme.service.test.ts` (jsdom, real settings store, no store mocks): `applyTheme(LAVENDER_HAZE_THEME)` removes `dark` from `<html>`, sets `style.colorScheme` to `light` and makes `appliedThemeStore.isDark` false; `applyTheme(KOKOBRAIN_DEFAULT_THEME)` restores all three; a theme whose `ui.editorBg` is unparseable (for example `var(--x)`) leaves the mode dark; `applyStoredTheme` with stored Lavender vars and `applyActiveTheme` with `activeTheme: 'Lavender Haze'` both switch to light. The `beforeEach` resets the class and the store so cases do not leak.
- [ ] Failing first, `theme-css-contract.test.ts` asserts `src/app.css` contains the line `@custom-variant dark (&:where(.dark, .dark *));`.
- [ ] New `e2e/specs/theme-mode.spec.ts` using the `vaultFiles` fixture (`e2e/fixtures/test-vault`) with `appearance.activeTheme` set in `.kokobrain/settings.json`: Lavender Haze with Playwright `colorScheme: 'dark'` gives an `<html>` without the `dark` class and a computed `color-scheme` of `light`; KokoBrain Default with `colorScheme: 'light'` gives the `dark` class and `color-scheme: dark`. Run through `bash scripts/e2e.sh`.
- [ ] The theme editor draft preview (`ThemeEditor.svelte:67`, which calls `applyTheme`) and the composer window (`applyStoredTheme`) follow the mode with no code of their own (covered by the unit cases above).
- [ ] `docs/adr/0002-shadcn-svelte-tailwind-bits-ui.md` gets a dated amendment: `dark:` follows the applied theme through `@custom-variant`, `theme.service.ts` owns `html.dark` and `color-scheme`, and the mode rule is `isDarkColor(editorBg)` with unreadable values treated as dark.
- [ ] No `dark:` utility is edited in this ticket.

## Notes

- **Source:** review-2026-11-04.md section 1 item 4 and roadmap row 2; `work/color.md` H2.
- **Visible effect:** with the Default theme on a light macOS appearance, the shadcn dark variants (button, switch, select trigger, menu destructive highlight, scroll-area ring, `AppShell.svelte:188` ghost hover) now apply, as they already do on a dark OS. That is the intended shadcn dark look (owner decision recorded, accept). The destructive button's own colors (`text-white`, `dark:bg-destructive/60`) are separate contrast work.
- **Syntax:** the `@custom-variant` line is the Tailwind v4 "toggle dark mode manually" form; confirm it against the tailwindcss 4.3.3 docs before writing (from memory).
- **Layer:** store and service stay in `core/settings`; no new import edges.
- **Out of scope:** Toaster and CodeMirror (Issue 40), elevation and shadow tokens, an audit of the `dark:` utilities.
- **Size:** M.
