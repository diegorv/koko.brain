# 75: The start screen uses the last applied theme

**What to build:** The start screen (the vault picker, `src/routes/(app)/+page.svelte`) renders before any vault loads. The active theme lives in the vault's settings (`<vault>/.kokobrain/settings.json`) and reaches the DOM only through `applyActiveTheme()`, which `loadSettings` calls (`settings.service.ts:242`) in Step 1 of `initializeVault` (`app-lifecycle.service.ts:199`). So the start screen showed the stylesheet default (`src/app.html:2` `class="dark"` plus the `.dark` block in `src/app.css`), not the user's theme. `applyActiveTheme()` already mirrors the theme's CSS variables to localStorage (`kokobrain:theme-vars`), and `applyStoredTheme()` (`theme.service.ts:52`) reads them back, but only the Quick Capture composer called it:
- `src/routes/(app)/+layout.svelte`: call `applyStoredTheme()` synchronously at the top level of the script, next to `registerAppPorts()`, outside any `$effect`. `initializeVault` then replaces it with the vault's own theme, writing the same variable set.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first, `src/tests/lib/core/settings/theme.service.test.ts`: the `(app)` layout source calls `applyStoredTheme();` at one tab of indentation (top level of the `<script>`, not inside a vault-scoped `$effect`), the same source-scan pattern as `boot.test.ts:117`. The behavior of `applyStoredTheme` (vars, mode, empty and corrupt storage) is covered by the existing cases in the same file.
- [x] With nothing stored (first run, fresh Playwright context) the stylesheet defaults stay in place.

## Notes

- **Source:** owner report, 2026-11-05: the start screen does not follow the theme colors.
- **Several vaults:** the start screen shows the theme of the vault opened last, because the mirror holds one theme for the whole app.
- **Known gap, not fixed here:** a short flash of the default palette before the JS bundle runs. Removing it needs the theme applied before the bundle (for example an inline script in `app.html`), which this change does not do.
- **Latent risk (from the review):** `applyActiveTheme` only sets variables and never removes them. If a future release removes or renames a theme token, the old variable from an older mirror stays inline on `<html>` for the session, and would override `app.css` if the stylesheet later declares that same name. The composer already behaves this way.
- **Size:** S.

## Comments

- 2026-11-05, branch `fix/startup-theme`, merged to main as 7dd276998 (no relay run). Full suite 11883 passed, 1 skipped, 1 todo; `pnpm check` 0 errors; build ok. One adversarial opus review: could not refute.
