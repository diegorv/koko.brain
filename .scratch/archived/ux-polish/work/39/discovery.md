# Issue 39 discovery: the active theme decides dark mode

## Files that change
- `src/lib/core/settings/applied-theme.store.svelte.ts` (new): `appliedThemeStore` with `isDark` getter (default `true`) and `setDark(value)`; `_reset()` for tests, as `settings-panel.store.svelte.ts` does.
- `src/lib/core/settings/theme.service.ts:13-64`: private `applyMode(vars)` after `setRootVars` in `applyTheme` (:26), `applyStoredTheme` (:45, only after the parse guards pass) and `applyActiveTheme` (:57). Reads `vars['--editor-bg']`, `isDarkColor(v) !== false` (`src/lib/utils/color.ts:71`), toggles `html.dark`, sets `style.colorScheme`, calls `appliedThemeStore.setDark`.
- `src/app.css:1-3`: `@custom-variant dark (&:where(.dark, .dark *));` after the imports. The file has three imports (tailwindcss, tw-animate-css, katex), not two; the line goes after all three.
- `src/tests/lib/core/settings/theme.service.test.ts`: new describe for the mode.
- `src/tests/lib/core/settings/theme-css-contract.test.ts`: asserts the custom-variant line.
- `e2e/specs/theme-mode.spec.ts` (new): `test.use({ vaultFiles, colorScheme })` per describe, settings override copied from `e2e/specs/deep-link.spec.ts:11-25`.
- `docs/adr/0002-shadcn-svelte-tailwind-bits-ui.md`: dated amendment.

## Plan
1. Failing unit tests (theme.service + css contract), then store + helper + css line.
2. e2e spec.
3. ADR amendment.

## Decisions / defaults
- Missing `--editor-bg` in the applied vars (a partial theme, e.g. the `applyTheme` edge-case tests, or a stored mirror without it): `isDarkColor(undefined ?? '')` returns null, so the mode is dark. Same rule as an unparseable value.
- `applyStoredTheme` with nothing or garbage stored returns early: the class stays as `app.html` set it (dark), matching "only on the path that applied vars".
- Syntax `@custom-variant dark (&:where(.dark, .dark *));` checked against https://tailwindcss.com/docs/dark-mode (tailwindcss 4.3.3 installed).
- `app.html` keeps `class="dark"`; `kb-ui.ts` untouched; no `dark:` utility edited.
- E2E colorScheme set with `test.use({ colorScheme })` inside each `test.describe`.

## Risks
- jsdom tests share `document.documentElement` across files in one worker only within a file; the new `beforeEach` resets class, colorScheme and the store.
- Visible change on Default + light OS (shadcn dark variants now apply): accepted by the owner per the Issue Notes.
